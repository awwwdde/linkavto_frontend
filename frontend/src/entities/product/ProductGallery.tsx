import { useState } from 'react'
import type { ImageSet } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'
import { Img } from '@/shared/ui'

/** Свайп на mobile (scroll-snap), выбор миниатюрой на desktop. */
export function ProductGallery({ images, name }: { images: ImageSet[]; name: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  if (images.length === 0) {
    return <Img src={null} alt={name} width={800} height={800} className="w-full rounded-card" />
  }

  return (
    /*
     * На десктопе миниатюры вынесены из потока (absolute под карточкой). Иначе
     * они забирали часть высоты колонки, и белая карточка с фото не доходила до
     * низа блока с информацией. Теперь высоту ряда задаёт правая колонка, а
     * карточка тянется ровно под неё; место под миниатюры резервирует отступ
     * грида на странице товара.
     */
    <div className="flex flex-col gap-3 lg:relative lg:h-full lg:gap-0">
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-card bg-surface lg:h-full">
        {images.map((image, index) => (
          <div
            key={image.card}
            className={cn(
              'w-full shrink-0 snap-center p-4',
              'lg:flex lg:h-full lg:items-center lg:justify-center',
              index !== active && 'lg:hidden',
            )}
          >
            <Img
              src={image.full}
              alt={image.alt || name}
              width={800}
              height={800}
              priority={index === 0}
              sizes="(min-width: 1024px) 520px, 100vw"
              className="mx-auto w-full max-w-[520px] rounded-control lg:h-full lg:object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 ? (
        <div className="hidden gap-2 lg:absolute lg:inset-x-0 lg:top-full lg:mt-3 lg:flex">
          {images.map((image, index) => (
            <button
              key={image.thumb}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${name}, фото ${index + 1}`}
              aria-current={index === active}
              className={cn(
                'rounded-control border bg-surface p-1 transition-colors duration-[--duration-fast]',
                index === active ? 'border-ink' : 'border-line hover:border-ink-muted',
              )}
            >
              <Img src={image.thumb} alt="" width={64} height={64} className="h-16 w-16 rounded-[6px]" />
            </button>
          ))}
        </div>
      ) : null}

      {current ? <p className="sr-only">{current.alt || name}</p> : null}
    </div>
  )
}
