import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { Order, Paginated } from '@/shared/api/types'
import { get } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { formatDate, formatPlural } from '@/shared/lib/format'
import { Badge, ButtonLink, EmptyState, ErrorState, Price, Skeleton } from '@/shared/ui'

type Tab = 'active' | 'done'

/** Завершённые — выполненные и отменённые; всё остальное ещё в работе. */
const isFinished = (order: Order) => order.status === 'done' || order.status === 'canceled'

export function Component() {
  const [tab, setTab] = useState<Tab>('active')

  const orders = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => get<Paginated<Order>>('orders/'),
  })

  const { active, done } = useMemo(() => {
    const list = orders.data?.results ?? []
    return { active: list.filter((order) => !isFinished(order)), done: list.filter(isFinished) }
  }, [orders.data])

  if (orders.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-card" />
        ))}
      </div>
    )
  }

  if (orders.isError) return <ErrorState onRetry={() => void orders.refetch()} />

  const shown = tab === 'active' ? active : done

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={cn(
        'flex h-10 items-center gap-2 rounded-pill px-4 text-base font-medium transition-colors duration-[--duration-fast]',
        tab === value ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex w-fit gap-1 rounded-pill bg-paper p-1">
        {tabButton('active', t('profile.ordersActive'), active.length)}
        {tabButton('done', t('profile.ordersDone'), done.length)}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? t('profile.ordersEmptyTitle') : t('profile.ordersDoneEmpty')}
          text={t('profile.ordersEmptyText')}
          action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((order) => {
            const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
            return (
              <li key={order.id}>
                <Link
                  to={`/profile/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 rounded-card bg-surface p-4 shadow-float transition-colors duration-[--duration-fast] hover:bg-paper"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-base">
                      {t('profile.orderNumber')} {order.number}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {formatDate(order.created_at)} ·{' '}
                      {formatPlural(count, { one: 'товар', few: 'товара', many: 'товаров' })}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Badge tone={order.status === 'done' ? 'ok' : 'neutral'}>{order.status_display}</Badge>
                    <Price value={order.total} size="sm" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
