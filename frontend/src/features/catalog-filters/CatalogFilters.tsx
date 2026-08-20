import { Link } from 'react-router'
import type { CategoryDetail, ProductListResponse } from '@/shared/api/types'
import { categoryHref } from '@/entities/category/tree'
import { t } from '@/shared/i18n'
import { Button, Checkbox } from '@/shared/ui'
import { VehicleFilter } from '@/features/vehicle-filter/VehicleFilter'
import { filterProfile } from './filter-profile'
import { PriceHistogramSlider } from './PriceHistogramSlider'
import { FacetGroup } from './FacetGroup'
import { useCatalogParams } from './useCatalogParams'

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
  const profile = filterProfile(category?.vehicle_type)

  const children = category?.children ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Категория сужает выдачу сильнее любого фасета, поэтому идёт первой.
          Это навигация, а не фильтр: выбор меняет раздел, а не параметр. */}
      {children.length > 0 ? (
        <nav aria-label={t('catalog.subcategories')} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t('catalog.subcategories')}</h2>
          <ul className="flex flex-col">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  to={categoryHref(child.path)}
                  onClick={onApplied}
                  className="flex min-h-9 items-baseline justify-between gap-3 text-base text-ink-muted transition-colors duration-[--duration-fast] hover:text-ink"
                >
                  <span className="truncate">{child.name}</span>
                  <span className="text-sm tabular-nums">{child.products_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <VehicleFilter mode={profile.vehicleMode} lockedKind={profile.lockedKind} />

      <hr className="border-line" />

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
