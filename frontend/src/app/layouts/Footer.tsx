import { Link } from 'react-router'
import { t } from '@/shared/i18n'
import { Container } from '@/shared/ui/Layout'
import { IconArrowRight } from '@/shared/ui/Icon'

/** По четыре ссылки в каждой колонке — иначе они обрываются на разной высоте. */
const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: t('footer.buyers'),
    links: [
      { to: '/help', label: t('nav.help') },
      { to: '/return-policy', label: 'Условия возврата' },
      { to: '/buyer-rules', label: 'Правила для покупателей' },
      { to: '/favorites', label: t('nav.favorites') },
    ],
  },
  {
    title: t('footer.sellers'),
    links: [
      { to: '/become-seller', label: t('nav.becomeSeller') },
      { to: '/seller-rules', label: 'Правила для продавцов' },
      { to: '/public-offer', label: 'Публичная оферта' },
      { to: '/about', label: t('nav.about') },
    ],
  },
  {
    title: t('footer.company'),
    links: [
      { to: '/terms', label: 'Пользовательское соглашение' },
      { to: '/privacy', label: 'Политика конфиденциальности' },
      { to: '/personal-data', label: 'Обработка персональных данных' },
      { to: '/cart', label: t('nav.cart') },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 lg:pb-0">
      <Container className="py-10 lg:py-14">
        {/* Четыре равные колонки: бренд и три группы ссылок. */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="flex flex-col items-start gap-3">
            <Link to="/" className="font-display text-lg tracking-tight text-ink">
              LINKAVTO
            </Link>
            <p className="max-w-[28ch] text-base text-ink-muted">{t('brand.tagline')}</p>
            <Link
              to="/become-seller"
              className="mt-1 inline-flex min-h-10 items-center gap-2 rounded-pill bg-ink px-4 text-base font-medium text-white transition-colors duration-[--duration-fast] hover:bg-ink/90"
            >
              {t('nav.becomeSeller')}
              <IconArrowRight width={16} height={16} />
            </Link>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="flex flex-col gap-1" aria-label={column.title}>
              <h2 className="mb-1 text-base font-semibold">{column.title}</h2>
              {column.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  // На узких экранах строка остаётся пальцевой, на десктопе плотнее.
                  className="flex min-h-10 items-center text-base text-ink-muted transition-colors duration-[--duration-fast] hover:text-ink lg:min-h-8"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} LINKAVTO. {t('footer.rights')}
          </p>
          <p className="text-sm text-ink-muted">{t('footer.pricesNote')}</p>
        </div>
      </Container>
    </footer>
  )
}
