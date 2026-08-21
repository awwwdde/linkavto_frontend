import { describe, expect, it } from 'vitest'
import { PAGE_SIZE } from '@/shared/config'
import { DEFAULT_SORT, parseCatalogParams, toQueryParams } from './useCatalogParams'

const parse = (search: string) => parseCatalogParams(new URLSearchParams(search))

describe('parseCatalogParams', () => {
  it('пустая строка даёт пустые фильтры и первую страницу', () => {
    const params = parse('')
    expect(params.page).toBe(1)
    expect(params.sort).toBe(DEFAULT_SORT)
    expect(params.brands).toEqual([])
    expect(params.categories).toEqual([])
    expect(params.attributes).toEqual({})
  })

  it('уровни каскада разбираются как CSV-мультивыбор', () => {
    const params = parse('brand=lada,kia&model=lada-vesta&generation=&modification=a,b')
    expect(params.brands).toEqual(['lada', 'kia'])
    expect(params.models).toEqual(['lada-vesta'])
    expect(params.generations).toEqual([])
    expect(params.modifications).toEqual(['a', 'b'])
  })

  it('класс техники читается из ключа своего типа', () => {
    expect(parse('vehicle_type=truck&truck_type=tyagach').vehicleClass).toBe('tyagach')
    // Ключ чужого типа игнорируется — иначе «седан» протёк бы в грузовые.
    expect(parse('vehicle_type=truck&car_type=sedan').vehicleClass).toBeNull()
  })

  it('атрибутные фильтры собираются по префиксу attr_', () => {
    const params = parse('attr_side=Левая,Правая&attr_position=&sort=price_asc')
    expect(params.attributes).toEqual({ attr_side: ['Левая', 'Правая'] })
    expect(params.sort).toBe('price_asc')
  })

  it('страница не опускается ниже первой', () => {
    expect(parse('page=0').page).toBe(1)
    expect(parse('page=-5').page).toBe(1)
    expect(parse('page=4').page).toBe(4)
  })
})

describe('toQueryParams', () => {
  it('пустые фильтры не попадают в запрос', () => {
    expect(toQueryParams(parse(''))).toEqual({ page: 1, page_size: PAGE_SIZE, sort: DEFAULT_SORT })
  })

  it('мультизначные фильтры уходят одной строкой через запятую', () => {
    const query = toQueryParams(parse('brand=lada,kia&category_in=kuzov,dvigatel&attr_side=Левая'))
    expect(query['brand']).toBe('lada,kia')
    expect(query['category_in']).toBe('kuzov,dvigatel')
    expect(query['attr_side']).toBe('Левая')
  })

  it('класс техники уходит под ключом своего типа', () => {
    expect(toQueryParams(parse('vehicle_type=moto&moto_type=skuter'))['moto_type']).toBe('skuter')
  })

  it('флаги наличия передаются только когда включены', () => {
    expect(toQueryParams(parse('in_stock=true'))['in_stock']).toBe(true)
    expect(toQueryParams(parse('in_stock=false'))['in_stock']).toBeUndefined()
  })
})
