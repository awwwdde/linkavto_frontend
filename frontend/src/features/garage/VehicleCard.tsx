import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { GarageVehicle } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { vehicleMeta } from '@/shared/lib/vehicle-types'
import { Badge } from '@/shared/ui'
import { IconMore, IconTypeCar } from '@/shared/ui/Icon'

/** Ссылка на каталог с уже применённым подбором под это авто. */
export function partsHref(vehicle: GarageVehicle): string {
  const slug = vehicleMeta(vehicle.vehicle_type)?.slug ?? 'legkovye'
  return `/category/${slug}?garage_vehicle_id=${vehicle.id}`
}

export function VehicleCard({
  vehicle,
  active,
  onSetActive,
  onRemove,
}: {
  vehicle: GarageVehicle
  active: boolean
  onSetActive: () => void
  onRemove: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float',
        active && 'ring-1 ring-accent',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-paper text-icon">
          <IconTypeCar width={18} height={18} />
        </span>

        <Link to={`/garage/${vehicle.id}`} className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-medium hover:underline">{vehicle.title}</span>
          {vehicle.vin ? <span className="truncate font-mono text-sm text-ink-muted">{vehicle.vin}</span> : null}
        </Link>

        <div ref={box} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t('garage.actions')}
            className="flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
          >
            <IconMore width={18} height={18} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute top-full right-0 z-20 mt-1 flex min-w-48 flex-col overflow-hidden rounded-control border border-line bg-surface py-1 shadow-float"
            >
              {active ? null : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSetActive()
                    setMenuOpen(false)
                  }}
                  className="flex h-10 items-center px-3 text-left text-base text-ink transition-colors duration-[--duration-fast] hover:bg-paper"
                >
                  {t('garage.setActive')}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRemove()
                  setMenuOpen(false)
                }}
                className="flex h-10 items-center px-3 text-left text-base text-danger transition-colors duration-[--duration-fast] hover:bg-paper"
              >
                {t('garage.remove')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {active ? <Badge tone="ok">{t('garage.active')}</Badge> : null}

      <Link
        to={partsHref(vehicle)}
        className="mt-auto flex min-h-10 items-center justify-center rounded-control bg-accent px-4 text-base font-medium text-white transition-colors duration-[--duration-fast] hover:bg-accent-hover"
      >
        {t('garage.partsFor')}
      </Link>
    </article>
  )
}
