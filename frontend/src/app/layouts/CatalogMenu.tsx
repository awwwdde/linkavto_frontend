import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { CategoryNode } from '@/shared/api/types'
import { fetchCategoryTree } from '@/entities/category/api'
import { categoryHref } from '@/entities/category/tree'
import { queryKeys } from '@/shared/api/query-keys'
import { vehicleMeta } from '@/shared/lib/vehicle-types'
import { cn } from '@/shared/lib/cn'
import { t } from '@/shared/i18n'
import { BottomSheet, Modal, Skeleton } from '@/shared/ui'
import { IconChevronLeft, IconChevronRight, IconGarage } from '@/shared/ui/Icon'
import { useIsDesktop } from '@/shared/lib/media'
import { useUiStore } from '@/app/ui-store'

/** Высота панели фиксирована — колонки скроллятся внутри, меню не «дышит». */
const PANEL_HEIGHT = 'h-[min(64dvh,520px)]'

/**
 * Строка меню — одна на разделы и на подкатегории всех уровней, чтобы
 * выделение не разъезжалось при будущих правках. Активный элемент получает
 * постоянную подложку, наведение и клавиатурный фокус — ту же самую.
 */
function menuRow(active: boolean, size?: string): string {
  return cn(
    'flex min-h-10 w-full items-center gap-2 rounded-control px-2 text-left transition-colors duration-[--duration-fast]',
    'hover:bg-paper hover:text-ink',
    'focus-visible:bg-paper focus-visible:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
    active ? 'bg-paper font-medium text-ink' : 'text-ink-muted',
    size ?? 'text-base',
  )
}

function ColumnHeader({ title }: { title: string }) {
  return (
    <p className="sticky top-0 z-10 bg-surface pb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
      {title}
    </p>
  )
}

function ViewAllLink({ node, onNavigate }: { node: CategoryNode; onNavigate: () => void }) {
  return (
    <Link
      to={categoryHref(node.path)}
      onClick={onNavigate}
      className={cn(menuRow(false), 'mb-1 font-medium text-ink')}
    >
      <span className="min-w-0 flex-1 truncate">{t('catalog.allSubcategories')}</span>
    </Link>
  )
}

/**
 * Подкатегория 3-й и 4-й колонок. Раскрытия у неё нет, поэтому выбранной
 * считается та, на странице которой пользователь сейчас находится, — это и
 * даёт NavLink.
 */
function SubcategoryLink({
  node,
  onNavigate,
  size,
  strong,
}: {
  node: CategoryNode
  onNavigate: () => void
  size?: string
  /** Верхний уровень колонки — он озаглавливает вложенный список под собой. */
  strong?: boolean
}) {
  return (
    <NavLink
      to={categoryHref(node.path)}
      onClick={onNavigate}
      className={({ isActive }) => cn(menuRow(isActive, size), strong && !isActive && 'font-medium text-ink')}
    >
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
    </NavLink>
  )
}

/**
 * Desktop-меню: три колонки фиксированной ширины и высоты.
 * Наведение только перекрашивает строку и меняет содержимое соседней колонки —
 * геометрия панели при этом не меняется, поэтому ничего не прыгает.
 */
