import { Link } from 'react-router'
import type { CrossReference } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { SectionHeading } from '@/app/layouts/SectionHeading'

/**
 * Кроссы и аналоги — отдельный блок в нижней части карточки. Кросс без своей
 * страницы остаётся текстом: вести в никуда хуже, чем не вести совсем.
 */
export function CrossReferences({ crosses }: { crosses: CrossReference[] }) {
  if (crosses.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading lead={t('product.crosses')} />
      <ul className="flex flex-wrap gap-2 rounded-card bg-surface p-4 shadow-float lg:p-6">
        {crosses.map((cross) => {
          const content = (
            <>
              <span className="text-ink-muted">{cross.manufacturer}</span>
              <span className="font-mono">{cross.sku}</span>
            </>
          )
          return (
            <li key={`${cross.manufacturer}-${cross.sku}`}>
              {cross.product_slug ? (
                <Link
                  to={`/product/${cross.product_slug}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line px-3 text-sm transition-colors duration-[--duration-fast] hover:border-ink-muted"
                >
                  {content}
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line px-3 text-sm">
                  {content}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
