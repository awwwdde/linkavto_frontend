import type { PickupProvider } from '@/shared/api/types'
import type { MapBounds } from './TileMap'

/**
 * Пункты выдачи для самовывоза. В выдаче участвуют только Почта России и СДЭК;
 * лейблы остальных служб оставлены для адресов, сохранённых раньше.
 *
 * TODO(api): точки приходят от служб доставки (`delivery/pickup-points/`) с
 * реальными координатами. Здесь — мок-справочник с координатами в процентах
 * полотна карты (0…100), чтобы метки раскладывались без внешних запросов.
 */
export const PICKUP_PROVIDERS: { value: PickupProvider; label: string; short: string }[] = [
  { value: 'post', label: 'Почта России', short: 'ПОЧТА' },
  { value: 'cdek', label: 'СДЭК', short: 'СДЭК' },
]

export const DEFAULT_PICKUP_PROVIDER: PickupProvider = 'post'

export const PROVIDER_LABEL: Record<PickupProvider, string> = {
  post: 'Почта России',
  cdek: 'СДЭК',
  boxberry: 'Boxberry',
  yandex: 'Яндекс Доставка',
}

export interface PickupPoint {
  provider: PickupProvider
  /** Короткое имя пункта — оно же сохраняется в адресе. */
  name: string
  address: string
  schedule: string
  lat: number
  lng: number
}

const POINTS: PickupPoint[] = [
  { provider: 'post', name: 'Отделение 101000', address: 'Мясницкая ул., 26', schedule: 'пн–пт 09:00–20:00, сб 09:00–18:00', lat: 55.7686, lng: 37.6386 },
  { provider: 'post', name: 'Отделение 119021', address: 'ул. Льва Толстого, 16', schedule: 'пн–пт 09:00–19:00', lat: 55.734, lng: 37.5876 },
  { provider: 'post', name: 'Отделение 125009', address: 'ул. Тверская, 12', schedule: 'ежедневно 08:00–20:00', lat: 55.7644, lng: 37.6062 },
  { provider: 'post', name: 'Отделение 117420', address: 'Профсоюзная ул., 61', schedule: 'пн–сб 09:00–19:00', lat: 55.6636, lng: 37.534 },
  { provider: 'post', name: 'Отделение 125080', address: 'Волоколамское ш., 15', schedule: 'пн–пт 09:00–19:00', lat: 55.8036, lng: 37.506 },
  { provider: 'post', name: 'Отделение 105523', address: 'Щёлковское ш., 100', schedule: 'пн–сб 09:00–20:00', lat: 55.8143, lng: 37.818 },
  { provider: 'post', name: 'Отделение 119048', address: 'Комсомольский пр-т, 42', schedule: 'пн–пт 09:00–19:00', lat: 55.7237, lng: 37.5766 },
  { provider: 'cdek', name: 'СДЭК Тверская', address: 'ул. Тверская, 12, офис 4', schedule: 'ежедневно 10:00–21:00', lat: 55.7662, lng: 37.6045 },
  { provider: 'cdek', name: 'СДЭК Ленинградский', address: 'Ленинградский пр-т, 80', schedule: 'пн–сб 09:00–20:00', lat: 55.806, lng: 37.514 },
  { provider: 'cdek', name: 'СДЭК Кутузовский', address: 'Кутузовский пр-т, 30', schedule: 'пн–пт 10:00–19:00', lat: 55.7404, lng: 37.535 },
  { provider: 'cdek', name: 'СДЭК Арбат', address: 'ул. Арбат, 24', schedule: 'ежедневно 10:00–22:00', lat: 55.7498, lng: 37.591 },
  { provider: 'cdek', name: 'СДЭК Авиапарк', address: 'Ходынский б-р, 4', schedule: 'ежедневно 10:00–22:00', lat: 55.7898, lng: 37.532 },
  { provider: 'cdek', name: 'СДЭК Автозаводская', address: 'Автозаводская ул., 18', schedule: 'пн–сб 10:00–20:00', lat: 55.708, lng: 37.657 },
]

/** Точки выбранных служб; пустой фильтр — значит показываем все. */
export function pickupPoints(providers?: PickupProvider[]): PickupPoint[] {
  if (!providers || providers.length === 0) return POINTS
  return POINTS.filter((point) => providers.includes(point.provider))
}

export const findPickupPoint = (name: string): PickupPoint | null =>
  POINTS.find((point) => point.name === name) ?? null

/* --- Реальные пункты выдачи из справочника 2ГИС --------------------------- */

