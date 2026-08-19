import type { CategoryDetail, ProductListResponse, TireWheelFacets } from '@/shared/api/types'
import { t, type TranslationKey } from '@/shared/i18n'
import { Button, Checkbox, Select } from '@/shared/ui'
import { VehicleFilter } from '@/features/vehicle-filter/VehicleFilter'
import { filterProfile } from './filter-profile'
import { PriceHistogramSlider } from './PriceHistogramSlider'
import { FacetGroup } from './FacetGroup'
import { useCatalogParams, type TireWheelKey } from './useCatalogParams'

const TIRE_WHEEL_FIELDS: { key: TireWheelKey; facet: keyof TireWheelFacets; labelKey: TranslationKey }[] = [
  { key: 'tire_diameter', facet: 'tire_diameter', labelKey: 'tires.diameter' },
  { key: 'tire_width', facet: 'tire_width', labelKey: 'tires.width' },
  { key: 'tire_height', facet: 'tire_height', labelKey: 'tires.height' },
  { key: 'tire_seasonality', facet: 'tire_seasonality', labelKey: 'tires.seasonality' },
  { key: 'wheel_diameter', facet: 'wheel_diameter', labelKey: 'tires.diameter' },
  { key: 'wheel_width', facet: 'wheel_width', labelKey: 'tires.width' },
  { key: 'wheel_pcd', facet: 'wheel_pcd', labelKey: 'tires.pcd' },
  { key: 'wheel_offset_type', facet: 'wheel_offset_type', labelKey: 'tires.offsetType' },
  { key: 'wheel_type', facet: 'wheel_type', labelKey: 'tires.wheelType' },
]

/** Профильные фильтры показываются только там, где бэк прислал их фасеты. */
function TireWheelFilters({ facets }: { facets: TireWheelFacets }) {
  const { params, setParam } = useCatalogParams()
  const kind = params.tireWheel['tire_wheel_type'] ?? 'tire'

  const fields = TIRE_WHEEL_FIELDS.filter((field) =>
    kind === 'wheel' ? field.key.startsWith('wheel_') : field.key.startsWith('tire_'),
  )

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t('tires.title')}</h2>

      <Select
        label={t('tires.kind')}
        value={kind}
        onChange={(event) => setParam('tire_wheel_type', event.target.value)}
      >
        <option value="tire">{t('tires.tire')}</option>
        <option value="wheel">{t('tires.wheel')}</option>
      </Select>

      {fields.map((field) => {
        const options = facets[field.facet]
        if (options.length === 0) return null
        return (
          <Select
            key={field.key}
            label={t(field.labelKey)}
            value={params.tireWheel[field.key] ?? ''}
            onChange={(event) => setParam(field.key, event.target.value || null)}
          >
            <option value="">{t('common.all')}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </Select>
        )
      })}

      {kind === 'tire' ? (
        <Checkbox
          checked={params.tireWheel['tire_spikes'] === 'true'}
          onChange={(event) => setParam('tire_spikes', event.target.checked ? 'true' : null)}
          label={t('tires.spikes')}
        />
      ) : null}
    </section>
  )
}

/** Названия фасетов, у которых в панели есть собственный блок. */
const DEDICATED_FACETS = new Set([
  t('catalog.brand').toLowerCase(),
  t('catalog.countryOfOrigin').toLowerCase(),
  t('catalog.productBrand').toLowerCase(),
  t('catalog.manufacturer').toLowerCase(),
])

export interface CatalogFiltersProps {
  data: ProductListResponse | undefined
  /** Текущая категория — задаёт профиль фильтров (§ умные фильтры по разделу). */
  category?: CategoryDetail | null
  onApplied?: () => void
}

export function CatalogFilters({ data, category, onApplied }: CatalogFiltersProps) {
  const { params, setParam, toggleInList, reset, activeCount } = useCatalogParams()

  const min = data?.facets.price_min ?? 0
  const max = data?.facets.price_max ?? 0
  const tireWheelFacets = data?.facets.tire_wheel ?? null
  const profile = filterProfile(category?.vehicle_type)

  return (
    <div className="flex flex-col gap-6">
      <VehicleFilter mode={profile.vehicleMode} lockedKind={profile.lockedKind} />

      <hr className="border-line" />

      {tireWheelFacets ? (
        <>
          <TireWheelFilters facets={tireWheelFacets} />
          <hr className="border-line" />
        </>
      ) : null}

      {max > min ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold">{t('catalog.price')}</legend>
          <PriceHistogramSlider
            min={min}
            max={max}
            value={[params.priceMin ?? min, params.priceMax ?? max]}
            histogram={data?.price_histogram ?? []}
            onCommit={([from, to]) => {
              setParam('price_min', from > min ? String(from) : null)
              setParam('price_max', to < max ? String(to) : null)
              onApplied?.()
            }}
          />
        </fieldset>
      ) : null}

      {/* Бренд и страна — две грани одного, поэтому одним блоком: порознь они
          читались как два конкурирующих фильтра с похожими названиями. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">{t('catalog.production')}</h2>

        <FacetGroup
          title={t('catalog.brand')}
          options={data?.facets.product_brands ?? []}
          selected={params.productBrands}
          onToggle={(value) => {
            toggleInList('product_brand', value)
            onApplied?.()
          }}
        />

        <FacetGroup
          title={t('catalog.countryOfOrigin')}
          options={data?.facets.manufacturers ?? []}
          selected={params.manufacturers}
          onToggle={(value) => {
            toggleInList('manufacturer', value)
            onApplied?.()
          }}
        />
      </section>

      {/* §5: динамические атрибутные фильтры категории (как в старом каталоге).
          Атрибуты, дублирующие блок «Производство», отбрасываем: бэк отдаёт
          страну и в `manufacturers`, и отдельным атрибутом, и в панели
          появлялись два одинаковых фасета подряд. */}
      {(data?.facets.attributes ?? []).filter((facet) => !DEDICATED_FACETS.has(facet.label.trim().toLowerCase())).map((facet) => (
        <FacetGroup
          key={facet.code}
          title={facet.label}
          options={facet.options}
          selected={params.attributes[facet.code] ?? []}
          onToggle={(value) => {
            toggleInList(facet.code, value)
            onApplied?.()
          }}
        />
      ))}

      <fieldset className="flex flex-col gap-1">
        {/* Было «Фильтры» — группа «Фильтры» внутри панели фильтров ни о чём. */}
        <legend className="mb-2 text-base font-semibold">{t('catalog.availability')}</legend>
        <Checkbox
          checked={params.inStock}
          onChange={(event) => {
            setParam('in_stock', event.target.checked ? 'true' : null)
            onApplied?.()
          }}
          label={t('catalog.inStock')}
        />
        <Checkbox
          checked={params.onOrder}
          onChange={(event) => {
            setParam('on_order', event.target.checked ? 'true' : null)
            onApplied?.()
          }}
          label={t('catalog.onOrder')}
        />
        <Checkbox
          checked={params.isOriginal}
          onChange={(event) => {
            setParam('is_original', event.target.checked ? 'true' : null)
            onApplied?.()
          }}
          label={t('catalog.isOriginal')}
        />
      </fieldset>

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          onClick={() => {
            reset()
            onApplied?.()
          }}
        >
          {t('catalog.filtersReset')}
        </Button>
      ) : null}
    </div>
  )
}
