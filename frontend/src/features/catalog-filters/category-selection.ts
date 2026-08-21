import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { CategoryNode } from '@/shared/api/types'
import { fetchCategoryTree } from '@/entities/category/api'
import { categoryHref, findChain, flattenTree } from '@/entities/category/tree'
import { queryKeys } from '@/shared/api/query-keys'
import { CATEGORY_PARAM } from './useCatalogParams'

/**
 * Выбор категорий — одна сущность с двумя формами записи в URL:
 *
 * - одна отметка → это **путь**: `/category/legkovye/kuzov`. Заголовок, крошки
 *   и canonical совпадают с выбором, дублей выдачи не возникает;
 * - две и больше → путь ближайшего общего предка + `?category_in=a,b`.
 *   Такая выдача уже не имеет своего места в дереве, поэтому страница
 *   помечается noindex (см. `pages/catalog`).
 *
 * Отсюда правило показа: дерево фильтра показывает **тот уровень, на котором
 * сделан выбор** — детей родителя текущей категории, а сама категория стоит в
 * нём с галочкой. Иначе выбранное исчезало бы из списка, стоило перейти в него.
 */
export interface CategorySelection {
  /** Узел, чьи дети образуют дерево фильтра. */
  scope: CategoryNode | null
  /** Отмеченные слаги: путь текущей категории + `category_in`. */
  selected: string[]
  /** Дерево ещё грузится — блок держит место скелетоном. */
  loading: boolean
  toggle: (slug: string) => void
  clear: () => void
  /** Имя по слагу — для сводки и тегов. */
  nameOf: (slug: string) => string
}

/**
 * Параметры, которые переживают смену категории. Не переживают:
 * `category_in` и `page` — они про прежний выбор, и профильные `attr_*`
 * («Сторона», «Тип кузова», «Вязкость») — в соседнем разделе таких осей
 * может не быть вовсе, и переход оборачивался бы пустой выдачей.
 */
export function categoryQuery(searchParams: URLSearchParams): URLSearchParams {
  const kept = new URLSearchParams(searchParams)
  kept.delete(CATEGORY_PARAM)
  kept.delete('page')
  for (const key of [...kept.keys()]) {
    if (key.startsWith('attr_')) kept.delete(key)
  }
  return kept
}

/** Узел `a` — предок `b` (или он сам). */
const covers = (a: CategoryNode, b: CategoryNode) => a.path === b.path || b.path.startsWith(`${a.path}/`)

/**
 * Правила отметки: ветка поглощает своих потомков, потомок вытесняет ветку.
 * Держать в выборе и родителя, и ребёнка бессмысленно — выдача одна и та же.
 */
export function nextSelection(current: CategoryNode[], node: CategoryNode): CategoryNode[] {
  if (current.some((item) => item.slug === node.slug)) {
    return current.filter((item) => item.slug !== node.slug)
  }
  return [...current.filter((item) => !covers(item, node) && !covers(node, item)), node]
}

/**
 * Набор отметок → адрес страницы: одна отметка становится путём, несколько —
 * путём общего предка плюс `category_in`. Пустой набор возвращает к области,
 * в которой шёл выбор (то есть на уровень выше).
 */
export function encodeSelection(
  next: CategoryNode[],
  scope: CategoryNode,
): { path: string; categoryIn: string[] } {
  if (next.length === 0) return { path: scope.path, categoryIn: [] }
  if (next.length === 1) return { path: next[0]!.path, categoryIn: [] }
  return {
    path: commonAncestorPath(next) || scope.path,
    categoryIn: next.map((node) => node.slug),
  }
}

/** Ближайший общий предок: самый длинный общий префикс путей. */
function commonAncestorPath(nodes: CategoryNode[]): string {
  const paths = nodes.map((node) => node.path.split('/'))
  const first = paths[0] ?? []
  let length = 0
  while (first[length] && paths.every((segments) => segments[length] === first[length])) length += 1
  // Совпасть целиком пути не могут: предки и потомки в выборе не уживаются.
  return first.slice(0, length).join('/')
}

export function useCategorySelection(slug: string): CategorySelection {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tree = useQuery({ queryKey: queryKeys.categories.tree(), queryFn: fetchCategoryTree })

  const { scope, pathSelected } = useMemo(() => {
    const chain = findChain(tree.data ?? [], slug)
    const current = chain[chain.length - 1] ?? null
    const parent = chain.length > 1 ? (chain[chain.length - 2] ?? null) : null
    // В корне раздела выбирать ещё нечего — показываем его же детей.
    return { scope: parent ?? current, pathSelected: parent ? current : null }
  }, [tree.data, slug])

  const inScope = useMemo(() => (scope ? flattenTree(scope.children) : []), [scope])

  const selected = useMemo(() => {
    const marks = (searchParams.get(CATEGORY_PARAM) ?? '').split(',').filter(Boolean)
    const all = pathSelected ? [pathSelected.slug, ...marks] : marks
    return [...new Set(all)]
  }, [searchParams, pathSelected])

  const selectedNodes = useMemo(
    () => selected.map((value) => inScope.find((node) => node.slug === value)).filter((node) => node !== undefined),
    [selected, inScope],
  )

  /** Перевод набора отметок обратно в URL по правилу «одна отметка — путь». */
  const apply = useCallback(
    (next: CategoryNode[]) => {
      if (!scope) return
      const query = categoryQuery(searchParams)

      const { path, categoryIn } = encodeSelection(next, scope)
      if (categoryIn.length > 0) query.set(CATEGORY_PARAM, categoryIn.join(','))

      navigate(categoryHref(path, query.toString()), { preventScrollReset: true })
    },
    [navigate, scope, searchParams],
  )

  const toggle = useCallback(
    (value: string) => {
      const node = inScope.find((item) => item.slug === value)
      if (node) apply(nextSelection(selectedNodes, node))
    },
    [apply, inScope, selectedNodes],
  )

  const clear = useCallback(() => apply([]), [apply])

  const nameOf = useCallback(
    (value: string) => inScope.find((node) => node.slug === value)?.name ?? value,
    [inScope],
  )

  return { scope, selected, loading: tree.isPending, toggle, clear, nameOf }
}
