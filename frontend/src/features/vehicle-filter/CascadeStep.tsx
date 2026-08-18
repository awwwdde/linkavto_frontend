import { useMemo, useState } from 'react'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Input, Skeleton } from '@/shared/ui'
import { IconCheck, IconSearch } from '@/shared/ui/Icon'

export interface CascadeOption {
  slug: string
  name: string
  /** Вторая строка: мощность, годы поколения и т.п. */
  note?: string | null
}

type Sort = 'az' | 'za'

/**
 * Один шаг каскада подбора: заголовок, поиск, сортировка и плитка вариантов.
 * Поиск и сортировка появляются только когда вариантов действительно много —
 * над списком из четырёх кнопок они лишний шум.
 */
export function CascadeStep({
  title,
  options,
  value,
  onSelect,
  pending,
  columns = 4,
}: {
  title: string
  options: CascadeOption[]
  value: string | null
  onSelect: (slug: string) => void
  pending?: boolean
  columns?: 3 | 4 | 6
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('az')

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = needle ? options.filter((option) => option.name.toLowerCase().includes(needle)) : [...options]
    return list.sort((a, b) =>
      sort === 'az' ? a.name.localeCompare(b.name, 'ru') : b.name.localeCompare(a.name, 'ru'),
    )
  }, [options, query, sort])

  const showControls = options.length > 8

  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-md font-semibold">{title}</h2>

        {showControls ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <IconSearch
                width={16}
                height={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
              />
              <Input
                aria-label={`${t('common.search')}: ${title}`}
                placeholder={t('common.search')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1 rounded-pill bg-paper p-1">
              {(['az', 'za'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sort === option}
                  onClick={() => setSort(option)}
                  className={cn(
                    'flex h-8 items-center rounded-pill px-3 text-sm transition-colors duration-[--duration-fast]',
                    sort === option ? 'bg-ink font-medium text-white' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {option === 'az' ? 'А–Я' : 'Я–А'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {pending ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-control" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-base text-ink-muted">{t('vehicleFilter.emptyOptions')}</p>
      ) : (
        <ul
          className={cn(
            'grid gap-2 sm:grid-cols-2',
            columns === 3 && 'lg:grid-cols-3',
            columns === 4 && 'lg:grid-cols-4',
            columns === 6 && 'lg:grid-cols-3 xl:grid-cols-6',
          )}
        >
          {shown.map((option) => {
            const selected = option.slug === value
            return (
              <li key={option.slug}>
                <button
                  type="button"
                  onClick={() => onSelect(option.slug)}
                  aria-pressed={selected}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between gap-2 rounded-control border px-3 py-2 text-left',
                    'transition-colors duration-[--duration-fast]',
                    selected
                      ? 'border-accent bg-accent/5 text-ink'
                      : 'border-line text-ink hover:border-ink-muted',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium">{option.name}</span>
                    {option.note ? <span className="truncate text-sm text-ink-muted">{option.note}</span> : null}
                  </span>
                  {selected ? <IconCheck width={16} height={16} className="shrink-0 text-accent" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
