import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import type { Address, DeliveryType, PickupProvider } from '@/shared/api/types'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Button, Input, Modal, toast } from '@/shared/ui'
import { IconAddress, IconGarage, IconTypeTruck } from '@/shared/ui/Icon'
import { usePrefersReducedMotion } from '@/shared/lib/media'
import { MOSCOW_CENTER, pointForAddress, reverseGeocode, searchAddress, type GeoPoint } from './geocode'
import { TileMap, type LatLng, type MapMarker } from './TileMap'
import { DEFAULT_PICKUP_PROVIDER, findPickupPoint, PICKUP_PROVIDERS, pickupPoints, type PickupPoint } from './pickup'
import { ProviderLogo } from './ProviderLogo'
import { useAddressStore, type AddressDraft } from './store'

const pickupLabel = (point: PickupPoint) => `${point.name} — ${point.address}`

/**
 * Высота рабочей области: карта тянется по окну, но окно не уезжает в скролл.
 * Нижняя граница — высота левой колонки, чтобы её содержимое не обрезалось.
 */
export const PICKER_BODY_HEIGHT = 'lg:h-[clamp(452px,calc(90dvh-230px),620px)]'

interface BodyProps {
  initial?: Address
  onCancel: () => void
  onDone: () => void
}

/**
 * §7: содержимое выбора адреса — слева поиск и параметры, справа карта 2ГИС.
 * «Доставка» — адрес подставляется при вводе или кликом по карте, «Самовывоз» —
 * пункт выбирается меткой (Почта России и СДЭК). Геометрия панелей фиксирована,
 * поэтому переключение режимов ничего не двигает.
 */
