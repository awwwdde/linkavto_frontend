import { useState } from 'react'
import { SectionHeading } from '@/app/layouts/SectionHeading'
import { Button, Container, PageMeta, Section } from '@/shared/ui'
import { IconChevronDown } from '@/shared/ui/Icon'
import { cn } from '@/shared/lib/cn'

/** Кабинет продавца — отдельное приложение, поэтому ссылка ведёт наружу. */
const SELLER_CABINET = 'https://linkavtoseller.ru'

const STATS = [
  { value: '1M+', label: 'покупателей' },
  { value: '1%', label: 'минимальная комиссия' },
  { value: '48 ч', label: 'до первых продаж' },
]

const STEPS = [
  {
    title: 'Регистрация продавца',
    text: 'Заполните форму регистрации, предоставьте информацию о компании и пройдите верификацию.',
  },
  {
    title: 'Добавление товаров',
    text: 'Загрузите каталог запчастей с фотографиями, описаниями и актуальными ценами.',
  },
  {
    title: 'Настройка условий продажи',
    text: 'Установите условия доставки, оплаты и возврата — покупатели увидят их в карточке.',
  },
  {
    title: 'Начало продаж',
    text: 'После модерации товары появляются в каталоге, и вы начинаете получать заказы.',
  },
]

const BENEFITS = [
  'Покупатели ищут детали по VIN и артикулу — ваши предложения видны прямо в карточке',
  'Удобный поиск и фильтрация по параметрам',
  'Доставка по всей России: СДЭК, Почта России, самовывоз',
  'Сравнение предложений по цене и сроку — выигрывает лучшее, а не самое дорогое',
  'Поддержка на всех этапах: от загрузки прайса до выплаты',
]

const FAQ = [
  {
    question: 'Какие документы нужны для регистрации?',
    answer:
      'Для ИП: сканы ИНН, ОГРНИП и паспорта. Для ООО: сканы ИНН, ОГРН, устава и решения о назначении директора.',
  },
  {
    question: 'Как происходит выплата денег?',
    answer:
      'Выплаты проходят два раза в месяц — 15 и 30 числа. Деньги поступают на расчётный счёт после завершения заказа.',
  },
  {
    question: 'Можно ли использовать свою логистику?',
    answer: 'Да. Можно возить самостоятельно или подключиться к нашей системе доставки.',
  },
]

const openCabinet = () => window.open(SELLER_CABINET, '_blank', 'noopener')

/** Аккордеон вопросов: раскрыт ровно один, чтобы список не разъезжался. */
function FaqItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-md font-medium text-ink transition-colors duration-[--duration-fast] hover:text-ink-muted"
      >
        {question}
        <IconChevronDown
          width={18}
          height={18}
          className={cn('shrink-0 text-ink-muted transition-transform duration-[--duration-base]', open && 'rotate-180')}
        />
      </button>
      {open ? <p className="pb-4 text-base text-ink-muted">{answer}</p> : null}
    </li>
  )
}

export function Component() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <>
      <PageMeta
        title="Стать продавцом — LINKAVTO"
        description="Продавайте автозапчасти на LINKAVTO: витрина, заказы и аналитика в кабинете продавца."
        canonicalPath="/become-seller"
      />

      <Container className="flex flex-col gap-12 py-8 lg:gap-16 lg:py-12">
        {/* Обложка — тёмная пауза (§3.4), как полоса гаража на главной. */}
        <section className="flex flex-col gap-6 rounded-card bg-ink p-6 lg:p-10">
          <SectionHeading
            as="h1"
            dark
            size="xl"
            lead="Продавайте автозапчасти"
            ghost="на LINKAVTO."
          />
          <p className="max-w-[52ch] text-md text-ink-ghost-dark">
            Подключайтесь к маркетплейсу запчастей для любого транспорта — от легковых до спецтехники.
          </p>

          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-xl font-semibold text-paper lg:text-2xl">{stat.value}</dd>
                <span aria-hidden className="text-base text-ink-ghost-dark">
                  {stat.label}
                </span>
              </div>
            ))}
          </dl>

          <Button variant="primary" size="lg" className="w-fit" onClick={openCabinet}>
            Начать продавать
          </Button>
        </section>

        <Section title="Начать продавать — легко">
          <p className="-mt-2 text-base text-ink-muted">Всего четыре шага до первых заказов.</p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-card bg-surface p-5 shadow-float">
                <span className="font-mono text-sm text-ink-muted">0{index + 1}</span>
                <h3 className="text-md font-semibold">{step.title}</h3>
                <p className="text-base text-ink-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Что вы получаете">
          <ul className="grid gap-3 lg:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 rounded-card bg-surface p-4 shadow-float">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                <span className="text-base text-ink">{benefit}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Частые вопросы">
          <ul className="rounded-card bg-surface px-5 shadow-float">
            {FAQ.map((item, index) => (
              <FaqItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                open={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
              />
            ))}
          </ul>
        </Section>

        <section className="flex flex-col items-start gap-4 rounded-card bg-surface p-6 shadow-float lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold lg:text-xl">Готовы начать?</h2>
            <p className="text-base text-ink-muted">Регистрация и проверка занимают один рабочий день.</p>
          </div>
          <Button variant="primary" size="lg" className="shrink-0" onClick={openCabinet}>
            Стать продавцом
          </Button>
        </section>
      </Container>
    </>
  )
}
