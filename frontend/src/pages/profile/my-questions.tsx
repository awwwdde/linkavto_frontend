import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ProductListItem } from '@/shared/api/types'
import { get } from '@/shared/api/client'
import { t } from '@/shared/i18n'
import { formatDate } from '@/shared/lib/format'
import { ButtonLink, EmptyState, ErrorState, Img, Skeleton } from '@/shared/ui'

interface MyQuestion {
  id: number
  product: ProductListItem
  text: string
  answer: string | null
  created_at: string
}

export function Component() {
  const questions = useQuery({
    queryKey: ['account', 'questions'],
    queryFn: () => get<MyQuestion[]>('account/questions/'),
  })

  if (questions.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-card" />
        ))}
      </div>
    )
  }

  if (questions.isError) return <ErrorState onRetry={() => void questions.refetch()} />

  if (questions.data.length === 0) {
    return (
      <EmptyState
        title={t('profile.questionsEmpty')}
        text={t('profile.questionsEmptyText')}
        action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {questions.data.map((question) => (
        <li key={question.id} className="flex gap-3 rounded-card bg-surface p-4 shadow-float">
          <Link to={`/product/${question.product.slug}`} className="shrink-0">
            <Img
              src={question.product.image?.thumb}
              alt={question.product.image?.alt ?? question.product.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-control"
            />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link to={`/product/${question.product.slug}`} className="line-clamp-1 text-base hover:underline">
              {question.product.name}
            </Link>
            <p className="text-base text-ink">{question.text}</p>
            {question.answer ? (
              <p className="border-l border-line pl-3 text-base text-ink-muted">{question.answer}</p>
            ) : (
              <p className="text-sm text-ink-muted">{t('product.awaitingAnswer')}</p>
            )}
            <span className="text-sm text-ink-muted">{formatDate(question.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
