import { useQuery } from '@tanstack/react-query'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'
import { IconClose } from '@/shared/ui/Icon'
import {
  fetchVehicleBrands,
  fetchVehicleClasses,
  fetchVehicleGenerations,
  fetchVehicleModels,
  fetchVehicleModifications,
} from '@/features/vehicle-filter/api'
import { useActiveVehicle } from '@/features/garage/store'
import { useCategorySelection } from './category-selection'
import { CATEGORY_PARAM, CLASS_PARAM, useCatalogParams } from './useCatalogParams'

const KIND_LABEL: Record<string, string> = {
  car: 'Легковые',
  truck: 'Грузовые',
  moto: 'Мото',
  special: 'Спецтехника',
}

interface Tag {
  id: string
  label: string
  onRemove: () => void
}

/** Активный фильтр — выделенный тег, который можно снять одним нажатием. */
function FilterTag({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-pill border border-ink bg-ink pr-1 pl-3 text-sm text-white">
      <span className="max-w-[220px] truncate">{tag.label}</span>
      <button
        type="button"
        onClick={tag.onRemove}
        aria-label={`Снять фильтр: ${tag.label}`}
        className="flex h-8 w-8 items-center justify-center rounded-pill text-white/70 transition-colors duration-[--duration-fast] hover:text-white"
      >
        <IconClose width={14} height={14} />
      </button>
    </span>
  )
}

