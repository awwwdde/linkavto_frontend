/**
 * Первая буква строки в верхнем регистре. Локаль указана явно: без неё на
 * системе с турецкой локалью «i» превращается в «İ».
 */
function firstLetter(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  // Берём кодовую точку, а не байт: у составных символов [0] вернёт половину.
  const [char] = [...trimmed]
  return char ? char.toLocaleUpperCase('ru-RU') : ''
}

/**
 * Инициалы для аватара: буква имени + буква фамилии. Если ни того ни другого
 * нет — первая буква email. Пустая строка на выходе означает, что показывать
 * нечего и нужен дефолтный значок пользователя.
 */
export function userInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null,
): string {
  const name = firstLetter(firstName) + firstLetter(lastName)
  return name || firstLetter(email)
}
