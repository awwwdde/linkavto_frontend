import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSimilarProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import { ButtonLink, Container, EmptyState, PageMeta, Select } from '@/shared/ui'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { useFavoritesStore } from '@/features/favorites/store'

type Sort = 'new' | 'old' | 'cheap' | 'expensive'

const SORT_OPTIONS: { value: Sort; labelKey: Parameters<typeof t>[0] }[] = [
  { value: 'new', labelKey: 'favorites.sortNew' },
  { value: 'old', labelKey: 'favorites.sortOld' },
  { value: 'cheap', labelKey: 'favorites.sortCheap' },
  { value: 'expensive', labelKey: 'favorites.sortExpensive' },
]

export function Component() {
  const items = useFavoritesStore((state) => state.items)
  const [sort, setSort] = useState<Sort>('new')

  // Стор кладёт новое в начало списка, поэтому порядок массива — это и есть
  // «сначала новые»; отдельного поля с датой добавления не требуется.
  const sorted = useMemo(() => {
    const list = [...items]
    switch (sort) {
      case 'old':
        return list.reverse()
      case 'cheap':
        return list.sort((a, b) => a.price - b.price)
      case 'expensive':
        return list.sort((a, b) => b.price - a.price)
      default:
        return list
    }
  }, [items, sort])

  // Похожие считаем по первому товару в избранном — он же самый свежий.
  const anchor = items[0]
  const similar = useQuery({
    queryKey: queryKeys.products.similar(anchor?.slug ?? ''),
    queryFn: () => fetchSimilarProducts(anchor!.slug),
    enabled: Boolean(anchor),
  })

  return (
    <>
      <PageMeta title="Избранное — LINKAVTO" canonicalPath="/favorites" noIndex />

      <Container className="flex flex-col gap-6 py-4 lg:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* §3.2 двухтоновый заголовок: раздел + счётчик вторым тоном. */}
          <SectionHeading
            as="h1"
            size="xl"
            lead={`${t('favorites.title')}.`}
            ghost={
              items.length > 0
                ? formatPlural(items.length, { one: 'товар', few: 'товара', many: 'товаров' })
                : undefined
            }
          />

          {items.length > 1 ? (
            <Select
              aria-label={t('catalog.sort')}
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              wrapperClassName="w-56"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={t('favorites.emptyTitle')}
            text={t('favorites.emptyText')}
            action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
          />
        ) : (
          <ProductGrid dense>
            {sorted.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}

        {similar.data && similar.data.length > 0 ? (
          <section className="flex flex-col gap-4 pt-2">
            <SectionHeading lead={t('product.similar')} />
            <ProductGrid dense>
              {similar.data.slice(0, 12).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </section>
        ) : null}
      </Container>
    </>
  )
}
