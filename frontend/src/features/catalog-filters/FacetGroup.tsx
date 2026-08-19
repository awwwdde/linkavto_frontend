import { useMemo, useState } from 'react'
import type { FacetOption } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Checkbox, Input } from '@/shared/ui'
import { IconChevronDown, IconSearch } from '@/shared/ui/Icon'

/** Сколько значений видно в свёрнутом состоянии. */
const PREVIEW = 6
/** С какого размера списка появляется поиск внутри фасета. */
const SEARCHABLE = 12
/** Значения короче этого рисуем чипами — так вчетверо компактнее. */
const CHIP_MAX_LENGTH = 6

const isNumeric = (options: FacetOption[]) => options.every((option) => /^[\d.,]+$/.test(option.label))

/**
 * Группа значений одного фасета.
 *
 * Скрывается сама, если фильтровать нечем: пустой список или единственное
 * значение, которое всё равно ничего не сузит. Внутренней прокрутки нет —
 * вместо неё превью на шесть значений и поиск в длинных списках.
 */
export function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: FacetOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')

  // Размерности сортируем по числу, всё остальное — по частоте: сверху то,
  // чем реально пользуются, а не то, что раньше в алфавите.
  const sorted = useMemo(() => {
    const list = [...options]
    return isNumeric(list)
      ? list.sort((a, b) => Number(a.label.replace(',', '.')) - Number(b.label.replace(',', '.')))
      : list.sort((a, b) => b.count - a.count)
  }, [options])

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? sorted.filter((option) => option.label.toLowerCase().includes(needle)) : sorted
  }, [sorted, query])

  // Выбранные всегда видны, даже если не попали в превью — иначе непонятно,
  // почему выдача сузилась.
  const visible = expanded || query ? found : found.filter((option, index) => index < PREVIEW || selected.includes(option.value))

  if (options.length < 2) return null

  const asChips = sorted.every((option) => option.label.length <= CHIP_MAX_LENGTH)
  const searchable = options.length >= SEARCHABLE
  // Прокрутка появляется только у раскрытого списка: в свёрнутом виде значений
  // шесть, и ограничивать там нечего.
  const scrolls = visible.length > PREVIEW

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="w-full">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-base font-semibold"
        >
          <span className="flex items-center gap-2">
            {title}
            {selected.length > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 text-xs font-medium text-white tabular-nums">
                {selected.length}
              </span>
            ) : null}
          </span>
          <IconChevronDown
            width={16}
            height={16}
            className={cn('shrink-0 text-ink-muted transition-transform duration-[--duration-fast]', open && 'rotate-180')}
          />
        </button>
      </legend>

      {open ? (
        <>
          {searchable ? (
            <div className="relative">
              <IconSearch
                width={14}
                height={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
              />
              <Input
                aria-label={`${t('common.search')}: ${title}`}
                placeholder={t('common.search')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
          ) : null}

          {found.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('catalog.nothingFound')}</p>
          ) : asChips ? (
            <div className={cn('flex flex-wrap gap-1.5', scrolls && 'max-h-64 overflow-y-auto scrollbar-thin pr-1')}>
              {visible.map((option) => {
                const active = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(option.value)}
                    title={`${option.label} · ${option.count}`}
                    className={cn(
                      'flex h-9 min-w-9 items-center justify-center rounded-control border px-2.5 text-sm',
                      'transition-colors duration-[--duration-fast]',
                      active ? 'border-accent bg-accent/5 text-accent' : 'border-line text-ink hover:border-ink-muted',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className={cn('flex flex-col', scrolls && 'max-h-64 overflow-y-auto scrollbar-thin pr-1')}>
              {visible.map((option) => (
                <Checkbox
                  key={option.value}
                  checked={selected.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                  label={
                    <span className="flex w-full items-baseline justify-between gap-3">
                      <span className="truncate">{option.label}</span>
                      <span className="text-sm text-ink-muted tabular-nums">{option.count}</span>
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {!query && found.length > visible.length ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="self-start text-sm text-accent hover:underline"
            >
              {t('catalog.showAllValues')} ({found.length})
            </button>
          ) : null}

          {!query && expanded && found.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="self-start text-sm text-ink-muted hover:text-ink"
            >
              {t('catalog.collapseValues')}
            </button>
          ) : null}
        </>
      ) : null}
    </fieldset>
  )
}
