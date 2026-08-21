import { get } from '@/shared/api/client'
import type {
  VehicleBrandOption,
  VehicleClassOption,
  VehicleGenerationOption,
  VehicleKind,
  VehicleModelOption,
  VehicleModificationOption,
} from '@/shared/api/types'

/**
 * TODO(api): этих ручек нет в контракте §7 — они выведены из моделей Django
 * (CarType/CarBrand/CarModel/CarGeneration/CarModification и аналоги).
 * Имена GET-параметров совпадают с shop/views.py.
 *
 * Родитель во всех запросах необязателен: без него ручка отдаёт полный список.
 * Родителей может быть несколько — CSV, как и у остальных мультифильтров
 * (`?brand=lada,kia` → модели обеих марок одним запросом).
 *
 * `category` задаёт раздел, по которому считается `products_count` у вариантов.
 */

function params(entries: Record<string, string | null | undefined>) {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(entries)) {
    if (value) out[key] = value
  }
  return out
}

const csv = (values: string[] | string | null): string | null =>
  Array.isArray(values) ? (values.length > 0 ? values.join(',') : null) : values

export const fetchVehicleClasses = (vehicleType: VehicleKind | null, category?: string | null) =>
  get<VehicleClassOption[]>('catalog/vehicle-classes/', params({ vehicle_type: vehicleType, category }))

export const fetchVehicleBrands = (
  vehicleType: VehicleKind | null,
  classSlug: string | null,
  category?: string | null,
) => get<VehicleBrandOption[]>('catalog/brands/', params({ vehicle_type: vehicleType, class: classSlug, category }))

export const fetchVehicleModels = (
  vehicleType: VehicleKind | null,
  brandSlugs: string[] | string | null,
  category?: string | null,
) => get<VehicleModelOption[]>('catalog/models/', params({ vehicle_type: vehicleType, brand: csv(brandSlugs), category }))

export const fetchVehicleGenerations = (
  vehicleType: VehicleKind | null,
  modelSlugs: string[] | string | null,
  category?: string | null,
) =>
  get<VehicleGenerationOption[]>(
    'catalog/generations/',
    params({ vehicle_type: vehicleType, model: csv(modelSlugs), category }),
  )

export const fetchVehicleModifications = (
  vehicleType: VehicleKind | null,
  generationSlugs: string[] | string | null,
  category?: string | null,
) =>
  get<VehicleModificationOption[]>(
    'catalog/modifications/',
    params({ vehicle_type: vehicleType, generation: csv(generationSlugs), category }),
  )
