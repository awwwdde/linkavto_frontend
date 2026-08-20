import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/entities/product/api'
import { ProductCard, ProductGrid } from '@/entities/product/ProductCard'
import { queryKeys } from '@/shared/api/query-keys'
import { t } from '@/shared/i18n'
import { vehicleMeta } from '@/shared/lib/vehicle-types'
import { Badge, Button, Container, EmptyState, Modal, PageMeta, toast } from '@/shared/ui'
import { IconChevronLeft } from '@/shared/ui/Icon'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { GarageVehicleForm } from '@/features/garage/GarageVehicleForm'
import { partsHref } from '@/features/garage/VehicleCard'
import { deleteGarageVehicle } from '@/features/garage/api'
import { useGarageStore } from '@/features/garage/store'

/** Быстрые входы в каталог под это авто. Слаги — корневые разделы каталога. */
const SHORTCUTS: { slug: string; label: string }[] = [
  { slug: 'dlya-to', label: 'Запчасти для ТО' },
  { slug: 'shiny-i-diski', label: 'Шины и диски' },
  { slug: 'legkovye/kuzov', label: 'Кузовные детали' },
  { slug: 'legkovye/dvigatel', label: 'Двигатель' },
  { slug: 'legkovye/podveska', label: 'Подвеска' },
  { slug: 'legkovye/transmissiya', label: 'Трансмиссия' },
  { slug: 'legkovye/elektrika', label: 'Электрика' },
  { slug: 'legkovye/kuzov/optika', label: 'Фары и оптика' },
  { slug: 'legkovye/tormoznaya-sistema', label: 'Тормозная система' },
]

export function Component() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  const vehicles = useGarageStore((state) => state.vehicles)
  const activeId = useGarageStore((state) => state.activeVehicleId)
  const setActive = useGarageStore((state) => state.setActive)
  const removeVehicle = useGarageStore((state) => state.removeVehicle)

  const vehicle = vehicles.find((item) => String(item.id) === id) ?? null

  const remove = useMutation({
    mutationFn: deleteGarageVehicle,
    onSuccess: (_data, removedId) => {
      removeVehicle(removedId)
      toast.ok(t('garage.removed'))
      navigate('/garage')
    },
    onError: () => toast.error('Удалить не вышло. Повторите через минуту.'),
  })

  // Рекомендации — популярное в разделе под тип техники этого авто.
  const rootSlug = vehicleMeta(vehicle?.vehicle_type)?.slug ?? 'legkovye'
  const listParams = { category: rootSlug, page_size: 12, ordering: 'popular' }
  const recommended = useQuery({
    queryKey: queryKeys.products.list(listParams),
    queryFn: () => fetchProducts(listParams),
    enabled: Boolean(vehicle),
  })

  if (!vehicle) {
    return (
      <Container className="py-12">
        <PageMeta title="Гараж — LINKAVTO" canonicalPath={`/garage/${id}`} noIndex />
        <EmptyState
          title={t('garage.notFound')}
          text={t('garage.notFoundText')}
          action={<Button onClick={() => navigate('/garage')}>{t('garage.title')}</Button>}
        />
      </Container>
    )
  }

  const isActive = vehicle.id === activeId
  const specs = [
    { label: t('garage.make'), value: vehicle.make },
    { label: t('garage.model'), value: vehicle.model },
    { label: t('garage.modification'), value: vehicle.modification },
    { label: 'Год', value: vehicle.year ? String(vehicle.year) : null },
    { label: t('garage.vin'), value: vehicle.vin },
  ].filter((spec) => Boolean(spec.value))

  return (
    <>
      <PageMeta title={`${vehicle.title} — Гараж LINKAVTO`} canonicalPath={`/garage/${vehicle.id}`} noIndex />

      <Container className="flex flex-col gap-8 py-6 lg:py-10">
        <section className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/garage')}
              aria-label={t('nav.back')}
              className="flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-[--duration-fast] hover:bg-ink/5 hover:text-ink"
            >
              <IconChevronLeft />
            </button>
            <h1 className="text-xl font-semibold lg:text-2xl">{vehicle.title}</h1>
            {isActive ? <Badge tone="ok">{t('garage.active')}</Badge> : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((spec) => (
              <div key={spec.label} className="flex flex-col">
                <dt className="text-sm text-ink-muted">{spec.label}</dt>
                <dd className={spec.label === t('garage.vin') ? 'font-mono text-base' : 'text-base'}>{spec.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Link
              to={partsHref(vehicle)}
              className="flex min-h-10 items-center rounded-control bg-accent px-4 text-base font-medium text-white transition-colors duration-[--duration-fast] hover:bg-accent-hover"
            >
              {t('garage.partsFor')}
            </Link>
            {/* TODO(api): редактирование требует обратного маппинга сохранённых
                названий в id справочника — форма пока умеет только добавлять,
                и кнопка «Редактировать» создавала бы дубль вместо правки. */}
            {isActive ? null : (
              <Button variant="secondary" onClick={() => setActive(vehicle.id)}>
                {t('garage.setActive')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => remove.mutate(vehicle.id)} loading={remove.isPending}>
              {t('garage.remove')}
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading lead={t('garage.shortcuts')} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.slug}>
                <Link
                  to={`/category/${shortcut.slug}?garage_vehicle_id=${vehicle.id}`}
                  className="flex min-h-16 items-center rounded-card bg-surface px-4 text-base font-medium shadow-float transition-colors duration-[--duration-fast] hover:bg-paper"
                >
                  {shortcut.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {recommended.data && recommended.data.results.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading lead={t('cart.recommended')} />
            <ProductGrid dense>
              {recommended.data.results.slice(0, 12).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </section>
        ) : null}
      </Container>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('garage.addVehicle')}>
        <GarageVehicleForm onDone={() => setEditOpen(false)} />
      </Modal>
    </>
  )
}
