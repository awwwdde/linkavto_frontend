import { t } from '@/shared/i18n'
import {
  IconAddress,
  IconGarage,
  IconHeart,
  IconMail,
  IconPackage,
  IconStar,
  IconUser,
  type IconComponent,
} from '@/shared/ui/Icon'

export interface ProfileSection {
  to: string
  labelKey: Parameters<typeof t>[0]
  icon: IconComponent
  /** Подпись в плитке обзора; в боковом меню не показывается. */
  hint: string
  /** Совпадение только по точному пути — для самого «Обзора». */
  end?: boolean
}

/**
 * Разделы кабинета. Список один на боковое меню и на плитку обзора, иначе они
 * разъезжаются при добавлении раздела. «Гараж» и «Избранное» живут вне /profile,
 * но для пользователя это части кабинета, поэтому в меню они есть.
 */
export const PROFILE_SECTIONS: ProfileSection[] = [
  { to: '/profile', labelKey: 'profile.overview', icon: IconUser, hint: 'Всё о вашем аккаунте', end: true },
  { to: '/profile/orders', labelKey: 'profile.orders', icon: IconPackage, hint: 'История покупок и статусы' },
  { to: '/profile/addresses', labelKey: 'profile.addresses', icon: IconAddress, hint: 'Куда доставлять заказы' },
  { to: '/profile/settings', labelKey: 'profile.settings', icon: IconUser, hint: 'Имя, телефон, фото' },
  { to: '/garage', labelKey: 'nav.garage', icon: IconGarage, hint: 'Ваши автомобили' },
  { to: '/favorites', labelKey: 'nav.favorites', icon: IconHeart, hint: 'Отложенные товары' },
  { to: '/profile/messages', labelKey: 'profile.messages', icon: IconMail, hint: 'Переписка с продавцами' },
  { to: '/profile/reviews', labelKey: 'profile.myReviews', icon: IconStar, hint: 'Что вы оценили' },
  { to: '/profile/questions', labelKey: 'profile.myQuestions', icon: IconMail, hint: 'Вопросы и ответы продавцов' },
]
