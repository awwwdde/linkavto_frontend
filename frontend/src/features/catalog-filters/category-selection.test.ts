import { describe, expect, it } from 'vitest'
import type { CategoryNode } from '@/shared/api/types'
import { categoryQuery, encodeSelection, nextSelection } from './category-selection'

/** Минимальный узел дерева: правилам выбора важны только слаг и путь. */
function node(path: string): CategoryNode {
  const slug = path.split('/').pop()!
  return {
    id: path.length,
    name: slug,
    slug,
    path,
    level: path.split('/').length,
    products_count: 0,
    vehicle_type: 'car',
    show_in: 'cars',
    icon: null,
    has_children: false,
    children: [],
  }
}

const legkovye = node('legkovye')
const kuzov = node('legkovye/kuzov')
const optika = node('legkovye/kuzov/optika')
const bampery = node('legkovye/kuzov/bampery')
const dvigatel = node('legkovye/dvigatel')

describe('encodeSelection', () => {
  it('одна отметка становится путём — у выдачи один канонический адрес', () => {
    expect(encodeSelection([kuzov], legkovye)).toEqual({ path: 'legkovye/kuzov', categoryIn: [] })
  })

  it('пустой выбор возвращает на уровень, где шёл выбор', () => {
    expect(encodeSelection([], legkovye)).toEqual({ path: 'legkovye', categoryIn: [] })
  })

  it('несколько отметок — путь общего предка плюс category_in', () => {
    expect(encodeSelection([kuzov, dvigatel], legkovye)).toEqual({
      path: 'legkovye',
      categoryIn: ['kuzov', 'dvigatel'],
    })
  })

  it('общий предок ищется по всей глубине, а не только на уровне области', () => {
    expect(encodeSelection([optika, bampery], legkovye)).toEqual({
      path: 'legkovye/kuzov',
      categoryIn: ['optika', 'bampery'],
    })
  })
})

describe('nextSelection', () => {
  it('повторная отметка снимает выбор', () => {
    expect(nextSelection([kuzov], kuzov)).toEqual([])
  })

  it('потомок вытесняет ветку — это уточнение, а не второй фильтр', () => {
    expect(nextSelection([kuzov], optika)).toEqual([optika])
  })

  it('ветка поглощает уже отмеченных потомков', () => {
    expect(nextSelection([optika, bampery], kuzov)).toEqual([kuzov])
  })

  it('соседи складываются', () => {
    expect(nextSelection([kuzov], dvigatel)).toEqual([kuzov, dvigatel])
  })
})

describe('categoryQuery', () => {
  it('переносит общие фильтры и роняет профильные attr_*', () => {
    const query = categoryQuery(
      new URLSearchParams('in_stock=true&brand=lada&attr_side=Левая&category_in=kuzov&page=3'),
    )
    expect(query.get('in_stock')).toBe('true')
    expect(query.get('brand')).toBe('lada')
    expect(query.get('attr_side')).toBeNull()
    expect(query.get('category_in')).toBeNull()
    expect(query.get('page')).toBeNull()
  })
})
