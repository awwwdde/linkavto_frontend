import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { t } from '@/shared/i18n'
import { usePrefersReducedMotion } from '@/shared/lib/media'
import { Button, Container } from '@/shared/ui'

const STORAGE_KEY = 'linkavto:cookies-accepted'

/**
 * Уведомление об использовании cookie. Решение храним локально: показывать
 * его на каждый заход — раздражать без нужды.
 *
 * Читаем хранилище в эффекте, а не в useState: в приватном режиме доступ к
 * localStorage бросает исключение, и на рендере это уронило бы всю страницу.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      /* хранилище недоступно — молча не показываем */
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* не сохранилось — уведомление вернётся при следующем заходе */
    }
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="dialog"
          aria-label={t('cookies.title')}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          // Над таб-баром на мобильных, но ниже модалок (z-50).
          className="fixed inset-x-0 bottom-0 z-45 pb-20 lg:pb-0"
        >
          <Container className="pb-4">
            <div className="flex flex-col gap-3 rounded-card bg-ink p-4 shadow-lift sm:flex-row sm:items-center sm:justify-between lg:p-5">
              <p className="text-base text-paper">
                {t('cookies.text')}{' '}
                <Link to="/privacy" className="underline decoration-white/40 underline-offset-2 hover:decoration-paper">
                  {t('cookies.policy')}
                </Link>
                .
              </p>
              <Button variant="primary" className="shrink-0" onClick={accept}>
                {t('cookies.accept')}
              </Button>
            </div>
          </Container>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
