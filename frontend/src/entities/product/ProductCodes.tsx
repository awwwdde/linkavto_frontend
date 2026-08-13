import { useState } from 'react'
import { t } from '@/shared/i18n'
import { toast } from '@/shared/ui'
import { IconCheck, IconCopy } from '@/shared/ui/Icon'

function CodeStamp({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Скопировать не вышло. Выделите код и скопируйте вручную.')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="truncate font-mono text-md font-medium">{value}</span>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`${t('product.copyCode')}: ${label}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-[--duration-fast] hover:text-ink"
      >
        {copied ? <IconCheck className="text-ok" /> : <IconCopy />}
      </button>
    </div>
  )
}

/**
 * Коды детали под кнопкой покупки: их переписывают и диктуют по телефону,
 * поэтому каждый копируется отдельно.
 *
 * TODO(api): «Код товара» бэк пока не отдаёт — до появления поля показываем
 * внутренний id, он тоже присваивается автоматически и уникален.
 */
export function ProductCodes({ sku, productId }: { sku: string; productId: number }) {
  return (
    // Та же карточка, что у цены и продавца: голым блоком коды выпадали из
    // общего ряда правой колонки.
    <div className="grid gap-2 rounded-card bg-surface p-4 shadow-float sm:grid-cols-2">
      <CodeStamp label={t('product.sku')} value={sku} />
      <CodeStamp label={t('product.internalCode')} value={String(productId).padStart(8, '0')} />
    </div>
  )
}
