import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ProductListItem } from '@/shared/api/types'
import { get } from '@/shared/api/client'
import { t } from '@/shared/i18n'
import { formatDate } from '@/shared/lib/format'
import { ButtonLink, EmptyState, ErrorState, Img, RatingStars, Skeleton } from '@/shared/ui'

interface MyReview {
  id: number
  product: ProductListItem
  rating: number
  text: string
  created_at: string
}

export function Component() {
  const reviews = useQuery({
    queryKey: ['account', 'reviews'],
    queryFn: () => get<MyReview[]>('account/reviews/'),
  })

  if (reviews.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-card" />
        ))}
      </div>
    )
  }

  if (reviews.isError) return <ErrorState onRetry={() => void reviews.refetch()} />

  if (reviews.data.length === 0) {
    return (
      <EmptyState
        title={t('profile.reviewsEmpty')}
        text={t('profile.reviewsEmptyText')}
        action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.data.map((review) => (
        <li key={review.id} className="flex gap-3 rounded-card bg-surface p-4 shadow-float">
          <Link to={`/product/${review.product.slug}`} className="shrink-0">
            <Img
              src={review.product.image?.thumb}
              alt={review.product.image?.alt ?? review.product.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-control"
            />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link to={`/product/${review.product.slug}`} className="line-clamp-1 text-base hover:underline">
              {review.product.name}
            </Link>
            <RatingStars value={review.rating} />
            <p className="text-base text-ink-muted">{review.text}</p>
            <span className="text-sm text-ink-muted">{formatDate(review.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
