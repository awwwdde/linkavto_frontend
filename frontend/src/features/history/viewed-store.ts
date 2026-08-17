import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProductListItem } from '@/shared/api/types'

const LIMIT = 12

interface ViewedState {
  items: ProductListItem[]
  push: (product: ProductListItem) => void
  clear: () => void
}

/**
 * Просмотренные товары — локальная история для блока «Вы смотрели».
 * Повторный заход поднимает товар наверх, а не плодит дубли.
 */
export const useViewedStore = create<ViewedState>()(
  persist(
    (set) => ({
      items: [],
      push: (product) =>
        set((state) => ({
          items: [product, ...state.items.filter((item) => item.id !== product.id)].slice(0, LIMIT),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'linkavto:viewed', version: 1 },
  ),
)
