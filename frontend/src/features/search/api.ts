import { get } from '@/shared/api/client'
import type { SearchMode, SearchResponse, SearchSuggestion } from '@/shared/api/types'

export const fetchSuggestions = (q: string) => get<SearchSuggestion[]>('search/suggest/', { q })

export interface SearchParams {
  q: string
  type?: SearchMode
  garage_vehicle_id?: number
  /**
   * Остальное — фильтры каталога как есть (`queryParams` из useCatalogParams):
   * поиск сужается теми же фасетами, что и раздел, и незачем перечислять их
   * здесь по одному.
   */
  [key: string]: string | number | boolean | undefined
}

export function fetchSearch({ q, type = 'auto', ...rest }: SearchParams) {
  const params: Record<string, string | number | boolean> = { q, type }
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined && value !== '') params[key] = value
  }
  return get<SearchResponse>('search/', params)
}
