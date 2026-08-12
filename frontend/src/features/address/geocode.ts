import type { LatLng } from './TileMap'

/**
 * Геокодер адресов: подсказки при вводе и обратное геокодирование клика по
 * карте.
 *
 * Источников три, по убыванию точности. Основной — 2ГИС, он включается, когда
 * задан VITE_2GIS_KEY. Без ключа работает OpenStreetMap/Nominatim. Если сети
 * нет вовсе — локальный справочник ниже, чтобы витрина на моках оставалась
 * кликабельной. Наружу все три отдают один и тот же GeoPoint.
 */
export interface GeoPoint extends LatLng {
  address: string
  postal: string
}

export const MOSCOW_CENTER: LatLng = { lat: 55.751, lng: 37.6175 }

const DGIS_KEY = import.meta.env['VITE_2GIS_KEY'] ?? ''
const DGIS_ENDPOINT = 'https://catalog.api.2gis.com/3.0/items/geocode'
const DGIS_FIELDS = 'items.point,items.address,items.full_address_name'

const ENDPOINT = 'https://nominatim.openstreetmap.org'
const COMMON = 'format=jsonv2&addressdetails=1&accept-language=ru'

/** Резервный справочник — используется, когда геокодер недоступен. */
const FALLBACK: GeoPoint[] = [
  { address: 'Москва, ул. Тверская, 12', postal: '125009', lat: 55.7644, lng: 37.6062 },
  { address: 'Москва, Ленинградский пр-т, 80', postal: '125190', lat: 55.806, lng: 37.514 },
  { address: 'Москва, ул. Мясницкая, 26', postal: '101000', lat: 55.7686, lng: 37.6386 },
  { address: 'Москва, ул. Льва Толстого, 16', postal: '119021', lat: 55.734, lng: 37.5876 },
  { address: 'Москва, Кутузовский пр-т, 30', postal: '121165', lat: 55.7404, lng: 37.535 },
  { address: 'Москва, ул. Арбат, 24', postal: '119002', lat: 55.7498, lng: 37.591 },
  { address: 'Москва, Профсоюзная ул., 61', postal: '117420', lat: 55.6636, lng: 37.534 },
  { address: 'Москва, Ходынский б-р, 4', postal: '125252', lat: 55.7898, lng: 37.532 },
  { address: 'Москва, Щёлковское ш., 100', postal: '105523', lat: 55.8143, lng: 37.818 },
  { address: 'Москва, Волоколамское ш., 15', postal: '125080', lat: 55.8036, lng: 37.506 },
]

interface NominatimAddress {
  road?: string
  house_number?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  suburb?: string
  postcode?: string
}

/** «городской округ Казань» → «Казань»: в подсказке нужен только город. */
const cleanCity = (value?: string) =>
  value?.replace(/^(городской округ|муниципальный район|городское поселение|район)\s+/i, '').trim()

interface NominatimPlace {
  lat: string
  lon: string
  display_name?: string
  address?: NominatimAddress
}

/** Короткая строка «Город, улица, дом» вместо длинного display_name. */
function formatAddress(place: NominatimPlace): string {
  const a = place.address ?? {}
  const city =
    cleanCity(a.city) ?? cleanCity(a.town) ?? cleanCity(a.village) ?? cleanCity(a.municipality) ?? cleanCity(a.county) ?? a.state
  const street = [a.road, a.house_number].filter(Boolean).join(', ')
  const short = [city, street || a.suburb].filter(Boolean).join(', ')
  return short || place.display_name?.split(',').slice(0, 3).join(',') || ''
}

const toGeoPoint = (place: NominatimPlace): GeoPoint => ({
  address: formatAddress(place),
  postal: place.address?.postcode ?? '',
  lat: Number(place.lat),
  lng: Number(place.lon),
})

interface DgisItem {
  type?: string
  full_address_name?: string
  full_name?: string
  point?: { lat: number; lon: number }
  address?: { postcode?: string }
}

