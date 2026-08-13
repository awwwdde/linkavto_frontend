import type { ProductAttribute } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { SectionHeading } from '@/app/layouts/SectionHeading'

/**
 * Характеристики детали. Совместимость — такая же характеристика, поэтому
 * идёт последней строкой таблицы, а не отдельным блоком.
 */
export function AttributesTable({
  attributes,
  compatibility = [],
}: {
  attributes: ProductAttribute[]
  compatibility?: string[]
}) {
  if (attributes.length === 0 && compatibility.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading lead={t('product.attributes')} />
      <dl className="overflow-hidden rounded-card bg-surface shadow-float">
        {attributes.map((attribute, index) => (
          <div
            key={attribute.name}
            className={`flex items-baseline justify-between gap-6 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <dt className="text-base text-ink-muted">{attribute.name}</dt>
            <dd className="text-right text-base tabular-nums">{attribute.value}</dd>
          </div>
        ))}

        {compatibility.length > 0 ? (
          <div className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className="text-base text-ink-muted">{t('product.compatibility')}</dt>
            <dd className="flex flex-col text-base sm:text-right">
              {compatibility.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
