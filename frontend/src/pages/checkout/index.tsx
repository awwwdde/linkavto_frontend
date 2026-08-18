import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ApiError, post } from '@/shared/api/client'
import { t } from '@/shared/i18n'
import { formatPlural } from '@/shared/lib/format'
import {
  Button,
  ButtonLink,
  Container,
  EmptyState,
  Input,
  Modal,
  PageMeta,
  Price,
  toast,
} from '@/shared/ui'
import { useAuthStore } from '@/features/auth/store'
import { useUiStore } from '@/app/ui-store'
import { useCartStore } from '@/features/cart/store'
import { useAddressStore } from '@/features/address/store'
import { AddressModal, addressLabel } from '@/features/address/AddressModal'
import { AddressPicker } from '@/features/address/AddressPicker'

const DELIVERY_PER_SELLER = 39000

const schema = z.object({
  last_name: z.string().min(2, 'Укажите фамилию.'),
  first_name: z.string().min(2, 'Укажите имя.'),
  phone: z.string().min(10, 'Телефон нужен для связи по доставке.'),
  comment: z.string().optional(),
})
type CheckoutForm = z.infer<typeof schema>

type Delivery = 'cdek' | 'post' | 'pickup'
type Payment = 'card' | 'sbp' | 'cash'

export function Component() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const clear = useCartStore((state) => state.clear)
  const user = useAuthStore((state) => state.user)
  const openAuth = useUiStore((state) => state.openAuth)
  const addresses = useAddressStore((state) => state.addresses)

  const [pending, setPending] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<{ id: number; number: string } | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      last_name: user?.last_name ?? '',
      first_name: user?.first_name ?? '',
      phone: user?.phone ?? '',
      comment: '',
    },
  })

  // Адрес берём основной из списка профиля — его же меняют кнопки ниже.
  const address = addresses.find((item) => item.is_default) ?? addresses[0] ?? null

  /*
   * Отдельного выбора доставки нет: способ определяется самим адресом —
   * пункт выдачи знает своего оператора, курьерский адрес едет СДЭКом.
   * Самовывоз из ПВЗ бесплатный, доставка курьером считается по продавцам.
   */
  const deliveryMethod: Delivery =
    address?.delivery_type === 'pickup' ? (address.pickup_provider === 'post' ? 'post' : 'cdek') : 'cdek'
  const isPickup = address?.delivery_type === 'pickup'

  const subtotal = items.reduce((sum, item) => sum + (item.offer?.price ?? item.product.price) * item.quantity, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const sellersCount = new Set(items.map((item) => item.offer?.seller.id ?? 0)).size
  const deliveryCost = isPickup ? 0 : sellersCount * DELIVERY_PER_SELLER
  const total = subtotal + deliveryCost

  if (items.length === 0 && !doneOpen) {
    return (
      <Container className="py-12">
        <PageMeta title="Оформление заказа — LINKAVTO" canonicalPath="/checkout" noIndex />
        <EmptyState
          title={t('cart.emptyTitle')}
          text={t('cart.emptyText')}
          action={<ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>}
        />
      </Container>
    )
  }

  const submit = async () => {
    setPending(true)
    try {
      const values = form.getValues()
      const order = await post<{ id: number; number: string }>('orders/', {
        delivery_method: deliveryMethod,
        // TODO(api): онлайн-оплаты пока нет — заказ уходит с расчётом при получении.
        payment_method: 'cash' satisfies Payment,
        address: address ? addressLabel(address) : '',
        email: user?.email ?? '',
        items: items.map((item) => ({
          product_id: item.product.id,
          offer_id: item.offer?.id ?? null,
          quantity: item.quantity,
        })),
        ...values,
      })
      setPlacedOrder(order)
      clear()
      setDoneOpen(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('common.errorText'))
    } finally {
      setPending(false)
    }
  }

  /** Порядок проверок: сначала вход, потом адрес, потом валидация полей. */
  const place = () => {
    if (!user) {
      openAuth('/checkout')
      return
    }
    if (!address) {
      toast.error(t('checkout.addressRequired'))
      setListOpen(true)
      return
    }
    void form.handleSubmit(() => void submit())()
  }

  return (
    <>
      <PageMeta title="Оформление заказа — LINKAVTO" canonicalPath="/checkout" noIndex />

      <Container className="flex flex-col gap-6 py-4 lg:py-8">
        <h1 className="text-xl font-semibold lg:text-2xl">{t('checkout.title')}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
              <div className="flex flex-col gap-2">
                <span className="text-base font-semibold">
                  {t('checkout.address')} <span className="text-danger">*</span>
                </span>
                <p className={address ? 'text-base text-ink' : 'text-base text-ink-muted'}>
                  {address ? addressLabel(address) : t('checkout.noAddress')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {addresses.length > 0 ? (
                    <Button variant="secondary" onClick={() => setListOpen(true)}>
                      {t('checkout.chooseAddress')}
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                    {t('address.add')}
                  </Button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-float lg:p-6">
              <h2 className="text-base font-semibold">{t('checkout.recipient')}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={`${t('profile.lastName')} *`}
                  autoComplete="family-name"
                  error={form.formState.errors.last_name?.message}
                  {...form.register('last_name')}
                />
                <Input
                  label={`${t('profile.firstName')} *`}
                  autoComplete="given-name"
                  error={form.formState.errors.first_name?.message}
                  {...form.register('first_name')}
                />
              </div>
              <Input
                label={`${t('checkout.phone')} *`}
                type="tel"
                autoComplete="tel"
                placeholder="+7 900 000-00-00"
                error={form.formState.errors.phone?.message}
                {...form.register('phone')}
              />
              {/* Почта не редактируется здесь: она из профиля и служит логином. */}
              <Input label={`${t('auth.emailLabel')} *`} value={user?.email ?? ''} readOnly hint={t('checkout.emailFromProfile')} />
              <Input label={t('checkout.comment')} {...form.register('comment')} />
            </section>

          </div>

          <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80">
            <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-float">
              <div className="flex justify-between text-base">
                <span className="text-ink-muted">
                  {t('cart.subtotal')}, {formatPlural(count, { one: 'штука', few: 'штуки', many: 'штук' })}
                </span>
                <Price value={subtotal} size="sm" />
              </div>
              <div className="flex justify-between text-base">
                <span className="text-ink-muted">{t('cart.delivery')}</span>
                <Price value={deliveryCost} size="sm" />
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-md font-semibold">{t('cart.total')}</span>
                <Price value={total} size="lg" />
              </div>

              <Button variant="primary" size="lg" block loading={pending} onClick={place}>
                {t('checkout.submit')}
              </Button>

              <p className="text-2xs text-ink-muted">
                {t('checkout.legalLead')}{' '}
                <Link to="/terms" className="text-accent hover:underline">
                  {t('address.legalTerms')}
                </Link>{' '}
                {t('checkout.legalAnd')}{' '}
                <Link to="/privacy" className="text-accent hover:underline">
                  {t('address.legalPrivacy')}
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <AddressModal open={listOpen} onClose={() => setListOpen(false)} />
      <AddressPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Modal open={doneOpen} onClose={() => navigate('/profile/orders')} title={t('checkout.doneTitle')}>
        <div className="flex flex-col gap-4">
          <p className="text-base text-ink-muted">
            {t('checkout.doneText')}
            {placedOrder ? ` № ${placedOrder.number}.` : '.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/profile/orders" variant="primary">
              {t('profile.orders')}
            </ButtonLink>
            <ButtonLink to="/">{t('common.toCatalog')}</ButtonLink>
          </div>
        </div>
      </Modal>
    </>
  )
}
