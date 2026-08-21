import { useMemo, useState } from 'react'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Checkbox } from '@/shared/ui'
import { IconChevronDown } from '@/shared/ui/Icon'
import { Highlight } from './FilterShell'

/** Значение фильтра. `group` — заголовок группы («Популярные», марка модели). */
export interface Choice {
  value: string
  label: string
  count?: number
  hint?: string
  group?: string
}

/** Группа «Популярные» всегда идёт первой — как в макете. */
export const POPULAR_GROUP = 'Популярные'

interface OptionListProps {
  choices: Choice[]
  selected: string[]
  onToggle: (value: string) => void
  /** Строка поиска из FilterShell — уже в нижнем регистре. */
  query: string
  /** Группы можно сворачивать (список моделей по маркам). */
  collapsibleGroups?: boolean
  className?: string
}

/**
 * Прокручиваемый список значений с галочками. Прокрутка вместо «показать ещё»:
 * список остаётся одной высоты, сколько бы марок в нём ни было.
 */
export function OptionList({ choices, selected, onToggle, query, collapsibleGroups, className }: OptionListProps) {
  const [closedGroups, setClosedGroups] = useState<string[]>([])

  const groups = useMemo(() => {
    const found = query
      ? choices.filter((choice) => choice.label.toLowerCase().includes(query) || selected.includes(choice.value))
      : choices

    const order: string[] = []
    const map = new Map<string, Choice[]>()
    for (const choice of found) {
      const key = choice.group ?? ''
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(choice)
    }
    // «Популярные» — наверх, остальные группы в порядке появления.
    order.sort((a, b) => Number(b === POPULAR_GROUP) - Number(a === POPULAR_GROUP))
    return order.map((name) => ({ name, items: map.get(name)! }))
  }, [choices, query, selected])

  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  if (total === 0) return <p className="py-2 text-sm text-ink-muted">{t('catalog.nothingFound')}</p>

  return (
    <div
      data-lenis-prevent
      className={cn('scrollbar-thin max-h-72 overflow-y-auto pr-1', className)}
    >
      {groups.map((group) => {
        const closed = collapsibleGroups && closedGroups.includes(group.name)
        return (
          <div key={group.name || 'all'} className="flex flex-col">
            {group.name ? (
              collapsibleGroups ? (
                <button
                  type="button"
                  onClick={() =>
                    setClosedGroups((current) =>
                      current.includes(group.name)
                        ? current.filter((item) => item !== group.name)
                        : [...current, group.name],
                    )
                  }
                  aria-expanded={!closed}
                  className="flex min-h-9 items-center gap-1.5 text-base font-semibold"
                >
                  {group.name}
                  <IconChevronDown
                    width={14}
                    height={14}
                    className={cn(
                      'text-ink-muted transition-transform duration-[--duration-fast]',
                      !closed && 'rotate-180',
                    )}
                  />
                </button>
              ) : (
                <span className="pt-1 text-sm text-ink-muted">{group.name}</span>
              )
            ) : null}

            {closed
              ? null
              : group.items.map((choice) => (
                  <Checkbox
                    key={choice.value}
                    checked={selected.includes(choice.value)}
                    onChange={() => onToggle(choice.value)}
                    label={
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span className="truncate">
                          <Highlight text={choice.label} query={query} />
                          {choice.hint ? <span className="text-ink-muted"> · {choice.hint}</span> : null}
                        </span>
                        {typeof choice.count === 'number' ? (
                          <span className="shrink-0 text-sm text-ink-muted tabular-nums">{choice.count}</span>
                        ) : null}
                      </span>
                    }
                  />
                ))}
          </div>
        )
      })}
    </div>
  )
}
