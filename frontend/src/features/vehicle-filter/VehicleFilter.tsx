import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  VehicleGenerationOption,
  VehicleKind,
  VehicleModelOption,
  VehicleModificationOption,
} from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Button, Img } from '@/shared/ui'
import { IconCheck, IconChevronDown, IconClose } from '@/shared/ui/Icon'
import type { VehicleFilterMode } from '@/features/catalog-filters/filter-profile'
import { FilterShell } from '@/features/catalog-filters/FilterShell'
import { OptionList, POPULAR_GROUP, type Choice } from '@/features/catalog-filters/OptionList'
import { useCatalogParams } from '@/features/catalog-filters/useCatalogParams'
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

const YEARS_DASH = ' — '

/** Годы выпуска поколения: «2017 — 2023» либо «2023 — н.в.». */
function years(option: { year_start: number | null; year_end: number | null }): string {
  if (!option.year_start) return ''
  return `${option.year_start}${YEARS_DASH}${option.year_end ?? 'н.в.'}`
}

/**
 * Поколения выбираются карточками с фотографией — по картинке машину узнают
 * быстрее, чем по римской цифре и годам.
 */
function GenerationCards({
  options,
  selected,
  onToggle,
  query,
}: {
  options: VehicleGenerationOption[]
  selected: string[]
  onToggle: (slug: string) => void
  query: string
}) {
  const found = query
    ? options.filter(
        (option) =>
          `${option.model_name} ${option.name}`.toLowerCase().includes(query) || selected.includes(option.slug),
      )
    : options

  if (found.length === 0) return <p className="py-2 text-sm text-ink-muted">{t('catalog.nothingFound')}</p>

  return (
    <div data-lenis-prevent className="scrollbar-thin max-h-96 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        {found.map((option) => {
          const active = selected.includes(option.slug)
          return (
            <button
              key={option.slug}
              type="button"
              // Карточка поколения — та же галочка, только с фотографией:
              // aria-pressed прочитался бы кнопкой-переключателем, а не выбором.
              role="checkbox"
              aria-checked={active}
              onClick={() => onToggle(option.slug)}
              className={cn(
                'flex flex-col gap-1 rounded-card border p-1.5 text-left transition-colors duration-[--duration-fast]',
                active ? 'border-accent bg-accent/5' : 'border-line hover:border-ink-muted',
              )}
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-control">
                <Img
                  src={option.image?.card ?? null}
                  alt={option.image?.alt ?? `${option.model_name} ${option.name}`}
                  width={400}
                  height={300}
                  cover
                  className="h-full w-full"
                  wrapperClassName="w-full"
                />
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded border bg-surface',
                    active ? 'border-accent bg-accent text-white' : 'border-line',
                  )}
                >
                  {active ? <IconCheck width={14} height={14} /> : null}
                </span>
              </span>
              <span className="flex items-baseline justify-between gap-2 text-sm text-ink">
                <span className="truncate">{years(option)}</span>
                <span className="shrink-0 text-ink-muted tabular-nums">{option.products_count}</span>
              </span>
              <span className="truncate text-sm text-ink-muted">
                {option.model_name} {option.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Подбор детали под технику: марка → модель → поколение → модификация.
 * На каждом уровне множественный выбор (§1 ТЗ): отметив две марки, ниже
 * получаешь модели обеих, сгруппированные по марке.
 *
 * Уровень появляется, только когда выбран предыдущий — иначе список моделей
 * всех марок сразу бессмыслен.
 */
export interface VehicleFilterProps {
  className?: string
  /** Режим каскада в текущем разделе (см. filterProfile). По умолчанию — полный. */
  mode?: VehicleFilterMode
  /** Тип техники, к которому привязан раздел (для mode='locked'). */
  lockedKind?: VehicleKind | null
  /** Раздел каталога — по нему считаются счётчики товаров у вариантов. */
  categorySlug?: string | null
}

export function VehicleFilter({
  className,
  mode = 'full',
  lockedKind = null,
  categorySlug = null,
}: VehicleFilterProps) {
  const { params, applyVehicle, resetVehicle, setParam, vehicleDepth } = useCatalogParams()
  const garageVehicle = useActiveVehicle()
  // В залоченном разделе тип техники задаётся категорией и в URL не пишется,
  // пока пользователь сам не выберет уровень — так подбор не «протекает» в
  // соседние разделы при переходе по дереву категорий.
  const kind = lockedKind ?? params.vehicleType
  const garageApplied = Boolean(params.garageVehicleId)
  // optional: каскад свёрнут, пока в нём нет активного выбора.
  const [expanded, setExpanded] = useState(vehicleDepth > 0)
  const collapsible = mode === 'optional' && !garageApplied
  // Тип техники скрыт только там, где его задаёт сам раздел (locked).
  const showTypeChips = mode !== 'locked'

  const brands = useQuery({
    queryKey: ['vehicle', 'brands', kind, params.vehicleClass, categorySlug],
    queryFn: () => fetchVehicleBrands(kind, params.vehicleClass, categorySlug),
  })

  const models = useQuery({
    queryKey: ['vehicle', 'models', kind, params.brands, categorySlug],
    queryFn: () => fetchVehicleModels(kind, params.brands, categorySlug),
    enabled: params.brands.length > 0,
  })

  const generations = useQuery({
    queryKey: ['vehicle', 'generations', kind, params.models, categorySlug],
    queryFn: () => fetchVehicleGenerations(kind, params.models, categorySlug),
    enabled: params.models.length > 0,
  })

  const modifications = useQuery({
    queryKey: ['vehicle', 'modifications', kind, params.generations, categorySlug],
    queryFn: () => fetchVehicleModifications(kind, params.generations, categorySlug),
    enabled: params.generations.length > 0,
  })

  const modelList: VehicleModelOption[] = models.data ?? []
  const generationList: VehicleGenerationOption[] = generations.data ?? []
  const modificationList: VehicleModificationOption[] = modifications.data ?? []

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  /**
   * Снятая марка уносит с собой свои модели, поколения и модификации: иначе
   * в фильтре остаётся выбор, которого больше не видно ни в одном списке.
   */
  const toggleBrand = (slug: string) => {
    const nextBrands = toggle(params.brands, slug)
    const keptModels = params.models.filter((value) => {
      const model = modelList.find((item) => item.slug === value)
      return model ? nextBrands.includes(model.brand_slug) : true
    })
    const keptGenerations = params.generations.filter((value) => {
      const generation = generationList.find((item) => item.slug === value)
      return generation ? keptModels.includes(generation.model_slug) : true
    })
    const keptModifications = params.modifications.filter((value) => {
      const modification = modificationList.find((item) => item.slug === value)
      return modification ? keptGenerations.includes(modification.generation_slug) : true
    })
    applyVehicle({
      vehicleType: kind,
      brand: nextBrands,
      model: keptModels,
      generation: keptGenerations,
      modification: keptModifications,
    })
  }

  const toggleModel = (slug: string) => {
    const nextModels = toggle(params.models, slug)
    const keptGenerations = params.generations.filter((value) => {
      const generation = generationList.find((item) => item.slug === value)
      return generation ? nextModels.includes(generation.model_slug) : true
    })
    const keptModifications = params.modifications.filter((value) => {
      const modification = modificationList.find((item) => item.slug === value)
      return modification ? keptGenerations.includes(modification.generation_slug) : true
    })
    applyVehicle({ model: nextModels, generation: keptGenerations, modification: keptModifications })
  }

  const toggleGeneration = (slug: string) => {
    const nextGenerations = toggle(params.generations, slug)
    const keptModifications = params.modifications.filter((value) => {
      const modification = modificationList.find((item) => item.slug === value)
      return modification ? nextGenerations.includes(modification.generation_slug) : true
    })
    applyVehicle({ generation: nextGenerations, modification: keptModifications })
  }

  const toggleModification = (slug: string) =>
    applyVehicle({ modification: toggle(params.modifications, slug) })

  const nameOf = (list: { slug: string; name: string }[], slugs: string[]) =>
    slugs.map((slug) => list.find((item) => item.slug === slug)?.name ?? slug).join(', ')

  const brandChoices: Choice[] = (brands.data ?? []).map((brand) => ({
    value: brand.slug,
    label: brand.name,
    count: brand.products_count,
    group: brand.is_popular ? POPULAR_GROUP : t('vehicleFilter.allBrands'),
  }))

  // Группируем модели по марке только когда марок больше одной — иначе
  // заголовок группы дублирует уже выбранную марку.
  const multipleBrands = params.brands.length > 1
  const modelChoices: Choice[] = modelList.map((model) => ({
    value: model.slug,
    label: model.name,
    count: model.products_count,
    hint: years(model) || undefined,
    group: multipleBrands ? model.brand_name : model.is_popular ? POPULAR_GROUP : t('vehicleFilter.allModels'),
  }))

  const modificationChoices: Choice[] = modificationList.map((modification) => ({
    value: modification.slug,
    label: modification.name,
    count: modification.products_count,
    group: params.generations.length > 1 ? modification.generation_name : undefined,
  }))

  const showReset = vehicleDepth > 0 || garageApplied

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-4">
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
                className={cn(
                  'text-ink-muted transition-transform duration-[--duration-fast]',
                  expanded && 'rotate-180',
                )}
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
        ) : null}
      </div>

      {garageApplied || (collapsible && !expanded) ? null : (
        <>
          {garageVehicle && !garageApplied ? (
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
                    onClick={() =>
                      applyVehicle({
                        vehicleType: active ? null : item.value,
                        brand: [],
                        model: [],
                        generation: [],
                        modification: [],
                      })
                    }
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

          <FilterShell
            title={t('vehicleFilter.brand')}
            summary={nameOf(brands.data ?? [], params.brands)}
            placeholder={t('vehicleFilter.anyBrand')}
            count={params.brands.length}
            searchPlaceholder={t('vehicleFilter.enterName')}
            onReset={() =>
              applyVehicle({ brand: [], model: [], generation: [], modification: [] })
            }
          >
            {(query) => (
              <OptionList query={query} choices={brandChoices} selected={params.brands} onToggle={toggleBrand} />
            )}
          </FilterShell>

          {params.brands.length > 0 ? (
            <FilterShell
              title={t('vehicleFilter.model')}
              summary={nameOf(modelList, params.models)}
              placeholder={t('vehicleFilter.anyModel')}
              count={params.models.length}
              searchPlaceholder={t('vehicleFilter.enterName')}
              onReset={() => applyVehicle({ model: [], generation: [], modification: [] })}
            >
              {(query) => (
                <OptionList
                  query={query}
                  choices={modelChoices}
                  selected={params.models}
                  onToggle={toggleModel}
                  collapsibleGroups={multipleBrands}
                />
              )}
            </FilterShell>
          ) : null}

          {params.models.length > 0 ? (
            <FilterShell
              title={t('vehicleFilter.generation')}
              summary={nameOf(generationList, params.generations)}
              placeholder={t('vehicleFilter.anyGeneration')}
              count={params.generations.length}
              searchPlaceholder={t('vehicleFilter.enterName')}
              onReset={() => applyVehicle({ generation: [], modification: [] })}
            >
              {(query) => (
                <GenerationCards
                  query={query}
                  options={generationList}
                  selected={params.generations}
                  onToggle={toggleGeneration}
                />
              )}
            </FilterShell>
          ) : null}

          {params.generations.length > 0 ? (
            <FilterShell
              title={t('vehicleFilter.modification')}
              summary={nameOf(modificationList, params.modifications)}
              placeholder={t('vehicleFilter.anyModification')}
              count={params.modifications.length}
              searchPlaceholder={t('vehicleFilter.enterName')}
              onReset={() => applyVehicle({ modification: [] })}
            >
              {(query) => (
                <OptionList
                  query={query}
                  choices={modificationChoices}
                  selected={params.modifications}
                  onToggle={toggleModification}
                  collapsibleGroups={params.generations.length > 1}
                />
              )}
            </FilterShell>
          ) : null}
        </>
      )}
    </section>
  )
}