export function AddressPickerBody({ initial, onCancel, onDone }: BodyProps) {
  const add = useAddressStore((s) => s.add)
  const update = useAddressStore((s) => s.update)
  const reduced = usePrefersReducedMotion()
  const tabsId = useId()

  const [tab, setTab] = useState<DeliveryType>(initial?.delivery_type ?? 'courier')
  const [query, setQuery] = useState(initial?.delivery_type === 'pickup' ? '' : (initial?.full_address ?? ''))
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [geo, setGeo] = useState<GeoPoint | null>(() => pointForAddress(initial?.full_address ?? ''))
  const [point, setPoint] = useState<PickupPoint | null>(() => findPickupPoint(initial?.pickup_point_name ?? ''))
  const [providers, setProviders] = useState<PickupProvider[]>(() => PICKUP_PROVIDERS.map((p) => p.value))

  const [suggestions, setSuggestions] = useState<GeoPoint[]>([])

  const isPickup = tab === 'pickup'
  const valid = isPickup ? Boolean(point) : query.trim().length > 0

  // Подсказки геокодера: пауза после ввода и отмена предыдущего запроса, чтобы
  // не бомбить сервис на каждую букву и не показывать устаревший ответ.
  useEffect(() => {
    if (isPickup || !suggestOpen || query.trim().length < 3 || query === geo?.address) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchAddress(query, controller.signal)
        .then(setSuggestions)
        .catch(() => {
          /* запрос отменён — ответ уже не нужен */
        })
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, suggestOpen, isPickup, geo?.address])

  // Центр карты — выбранная точка режима, иначе центр города. Ввод символов
  // центр не двигает: иначе карта дёргалась бы на каждую букву.
  const center = useMemo<LatLng>(() => {
    const chosen = isPickup ? point : geo
    return chosen ? { lat: chosen.lat, lng: chosen.lng } : MOSCOW_CENTER
  }, [isPickup, point, geo])

  const markers: MapMarker[] = isPickup
    ? pickupPoints(providers).map((item) => ({
        id: item.name,
        position: { lat: item.lat, lng: item.lng },
        label: `${item.name}, ${item.address}`,
        active: point?.name === item.name,
        icon: <ProviderLogo provider={item.provider} className="h-4 w-6" />,
        onSelect: () => setPoint(item),
      }))
    : []

  const chooseGeo = (next: GeoPoint) => {
    setGeo(next)
    setQuery(next.address)
    setSuggestions([])
    setSuggestOpen(false)
  }

  // Клик по карте: спрашиваем геокодер, что находится в точке.
  const pickOnMap = (position: LatLng) => {
    reverseGeocode(position)
      .then((found) => {
        if (found) chooseGeo(found)
      })
      .catch(() => {
        /* точка без адреса — оставляем поле как есть */
      })
  }

  const toggleProvider = (value: PickupProvider) =>
    setProviders((state) => (state.includes(value) ? state.filter((p) => p !== value) : [...state, value]))

  const submit = () => {
    if (!valid) return
    // Ярлык, комментарий и флаг «основной» из формы убраны: у нового адреса они
    // пустые, при редактировании остаются какими были. Основной адрес теперь
    // назначается из списка адресов (AddressMenu), первый добавленный — сам.
    const kept = {
      title: initial?.title ?? '',
      comment: initial?.comment ?? '',
      is_default: initial?.is_default ?? false,
    }
    const draft: AddressDraft = isPickup
      ? {
          ...kept,
          delivery_type: 'pickup',
          full_address: point ? pickupLabel(point) : '',
          postal_code: '',
          pickup_provider: point?.provider ?? DEFAULT_PICKUP_PROVIDER,
          pickup_point_name: point?.name ?? null,
        }
      : {
          ...kept,
          delivery_type: 'courier',
          full_address: query.trim(),
          postal_code: geo?.postal ?? '',
          pickup_provider: null,
          pickup_point_name: null,
        }

    if (initial) update(initial.id, draft)
    else add(draft)
    toast.ok(t('address.saved'))
    onDone()
  }

  const tabButton = (type: DeliveryType, label: string, Icon: typeof IconTypeTruck) => {
    const active = tab === type
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setTab(type)}
        className={cn(
          'relative flex h-10 flex-1 items-center justify-center gap-2 rounded-pill px-3 text-sm font-medium',
          'transition-colors duration-[--duration-fast]',
          active ? 'text-white' : 'text-ink hover:text-ink-muted',
        )}
      >
        {active ? (
          <motion.span
            layoutId={`${tabsId}-active`}
            transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0.15 }}
            className="absolute inset-0 rounded-pill bg-accent"
          />
        ) : null}
        <Icon width={16} height={16} className="relative shrink-0" />
        <span className="relative truncate">{label}</span>
      </button>
    )
  }

  // Строка под полем — только для ПВЗ: адрес и режим работы выбранного пункта.
  // У курьера подпись убрана, поэтому подсказка сюда больше не заводится.
  const info = point ? `${point.address} · ${point.schedule}` : t('address.pickPointHint')

  return (
    <>
      <div className={cn('grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]', PICKER_BODY_HEIGHT)}>
        {/* Левая панель — поиск и параметры адреса */}
        <div className="flex min-h-0 flex-col gap-2.5">
          <p className="text-md font-semibold">{t('address.searchTitle')}</p>

          <div className="flex gap-1 rounded-pill bg-paper p-1">
            {tabButton('courier', t('address.courier'), IconTypeTruck)}
            {tabButton('pickup', t('address.pickup'), IconGarage)}
          </div>

          <div className="relative">
            <Input
              label={isPickup ? t('address.pickupLabel') : t('address.courierLabel')}
              placeholder={isPickup ? t('address.pickPointHint') : t('address.fullPlaceholder')}
              autoComplete="off"
              readOnly={isPickup}
              value={isPickup ? (point ? pickupLabel(point) : '') : query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSuggestOpen(true)
              }}
              onFocus={() => setSuggestOpen(true)}
              // Клик по подсказке успевает отработать до закрытия списка.
              onBlur={() => window.setTimeout(() => setSuggestOpen(false), 120)}
              className={cn(isPickup && 'cursor-default')}
            />

            <AnimatePresence>
              {suggestions.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: reduced ? 0 : 0.15 }}
                  className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-control border border-line bg-surface shadow-float"
                >
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.address}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseGeo(suggestion)}
                        className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-ink transition-colors duration-[--duration-fast] hover:bg-paper"
                      >
                        <IconAddress width={16} height={16} className="shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate">{suggestion.address}</span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Адрес и режим работы выбранного ПВЗ. Высота фиксирована, чтобы
              переключение вкладок не дёргало колонку. */}
          {isPickup ? (
            <div className="relative h-5">
              <AnimatePresence initial={false}>
                <motion.p
                  key={info}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                  className="absolute inset-0 truncate text-xs text-ink-muted"
                >
                  {info}
                </motion.p>
              </AnimatePresence>
            </div>
          ) : null}

          {/* Без mt-auto: полей осталось мало, и прижатый к низу колонки текст
              висел бы в пустоте в паре сотен пикселей от поля адреса. */}
          <p className="mt-1 text-[11px] leading-4 text-ink-muted">
            {t('address.legalLead')}{' '}
            <Link to="/terms" className="text-accent hover:underline">
              {t('address.legalTerms')}
            </Link>{' '}
            {t('address.legalMiddle')}{' '}
            <Link to="/privacy" className="text-accent hover:underline">
              {t('address.legalPrivacy')}
            </Link>
          </p>
        </div>

        {/* Правая панель — карта 2ГИС */}
        <TileMap
          className="h-[260px] lg:h-full"
          center={center}
          zoom={isPickup ? 11 : 12}
          markers={markers}
          pin={!isPickup && geo ? { lat: geo.lat, lng: geo.lng } : null}
          onPick={isPickup ? undefined : pickOnMap}
          overlay={
            <AnimatePresence initial={false}>
              {isPickup ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="flex gap-1 rounded-control bg-surface/95 p-1 shadow-float"
                >
                  {PICKUP_PROVIDERS.map((provider) => {
                    const on = providers.includes(provider.value)
                    return (
                      <button
                        key={provider.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleProvider(provider.value)}
                        title={provider.label}
                        className={cn(
                          'flex h-9 items-center gap-1.5 rounded-control px-2.5 text-xs font-semibold',
                          'transition-[background-color,opacity] duration-[--duration-fast]',
                          // Выключенный оператор глушится прозрачностью: заливать
                          // цветное лого белым текстом, как раньше иконку, нельзя.
                          on ? 'bg-paper text-ink ring-1 ring-accent' : 'bg-paper/70 text-ink-muted opacity-60 hover:opacity-100',
                        )}
                      >
                        <ProviderLogo provider={provider.value} className="h-3.5 w-6" />
                        {provider.short}
                      </button>
                    )
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          }
        />
      </div>

      <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={submit} disabled={!valid}>
          {initial ? t('address.save') : t('address.add')}
        </Button>
      </div>
    </>
  )
}

/** Отдельное окно выбора адреса — для профиля, где списка над ним нет. */
export function AddressPicker({ open, initial, onClose }: { open: boolean; initial?: Address; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={t('address.pickerTitle')} maxWidth={1120}>
      <AddressPickerBody initial={initial} onCancel={onClose} onDone={onClose} />
    </Modal>
  )
}
