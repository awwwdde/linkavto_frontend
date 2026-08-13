import type { FeedbackReply } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { t } from '@/shared/i18n'
import { Badge } from '@/shared/ui'

/** Ветка ответов под отзывом или вопросом — с отбивкой слева, как в переписке. */
export function FeedbackReplies({ replies }: { replies: FeedbackReply[] }) {
  if (replies.length === 0) return null

  return (
    <ul className="mt-1 flex flex-col gap-3 border-l border-line pl-4">
      {replies.map((reply) => (
        <li key={reply.id} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-medium">{reply.author}</span>
            {reply.is_seller ? <Badge tone="neutral">{t('product.sellerReply')}</Badge> : null}
            <span className="text-sm text-ink-muted">{formatDate(reply.created_at)}</span>
          </div>
          <p className="text-base text-ink-muted">{reply.text}</p>
        </li>
      ))}
    </ul>
  )
}
