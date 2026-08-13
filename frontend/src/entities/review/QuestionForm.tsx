import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Question } from '@/shared/api/types'
import { ApiError, post } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { Button, toast } from '@/shared/ui'
import { useAuthStore } from '@/features/auth/store'
import { useUiStore } from '@/app/ui-store'

const MIN_LENGTH = 10

export function QuestionForm({ productSlug }: { productSlug: string }) {
  const [text, setText] = useState('')
  const user = useAuthStore((state) => state.user)
  const openAuth = useUiStore((state) => state.openAuth)
  const queryClient = useQueryClient()

  const submit = useMutation({
    mutationFn: () => post<Question>(`products/${productSlug}/questions/`, { text }),
    onSuccess: () => {
      setText('')
      toast.ok(t('product.questionSent'))
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.questions(productSlug) })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t('common.errorText')),
  })

  if (!user) {
    return (
      <Button variant="secondary" onClick={() => openAuth()}>
        {t('product.loginToAsk')}
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float"
      onSubmit={(event) => {
        event.preventDefault()
        submit.mutate()
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">{t('product.yourQuestion')}</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder={t('product.questionPlaceholder')}
          className="w-full rounded-control border border-line bg-surface p-3 text-base text-ink placeholder:text-ink-muted focus:border-ink-muted focus:outline-none"
        />
      </label>

      <Button
        type="submit"
        variant="primary"
        className="self-start"
        loading={submit.isPending}
        disabled={text.trim().length < MIN_LENGTH}
      >
        {t('product.askQuestion')}
      </Button>
    </form>
  )
}
