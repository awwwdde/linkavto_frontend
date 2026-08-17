import { useQuery } from '@tanstack/react-query'
import type { Order, Paginated } from '@/shared/api/types'
import { get } from '@/shared/api/client'
import { fetchSimilarProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { ButtonLink, Skeleton } from '@/shared/ui'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { useAddressStore } from '@/features/address/store'
import { useFavoritesStore } from '@/features/favorites/store'
import { useGarageStore } from '@/features/garage/store'
import { useViewedStore } from '@/features/history/viewed-store'

function Stat({ value, label, to }: { value: number; label: string; to: string }) {
  return (
    <ButtonLink
      to={to}
      variant="ghost"
      className="h-auto flex-col items-start gap-1 rounded-card bg-surface p-4 shadow-float"
    >
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span className="text-base text-ink-muted">{label}</span>
    </ButtonLink>
  )
}

/**
 * Обзор кабинета. Списка разделов здесь нет намеренно — он всегда есть в
 * боковом меню слева, и плитка с теми же ссылками дублировала его.
 */
export function Component() {
  const viewed = useViewedStore((state) => state.items)
  const favorites = useFavoritesStore((state) => state.items)
  const addresses = useAddressStore((state) => state.addresses)
  const vehicles = useGarageStore((state) => state.vehicles)

  const orders = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => get<Paginated<Order>>('orders/'),
  })

  // Рекомендации строим от последнего просмотренного — без него советовать нечего.
  const anchor = viewed[0]
  const recommended = useQuery({
    queryKey: queryKeys.products.similar(anchor?.slug ?? ''),
    queryFn: () => fetchSimilarProducts(anchor!.slug),
    enabled: Boolean(anchor),
  })

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {orders.isPending ? (
          <Skeleton className="h-20 rounded-card" />
        ) : (
          <Stat value={orders.data?.results.length ?? 0} label={t('profile.orders')} to="/profile/orders" />
        )}
        <Stat value={favorites.length} label={t('nav.favorites')} to="/favorites" />
        <Stat value={vehicles.length} label={t('nav.garage')} to="/garage" />
        <Stat value={addresses.length} label={t('profile.addresses')} to="/profile/addresses" />
      </div>

      {viewed.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading lead={t('profile.viewed')} />
          <ProductGrid dense>
            {viewed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        </section>
      ) : null}

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
