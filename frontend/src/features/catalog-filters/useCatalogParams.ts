import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { VehicleKind } from '@/shared/api/types'
import { PAGE_SIZE } from '@/shared/config'

/**
 * Имена GET-параметров один в один повторяют shop/views.py (category_view),
 * чтобы фронт и Django говорили на одном языке и ничего не пришлось
 * переименовывать на стороне бэкенда.
 *
 * Мультизначные параметры бэк принимает и как `?brand=a&brand=b`,
 * и как `?brand=a,b` — используем второй формат, он короче в ссылке.
 */

export const SORT_OPTIONS = [
  { value: 'popular', labelKey: 'catalog.sortPopular' },
  { value: 'price_asc', labelKey: 'catalog.sortCheap' },
  { value: 'price_desc', labelKey: 'catalog.sortExpensive' },
  { value: 'newest', labelKey: 'catalog.sortNew' },
] as const

export const DEFAULT_SORT = 'popular'

/** Ключ параметра класса техники зависит от типа: car_type/truck_type/… */
export const CLASS_PARAM: Record<VehicleKind, string> = {
  car: 'car_type',
  truck: 'truck_type',
  moto: 'moto_type',
  special: 'special_type',
}

/**
 * Уровни подбора техники с множественным выбором: марок можно отметить
 * несколько, и тогда ниже показываются модели всех отмеченных марок.
 * Порядок — от общего к частному, он же задаёт очерёдность блоков в панели.
 */
export const VEHICLE_LEVELS = ['brand', 'model', 'generation', 'modification'] as const

export type VehicleLevel = (typeof VEHICLE_LEVELS)[number]

/** Имя GET-параметра уровня совпадает с названием самого уровня. */
const VEHICLE_PARAM: Record<VehicleLevel, string> = {
  brand: 'brand',
  model: 'model',
  generation: 'generation',
  modification: 'modification',
}

/** Выбор по всем уровням каскада: на каждом — список слагов. */
export type VehicleSelection = Record<VehicleLevel, string[]>

/** Подкатегории, отмеченные галочками в блоке «Категория». */
export const CATEGORY_PARAM = 'category_in'

export interface CatalogParams {
  page: number
  sort: string
  priceMin: number | null
  priceMax: number | null
  /** Отмеченные подкатегории текущего раздела (мультивыбор по дереву). */
  categories: string[]
  manufacturers: string[]
  productBrands: string[]
  inStock: boolean
  onOrder: boolean
  isOriginal: boolean
  /** Тип техники: задаётся разделом либо чипами в универсальных разделах. */
  vehicleType: VehicleKind | null
  vehicleClass: string | null
  /** Каскад подбора техники — мультивыбор на каждом уровне. */
  brands: string[]
  models: string[]
  generations: string[]
  modifications: string[]
  /** Одношаговый подбор «как в гараже» — бэк сам разворачивает его в цепочку. */
  garageVehicleId: number | null
  /** Динамические атрибутные фильтры категории: `attr_<code>` → выбранные значения. */
  attributes: Record<string, string[]>
}

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

/** Разбор строки запроса в состояние фильтров. Чистая функция — тестируется без роутера. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const vehicleType = (searchParams.get('vehicle_type') as VehicleKind | null) ?? null
  const classParam = vehicleType ? CLASS_PARAM[vehicleType] : null

  // Атрибутные фильтры — любой параметр вида `attr_*` (§5, динамические фасеты).
  const attributes: Record<string, string[]> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('attr_') && value) attributes[key] = parseList(value)
  }

  return {
    page: Math.max(1, Number(searchParams.get('page') ?? 1)),
    sort: searchParams.get('sort') ?? DEFAULT_SORT,
    priceMin: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null,
    priceMax: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null,
    categories: parseList(searchParams.get(CATEGORY_PARAM)),
    manufacturers: parseList(searchParams.get('manufacturer')),
    productBrands: parseList(searchParams.get('product_brand')),
    inStock: searchParams.get('in_stock') === 'true',
    onOrder: searchParams.get('on_order') === 'true',
    isOriginal: searchParams.get('is_original') === 'true',
    vehicleType,
    vehicleClass: classParam ? searchParams.get(classParam) : null,
    brands: parseList(searchParams.get('brand')),
    models: parseList(searchParams.get('model')),
    generations: parseList(searchParams.get('generation')),
    modifications: parseList(searchParams.get('modification')),
    garageVehicleId: searchParams.get('garage_vehicle_id')
      ? Number(searchParams.get('garage_vehicle_id'))
      : null,
    attributes,
  }
}

/** Состояние фильтров → параметры запроса списка, уже в терминах бэкенда. */
export function toQueryParams(params: CatalogParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    page: params.page,
    page_size: PAGE_SIZE,
    sort: params.sort,
  }
  if (params.priceMin) out['price_min'] = params.priceMin
  if (params.priceMax) out['price_max'] = params.priceMax
  if (params.categories.length) out[CATEGORY_PARAM] = params.categories.join(',')
  if (params.manufacturers.length) out['manufacturer'] = params.manufacturers.join(',')
  if (params.productBrands.length) out['product_brand'] = params.productBrands.join(',')
  if (params.inStock) out['in_stock'] = true
  if (params.onOrder) out['on_order'] = true
  if (params.isOriginal) out['is_original'] = true
  if (params.vehicleType) out['vehicle_type'] = params.vehicleType
  if (params.vehicleType && params.vehicleClass) out[CLASS_PARAM[params.vehicleType]] = params.vehicleClass
  if (params.brands.length) out['brand'] = params.brands.join(',')
  if (params.models.length) out['model'] = params.models.join(',')
  if (params.generations.length) out['generation'] = params.generations.join(',')
  if (params.modifications.length) out['modification'] = params.modifications.join(',')
  if (params.garageVehicleId) out['garage_vehicle_id'] = params.garageVehicleId
  for (const [code, values] of Object.entries(params.attributes)) {
    if (values.length) out[code] = values.join(',')
  }
  return out
}

