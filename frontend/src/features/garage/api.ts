import { del, get, post } from '@/shared/api/client'
import type { GarageOption, GarageVehicle, VehicleType } from '@/shared/api/types'

export const fetchGarageVehicles = () => get<GarageVehicle[]>('garage/vehicles/')

/**
 * Названия, а не id: каскад подбора работает со слагами справочника, а гараж
 * хранит человекочитаемые поля. Раньше форма слала `make_id/model_id`, которых
 * бэк не читает, и любой автомобиль сохранялся как значение по умолчанию.
 */
export interface CreateVehiclePayload {
  vehicle_type?: VehicleType
  make?: string
  model?: string
  generation?: string
  modification?: string
  vin?: string
}

export const createGarageVehicle = (payload: CreateVehiclePayload) =>
  post<GarageVehicle>('garage/vehicles/', payload)

export const deleteGarageVehicle = (id: number) => del<void>(`garage/vehicles/${id}/`)

export const fetchMakes = (vehicleType: VehicleType) => get<GarageOption[]>('garage/makes/', { type: vehicleType })

export const fetchModels = (makeId: number) => get<GarageOption[]>('garage/models/', { make: makeId })

export const fetchModifications = (modelId: number) =>
  get<GarageOption[]>('garage/modifications/', { model: modelId })
