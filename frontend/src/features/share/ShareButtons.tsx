import { useEffect, useRef, useState } from 'react'
import { SHARE_TARGETS } from '@/shared/config'
import { t } from '@/shared/i18n'
import { toast } from '@/shared/ui'
import { IconCopy, IconShare } from '@/shared/ui/Icon'

/**
 * §10.3: реальные URL текущей страницы, никаких плейсхолдеров.
 * Кнопка в углу карточки: сети развёрнутым рядом занимали строку под ценой,
 * а пользуются ими редко — поэтому прячем их под меню.
 */
export function ShareButtons({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const url = typeof window === 'undefined' ? '' : window.location.href

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.ok(t('product.copied'))
      setOpen(false)
    } catch {
      toast.error('Скопировать не вышло. Скопируйте адрес из адресной строки.')
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('product.share')}
        className="flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
      >
        <IconShare width={18} height={18} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 flex min-w-44 flex-col overflow-hidden rounded-control border border-line bg-surface py-1 shadow-float"
        >
          {SHARE_TARGETS.map((target) => (
            <a
              key={target.id}
              role="menuitem"
              href={target.href(url)}
              target="_blank"
              rel="noreferrer noopener"
              title={`${title} — ${target.label}`}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center px-3 text-base text-ink transition-colors duration-[--duration-fast] hover:bg-paper"
            >
              {target.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => void copy()}
            className="flex h-10 items-center gap-2 px-3 text-left text-base text-ink transition-colors duration-[--duration-fast] hover:bg-paper"
          >
            <IconCopy width={16} height={16} className="text-ink-muted" />
            {t('product.copyLink')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
