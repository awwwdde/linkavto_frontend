import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { VehicleKind } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Button, Select } from '@/shared/ui'
import { IconChevronDown, IconClose } from '@/shared/ui/Icon'
import type { VehicleFilterMode } from '@/features/catalog-filters/filter-profile'
import { useCatalogParams, type VehicleLevel } from '@/features/catalog-filters/useCatalogParams'
import { useActiveVehicle } from '@/features/garage/store'
import {
  fetchVehicleBrands,
  fetchVehicleGenerations,
  fetchVehicleModels,
  fetchVehicleModifications,
} from './api'

const VEHICLE_KINDS: { value: VehicleKind; label: string }[] = [
  { value: 'car', label: 'Легковые' },
  { value: 'truck', label: 'Грузовые' },
  { value: 'moto', label: 'Мото' },
  { value: 'special', label: 'Спецтехника' },
]

interface Option {
  slug: string
  name: string
}

interface ChosenStep {
  level: VehicleLevel
  name: string
}

/**
 * Открытый шаг подбора — ровно один на экране. Предыдущие уровни свёрнуты в
 * чипы выше, следующие ещё не показаны, поэтому панель не растёт в высоту.
 */
function Step({
  label,
  options,
  loading,
  onChange,
}: {
  label: string
  options: Option[]
  loading: boolean
  onChange: (slug: string | null) => void
}) {
  return (
    <Select label={label} value="" onChange={(event) => onChange(event.target.value || null)}>
      <option value="">{loading ? `${t('common.loading')}…` : t('vehicleFilter.any')}</option>
      {options.map((option) => (
        <option key={option.slug} value={option.slug}>
          {option.name}
        </option>
      ))}
    </Select>
  )
}

/** Выбранный уровень: клик снимает его и все, что ниже. */
function ChosenChip({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-pill bg-accent/10 px-3 text-sm text-accent transition-colors duration-[--duration-fast] hover:bg-accent/15"
    >
      <span className="truncate">{name}</span>
      <IconClose width={14} height={14} className="shrink-0" />
    </button>
  )
}

/**
 * Каскад подбора детали под технику: тип → класс → марка → модель →
 * поколение → модификация. Порядок повторяет модели Django, но выбирать
 * шаги можно в любой последовательности — предки достраиваются сами.
 */
export interface VehicleFilterProps {
  className?: string
  /** Режим каскада в текущем разделе (см. filterProfile). По умолчанию — полный. */
  mode?: VehicleFilterMode
  /** Тип техники, к которому привязан раздел (для mode='locked'). */
  lockedKind?: VehicleKind | null
}

