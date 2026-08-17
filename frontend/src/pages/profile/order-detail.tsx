import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { Order } from '@/shared/api/types'
import { get } from '@/shared/api/client'
import { fetchSimilarProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { formatDate, formatPlural } from '@/shared/lib/format'
import { Badge, Button, ErrorState, Img, Price, Skeleton, toast } from '@/shared/ui'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { IconChevronLeft } from '@/shared/ui/Icon'
import { AddToCart } from '@/features/cart/AddToCart'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { useCartStore } from '@/features/cart/store'

export function Component() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const addToCart = useCartStore((state) => state.add)

  const order = useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => get<Order>(`orders/${id}/`),
  })

  const anchorSlug = order.data?.items[0]?.product.slug ?? ''
  const recommended = useQuery({
    queryKey: queryKeys.products.similar(anchorSlug),
    queryFn: () => fetchSimilarProducts(anchorSlug),
    enabled: Boolean(anchorSlug),
  })

  if (order.isPending) return <Skeleton className="h-64 rounded-card" />
  if (order.isError) return <ErrorState onRetry={() => void order.refetch()} />

  const data = order.data
  const count = data.items.reduce((sum, item) => sum + item.quantity, 0)

  /** Повтор заказа: складываем все позиции обратно в корзину. */
  const repeat = () => {
    for (const item of data.items) addToCart(item.product, null, item.quantity)
    toast.ok(t('profile.repeatDone'))
    navigate('/cart')
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile/orders')}
            aria-label={t('nav.back')}
            className="flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
          >
            <IconChevronLeft />
          </button>
          <h2 className="font-mono text-md">
            {t('profile.orderNumber')} {data.number}
          </h2>
          <Badge tone={data.status === 'done' ? 'ok' : 'neutral'}>{data.status_display}</Badge>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-sm text-ink-muted">{t('profile.orderDate')}</dt>
            <dd className="text-base">{formatDate(data.created_at)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-ink-muted">{t('checkout.address')}</dt>
            <dd className="text-base">{data.delivery_address || t('checkout.deliveryPickup')}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-ink-muted">{t('cart.subtotal')}</dt>
            <dd className="text-base">{formatPlural(count, { one: 'товар', few: 'товара', many: 'товаров' })}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-ink-muted">{t('cart.total')}</dt>
            <dd>
              <Price value={data.total} size="sm" />
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={repeat}>
            {t('profile.repeat')}
          </Button>
          <Button variant="secondary" onClick={() => toast.ok(t('product.chatSoon'))}>
            {t('profile.orderQuestions')}
          </Button>
        </div>

        <ul className="flex flex-col gap-4 border-t border-line pt-4">
          {data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3">
              <Link to={`/product/${item.product.slug}`} className="shrink-0">
                <Img
                  src={item.product.image?.thumb}
                  alt={item.product.image?.alt ?? item.product.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-control"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/product/${item.product.slug}`} className="line-clamp-2 text-base hover:underline">
                  {item.product.name}
                </Link>
                <span className="font-mono text-xs text-ink-muted">{item.product.sku}</span>
                <span className="text-sm text-ink-muted tabular-nums">
                  {item.quantity} × <Price value={item.price} size="sm" />
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="w-40">
                  <AddToCart product={item.product} />
                </div>
                <FavoriteButton product={item.product} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {recommended.data && recommended.data.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading lead={t('cart.recommended')} />
          <ProductGrid dense>
            {recommended.data.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        </section>
      ) : null}
    </div>
  )
}
