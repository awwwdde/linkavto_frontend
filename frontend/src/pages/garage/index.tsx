import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { VehicleType } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { formatPlural } from '@/shared/lib/format'
import { Button, Container, EmptyState, Input, Modal, PageMeta, toast } from '@/shared/ui'
import { IconPlus, IconSearch } from '@/shared/ui/Icon'
import { GarageVehicleForm } from '@/features/garage/GarageVehicleForm'
import { VehicleCard } from '@/features/garage/VehicleCard'
import { deleteGarageVehicle } from '@/features/garage/api'
import { useGarageStore } from '@/features/garage/store'
import { useAuthStore } from '@/features/auth/store'
import { useUiStore } from '@/app/ui-store'

export function Component() {
  const user = useAuthStore((state) => state.user)
  const openAuth = useUiStore((state) => state.openAuth)
  const [formOpen, setFormOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<VehicleType | 'all'>('all')

  const vehicles = useGarageStore((state) => state.vehicles)
  const activeId = useGarageStore((state) => state.activeVehicleId)
  const setActive = useGarageStore((state) => state.setActive)
  const removeVehicle = useGarageStore((state) => state.removeVehicle)

  const remove = useMutation({
    mutationFn: deleteGarageVehicle,
    onSuccess: (_data, id) => removeVehicle(id),
    onError: () => toast.error('Удалить не вышло. Повторите через минуту.'),
  })

  // Фильтр по типу техники строим по тому, что реально стоит в гараже —
  // показывать «Мото», когда мотоциклов нет, незачем.
  const types = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.vehicle_type))], [vehicles])

  const shown = useMemo(() => {
    const value = query.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      if (type !== 'all' && vehicle.vehicle_type !== type) return false
      if (!value) return true
      return `${vehicle.title} ${vehicle.vin ?? ''}`.toLowerCase().includes(value)
    })
  }, [vehicles, query, type])

  // §7: гараж привязан к аккаунту — весь маршрут закрыт для гостя.
  useEffect(() => {
    if (!user) openAuth('/garage')
  }, [user, openAuth])

  if (!user) {
    return (
      <Container className="py-12">
        <PageMeta title="Гараж — LINKAVTO" canonicalPath="/garage" noIndex />
        <EmptyState
          title={t('auth.title')}
          text="Войдите, чтобы добавить авто и подобрать детали под него."
          action={
            <Button variant="primary" onClick={() => openAuth('/garage')}>
              {t('nav.login')}
            </Button>
          }
        />
      </Container>
    )
  }

  return (
    <>
      <PageMeta
        title="Гараж — LINKAVTO"
        description="Добавьте автомобиль в гараж, и каталог покажет только подходящие запчасти."
        canonicalPath="/garage"
      />

      <Container className="flex flex-col gap-6 py-6 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold lg:text-2xl">{t('garage.title')}</h1>
            {vehicles.length > 0 ? (
              <span className="text-md text-ink-muted tabular-nums">
                {formatPlural(vehicles.length, { one: 'автомобиль', few: 'автомобиля', many: 'автомобилей' })}
              </span>
            ) : null}
          </div>

          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <IconPlus width={18} height={18} />
            {t('garage.addVehicle')}
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <EmptyState
            title={t('garage.empty')}
            text={t('garage.emptyText')}
            action={
              <Button variant="primary" size="lg" onClick={() => setFormOpen(true)}>
                {t('garage.addVehicle')}
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <IconSearch
                  width={16}
                  height={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
                />
                <Input
                  aria-label={t('garage.searchPlaceholder')}
                  placeholder={t('garage.searchPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                />
              </div>

              {types.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {(['all', ...types] as const).map((value) => {
                    const label = value === 'all' ? t('garage.allTypes') : t(`vehicleType.${value}`)
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={type === value}
                        onClick={() => setType(value)}
                        className={cn(
                          'flex h-10 items-center rounded-pill px-4 text-base transition-colors duration-[--duration-fast]',
                          type === value ? 'bg-ink font-medium text-white' : 'bg-surface text-ink-muted hover:text-ink',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            {shown.length === 0 ? (
              <EmptyState title={t('garage.nothingFound')} text={t('garage.nothingFoundText')} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((vehicle) => (
                  <li key={vehicle.id} className="flex">
                    <VehicleCard
                      vehicle={vehicle}
                      active={vehicle.id === activeId}
                      onSetActive={() => setActive(vehicle.id)}
                      onRemove={() => remove.mutate(vehicle.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t('garage.addVehicle')}>
        <GarageVehicleForm onDone={() => setFormOpen(false)} />
      </Modal>
    </>
  )
}