export function SelectedFilters({
  className,
  categorySlug = '',
  attributeLabels,
}: {
  className?: string
  /** Текущая категория — по ней теги подкатегорий снимаются по правилу
      «одна отметка — путь» (см. category-selection.ts). */
  categorySlug?: string
  /** `attr_side` → «Сторона». Без имени оси значение вроде «Левая» ни о чём. */
  attributeLabels?: Record<string, string>
}) {
  const { params, applyVehicle, setParam, toggleInList, reset, activeCount } = useCatalogParams()
  const garageVehicle = useActiveVehicle()
  const kind = params.vehicleType

  // Запросы уже прогреты фильтром — берём из кэша, чтобы показать имена, а не слаги.
  const classes = useQuery({
    queryKey: ['vehicle', 'classes', kind],
    queryFn: () => fetchVehicleClasses(kind),
    enabled: Boolean(params.vehicleClass),
  })
  const brands = useQuery({
    queryKey: ['vehicle', 'brands', kind, params.vehicleClass, categorySlug || null],
    queryFn: () => fetchVehicleBrands(kind, params.vehicleClass, categorySlug || null),
    enabled: params.brands.length > 0,
  })
  const models = useQuery({
    queryKey: ['vehicle', 'models', kind, params.brands, categorySlug || null],
    queryFn: () => fetchVehicleModels(kind, params.brands, categorySlug || null),
    enabled: params.models.length > 0,
  })
  const generations = useQuery({
    queryKey: ['vehicle', 'generations', kind, params.models, categorySlug || null],
    queryFn: () => fetchVehicleGenerations(kind, params.models, categorySlug || null),
    enabled: params.generations.length > 0,
  })
  const modifications = useQuery({
    queryKey: ['vehicle', 'modifications', kind, params.generations, categorySlug || null],
    queryFn: () => fetchVehicleModifications(kind, params.generations, categorySlug || null),
    enabled: params.generations.length > 0,
  })
  const categories = useCategorySelection(categorySlug)

  const nameOf = (options: { slug: string; name: string }[] | undefined, slug: string) =>
    options?.find((option) => option.slug === slug)?.name ?? slug

  const tags: Tag[] = []

  if (params.garageVehicleId && garageVehicle) {
    tags.push({
      id: 'garage',
      label: garageVehicle.title,
      onRemove: () => setParam('garage_vehicle_id', null),
    })
  }

  // Категория пути видна в крошках и заголовке — тегами показываем только
  // дополнительные отметки, иначе один и тот же выбор дублируется дважды.
  for (const slug of params.categories) {
    tags.push({
      id: `category:${slug}`,
      label: categories.nameOf(slug),
      onRemove: () => (categories.scope ? categories.toggle(slug) : toggleInList(CATEGORY_PARAM, slug)),
    })
  }

  if (kind) {
    tags.push({
      id: `vehicle_type:${kind}`,
      label: KIND_LABEL[kind] ?? kind,
      onRemove: () =>
        applyVehicle({ vehicleType: null, brand: [], model: [], generation: [], modification: [] }),
    })
  }
  if (params.vehicleClass && kind) {
    tags.push({
      id: `class:${params.vehicleClass}`,
      label: nameOf(classes.data, params.vehicleClass),
      onRemove: () => setParam(CLASS_PARAM[kind], null),
    })
  }

  // Снятие тега уносит и потомков: без родителя они всё равно не показываются.
  for (const slug of params.brands) {
    tags.push({
      id: `brand:${slug}`,
      label: nameOf(brands.data, slug),
      onRemove: () =>
        applyVehicle({
          brand: params.brands.filter((item) => item !== slug),
          model: [],
          generation: [],
          modification: [],
        }),
    })
  }
  for (const slug of params.models) {
    tags.push({
      id: `model:${slug}`,
      label: nameOf(models.data, slug),
      onRemove: () =>
        applyVehicle({
          model: params.models.filter((item) => item !== slug),
          generation: [],
          modification: [],
        }),
    })
  }
  for (const slug of params.generations) {
    tags.push({
      id: `generation:${slug}`,
      label: nameOf(generations.data, slug),
      onRemove: () =>
        applyVehicle({
          generation: params.generations.filter((item) => item !== slug),
          modification: [],
        }),
    })
  }
  for (const slug of params.modifications) {
    tags.push({
      id: `modification:${slug}`,
      label: nameOf(modifications.data, slug),
      onRemove: () => applyVehicle({ modification: params.modifications.filter((item) => item !== slug) }),
    })
  }

  for (const value of params.manufacturers) {
    tags.push({ id: `manufacturer:${value}`, label: value, onRemove: () => toggleInList('manufacturer', value) })
  }
  for (const value of params.productBrands) {
    tags.push({ id: `product_brand:${value}`, label: value, onRemove: () => toggleInList('product_brand', value) })
  }

  if (params.priceMin || params.priceMax) {
    const from = params.priceMin ? `${t('catalog.priceFrom')} ${formatPrice(params.priceMin)}` : ''
    const to = params.priceMax ? `${t('catalog.priceTo')} ${formatPrice(params.priceMax)}` : ''
    tags.push({
      id: 'price',
      label: `${t('catalog.price')}: ${[from, to].filter(Boolean).join(' ')}`,
      onRemove: () => {
        setParam('price_min', null)
        setParam('price_max', null)
      },
    })
  }

  if (params.inStock) tags.push({ id: 'in_stock', label: t('catalog.inStock'), onRemove: () => setParam('in_stock', null) })
  if (params.onOrder) tags.push({ id: 'on_order', label: t('catalog.onOrder'), onRemove: () => setParam('on_order', null) })
  if (params.isOriginal)
    tags.push({ id: 'is_original', label: t('catalog.isOriginal'), onRemove: () => setParam('is_original', null) })

  for (const [code, values] of Object.entries(params.attributes)) {
    const axis = attributeLabels?.[code]
    for (const value of values) {
      tags.push({
        id: `${code}:${value}`,
        label: axis ? `${axis}: ${value}` : value,
        onRemove: () => toggleInList(code, value),
      })
    }
  }

  if (tags.length === 0) return null

  return (
    <div className={cn('no-scrollbar flex items-center gap-2 overflow-x-auto', className)}>
      {tags.map((tag) => (
        <FilterTag key={tag.id} tag={tag} />
      ))}

      {activeCount > 1 ? (
        <button
          type="button"
          onClick={reset}
          className="shrink-0 px-2 text-sm text-ink-muted underline transition-colors duration-[--duration-fast] hover:text-ink"
        >
          {t('catalog.filtersReset')}
        </button>
      ) : null}
    </div>
  )
}
