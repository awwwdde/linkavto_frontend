import type { PickupProvider } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'
import { PROVIDER_LABEL } from './pickup'

/** Файлы лежат в public/, поэтому не раздувают бандл и кешируются отдельно. */
const LOGO: Partial<Record<PickupProvider, string>> = {
  post: '/logos/russian-post.svg',
  cdek: '/logos/cdek.svg',
}

/**
 * Фирменный знак службы доставки. Логотипы широкие, а маркер на карте —
 * квадрат 32px, поэтому вписываем через object-contain: пропорции не едут,
 * перерисовывать ничего не нужно.
 */
export function ProviderLogo({ provider, className }: { provider: PickupProvider; className?: string }) {
  const src = LOGO[provider]
  if (!src) return null
  return <img src={src} alt={PROVIDER_LABEL[provider]} className={cn('object-contain', className)} />
}
