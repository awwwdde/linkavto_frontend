import { useMemo } from 'react'
import type { FacetOption } from '@/shared/api/types'
import { FilterShell } from './FilterShell'
import { OptionList } from './OptionList'

/** С какого размера списка появляется поиск внутри фасета. */
const SEARCHABLE = 8

const isNumeric = (options: FacetOption[]) => options.every((option) => /^[\d.,]+$/.test(option.label))

/**
 * Группа значений одного фасета: свёрнутое поле → список с галочками, поиском
 * и прокруткой (§2 ТЗ). Скрывается сама, если фильтровать нечем: пустой список
 * или единственное значение, которое всё равно ничего не сузит.
 */
export function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  onReset,
  placeholder,
}: {
  title: string
  options: FacetOption[]
  selected: string[]
  onToggle: (value: string) => void
  onReset?: () => void
  placeholder?: string
}) {
  // Размерности сортируем по числу, всё остальное — по частоте: сверху то,
  // чем реально пользуются, а не то, что раньше в алфавите.
  const sorted = useMemo(() => {
    const list = [...options]
    return isNumeric(list)
      ? list.sort((a, b) => Number(a.label.replace(',', '.')) - Number(b.label.replace(',', '.')))
      : list.sort((a, b) => b.count - a.count)
  }, [options])

  if (options.length < 2) return null

  const summary = sorted
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)
    .join(', ')

  return (
    <FilterShell
      title={title}
      summary={summary}
      placeholder={placeholder}
      count={selected.length}
      searchable={options.length >= SEARCHABLE}
      onReset={onReset}
    >
      {(query) => (
        <OptionList
          query={query}
          selected={selected}
          onToggle={onToggle}
          choices={sorted.map((option) => ({ value: option.value, label: option.label, count: option.count }))}
        />
      )}
    </FilterShell>
  )
}
