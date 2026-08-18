import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { VehicleKind } from '@/shared/api/types'
import { fetchProducts } from '@/entities/product/api'
import { ProductCard, ProductCardSkeleton, ProductGrid } from '@/entities/product/ProductCard'
import {
  fetchVehicleBrands,
  fetchVehicleGenerations,
  fetchVehicleModels,
  fetchVehicleModifications,
} from '@/features/vehicle-filter/api'
import { CascadeStep, type CascadeOption } from '@/features/vehicle-filter/CascadeStep'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import { Button, Container, EmptyState, PageMeta, Select } from '@/shared/ui'
import { SectionHeading } from '@/app/layouts/SectionHeading'

const SERVICE_CATEGORY = 'dlya-to'

const KINDS: { value: VehicleKind; labelKey: Parameters<typeof t>[0] }[] = [
  { value: 'car', labelKey: 'vehicleType.car' },
  { value: 'truck', labelKey: 'vehicleType.truck' },
  { value: 'moto', labelKey: 'vehicleType.moto' },
  { value: 'special', labelKey: 'vehicleType.special' },
]

const SORT_OPTIONS: { value: string; labelKey: Parameters<typeof t>[0] }[] = [
  { value: 'popular', labelKey: 'catalog.sortPopular' },
  { value: 'price_asc', labelKey: 'catalog.sortCheap' },
  { value: 'price_desc', labelKey: 'catalog.sortExpensive' },
  { value: 'newest', labelKey: 'catalog.sortNew' },
]

/**
 * Подбор расходников под конкретный автомобиль. Каскад живёт на одной странице:
 * следующий шаг раскрывается только после выбора предыдущего, а выбранное
 * лежит в URL — ссылку на подбор можно отправить или сохранить.
 */
export function Component() {
  const [params, setParams] = useSearchParams()
  const [sort, setSort] = useState('popular')

  const kind = (params.get('vehicle_type') as VehicleKind | null) ?? null
  const brand = params.get('brand')
  const model = params.get('model')
  const generation = params.get('generation')
  const modification = params.get('modification')

  /** Выбор шага сбрасывает всё, что ниже: иначе остаётся несовместимая связка. */
  const choose = (step: 'vehicle_type' | 'brand' | 'model' | 'generation' | 'modification', value: string) => {
    const next = new URLSearchParams(params)
    const order = ['vehicle_type', 'brand', 'model', 'generation', 'modification'] as const
    next.set(step, value)
    for (const key of order.slice(order.indexOf(step) + 1)) next.delete(key)
    setParams(next, { replace: false })
  }

  const brands = useQuery({
    queryKey: ['catalog', 'brands', kind],
    queryFn: () => fetchVehicleBrands(kind, null),
    enabled: Boolean(kind),
  })
  const models = useQuery({
    queryKey: ['catalog', 'models', kind, brand],
    queryFn: () => fetchVehicleModels(kind, brand),
    enabled: Boolean(brand),
  })
  const generations = useQuery({
    queryKey: ['catalog', 'generations', kind, model],
    queryFn: () => fetchVehicleGenerations(kind, model),
    enabled: Boolean(model),
  })
  const modifications = useQuery({
    queryKey: ['catalog', 'modifications', kind, generation],
    queryFn: () => fetchVehicleModifications(kind, generation),
    enabled: Boolean(generation),
  })

  const ready = Boolean(modification)
  const listParams = useMemo(
    () => ({
      category: SERVICE_CATEGORY,
      page_size: 24,
      ordering: sort,
      ...(kind ? { vehicle_type: kind } : {}),
      ...(brand ? { brand } : {}),
      ...(model ? { model } : {}),
      ...(generation ? { generation } : {}),
      ...(modification ? { modification } : {}),
    }),
    [kind, brand, model, generation, modification, sort],
  )

  const products = useQuery({
    queryKey: queryKeys.products.list(listParams),
    queryFn: () => fetchProducts(listParams),
    enabled: ready,
    placeholderData: keepPreviousData,
  })

  const chosenTitle = [
    brands.data?.find((item) => item.slug === brand)?.name,
    models.data?.find((item) => item.slug === model)?.name,
    generations.data?.find((item) => item.slug === generation)?.name,
    modifications.data?.find((item) => item.slug === modification)?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  const toOptions = <T extends { slug: string; name: string }>(
    list: T[] | undefined,
    note: (item: T) => string | null,
  ): CascadeOption[] => (list ?? []).map((item) => ({ slug: item.slug, name: item.name, note: note(item) }))

  return (
    <>
      <PageMeta
        title="Запчасти для ТО — LINKAVTO"
        description="Подбор расходников для планового обслуживания по марке, модели и модификации."
        canonicalPath="/dlya-to"
      />

      <Container className="flex flex-col gap-6 py-6 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SectionHeading as="h1" size="xl" lead={t('service.title')} />
            <p className="text-base text-ink-muted">{chosenTitle || t('service.lead')}</p>
          </div>
          {kind ? (
            <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
              {t('service.reset')}
            </Button>
          ) : null}
        </div>

        <CascadeStep
          title={t('service.stepType')}
          options={KINDS.map((item) => ({ slug: item.value, name: t(item.labelKey) }))}
          value={kind}
          onSelect={(value) => choose('vehicle_type', value)}
        />

        {kind ? (
          <CascadeStep
            title={t('service.stepBrand')}
            options={toOptions(brands.data, (item) => formatPlural(item.models_count, { one: 'модель', few: 'модели', many: 'моделей' }))}
            value={brand}
            onSelect={(value) => choose('brand', value)}
            pending={brands.isPending}
            columns={6}
          />
        ) : null}

        {brand ? (
          <CascadeStep
            title={t('service.stepModel')}
            options={toOptions(models.data, () => null)}
            value={model}
            onSelect={(value) => choose('model', value)}
            pending={models.isPending}
            columns={4}
          />
        ) : null}

        {model ? (
          <CascadeStep
            title={t('service.stepGeneration')}
            options={toOptions(generations.data, (item) =>
              item.year_start ? `${item.year_start}—${item.year_end ?? 'н. в.'}` : null,
            )}
            value={generation}
            onSelect={(value) => choose('generation', value)}
            pending={generations.isPending}
            columns={4}
          />
        ) : null}

        {generation ? (
          <CascadeStep
            title={t('service.stepModification')}
            options={toOptions(modifications.data, (item) =>
              [item.engine, item.power ? `${item.power} л.с.` : null].filter(Boolean).join(' · ') || null,
            )}
            value={modification}
            onSelect={(value) => choose('modification', value)}
            pending={modifications.isPending}
            columns={3}
          />
        ) : null}

        {ready ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold lg:text-xl">
                {t('service.title')}
                {products.data ? (
                  <span className="ml-2 text-base font-normal text-ink-muted tabular-nums">
                    {formatPlural(products.data.count, { one: 'товар', few: 'товара', many: 'товаров' })}
                  </span>
                ) : null}
              </h2>

              <Select
                aria-label={t('catalog.sort')}
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                wrapperClassName="w-56"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
            </div>

            {products.isPending ? (
              <ProductGrid>
                {Array.from({ length: 8 }, (_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </ProductGrid>
            ) : products.data && products.data.results.length > 0 ? (
              <ProductGrid>
                {products.data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ProductGrid>
            ) : (
              <EmptyState title={t('catalog.emptyTitle')} text={t('catalog.emptyText')} />
            )}
          </section>
        ) : null}
      </Container>
    </>
  )
}
