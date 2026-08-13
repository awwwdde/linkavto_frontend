import { Link } from 'react-router'
import type { SellerBrief } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { Rating, toast } from '@/shared/ui'
import { IconStore } from '@/shared/ui/Icon'

/**
 * Продавец под ценой: у кого именно покупаем и как с ним связаться.
 *
 * TODO(api): чат с продавцом отдельной ручкой пока нет — кнопка сообщает об
 * этом, чтобы не вести в пустую страницу.
 */
export function SellerCard({ seller }: { seller: SellerBrief }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-paper text-icon">
          <IconStore width={18} height={18} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-ink-muted">{t('product.soldBy')}</span>
          <span className="truncate text-md font-medium">{seller.name}</span>
        </div>
      </div>

      {seller.reviews_count > 0 && seller.rating !== null ? (
        <Rating value={seller.rating} reviewsCount={seller.reviews_count} />
      ) : null}

      <div className="flex gap-2">
        <Link
          // Маршрут витрины принимает числовой id, не slug — см. router.tsx.
          to={`/seller/${seller.id}`}
          className="flex h-10 flex-1 items-center justify-center rounded-control border border-line text-base font-medium text-ink transition-colors duration-[--duration-fast] hover:border-ink-muted"
        >
          {t('product.toShop')}
        </Link>
        <button
          type="button"
          onClick={() => toast.ok(t('product.chatSoon'))}
          className="flex h-10 flex-1 items-center justify-center rounded-control border border-line text-base font-medium text-ink transition-colors duration-[--duration-fast] hover:border-ink-muted"
        >
          {t('product.writeSeller')}
        </button>
      </div>
    </div>
  )
}
