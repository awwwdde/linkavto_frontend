import { cn } from '@/shared/lib/cn'
import { userInitials } from '@/shared/lib/initials'
import { IconUser } from './Icon'

export interface AvatarProps {
  src?: string | null
  /** Имя для инициалов-фолбэка и alt. */
  name?: string | null
  /** Готовые инициалы — когда имя и фамилия известны по отдельности. */
  initials?: string
  size?: number
  /** Скругление: круг (по умолчанию) или карточка — для логотипов магазинов. */
  shape?: 'circle' | 'rounded'
  className?: string
}

/** Инициалы из цельной строки: «Илья Иванов» и «Автозапчасти Плюс» → «ИИ», «АП». */
function initialsFromName(name: string | null | undefined): string {
  const [first, second] = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return userInitials(first, second)
}

/**
 * Аватар пользователя / логотип магазина. Есть фото — показываем его,
 * нет — монохромные инициалы (§3.1, без цветных подложек), а если и их не из
 * чего собрать — дефолтный значок пользователя.
 */
export function Avatar({ src, name, initials, size = 40, shape = 'circle', className }: AvatarProps) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-card'
  const dimension = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        style={dimension}
        className={cn('shrink-0 object-cover', radius, className)}
      />
    )
  }

  const letters = initials ?? initialsFromName(name)

  return (
    <span
      style={dimension}
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-ink/5 font-semibold text-ink',
        radius,
        className,
      )}
    >
      {letters ? (
        <span style={{ fontSize: Math.round(size * 0.4) }}>{letters}</span>
      ) : (
        <IconUser width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} />
      )}
    </span>
  )
}