function DesktopMenu({ tree, onNavigate }: { tree: CategoryNode[]; onNavigate: () => void }) {
  const [rootSlug, setRootSlug] = useState<string | null>(null)
  const [branchSlug, setBranchSlug] = useState<string | null>(null)

  const root = useMemo(() => tree.find((node) => node.slug === rootSlug) ?? tree[0] ?? null, [tree, rootSlug])

  // Третья колонка никогда не пустует: по умолчанию — первая подкатегория.
  const branch = useMemo(() => {
    if (!root) return null
    return root.children.find((node) => node.slug === branchSlug) ?? root.children[0] ?? null
  }, [root, branchSlug])

  useEffect(() => setBranchSlug(null), [rootSlug])

  if (!root) return null

  return (
    <div className={cn('grid grid-cols-[220px_260px_minmax(0,1fr)] gap-2', PANEL_HEIGHT)}>
      {/* Колонка 1 — разделы */}
      <ul className="no-scrollbar overflow-y-auto border-r border-line pr-2">
        {tree.map((node) => {
          const active = node.slug === root.slug
          return (
            <li key={node.id}>
              <button
                type="button"
                onMouseEnter={() => setRootSlug(node.slug)}
                onFocus={() => setRootSlug(node.slug)}
                onClick={() => setRootSlug(node.slug)}
                aria-current={active ? 'true' : undefined}
                className={menuRow(active)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-paper">
                  <IconGarage width={16} height={16} className="text-ink-muted" />
                </span>
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Колонка 2 — подкатегории раздела */}
      <div className="no-scrollbar overflow-y-auto border-r border-line pr-2">
        <ColumnHeader title={root.name} />
        <ViewAllLink node={root} onNavigate={onNavigate} />
        <ul>
          {root.children.map((child) => {
            const active = child.slug === branch?.slug
            return (
              <li key={child.id}>
                <Link
                  to={categoryHref(child.path)}
                  onClick={onNavigate}
                  onMouseEnter={() => setBranchSlug(child.slug)}
                  onFocus={() => setBranchSlug(child.slug)}
                  aria-current={active ? 'true' : undefined}
                  className={menuRow(active)}
                >
                  <span className="min-w-0 flex-1 truncate">{child.name}</span>
                  {child.has_children ? (
                    <IconChevronRight width={14} height={14} className="shrink-0 text-ink-muted" />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Колонка 3 — уровни 3–4 выбранной ветки */}
      <div className="no-scrollbar overflow-y-auto pl-1">
        {branch ? (
          <>
            <ColumnHeader title={branch.name} />
            <ViewAllLink node={branch} onNavigate={onNavigate} />

            {branch.children.length === 0 ? (
              <p className="px-2 text-base text-ink-muted">{t('catalog.nothingFound')}</p>
            ) : (
              <ul className="columns-2 gap-6 [column-fill:balance]">
                {branch.children.map((grandChild) => (
                  <li key={grandChild.id} className="mb-4 break-inside-avoid">
                    <SubcategoryLink node={grandChild} onNavigate={onNavigate} strong />

                    {grandChild.children.length > 0 ? (
                      <ul className="mt-1 border-l border-line pl-3">
                        {grandChild.children.map((leaf) => (
                          <li key={leaf.id}>
                            <SubcategoryLink node={leaf} onNavigate={onNavigate} size="text-sm" />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

/** Mobile: drill-down по одному уровню — работает на любой глубине. */
function MobileMenu({ tree, onNavigate }: { tree: CategoryNode[]; onNavigate: () => void }) {
  const [stack, setStack] = useState<CategoryNode[]>([])
  const current = stack[stack.length - 1] ?? null
  const items = current ? current.children : tree

  return (
    <div className="flex min-h-[60dvh] flex-col">
      {current ? (
        <div className="mb-2 flex items-center gap-1 border-b border-line pb-2">
          <button
            type="button"
            onClick={() => setStack(stack.slice(0, -1))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-muted"
            aria-label={t('catalog.upOneLevel')}
          >
            <IconChevronLeft />
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-medium">{current.name}</p>
        </div>
      ) : null}

      <ul className="flex flex-col">
        {current ? (
          <li className="border-b border-line">
            <Link
              to={categoryHref(current.path)}
              onClick={onNavigate}
              className="flex min-h-12 items-center justify-between gap-3 text-base font-medium"
            >
              {t('catalog.allSubcategories')}
            </Link>
          </li>
        ) : null}

        {items.map((node) => {
          const meta = current ? null : vehicleMeta(node.vehicle_type)
          return (
            <li key={node.id} className="flex items-center gap-2 border-b border-line last:border-0">
              <Link
                to={categoryHref(node.path)}
                onClick={onNavigate}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-base"
              >
                {meta ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-paper">
                    <IconGarage width={18} height={18} className="text-ink-muted" />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
              </Link>

              {node.has_children ? (
                <button
                  type="button"
                  onClick={() => setStack([...stack, node])}
                  aria-label={`${node.name}: подкатегории`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-muted"
                >
                  <IconChevronRight />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CatalogMenu() {
  const open = useUiStore((state) => state.catalogMenuOpen)
  const close = useUiStore((state) => state.closeCatalogMenu)
  const isDesktop = useIsDesktop()

  const tree = useQuery({ queryKey: queryKeys.categories.tree(), queryFn: fetchCategoryTree, enabled: open })

  const Shell = isDesktop ? Modal : BottomSheet

  return (
    <Shell
      open={open}
      onClose={close}
      title={t('nav.catalog')}
      className={isDesktop ? 'max-w-[1120px]' : undefined}
    >
      {tree.isPending ? (
        <div className={cn('grid grid-cols-[220px_260px_minmax(0,1fr)] gap-4', isDesktop && PANEL_HEIGHT)}>
          {Array.from({ length: 3 }, (_, column) => (
            <div key={column} className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, row) => (
                <Skeleton key={row} className="h-10" />
              ))}
            </div>
          ))}
        </div>
      ) : tree.isError ? (
        <p className="text-base text-ink-muted">{t('common.errorText')}</p>
      ) : isDesktop ? (
        <DesktopMenu tree={tree.data} onNavigate={close} />
      ) : (
        <MobileMenu tree={tree.data} onNavigate={close} />
      )}
    </Shell>
  )
}
