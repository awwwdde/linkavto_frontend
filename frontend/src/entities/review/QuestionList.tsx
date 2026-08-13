import type { Question } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { t } from '@/shared/i18n'
import { FeedbackReplies } from './FeedbackReplies'

export function QuestionList({ questions }: { questions: Question[] }) {
  if (questions.length === 0) {
    return <p className="rounded-card bg-surface p-4 text-base text-ink-muted shadow-float">{t('product.noQuestions')}</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {questions.map((question) => (
        <li key={question.id} className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-float">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-medium">{question.author}</span>
            <span className="text-sm text-ink-muted">{formatDate(question.created_at)}</span>
          </div>
          <p className="text-base text-ink">{question.text}</p>
          {question.answers.length > 0 ? (
            <FeedbackReplies replies={question.answers} />
          ) : (
            <p className="text-sm text-ink-muted">{t('product.awaitingAnswer')}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