export function useCatalogParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => parseCatalogParams(searchParams), [searchParams])

  const patchParams = useCallback(
    (mutate: (next: URLSearchParams) => void, options?: { keepPage?: boolean }) => {
      const next = new URLSearchParams(searchParams)
      mutate(next)
      if (!options?.keepPage) next.delete('page')
      setSearchParams(next, { preventScrollReset: true })
    },
    [searchParams, setSearchParams],
  )

  const setParam = useCallback(
    (key: string, value: string | null) => {
      patchParams((next) => {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      })
    },
    [patchParams],
  )

  const setList = useCallback(
    (key: string, values: string[]) => setParam(key, values.length > 0 ? values.join(',') : null),
    [setParam],
  )

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = parseList(searchParams.get(key))
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      setList(key, next)
    },
    [searchParams, setList],
  )

  const setPage = useCallback(
    (page: number) => {
      patchParams(
        (next) => {
          if (page > 1) next.set('page', String(page))
          else next.delete('page')
        },
        { keepPage: true },
      )
    },
    [patchParams],
  )

  /**
   * Запись сразу нескольких уровней каскада одним переходом. Уровни независимы:
   * отметить можно и одну марку, и три поколения разных моделей. Обрезку
   * «осиротевших» потомков делает панель фильтров — только у неё есть
   * справочник, по которому видно, чей это потомок.
   */
  const applyVehicle = useCallback(
    (patch: Partial<VehicleSelection> & { vehicleType?: VehicleKind | null }) => {
      patchParams((next) => {
        if ('vehicleType' in patch) {
          if (patch.vehicleType) next.set('vehicle_type', patch.vehicleType)
          else {
            next.delete('vehicle_type')
            for (const key of Object.values(CLASS_PARAM)) next.delete(key)
          }
        }
        for (const level of VEHICLE_LEVELS) {
          const values = patch[level]
          if (!values) continue
          if (values.length > 0) next.set(VEHICLE_PARAM[level], values.join(','))
          else next.delete(VEHICLE_PARAM[level])
        }
      })
    },
    [patchParams],
  )

  const resetVehicle = useCallback(
    () => applyVehicle({ vehicleType: null, brand: [], model: [], generation: [], modification: [] }),
    [applyVehicle],
  )

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { preventScrollReset: true })
  }, [setSearchParams])

  const vehicleDepth =
    (params.vehicleClass ? 1 : 0) +
    params.brands.length +
    params.models.length +
    params.generations.length +
    params.modifications.length

  const activeCount =
    (params.priceMin || params.priceMax ? 1 : 0) +
    params.categories.length +
    params.manufacturers.length +
    params.productBrands.length +
    (params.inStock ? 1 : 0) +
    (params.onOrder ? 1 : 0) +
    (params.isOriginal ? 1 : 0) +
    Object.values(params.attributes).reduce((sum, values) => sum + values.length, 0) +
    (params.garageVehicleId ? 1 : 0) +
    vehicleDepth

  /** То, что уходит в запрос списка товаров — уже в терминах бэкенда. */
  const queryParams = useMemo(() => toQueryParams(params), [params])

  return {
    params,
    setParam,
    setList,
    toggleInList,
    setPage,
    applyVehicle,
    resetVehicle,
    reset,
    activeCount,
    vehicleDepth,
    queryParams,
  }
}
