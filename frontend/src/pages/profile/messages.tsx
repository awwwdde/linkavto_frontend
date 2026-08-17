import { useQuery } from '@tanstack/react-query'
import { get } from '@/shared/api/client'
import { t } from '@/shared/i18n'
import { formatDate } from '@/shared/lib/format'
import { Badge, EmptyState, ErrorState, Skeleton, toast } from '@/shared/ui'

interface Dialog {
  id: number
  seller: string
  last_message: string
  created_at: string
  unread: number
}

/** TODO(api): переписка живёт в CRM — здесь пока список диалогов без ветки сообщений. */
export function Component() {
  const dialogs = useQuery({
    queryKey: ['account', 'messages'],
    queryFn: () => get<Dialog[]>('account/messages/'),
  })

  if (dialogs.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-card" />
        ))}
      </div>
    )
  }

  if (dialogs.isError) return <ErrorState onRetry={() => void dialogs.refetch()} />

  if (dialogs.data.length === 0) {
    return <EmptyState title={t('profile.messagesEmpty')} text={t('profile.messagesEmptyText')} />
  }

  return (
    <ul className="flex flex-col gap-3">
      {dialogs.data.map((dialog) => (
        <li key={dialog.id}>
          <button
            type="button"
            onClick={() => toast.ok(t('product.chatSoon'))}
            className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-left shadow-float transition-colors duration-[--duration-fast] hover:bg-paper"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="text-base font-medium">{dialog.seller}</span>
                {dialog.unread > 0 ? <Badge tone="ok">{dialog.unread}</Badge> : null}
              </span>
              <span className="truncate text-sm text-ink-muted">{dialog.last_message}</span>
            </span>
            <span className="shrink-0 text-sm text-ink-muted">{formatDate(dialog.created_at)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
