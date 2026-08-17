import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { SellerBrief } from '@/shared/api/types'
import { fetchProducts, fetchSimilarProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import {
  ButtonLink,
  Checkbox,
  Container,
  EmptyState,
  Img,
  PageMeta,
  Price,
  Stepper,
  toast,
} from '@/shared/ui'
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

  // Выбранные позиции. По умолчанию отмечено всё; новая позиция тоже приходит
  // отмеченной, иначе добавленный товар молча не попадал бы в заказ.
  const [selected, setSelected] = useState<string[]>(() => items.map((item) => item.key))
  useEffect(() => {
    setSelected((current) => {
      const keys = new Set(items.map((item) => item.key))
      const kept = current.filter((key) => keys.has(key))
      const added = items.filter((item) => !current.includes(item.key)).map((item) => item.key)
      return [...kept, ...added]
    })
  }, [items])

  const isSelected = (key: string) => selected.includes(key)
  const toggle = (key: string) =>
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  const allSelected = items.length > 0 && selected.length === items.length

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

  const chosen = items.filter((item) => isSelected(item.key))
  const subtotal = chosen.reduce((sum, item) => sum + (item.offer?.price ?? item.product.price) * item.quantity, 0)
  const sellersWithChosen = new Set(chosen.map((item) => item.offer?.seller.id ?? DEFAULT_SELLER.id))
  const delivery = sellersWithChosen.size * DELIVERY_PER_SELLER
  const count = chosen.reduce((sum, item) => sum + item.quantity, 0)

  // Обе ленты считаем от последнего добавленного товара — он и есть текущий
  // интерес покупателя. «Похожие» — его аналоги, «Рекомендуем» — популярное.
  const lastAdded = items[items.length - 1]
  const similar = useQuery({
    queryKey: queryKeys.products.similar(lastAdded?.product.slug ?? ''),
    queryFn: () => fetchSimilarProducts(lastAdded!.product.slug),
    enabled: Boolean(lastAdded),
  })
  const recommendedParams = { ordering: 'popular', page_size: 12 }
  const recommended = useQuery({
    queryKey: queryKeys.products.list(recommendedParams),
    queryFn: () => fetchProducts(recommendedParams),
    enabled: items.length > 0,
  })

  const shareCart = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.ok(t('product.copied'))
    } catch {
      toast.error('Скопировать не вышло. Скопируйте адрес из адресной строки.')
    }
  }

  const clearCart = () => {
    clear()
    toast.ok(t('cart.cleared'))
  }

  return (
    <>
      <PageMeta title="Корзина — LINKAVTO" canonicalPath="/cart" noIndex />

      <Container className="flex flex-col gap-10 py-4 lg:py-8">
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
              {/* Панель действий над списком. */}
              <div className="flex flex-wrap items-center gap-4 rounded-card bg-surface px-4 py-3 shadow-float">
                <Checkbox
                  checked={allSelected}
                  onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.key) : [])}
                  label={t('cart.selectAll')}
                />
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <button type="button" onClick={() => void shareCart()} className="text-ink-muted hover:text-ink">
                    {t('cart.share')}
                  </button>
                  <button type="button" onClick={clearCart} className="text-ink-muted hover:text-danger">
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
                          checked={isSelected(item.key)}
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

                {chosen.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('cart.nothingSelected')}</p>
                ) : (
                  <ButtonLink to="/checkout" variant="primary" size="lg" block>
                    {t('cart.checkout')}
                  </ButtonLink>
                )}
              </div>
            </aside>
          </div>
        )}

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

        {recommended.data && recommended.data.results.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading lead={t('cart.recommended')} />
            <ProductGrid dense>
              {recommended.data.results.slice(0, 12).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </section>
        ) : null}
      </Container>
    </>
  )
}
