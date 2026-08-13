import { useState } from 'react'
import type { Review } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { RatingStars } from '@/shared/ui'
import { IconThumbsDown, IconThumbsUp } from '@/shared/ui/Icon'
import { FeedbackReplies } from './FeedbackReplies'

type Vote = 'like' | 'dislike' | null

/**
 * Оценка полезности отзыва.
 *
 * TODO(api): ручки реакций пока нет — голос живёт в состоянии страницы и
 * сбрасывается при перезагрузке. Счётчик двигаем сразу, без ожидания ответа.
 */
function Helpful({ likes, dislikes }: { likes: number; dislikes: number }) {
  const [vote, setVote] = useState<Vote>(null)

  const toggle = (next: Exclude<Vote, null>) => setVote((current) => (current === next ? null : next))

  const button = (kind: Exclude<Vote, null>, base: number, Icon: typeof IconThumbsUp, label: string) => {
    const active = vote === kind
    return (
      <button
        type="button"
        onClick={() => toggle(kind)}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-pill border px-3 text-sm transition-colors duration-[--duration-fast]',
          active ? 'border-accent text-accent' : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink',
        )}
      >
        <Icon width={15} height={15} />
        <span className="tabular-nums">{base + (active ? 1 : 0)}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {button('like', likes, IconThumbsUp, t('product.helpful'))}
      {button('dislike', dislikes, IconThumbsDown, t('product.notHelpful'))}
    </div>
  )
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="rounded-card bg-surface p-4 text-base text-ink-muted shadow-float">{t('product.noReviews')}</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-float">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-medium">{review.author}</span>
            <span className="text-sm text-ink-muted">{formatDate(review.created_at)}</span>
          </div>
          <RatingStars value={review.rating} />
          <p className="text-base text-ink-muted">{review.text}</p>
          <Helpful likes={review.likes} dislikes={review.dislikes} />
          <FeedbackReplies replies={review.replies} />
        </li>
      ))}
    </ul>
  )
}
