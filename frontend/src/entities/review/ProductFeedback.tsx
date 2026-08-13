import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { fetchProductQuestions, fetchProductReviews } from '@/entities/product/api'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { formatPlural } from '@/shared/lib/format'
import { usePrefersReducedMotion } from '@/shared/lib/media'
import { Skeleton } from '@/shared/ui'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { QuestionForm } from './QuestionForm'
import { QuestionList } from './QuestionList'
import { ReviewForm } from './ReviewForm'
import { ReviewList } from './ReviewList'

type Tab = 'reviews' | 'questions'

/**
 * Отзывы и вопросы о товаре — одним блоком с переключателем. Оба списка
 * устроены одинаково (сообщение + ветка ответов), поэтому делить их на две
 * секции подряд было бы лишним шумом.
 */
export function ProductFeedback({ productSlug }: { productSlug: string }) {
  const [tab, setTab] = useState<Tab>('reviews')
  const reduced = usePrefersReducedMotion()
  const tabsId = useId()

  const reviews = useQuery({
    queryKey: queryKeys.products.reviews(productSlug),
    queryFn: () => fetchProductReviews(productSlug),
  })

  const questions = useQuery({
    queryKey: queryKeys.products.questions(productSlug),
    queryFn: () => fetchProductQuestions(productSlug),
  })

  const count = tab === 'reviews' ? reviews.data?.length : questions.data?.length
  const pending = tab === 'reviews' ? reviews.isPending : questions.isPending

  const tabButton = (value: Tab, label: string) => {
    const active = tab === value
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setTab(value)}
        className={cn(
          'relative flex h-10 items-center rounded-pill px-4 text-base font-medium',
          'transition-colors duration-[--duration-fast]',
          active ? 'text-white' : 'text-ink-muted hover:text-ink',
        )}
      >
        {active ? (
          <motion.span
            layoutId={`${tabsId}-active`}
            transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0.15 }}
            className="absolute inset-0 rounded-pill bg-ink"
          />
        ) : null}
        <span className="relative">{label}</span>
      </button>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        lead={tab === 'reviews' ? t('product.reviews') : t('product.questions')}
        ghost={
          count === undefined
            ? undefined
            : tab === 'reviews'
              ? formatPlural(count, { one: 'отзыв', few: 'отзыва', many: 'отзывов' })
              : formatPlural(count, { one: 'вопрос', few: 'вопроса', many: 'вопросов' })
        }
      />

      <div role="tablist" className="flex w-fit gap-1 rounded-pill bg-paper p-1">
        {tabButton('reviews', t('product.reviews'))}
        {tabButton('questions', t('product.questions'))}
      </div>

      {pending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      ) : tab === 'reviews' ? (
        <>
          <ReviewList reviews={reviews.data ?? []} />
          <ReviewForm productSlug={productSlug} />
        </>
      ) : (
        <>
          <QuestionList questions={questions.data ?? []} />
          <QuestionForm productSlug={productSlug} />
        </>
      )}
    </section>
  )
}