const dgisPoint = (item: DgisItem): GeoPoint | null => {
  const address = item.full_address_name ?? item.full_name ?? ''
  if (!address || !item.point) return null
  return { address, postal: item.address?.postcode ?? '', lat: item.point.lat, lng: item.point.lon }
}

async function dgisGeocode(params: string, signal?: AbortSignal): Promise<DgisItem[]> {
  const response = await fetch(`${DGIS_ENDPOINT}?${params}&fields=${DGIS_FIELDS}&key=${DGIS_KEY}`, { signal })
  if (!response.ok) throw new Error(String(response.status))
  const body = (await response.json()) as { result?: { items?: DgisItem[] } }
  return body.result?.items ?? []
}

const localMatches = (query: string): GeoPoint[] => {
  const value = query.trim().toLowerCase()
  return FALLBACK.filter((point) => point.address.toLowerCase().includes(value)).slice(0, 6)
}

/** Подсказки по вводу. Пустой массив — ничего не нашли. */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  const value = query.trim()
  if (value.length < 3) return []

  if (DGIS_KEY) {
    try {
      const items = await dgisGeocode(`q=${encodeURIComponent(value)}&page_size=6`, signal)
      const points = items.map(dgisPoint).filter((point): point is GeoPoint => point !== null)
      if (points.length > 0) return points
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      // 2ГИС недоступен или ключ отозвали — молча уходим на Nominatim ниже.
    }
  }

  try {
    const response = await fetch(
      `${ENDPOINT}/search?${COMMON}&limit=6&countrycodes=ru&q=${encodeURIComponent(value)}`,
      { signal },
    )
    if (!response.ok) throw new Error(String(response.status))
    const places = (await response.json()) as NominatimPlace[]
    // Геокодер отдаёт и здание, и объекты внутри него — после сокращения строки
    // они выглядят одинаково, поэтому оставляем по одному адресу.
    const unique = new Map<string, GeoPoint>()
    for (const place of places) {
      const point = toGeoPoint(place)
      if (point.address && !unique.has(point.address)) unique.set(point.address, point)
    }
    const points = [...unique.values()]
    return points.length > 0 ? points : localMatches(value)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return localMatches(value)
  }
}

/** Обратное геокодирование: что находится в точке клика по карте. */
export async function reverseGeocode(position: LatLng, signal?: AbortSignal): Promise<GeoPoint | null> {
  if (DGIS_KEY) {
    try {
      const items = await dgisGeocode(`lat=${position.lat}&lon=${position.lng}`, signal)
      // Первым в ответе часто идёт улица без дома и индекса — дом полезнее.
      const item = items.find((candidate) => candidate.type === 'building') ?? items[0]
      const point = item ? dgisPoint(item) : null
      // Координаты берём из клика: иначе метка прыгает в центр найденного дома.
      if (point) return { ...point, lat: position.lat, lng: position.lng }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
    }
  }

  try {
    const response = await fetch(
      `${ENDPOINT}/reverse?${COMMON}&zoom=18&lat=${position.lat}&lon=${position.lng}`,
      { signal },
    )
    if (!response.ok) throw new Error(String(response.status))
    const place = (await response.json()) as NominatimPlace
    const point = toGeoPoint(place)
    return point.address ? { ...point, lat: position.lat, lng: position.lng } : null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return nearestFallback(position)
  }
}

/** Ближайший адрес локального справочника — запасной вариант без сети. */
function nearestFallback(position: LatLng): GeoPoint {
  let best = FALLBACK[0]!
  let bestDistance = Number.POSITIVE_INFINITY
  for (const point of FALLBACK) {
    // Плоское приближение — на масштабе города погрешность несущественна.
    const dx = (point.lng - position.lng) * Math.cos((position.lat * Math.PI) / 180)
    const dy = point.lat - position.lat
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      bestDistance = distance
      best = point
    }
  }
  return best
}

/** Точка на карте для уже сохранённого адреса — чтобы метка встала на место. */
export function pointForAddress(address: string): GeoPoint | null {
  const value = address.trim().toLowerCase()
  if (!value) return null
  return FALLBACK.find((point) => point.address.toLowerCase() === value) ?? null
}
