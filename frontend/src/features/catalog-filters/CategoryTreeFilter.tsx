import { useMemo, useState } from 'react'
import type { CategoryNode } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Skeleton } from '@/shared/ui'
import { IconMinus, IconPlus } from '@/shared/ui/Icon'
import { useCategorySelection } from './category-selection'
import { FilterShell, Highlight } from './FilterShell'

/** Узел дерева вместе с отфильтрованными потомками — результат поиска. */
interface Matched {
  node: CategoryNode
  children: Matched[]
}

/** Ветка остаётся в дереве, если совпал сам узел или кто-то из его потомков. */
function match(nodes: CategoryNode[], query: string): Matched[] {
  const out: Matched[] = []
  for (const node of nodes) {
    const children = match(node.children, query)
    if (node.name.toLowerCase().includes(query) || children.length > 0) out.push({ node, children })
  }
  return out
}

/** Дерево без поиска — те же узлы, только в форме результата поиска. */
function toMatched(node: CategoryNode): Matched {
  return { node, children: node.children.map(toMatched) }
}

/** Слаги всех веток с потомками — для «развернуть всё». */
function branchSlugs(items: Matched[]): string[] {
  return items.flatMap((item) => (item.children.length > 0 ? [item.node.slug, ...branchSlugs(item.children)] : []))
}

function Row({
  item,
  depth,
  query,
  selected,
  onToggle,
  isOpen,
  onOpenToggle,
}: {
  item: Matched
  depth: number
  query: string
  selected: string[]
  onToggle: (slug: string) => void
  isOpen: (slug: string) => boolean
  onOpenToggle: (slug: string) => void
}) {
  const hasChildren = item.children.length > 0
  const open = hasChildren && isOpen(item.node.slug)
  const checked = selected.includes(item.node.slug)
  const empty = item.node.products_count === 0
  // Кнопка «+» связана со своим списком: скринридер объявляет не просто
  // «раскрыто», а что именно раскрылось.
  const childrenId = `category-${item.node.id}-children`

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1 rounded-control pr-2 transition-colors duration-[--duration-fast]',
          checked ? 'bg-accent/8' : 'hover:bg-paper',
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onOpenToggle(item.node.slug)}
            aria-expanded={open}
            aria-controls={open ? childrenId : undefined}
            aria-label={`${open ? t('catalog.collapseValues') : t('catalog.expandNode')}: ${item.node.name}`}
            className="flex h-9 w-7 shrink-0 items-center justify-center text-ink-muted transition-colors duration-[--duration-fast] hover:text-ink"
          >
            {open ? <IconMinus width={14} height={14} /> : <IconPlus width={14} height={14} />}
          </button>
        ) : (
          // Лист выравниваем по галочкам ветвей — иначе список «пляшет».
          <span aria-hidden className="w-7 shrink-0" />
        )}

        {/* Кликабельна вся строка, а не только квадратик галочки. */}
        <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(item.node.slug)}
            className="h-[18px] w-[18px] shrink-0 accent-[--color-accent]"
          />
          <span className={cn('min-w-0 flex-1 truncate text-base', depth === 0 ? 'font-medium text-ink' : 'text-ink')}>
            <Highlight text={item.node.name} query={query} />
          </span>
          <span className={cn('shrink-0 text-sm tabular-nums', empty ? 'text-ink-muted/50' : 'text-ink-muted')}>
            {item.node.products_count}
          </span>
        </label>
      </div>

      {open ? (
        <ul id={childrenId} role="group" aria-label={item.node.name} className="ml-[13px] flex flex-col border-l border-line pl-2">
          {item.children.map((child) => (
            <Row
              key={child.node.id}
              item={child}
              depth={depth + 1}
              query={query}
              selected={selected}
              onToggle={onToggle}
              isOpen={isOpen}
              onOpenToggle={onOpenToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * Фильтр «Категория» (§1): дерево подкатегорий с раскрытием по «+», поиском по
 * ключевым словам и множественным выбором галочками.
 *
 * Дерево показывает уровень, на котором сделан выбор: текущая категория стоит
 * в списке отмеченной, рядом — её соседи, внутри — потомки. Одна отметка
 * переводит страницу в саму категорию (путь), две и больше — оставляют на
 * общем предке с `category_in` (см. `category-selection.ts`).
 */
export function CategoryTreeFilter({ slug, onNavigate }: { slug: string; onNavigate?: () => void }) {
  const { scope, selected, loading, toggle, clear, nameOf } = useCategorySelection(slug)
  const [openSlugs, setOpenSlugs] = useState<string[]>([])

  const roots = useMemo(() => scope?.children ?? [], [scope])

  /**
   * Отмеченные ветки и их предки раскрыты всегда: выбор, спрятанный под
   * «плюсом», выглядит как пропавший, а внутрь отмеченной категории идёт
   * следующий шаг уточнения — он должен быть на виду.
   */
  const forced = useMemo(() => {
    const parents = new Map<string, string | null>()
    const walk = (nodes: CategoryNode[], parent: string | null) => {
      for (const node of nodes) {
        parents.set(node.slug, parent)
        walk(node.children, node.slug)
      }
    }
    walk(roots, null)

    const out = new Set<string>(selected)
    for (const value of selected) {
      let parent = parents.get(value) ?? null
      while (parent) {
        out.add(parent)
        parent = parents.get(parent) ?? null
      }
    }
    return out
  }, [roots, selected])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (roots.length === 0) return null

  const summary = selected.map(nameOf).join(', ')

  return (
    <FilterShell
      title={t('catalog.category')}
      summary={summary}
      placeholder={t('catalog.categoryAny')}
      count={selected.length}
      searchPlaceholder={t('catalog.categorySearch')}
      onReset={() => {
        clear()
        onNavigate?.()
      }}
      defaultOpen
    >
      {(query) => {
        const matched = query ? match(roots, query) : roots.map(toMatched)
        if (matched.length === 0) return <p className="py-2 text-sm text-ink-muted">{t('catalog.nothingFound')}</p>

        const branches = branchSlugs(matched)
        // Ветки с отметками раскрыты принудительно и в счёт не идут: иначе
        // «Свернуть всё» показывалось бы кнопкой, которая ничего не меняет.
        const anyOpen = branches.some((value) => openSlugs.includes(value))

        return (
          <>
            {/* При поиске ветки раскрыты принудительно — сворачивать нечего. */}
            {!query && branches.length > 0 ? (
              <div className="flex items-baseline justify-end gap-3 text-sm text-ink-muted">
                <button
                  type="button"
                  onClick={() => setOpenSlugs(anyOpen ? [] : branches)}
                  className="text-accent transition-opacity duration-[--duration-fast] hover:opacity-70"
                >
                  {anyOpen ? t('catalog.collapseAll') : t('catalog.expandAll')}
                </button>
              </div>
            ) : null}

            <ul data-lenis-prevent className="scrollbar-thin -mx-1 flex max-h-80 flex-col overflow-y-auto px-1">
              {matched.map((item) => (
                <Row
                  key={item.node.id}
                  item={item}
                  depth={0}
                  query={query}
                  selected={selected}
                  onToggle={(value) => {
                    toggle(value)
                    onNavigate?.()
                  }}
                  isOpen={(value) => Boolean(query) || openSlugs.includes(value) || forced.has(value)}
                  onOpenToggle={(value) =>
                    setOpenSlugs((current) =>
                      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
                    )
                  }
                />
              ))}
            </ul>
          </>
        )
      }}
    </FilterShell>
  )
}
