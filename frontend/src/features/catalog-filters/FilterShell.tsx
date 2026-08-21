import { useId, useState, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { IconChevronDown, IconClose, IconSearch } from '@/shared/ui/Icon'

/**
 * Оболочка блока фильтра из §2 ТЗ: свёрнутый блок выглядит как поле со
 * значением («Любая»), по нажатию раскрывается в список с поиском и
 * галочками, внизу — «Свернуть».
 *
 * Сам список рисует вызывающий код: у марок это плоские чекбоксы, у моделей —
 * группы по маркам, у поколений — карточки с фотографией. Общее у них ровно
 * то, что здесь: заголовок, строка поиска, прокрутка и сворачивание.
 */
export interface FilterShellProps {
  title: string
  /** Подпись свёрнутого блока: перечисление выбранного либо «Любая». */
  summary?: string
  placeholder?: string
  /** Сколько значений выбрано — цифра в заголовке и признак активности. */
  count?: number
  /** Поиск внутри списка. Скрываем, когда искать не в чем. */
  searchable?: boolean
  searchPlaceholder?: string
  onReset?: () => void
  /** Раскрыт с самого начала — так открываются блоки с уже выбранными значениями. */
  defaultOpen?: boolean
  className?: string
  children: (query: string) => ReactNode
}

export function FilterShell({
  title,
  summary,
  placeholder,
  count = 0,
  searchable = true,
  searchPlaceholder,
  onReset,
  defaultOpen,
  className,
  children,
}: FilterShellProps) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0)
  const [query, setQuery] = useState('')
  const panelId = useId()

  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          {title}
          {count > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 text-xs font-medium text-white tabular-nums">
              {count}
            </span>
          ) : null}
        </h3>
        {count > 0 && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-sm text-accent transition-opacity duration-[--duration-fast] hover:opacity-70"
          >
            {t('catalog.filtersReset')}
          </button>
        ) : null}
      </div>

      {open ? (
        <div id={panelId} className="flex flex-col gap-2">
          {searchable ? (
            <div className="relative">
              <IconSearch
                width={14}
                height={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="search"
                aria-label={`${t('common.search')}: ${title}`}
                placeholder={searchPlaceholder ?? t('catalog.searchInList')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={cn(
                  'h-10 w-full rounded-control border border-line bg-surface pr-8 pl-8 text-base text-ink',
                  'placeholder:text-ink-muted transition-[border-color] duration-[--duration-fast]',
                  'focus:border-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden',
                )}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('common.clear')}
                  className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink"
                >
                  <IconClose width={14} height={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          {children(query.trim().toLowerCase())}

          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            aria-expanded
            aria-controls={panelId}
            className="self-start text-sm text-accent transition-opacity duration-[--duration-fast] hover:opacity-70"
          >
            {t('catalog.collapseValues')}
          </button>
        </div>
      ) : (
        // Свёрнутый вид — поле со сводкой выбранного (§2: «Любая» до выбора).
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-control border px-3 text-left text-base',
            'transition-colors duration-[--duration-fast]',
            count > 0 ? 'border-accent text-ink' : 'border-line text-ink-muted hover:border-ink-muted',
          )}
        >
          <span className="truncate">{summary || placeholder || t('vehicleFilter.any')}</span>
          <IconChevronDown width={16} height={16} className="shrink-0 text-ink-muted" />
        </button>
      )}
    </section>
  )
}

/** Подсветка совпадения с поисковым запросом — как в дереве категорий на макете. */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const index = text.toLowerCase().indexOf(query)
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-ink">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}