export function VehicleFilter({ className, mode = 'full', lockedKind = null }: VehicleFilterProps) {
  const { params, applyVehicle, resetVehicle, setParam, vehicleDepth } = useCatalogParams()
  const garageVehicle = useActiveVehicle()
  // В залоченном разделе тип техники задаётся категорией и в URL не пишется,
  // пока пользователь сам не выберет уровень — так подбор не «протекает» в
  // соседние разделы через vehicleQuery.
  const kind = lockedKind ?? params.vehicleType
  const garageApplied = Boolean(params.garageVehicleId)
  // optional: каскад свёрнут, пока в нём нет активного выбора.
  const [expanded, setExpanded] = useState(vehicleDepth > 0)
  const collapsible = mode === 'optional' && !garageApplied
  // Тип техники скрыт только там, где его задаёт сам раздел (locked).
  const showTypeChips = mode !== 'locked'


  const brands = useQuery({
    queryKey: ['vehicle', 'brands', kind, params.vehicleClass],
    queryFn: () => fetchVehicleBrands(kind, params.vehicleClass),
  })

  const models = useQuery({
    queryKey: ['vehicle', 'models', kind, params.brand],
    queryFn: () => fetchVehicleModels(kind, params.brand),
  })

  const generations = useQuery({
    queryKey: ['vehicle', 'generations', kind, params.model],
    queryFn: () => fetchVehicleGenerations(kind, params.model),
  })

  const modifications = useQuery({
    queryKey: ['vehicle', 'modifications', kind, params.generation],
    queryFn: () => fetchVehicleModifications(kind, params.generation),
  })

  /** Выбор любого уровня подтягивает всех его предков. */
  const select = (level: VehicleLevel, slug: string | null) => {
    if (slug === null) {
      applyVehicle({ [level]: null }, level)
      return
    }

    switch (level) {
      case 'brand': {
        const option = brands.data?.find((item) => item.slug === slug)
        applyVehicle({ vehicleType: option?.vehicle_type ?? kind, brand: slug }, 'brand')
        break
      }
      case 'model': {
        const option = models.data?.find((item) => item.slug === slug)
        applyVehicle(
          { vehicleType: option?.vehicle_type ?? kind, brand: option?.brand_slug ?? params.brand, model: slug },
          'model',
        )
        break
      }
      case 'generation': {
        const option = generations.data?.find((item) => item.slug === slug)
        applyVehicle(
          {
            vehicleType: option?.vehicle_type ?? kind,
            brand: option?.brand_slug ?? params.brand,
            model: option?.model_slug ?? params.model,
            generation: slug,
          },
          'generation',
        )
        break
      }
      case 'modification': {
        const option = modifications.data?.find((item) => item.slug === slug)
        applyVehicle(
          {
            vehicleType: option?.vehicle_type ?? kind,
            brand: option?.brand_slug ?? params.brand,
            model: option?.model_slug ?? params.model,
            generation: option?.generation_slug ?? params.generation,
            modification: slug,
          },
          'modification',
        )
        break
      }
      default:
        applyVehicle({ vehicleType: slug as VehicleKind }, 'vehicleType')
    }
  }

  /**
   * Подписи выбранных уровней. Имя берём из справочника, а пока он грузится —
   * из слага: иначе чип на миг схлопывается в пустоту и строка прыгает.
   */
  const nameOf = (list: { slug: string; name: string }[] | undefined, slug: string) =>
    list?.find((item) => item.slug === slug)?.name ?? slug

  const steps: (ChosenStep | null)[] = [
    params.brand ? { level: 'brand', name: nameOf(brands.data, params.brand) } : null,
    params.model ? { level: 'model', name: nameOf(models.data, params.model) } : null,
    params.generation ? { level: 'generation', name: nameOf(generations.data, params.generation) } : null,
    params.modification ? { level: 'modification', name: nameOf(modifications.data, params.modification) } : null,
  ]
  const chosen = steps.filter((step): step is ChosenStep => step !== null)

  const showReset = vehicleDepth > 0 || garageApplied

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-base font-semibold"
          >
            {t('vehicleFilter.pickByVehicle')}
            <IconChevronDown
              width={16}
              height={16}
              className={cn('text-ink-muted transition-transform duration-[--duration-fast]', expanded && 'rotate-180')}
            />
          </button>
        ) : (
          <h2 className="text-base font-semibold">{t('vehicleFilter.title')}</h2>
        )}
        {showReset ? (
          <button
            type="button"
            onClick={() => {
              resetVehicle()
              setParam('garage_vehicle_id', null)
            }}
            className="text-sm text-ink-muted underline hover:text-ink"
          >
            {t('vehicleFilter.reset')}
          </button>
        ) : null}
      </div>

      {garageApplied && garageVehicle ? (
        <div className="flex items-center justify-between gap-2 rounded-control bg-ok-bg px-3 py-2">
          <span className="min-w-0 text-sm text-ok">
            {t('vehicleFilter.appliedFromGarage')} <span className="font-medium">{garageVehicle.title}</span>
          </span>
          <button
            type="button"
            onClick={() => setParam('garage_vehicle_id', null)}
            aria-label={t('vehicleFilter.reset')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ok"
          >
            <IconClose width={16} height={16} />
          </button>
        </div>
      ) : collapsible && !expanded ? null : (
        <>
          <p className="text-sm text-ink-muted">{t('vehicleFilter.hint')}</p>

          {garageVehicle ? (
            <Button variant="secondary" onClick={() => setParam('garage_vehicle_id', String(garageVehicle.id))}>
              {t('vehicleFilter.fromGarage')}
            </Button>
          ) : null}

          {showTypeChips ? (
            <div className="flex flex-wrap gap-2">
              {VEHICLE_KINDS.map((item) => {
                const active = kind === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => select('vehicleType', active ? null : item.value)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-pill border px-3 text-sm transition-colors duration-[--duration-fast]',
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-surface text-ink hover:border-ink-muted',
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          {/* Выбранные уровни — строкой чипов. Клик по чипу снимает его и всё,
              что ниже, поэтому вернуться на шаг назад — одно нажатие. */}
          {chosen.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chosen.map((step) => (
                <ChosenChip key={step.level} name={step.name} onClear={() => select(step.level, null)} />
              ))}
            </div>
          ) : null}

          {/* Открыт ровно один шаг — следующий после последнего выбранного. */}
          {!params.brand ? (
            <Step
              label={t('vehicleFilter.brand')}
              loading={brands.isFetching}
              options={(brands.data ?? []).map((item) => ({ slug: item.slug, name: item.name }))}
              onChange={(slug) => select('brand', slug)}
            />
          ) : !params.model ? (
            <Step
              label={t('vehicleFilter.model')}
              loading={models.isFetching}
              options={(models.data ?? []).map((item) => ({ slug: item.slug, name: item.name }))}
              onChange={(slug) => select('model', slug)}
            />
          ) : !params.generation ? (
            <Step
              label={t('vehicleFilter.generation')}
              loading={generations.isFetching}
              options={(generations.data ?? []).map((item) => ({ slug: item.slug, name: item.name }))}
              onChange={(slug) => select('generation', slug)}
            />
          ) : !params.modification ? (
            <Step
              label={t('vehicleFilter.modification')}
              loading={modifications.isFetching}
              options={(modifications.data ?? []).map((item) => ({ slug: item.slug, name: item.name }))}
              onChange={(slug) => select('modification', slug)}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
