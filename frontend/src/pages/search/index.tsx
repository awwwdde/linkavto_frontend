import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import {
  Badge,
  BottomSheet,
  Button,
  ButtonLink,
  ChipLink,
  Container,
  EmptyState,
  ErrorState,
  PageMeta,
  Pagination,
  Select,
} from '@/shared/ui'
import { IconFilter } from '@/shared/ui/Icon'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { CatalogFilters } from '@/features/catalog-filters/CatalogFilters'
import { SelectedFilters } from '@/features/catalog-filters/SelectedFilters'
import { SORT_OPTIONS, useCatalogParams } from '@/features/catalog-filters/useCatalogParams'
import { fetchSearch } from '@/features/search/api'
import { detectSearchMode } from '@/features/search/detect'
import { GarageContextBar } from '@/features/garage/GarageContextBar'
import { PAGE_SIZE } from '@/shared/config'

const MODE_LABEL = {
  vin: t('search.modeVin'),
  sku: t('search.modeSku'),
  text: t('search.modeText'),
} as const

export function Component() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  // Поиск фильтруется тем же набором, что и каталог: параметры, счётчик
  // активных фильтров и сброс берём из общего хука.
  const { params: filters, setParam, setPage, reset, activeCount, queryParams } = useCatalogParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Как и в каталоге: подбор под авто управляется URL-параметром (тумблером
  // в GarageContextBar), а не жёстко активным авто из гаража.
  const garageVehicleId = searchParams.get('garage_vehicle_id')
  const mode = detectSearchMode(query)

  const params = {
    q: query,
    type: 'auto' as const,
    ...queryParams,
    ...(garageVehicleId ? { garage_vehicle_id: Number(garageVehicleId) } : {}),
  }

  const results = useQuery({
    queryKey: queryKeys.search.results(params),
    queryFn: () => fetchSearch(params),
    enabled: query.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

  const pageCount = results.data ? Math.ceil(results.data.count / PAGE_SIZE) : 0
  /** `attr_side` → «Сторона»: теги выбранных фильтров без имени оси нечитаемы. */
  const attributeLabels = Object.fromEntries(
    (results.data?.facets.attributes ?? []).map((facet) => [facet.code, facet.label]),
  )
  const found = results.data
    ? formatPlural(results.data.count, { one: 'товар', few: 'товара', many: 'товаров' })
    : ''

  return (
    <>
      <PageMeta
        title={`${query} — поиск запчастей в LINKAVTO`}
        description={`Результаты поиска «${query}» в каталоге автозапчастей LINKAVTO.`}
        canonicalPath={`/search?q=${encodeURIComponent(query)}`}
        noIndex
      />

      <Container className="flex flex-col gap-6 py-4 lg:py-8">
        {/* §3.2 двухтоновый заголовок: запрос + счётчик результатов вторым тоном. */}
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeading
            as="h1"
            size="xl"
            lead={`«${query}».`}
            ghost={results.data ? found : undefined}
          />
          <Badge>{MODE_LABEL[mode]}</Badge>
        </div>

        {/* Гараж-контекст: тот же тумблер «только подходящие», что и в каталоге. */}
        <GarageContextBar className="sticky top-14 z-20 lg:top-20" />

        {results.data && results.data.vehicle ? (
          <p className="rounded-card bg-surface p-4 text-base shadow-float">
            По VIN определён автомобиль:{' '}
            <Link to="/garage" className="font-medium underline">
              {results.data.vehicle.title}
            </Link>
          </p>
        ) : null}

        {results.data && results.data.categories.length > 0 ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {results.data.categories.map((category) => (
              <ChipLink key={category.id} to={`/category/${category.path}`}>
                {category.name}
              </ChipLink>
            ))}
          </div>
        ) : null}

        {query.trim().length < 2 ? (
          <EmptyState
            title={t('search.emptyTitle')}
            text={t('search.emptyText')}
            action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
          />
        ) : (
          <>
            <SelectedFilters attributeLabels={attributeLabels} className="-mx-4 px-4 lg:mx-0 lg:px-0" />

            <div className="flex items-center justify-between gap-3">
              <Button className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <IconFilter width={18} height={18} />
                {t('catalog.filters')}
                {activeCount > 0 ? <span className="tabular-nums">· {activeCount}</span> : null}
              </Button>

              <Select
                aria-label={t('catalog.sort')}
                value={filters.sort}
                onChange={(event) => setParam('sort', event.target.value)}
                wrapperClassName="ml-auto w-56"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-8">
              {/* Фасеты те же, что в каталоге: раздел здесь не задан, поэтому
                  блок «Категория» не показывается, а подбор по авто идёт полным
                  каскадом с выбором типа техники. */}
              <aside className="hidden w-72 shrink-0 lg:block">
                <div
                  data-lenis-prevent
                  className="scrollbar-thin sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-card bg-surface p-4 shadow-float"
                >
                  <CatalogFilters data={results.data} />
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                {/* Смена фильтров ничего не «говорит» вслух: выдача
                    перерисовывается молча. Живая область проговаривает результат. */}
                <p role="status" aria-live="polite" className="sr-only">
                  {results.data ? `${t('catalog.found')} ${found}` : ''}
                </p>

                {results.isError ? (
                  <ErrorState onRetry={() => void results.refetch()} />
                ) : results.isPending ? (
                  <ProductGrid>
                    {Array.from({ length: 8 }, (_, index) => (
                      <ProductCardSkeleton key={index} />
                    ))}
                  </ProductGrid>
                ) : results.data.results.length === 0 ? (
                  // Запрос без результатов и запрос, перефильтрованный в ноль, —
                  // разные беды: во второй помогает снять условия, а не менять слова.
                  <EmptyState
                    title={activeCount > 0 ? t('catalog.emptyFilteredTitle') : t('search.emptyTitle')}
                    text={
                      activeCount > 0
                        ? `${t('catalog.emptyFilteredText')} ${formatPlural(activeCount, {
                            one: 'фильтр',
                            few: 'фильтра',
                            many: 'фильтров',
                          })}.`
                        : t('search.emptyText')
                    }
                    action={
                      activeCount > 0 ? (
                        <Button onClick={reset}>{t('catalog.filtersResetAll')}</Button>
                      ) : (
                        <ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>
                      )
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-8">
                    <ProductGrid className={results.isFetching ? 'opacity-70 transition-opacity' : undefined}>
                      {results.data.results.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </ProductGrid>
                    <Pagination page={filters.page} pageCount={pageCount} onChange={setPage} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Container>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('catalog.filters')}
        footer={
          <Button
            variant="primary"
            size="lg"
            block
            disabled={results.data?.count === 0}
            onClick={() => setFiltersOpen(false)}
          >
            {results.data
              ? results.data.count > 0
                ? `${t('catalog.filtersApply')} ${found}`
                : t('catalog.emptyFilteredTitle')
              : t('catalog.filtersApply')}
          </Button>
        }
      >
        <CatalogFilters data={results.data} />
      </BottomSheet>
    </>
  )
}
