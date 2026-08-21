import type { AttributeFacet, CategoryDetail, ProductListResponse } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { Button, Checkbox } from '@/shared/ui'
import { VehicleFilter } from '@/features/vehicle-filter/VehicleFilter'
import { CategoryTreeFilter } from './CategoryTreeFilter'
import { filterProfile } from './filter-profile'
import { PriceHistogramSlider } from './PriceHistogramSlider'
import { FacetGroup } from './FacetGroup'
import { useCatalogParams } from './useCatalogParams'

/** Названия фасетов, у которых в панели есть собственный блок. */
const DEDICATED_FACETS = new Set([
  t('catalog.brands').toLowerCase(),
  t('catalog.brand').toLowerCase(),
  t('catalog.countryOfOrigin').toLowerCase(),
  t('catalog.productBrand').toLowerCase(),
  t('catalog.manufacturer').toLowerCase(),
])

export interface CatalogFiltersProps {
  data: ProductListResponse | undefined
  /** Текущая категория — задаёт профиль фильтров (§ умные фильтры по разделу). */
  category?: CategoryDetail | null
  /**
   * Выбор категории — не фильтр, а переход: страница меняет адрес и заголовок.
   * На мобильном по нему закрывается лист фильтров, иначе результат перехода
   * остаётся за шторкой. Остальные фильтры применяются на месте и ничего не
   * закрывают — их обычно ставят пачкой.
   */
  onNavigate?: () => void
}

export function CatalogFilters({ data, category, onNavigate }: CatalogFiltersProps) {
  const { params, setParam, setList, toggleInList, reset, activeCount } = useCatalogParams()

  const min = data?.facets.price_min ?? 0
  const max = data?.facets.price_max ?? 0
  const profile = filterProfile(category)

  const attributes = data?.facets.attributes ?? []
  const byCode = new Map(attributes.map((facet) => [facet.code, facet]))
  // Профильные оси раздела идут сразу после подбора по авто, остальные
  // атрибуты — ниже, после брендов и страны.
  const featured = profile.featuredFacets
    .map((code) => byCode.get(code))
    .filter((facet): facet is AttributeFacet => facet !== undefined)
  const rest = attributes.filter(
    (facet) =>
      !profile.featuredFacets.includes(facet.code) && !DEDICATED_FACETS.has(facet.label.trim().toLowerCase()),
  )

  const attributeGroup = (facet: AttributeFacet) => (
    <FacetGroup
      key={facet.code}
      title={facet.label}
      options={facet.options}
      selected={params.attributes[facet.code] ?? []}
      onToggle={(value) => toggleInList(facet.code, value)}
      onReset={() => setList(facet.code, [])}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {/* §1: категория сужает выдачу сильнее любого фасета — поэтому первая. */}
      {category ? <CategoryTreeFilter slug={category.slug} onNavigate={onNavigate} /> : null}

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
            }}
          />
        </fieldset>
      ) : null}

      {/* Марка → Модель → Поколение → Модификация, мультивыбор на каждом шаге. */}
      <VehicleFilter
        mode={profile.vehicleMode}
        lockedKind={profile.lockedKind}
        categorySlug={category?.slug ?? null}
      />

      {/* Профильные оси раздела: «Тип кузова» и «Сторона» у кузовных деталей,
          «Сторона» и «Передняя/задняя» у фар. */}
      {featured.map(attributeGroup)}

      <FacetGroup
        title={t('catalog.brands')}
        placeholder={t('catalog.brandsAny')}
        options={data?.facets.product_brands ?? []}
        selected={params.productBrands}
        onToggle={(value) => toggleInList('product_brand', value)}
        onReset={() => setList('product_brand', [])}
      />

      <FacetGroup
        title={t('catalog.country')}
        placeholder={t('catalog.countryAny')}
        options={data?.facets.manufacturers ?? []}
        selected={params.manufacturers}
        onToggle={(value) => toggleInList('manufacturer', value)}
        onReset={() => setList('manufacturer', [])}
      />

      {/* §5: остальные динамические атрибутные фильтры категории. */}
      {rest.map(attributeGroup)}

      <fieldset className="flex flex-col gap-1">
        {/* Было «Фильтры» — группа «Фильтры» внутри панели фильтров ни о чём. */}
        <legend className="mb-2 text-base font-semibold">{t('catalog.availability')}</legend>
        <Checkbox
          checked={params.inStock}
          onChange={(event) => setParam('in_stock', event.target.checked ? 'true' : null)}
          label={t('catalog.inStock')}
        />
        <Checkbox
          checked={params.onOrder}
          onChange={(event) => setParam('on_order', event.target.checked ? 'true' : null)}
          label={t('catalog.onOrder')}
        />
        <Checkbox
          checked={params.isOriginal}
          onChange={(event) => setParam('is_original', event.target.checked ? 'true' : null)}
          label={t('catalog.isOriginal')}
        />
      </fieldset>

      {activeCount > 0 ? (
        <Button variant="ghost" onClick={reset}>
          {t('catalog.filtersReset')}
        </Button>
      ) : null}
    </div>
  )
}
