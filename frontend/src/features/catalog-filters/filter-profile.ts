import type { CategoryDetail, VehicleKind, VehicleType } from '@/shared/api/types'

/**
 * Режим каскада «подбор по автомобилю» в панели фильтров:
 * - `locked`   — раздел уже задаёт тип техники (Легковые/Грузовые/Мото/Спец),
 *                чипы типа скрыты, списки марок/классов сужены до этого типа;
 * - `optional` — тип техники не главный (шины, масла/ТО): каскад свёрнут под
 *                кнопку, главные оси — размер/спецификация из фасетов бэка;
 * - `full`     — универсальный раздел: полный каскад с выбором типа (как раньше).
 */
export type VehicleFilterMode = 'locked' | 'optional' | 'full'

export interface FilterProfile {
  vehicleMode: VehicleFilterMode
  /** Тип техники, к которому привязан раздел (только для `locked`). */
  lockedKind: VehicleKind | null
  /**
   * Профильные фасеты раздела (§1: у кузовных — «Тип кузова» и «Сторона»,
   * у фар — «Сторона» и «Передняя/задняя»). Это коды тех же атрибутных
   * фасетов, что приходят в `facets.attributes`; профиль лишь поднимает их
   * наверх панели и задаёт порядок.
   */
  featuredFacets: string[]
}

const LOCKED_KINDS = new Set<VehicleType>(['car', 'truck', 'moto', 'special'])

/**
 * Разделы, где нужны собственные оси фильтрации. Совпадение ищем по имени
 * категории и по именам предков: «Сторона» нужна и в «Кузов → Оптика → Фары»,
 * и в самих «Фарах», на какой бы глубине они ни лежали.
 */
const FEATURED_BY_SECTION: { match: RegExp; codes: string[] }[] = [
  // Фары проверяем первыми: они лежат внутри кузовной ветки, а оси у них свои.
  { match: /фар|фонар|оптик|птф/i, codes: ['attr_side', 'attr_position'] },
  { match: /кузов|бампер|крыл|капот|двер|порог|зеркал/i, codes: ['attr_body_type', 'attr_side'] },
]

function featuredFacetsFor(category: CategoryDetail | null | undefined): string[] {
  if (!category) return []
  const names = [category.name, ...category.breadcrumbs.map((crumb) => crumb.name)]
  return FEATURED_BY_SECTION.find((section) => names.some((name) => section.match.test(name)))?.codes ?? []
}

/**
 * Профиль фильтров выводится из категории: `vehicle_type` — то же поле,
 * по которому бэк решает, какие фасеты прислать, а имя раздела включает
 * профильные оси вроде «Тип кузова».
 */
export function filterProfile(category: CategoryDetail | null | undefined): FilterProfile {
  const vehicleType = category?.vehicle_type
  const featuredFacets = featuredFacetsFor(category)

  if (vehicleType && LOCKED_KINDS.has(vehicleType)) {
    return { vehicleMode: 'locked', lockedKind: vehicleType as VehicleKind, featuredFacets }
  }
  // tires / service — профильные оси главные, авто-подбор вторичен.
  if (vehicleType === 'tires' || vehicleType === 'service') {
    return { vehicleMode: 'optional', lockedKind: null, featuredFacets }
  }
  return { vehicleMode: 'full', lockedKind: null, featuredFacets }
}
