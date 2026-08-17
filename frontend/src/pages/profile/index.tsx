import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { t } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Avatar, Button, Container, EmptyState, PageMeta } from '@/shared/ui'
import { useAuthStore, userDisplayName } from '@/features/auth/store'
import { useUiStore } from '@/app/ui-store'
import { PROFILE_SECTIONS } from './sections'

export function Component() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const openAuth = useUiStore((state) => state.openAuth)

  useEffect(() => {
    if (!user) openAuth('/profile')
  }, [user, openAuth])

  return (
    <>
      <PageMeta title="Профиль — LINKAVTO" canonicalPath="/profile" noIndex />

      <Container className="flex flex-col gap-6 py-4 lg:py-8">
        {user ? (
          <>
            {/* Шапка профиля: аватар + имя + контакты. */}
            <div className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
              <Avatar src={user.avatar} name={userDisplayName(user)} size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold">{userDisplayName(user)}</h1>
                <p className="truncate text-sm text-ink-muted">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ''}
                </p>
              </div>
              <Button variant="ghost" onClick={signOut}>
                {t('nav.logout')}
              </Button>
            </div>

            {!user.profile_completed ? (
              <Link
                to="/profile/settings"
                className="rounded-card border border-dashed border-line bg-surface px-4 py-3 text-sm text-ink-muted transition-colors duration-[--duration-fast] hover:border-ink-muted hover:text-ink"
              >
                {t('profile.completePrompt')}
              </Link>
            ) : null}

            {/* Меню всех разделов рядом с содержимым: на десктопе колонкой
                слева, на узких экранах — горизонтальной лентой с прокруткой.
                Раньше сверху висели четыре вкладки, и до сообщений, отзывов и
                вопросов из раздела было не добраться. */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <nav aria-label={t('nav.profile')} className="lg:sticky lg:top-24 lg:w-60 lg:shrink-0">
                <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-card lg:bg-surface lg:p-2 lg:shadow-float">
                  {PROFILE_SECTIONS.map((section) => (
                    <li key={section.to} className="shrink-0 lg:shrink">
                      <NavLink
                        to={section.to}
                        end={section.end}
                        className={({ isActive }) =>
                          cn(
                            'flex h-10 items-center gap-2 rounded-pill px-4 text-base whitespace-nowrap',
                            'transition-colors duration-[--duration-fast] lg:rounded-control',
                            isActive
                              ? 'bg-ink font-medium text-white lg:bg-paper lg:font-medium lg:text-ink'
                              : 'bg-paper text-ink-muted hover:text-ink lg:bg-transparent lg:hover:bg-paper',
                          )
                        }
                      >
                        <section.icon width={16} height={16} className="shrink-0" />
                        {t(section.labelKey)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="min-w-0 flex-1">
                <Outlet />
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={t('auth.title')}
            text="Войдите по коду из письма — заказы и адреса подтянутся автоматически."
            action={
              <Button variant="primary" onClick={() => openAuth('/profile')}>
                {t('nav.login')}
              </Button>
            }
          />
        )}
      </Container>
    </>
  )
}
