import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { GarageVehicle, VehicleKind } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Button, Input, Select, Tabs, toast } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { isValidVin } from '@/features/search/detect'
import {
  fetchVehicleBrands,
  fetchVehicleGenerations,
  fetchVehicleModels,
  fetchVehicleModifications,
} from '@/features/vehicle-filter/api'
import { createGarageVehicle } from './api'
import { useGarageStore } from './store'

type Mode = 'model' | 'vin'

const KINDS: { value: VehicleKind; labelKey: Parameters<typeof t>[0] }[] = [
  { value: 'car', labelKey: 'vehicleType.car' },
  { value: 'truck', labelKey: 'vehicleType.truck' },
  { value: 'moto', labelKey: 'vehicleType.moto' },
  { value: 'special', labelKey: 'vehicleType.special' },
]

interface Picked {
  slug: string
  name: string
}

/**
 * Добавление техники в гараж. Каскад берёт те же справочники, что и подбор в
 * каталоге, — раньше форма ходила в отдельные ручки `garage/*`, где модели
 * всегда были от Lada, а поколений не было вовсе.
 */
export function GarageVehicleForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>('model')
  const [kind, setKind] = useState<VehicleKind>('car')
  const [brand, setBrand] = useState<Picked | null>(null)
  const [model, setModel] = useState<Picked | null>(null)
  const [generation, setGeneration] = useState<Picked | null>(null)
  const [modification, setModification] = useState<Picked | null>(null)
  const [vin, setVin] = useState('')
  const [vinError, setVinError] = useState<string | undefined>(undefined)
  const addVehicle = useGarageStore((state) => state.addVehicle)

  const brands = useQuery({
    queryKey: ['vehicle', 'brands', kind, null],
    queryFn: () => fetchVehicleBrands(kind, null),
  })
  const models = useQuery({
    queryKey: ['vehicle', 'models', kind, brand?.slug],
    queryFn: () => fetchVehicleModels(kind, brand!.slug),
    enabled: Boolean(brand),
  })
  const generations = useQuery({
    queryKey: ['vehicle', 'generations', kind, model?.slug],
    queryFn: () => fetchVehicleGenerations(kind, model!.slug),
    enabled: Boolean(model),
  })
  const modifications = useQuery({
    queryKey: ['vehicle', 'modifications', kind, generation?.slug],
    queryFn: () => fetchVehicleModifications(kind, generation!.slug),
    enabled: Boolean(generation),
  })

  const create = useMutation({
    mutationFn: createGarageVehicle,
    onSuccess: (vehicle: GarageVehicle) => {
      addVehicle(vehicle)
      onDone?.()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t('common.errorText')),
  })

  const submitByModel = () => {
    if (!brand || !model || !modification) return
    create.mutate({
      vehicle_type: kind,
      make: brand.name,
      model: model.name,
      ...(generation ? { generation: generation.name } : {}),
      modification: modification.name,
    })
  }

  const submitByVin = () => {
    const value = vin.trim().toUpperCase()
    if (!isValidVin(value)) {
      setVinError(t('garage.vinInvalid'))
      return
    }
    setVinError(undefined)
    create.mutate({ vin: value })
  }

  /** Смена уровня обнуляет всё, что ниже: иначе остаётся несовместимая связка. */
  const pick = (
    list: { slug: string; name: string }[] | undefined,
    slug: string,
    apply: (value: Picked | null) => void,
    resets: ((value: null) => void)[],
  ) => {
    const found = list?.find((item) => item.slug === slug)
    apply(found ? { slug: found.slug, name: found.name } : null)
    for (const clear of resets) clear(null)
  }

  /**
   * Название шага живёт внутри поля: до выбора оно и есть подпись, после —
   * заменяется выбранным значением. Отдельная строка-лейбл над каждым из
   * четырёх полей удваивала высоту формы.
   */
  const step = (
    label: string,
    value: Picked | null,
    list: { slug: string; name: string }[] | undefined,
    disabled: boolean,
    onPick: (slug: string) => void,
  ) => (
    <Select
      aria-label={label}
      value={value?.slug ?? ''}
      disabled={disabled}
      onChange={(event) => onPick(event.target.value)}
    >
      <option value="" disabled>
        {label}
      </option>
      {(list ?? []).map((option) => (
        <option key={option.slug} value={option.slug}>
          {option.name}
        </option>
      ))}
    </Select>
  )

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        aria-label={t('garage.addVehicle')}
        value={mode}
        onChange={setMode}
        items={[
          { value: 'model', label: t('garage.byModel') },
          { value: 'vin', label: t('garage.byVin') },
        ]}
      />

      {mode === 'model' ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitByModel()
          }}
        >
          <fieldset>
            <legend className="sr-only">{t('vehicleFilter.type')}</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={kind === item.value}
                  onClick={() => {
                    setKind(item.value)
                    setBrand(null)
                    setModel(null)
                    setGeneration(null)
                    setModification(null)
                  }}
                  className={cn(
                    'flex h-10 items-center rounded-pill border px-4 text-base transition-colors duration-[--duration-fast]',
                    kind === item.value
                      ? 'border-ink bg-ink font-medium text-white'
                      : 'border-line text-ink hover:border-ink-muted',
                  )}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
          </fieldset>

          {step(t('garage.make'), brand, brands.data, false, (slug) =>
            pick(brands.data, slug, setBrand, [setModel, setGeneration, setModification]),
          )}

          {step(t('garage.model'), model, models.data, !brand, (slug) =>
            pick(models.data, slug, setModel, [setGeneration, setModification]),
          )}

          {step(t('vehicleFilter.generation'), generation, generations.data, !model, (slug) =>
            pick(generations.data, slug, setGeneration, [setModification]),
          )}

          {step(t('garage.modification'), modification, modifications.data, !generation, (slug) =>
            pick(modifications.data, slug, setModification, []),
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={create.isPending}
            disabled={!modification}
          >
            {t('garage.add')}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitByVin()
          }}
        >
          <Input
            aria-label={t('garage.vin')}
            placeholder={t('garage.vin')}
            error={vinError}
            value={vin}
            maxLength={17}
            autoCapitalize="characters"
            onChange={(event) => setVin(event.target.value.toUpperCase().replace(/\s/g, ''))}
            className="font-mono tracking-[0.15em]"
          />
          <Button type="submit" variant="primary" size="lg" block loading={create.isPending}>
            {t('garage.add')}
          </Button>
        </form>
      )}
    </div>
  )
}