const DGIS_KEY = import.meta.env['VITE_2GIS_KEY'] ?? ''
const DGIS_ITEMS = 'https://catalog.api.2gis.com/3.0/items'
const DGIS_FIELDS = 'items.point,items.address,items.schedule'
/** Максимум, который отдаёт справочник за страницу. */
const PAGE_SIZE = 50
/** Потолок страниц: на весь регион точек тысячи, столько на карте не нужно. */
const MAX_PAGES = 6
/** Справочник иногда не отвечает вовсе — без потолка лоадер крутился бы вечно. */
const TIMEOUT_MS = 10_000

/** Запрос в справочнике: у операторов десятки вариантов написания вывески. */
const QUERY: Record<PickupProvider, string> = {
  post: 'Почта России',
  cdek: 'СДЭК',
  boxberry: 'Boxberry',
  yandex: 'Яндекс Доставка',
}

interface DgisPlace {
  id?: string
  name?: string
  address_name?: string
  full_address_name?: string
  point?: { lat: number; lon: number }
  schedule?: Record<string, { working_hours?: { from?: string; to?: string }[] }>
}

const DAYS: Record<string, string> = {
  Mon: 'пн',
  Tue: 'вт',
  Wed: 'ср',
  Thu: 'чт',
  Fri: 'пт',
  Sat: 'сб',
  Sun: 'вс',
}

/** «Mon 09:00–20:00, Tue …» — в короткую строку для подписи под полем. */
function formatSchedule(schedule: DgisPlace['schedule']): string {
  if (!schedule) return 'Режим работы уточняйте'
  const parts: string[] = []
  for (const [day, value] of Object.entries(schedule)) {
    const hours = value.working_hours?.[0]
    if (!DAYS[day] || !hours?.from || !hours.to) continue
    parts.push(`${DAYS[day]} ${hours.from}–${hours.to}`)
  }
  return parts.length > 0 ? parts.join(', ') : 'Режим работы уточняйте'
}

function toPickupPoint(place: DgisPlace, provider: PickupProvider): PickupPoint | null {
  if (!place.point) return null
  const address = place.full_address_name ?? place.address_name ?? ''
  if (!address) return null
  return {
    provider,
    name: place.name?.trim() || address,
    address,
    schedule: formatSchedule(place.schedule),
    lat: place.point.lat,
    lng: place.point.lon,
  }
}

/**
 * Пункты одного оператора в пределах видимой области карты. Справочник отдаёт
 * постранично, поэтому идём по страницам, пока они не кончатся или пока не
 * упрёмся в MAX_PAGES.
 */
async function fetchProviderPoints(
  provider: PickupProvider,
  bounds: MapBounds,
  signal: AbortSignal,
): Promise<PickupPoint[]> {
  const area = `point1=${bounds.west},${bounds.north}&point2=${bounds.east},${bounds.south}`
  const found: PickupPoint[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${DGIS_ITEMS}?q=${encodeURIComponent(QUERY[provider])}&${area}&page=${page}&page_size=${PAGE_SIZE}&fields=${DGIS_FIELDS}&key=${DGIS_KEY}`
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(String(response.status))
    const body = (await response.json()) as { result?: { items?: DgisPlace[] } }
    const items = body.result?.items ?? []
    for (const item of items) {
      const point = toPickupPoint(item, provider)
      if (point) found.push(point)
    }
    if (items.length < PAGE_SIZE) break
  }

  return found
}

/**
 * Пункты выбранных операторов в видимой области. Без ключа 2ГИС отдаём
 * мок-справочник — витрина остаётся кликабельной.
 */
export async function fetchPickupPoints(
  providers: PickupProvider[],
  bounds: MapBounds,
  signal: AbortSignal,
): Promise<PickupPoint[]> {
  if (!DGIS_KEY || providers.length === 0) return pickupPoints(providers)

  // Отмена приходит из двух мест: пользователь сдвинул карту либо истёк таймаут.
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort)
  const timer = window.setTimeout(abort, TIMEOUT_MS)

  let lists: PickupPoint[][]
  try {
    lists = await Promise.all(providers.map((provider) => fetchProviderPoints(provider, bounds, controller.signal)))
  } catch (error) {
    // Отмену по таймауту нельзя выдавать за отмену пользователем: вызывающий
    // молча игнорирует AbortError, и загрузка осталась бы висеть навсегда.
    if (!signal.aborted && error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('2GIS catalog timeout')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }

  // У сетевых операторов один адрес попадается в выдаче не раз — схлопываем.
  const unique = new Map<string, PickupPoint>()
  for (const point of lists.flat()) {
    const key = `${point.provider}:${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`
    if (!unique.has(key)) unique.set(key, point)
  }
  return [...unique.values()]
}
