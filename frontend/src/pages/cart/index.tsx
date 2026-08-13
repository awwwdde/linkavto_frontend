import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { SellerBrief } from '@/shared/api/types'
import { fetchProducts, fetchSimilarProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import { ButtonLink, Checkbox, Container, EmptyState, Img, PageMeta, Price, Stepper, toast } from '@/shared/ui'
import { IconShare, IconTrash } from '@/shared/ui/Icon'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { useCartStore, type GuestCartItem } from '@/features/cart/store'

const DEFAULT_SELLER: SellerBrief = {
  id: 0,
  name: 'LINKAVTO',
  slug: 'linkavto',
  rating: null,
  reviews_count: 0,
}

/** Доставка считается по-продавцово (§7). */
const DELIVERY_PER_SELLER = 39000

interface Group {
  seller: SellerBrief
  items: GuestCartItem[]
}

export function Component() {
  const items = useCartStore((state) => state.items)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const remove = useCartStore((state) => state.remove)
  const clear = useCartStore((state) => state.clear)

  // Снятые галочки, а не выбранные: новый товар в корзине сразу участвует
  // в заказе, и ключи ушедших позиций не копятся в состоянии.
  const [unchecked, setUnchecked] = useState<string[]>([])
  const isChecked = (key: string) => !unchecked.includes(key)
  const toggle = (key: string) =>
    setUnchecked((state) => (state.includes(key) ? state.filter((item) => item !== key) : [...state, key]))

  const allChecked = unchecked.length === 0
  const toggleAll = () => setUnchecked(allChecked ? items.map((item) => item.key) : [])

  const groups = useMemo<Group[]>(() => {
    const map = new Map<number, Group>()
    for (const item of items) {
      const seller = item.offer?.seller ?? DEFAULT_SELLER
      const group = map.get(seller.id) ?? { seller, items: [] }
      group.items.push(item)
      map.set(seller.id, group)
    }
    return [...map.values()]
  }, [items])

  const selected = items.filter((item) => isChecked(item.key))
  const subtotal = selected.reduce((sum, item) => sum + (item.offer?.price ?? item.product.price) * item.quantity, 0)
  const sellersWithSelection = new Set(selected.map((item) => (item.offer?.seller ?? DEFAULT_SELLER).id))
  const delivery = sellersWithSelection.size * DELIVERY_PER_SELLER
  const count = selected.reduce((sum, item) => sum + item.quantity, 0)

  // Ленты внизу — по последнему добавленному товару. «Похожие» это его аналоги,
  // «Рекомендуем» — его категория, иначе оба блока показали бы одно и то же.
  const anchor = items[items.length - 1]?.product
  const similar = useQuery({
    queryKey: queryKeys.products.similar(anchor?.slug ?? ''),
    queryFn: () => fetchSimilarProducts(anchor!.slug),
    enabled: Boolean(anchor),
  })
  const recommended = useQuery({
    queryKey: queryKeys.products.list({ cart: anchor?.id ?? 0 }),
    queryFn: () => fetchProducts({ page_size: 12, ordering: 'popular' }),
    enabled: Boolean(anchor),
  })

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.ok(t('product.copied'))
    } catch {
      toast.error('Скопировать не вышло. Скопируйте адрес из адресной строки.')
    }
  }

  const clearAll = () => {
    clear()
    setUnchecked([])
    toast.ok(t('cart.cleared'))
  }

  return (
    <>
      <PageMeta title="Корзина — LINKAVTO" canonicalPath="/cart" noIndex />

      <Container className="flex flex-col gap-6 py-4 lg:py-8">
        <h1 className="text-xl font-semibold lg:text-2xl">{t('cart.title')}</h1>

        {items.length === 0 ? (
          <EmptyState
            title={t('cart.emptyTitle')}
            text={t('cart.emptyText')}
            action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {/* Панель действий над списком */}
              <div className="flex flex-wrap items-center gap-4 rounded-card bg-surface px-4 py-3 shadow-float">
                <Checkbox checked={allChecked} onChange={toggleAll} label={t('cart.selectAll')} />
                <span className="text-sm text-ink-muted">
                  {t('cart.selected')}: <span className="tabular-nums">{selected.length}</span>
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void share()}
                    className="flex h-10 items-center gap-2 rounded-control px-3 text-base text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
                  >
                    <IconShare width={16} height={16} />
                    {t('cart.share')}
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex h-10 items-center gap-2 rounded-control px-3 text-base text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
                  >
                    <IconTrash width={16} height={16} />
                    {t('cart.clear')}
                  </button>
                </div>
              </div>

              {groups.map((group) => (
                <section key={group.seller.id} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-md font-semibold">
                      {group.seller.id === 0 ? (
                        group.seller.name
                      ) : (
                        <Link to={`/seller/${group.seller.id}`} className="hover:underline">
                          {group.seller.name}
                        </Link>
                      )}
                    </h2>
                    <span className="text-sm text-ink-muted">
                      {t('cart.sellerDelivery')} <Price value={DELIVERY_PER_SELLER} size="sm" />
                    </span>
                  </div>

                  <ul className="flex flex-col gap-4">
                    {group.items.map((item) => (
                      <li key={item.key} className="flex gap-3">
                        <Checkbox
                          checked={isChecked(item.key)}
                          onChange={() => toggle(item.key)}
                          aria-label={`${t('cart.selectItem')}: ${item.product.name}`}
                          className="mt-1"
                        />

                        <Link to={`/product/${item.product.slug}`} className="shrink-0">
                          <Img
                            src={item.product.image?.thumb}
                            alt={item.product.image?.alt ?? item.product.name}
                            width={88}
                            height={88}
                            className="h-22 w-22 rounded-control"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <Link to={`/product/${item.product.slug}`} className="line-clamp-2 text-base hover:underline">
                            {item.product.name}
                          </Link>
                          <span className="font-mono text-xs text-ink-muted">{item.product.sku}</span>

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                            <Stepper
                              value={item.quantity}
                              onChange={(next) => setQuantity(item.key, next)}
                              onRemove={() => remove(item.key)}
                            />
                            <Price value={(item.offer?.price ?? item.product.price) * item.quantity} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:w-80">
              <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float">
                <h2 className="text-md font-semibold">{t('cart.total')}</h2>

                <div className="flex justify-between text-base">
                  <span className="text-ink-muted">
                    {t('cart.subtotal')}, {formatPlural(count, { one: 'штука', few: 'штуки', many: 'штук' })}
                  </span>
                  <Price value={subtotal} size="sm" />
                </div>

                <div className="flex justify-between text-base">
                  <span className="text-ink-muted">{t('cart.delivery')}</span>
                  <Price value={delivery} size="sm" />
                </div>

                <div className="flex items-baseline justify-between border-t border-line pt-3">
                  <span className="text-md font-semibold">{t('cart.total')}</span>
                  <Price value={subtotal + delivery} size="lg" />
                </div>

                {selected.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('cart.nothingSelected')}</p>
                ) : null}

                <ButtonLink
                  to="/checkout"
                  variant="primary"
                  size="lg"
                  block
                  className={selected.length === 0 ? 'pointer-events-none opacity-50' : undefined}
                  aria-disabled={selected.length === 0}
                >
                  {t('cart.checkout')}
                </ButtonLink>
              </div>
            </aside>
          </div>
        )}

        {recommended.data && recommended.data.results.length > 0 ? (
          <section className="flex flex-col gap-4 pt-2">
            <SectionHeading lead={t('cart.recommended')} />
            <ProductGrid dense>
              {recommended.data.results.slice(0, 12).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </section>
        ) : null}

        {similar.data && similar.data.length > 0 ? (
          <section className="flex flex-col gap-4">
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
