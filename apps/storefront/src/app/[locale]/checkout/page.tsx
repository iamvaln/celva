import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { fetchCart } from '@/lib/cart';
import { formatPriceXAF, pickLocalized } from '@/lib/catalogue';
import { placeOrderAction, readAndClearCheckoutError } from './actions';
import { getActivePromoCode } from '../cart/actions';
import { GuestCheckoutForm } from '@/components/cart/GuestCheckoutForm';

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  zone?: string | null;
  country: string;
  isDefault: boolean;
};

type SavedPaymentMethod = {
  id: string;
  method: 'ORANGE_MONEY' | 'MTN_MOMO';
  label: string;
  phoneNumber: string;
  isDefault: boolean;
};

type DeliveryZone = {
  id: string;
  name: { fr: string; en: string };
  fee: string;
  freeDeliveryThreshold?: string | null;
  /** Localized free-text estimate, e.g. "1-2 jours" / "1-2 days". */
  estimatedDays?: { fr: string; en: string } | null;
};

type PickupPoint = {
  id: string;
  name: { fr: string; en: string };
  address: string;
  city: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title') };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const tCart = await getTranslations('cart');

  const accessToken = await getAccessToken();
  // Logged-out → guest checkout. The cart lives in the browser (localStorage),
  // so the form is client-side; we just feed it the public delivery options.
  if (!accessToken) {
    const [guestZones, guestPickups] = await Promise.all([
      apiFetch<DeliveryZone[]>('/delivery-zones', { locale }).catch(() => [] as DeliveryZone[]),
      apiFetch<PickupPoint[]>('/pickup-points', { locale }).catch(() => [] as PickupPoint[]),
    ]);
    return (
      <GuestCheckoutForm
        locale={locale}
        zones={guestZones.map((z) => ({
          id: z.id,
          name: z.name,
          fee: z.fee,
          estimatedDays: z.estimatedDays,
        }))}
        pickups={guestPickups.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          city: p.city,
        }))}
      />
    );
  }

  const cart = await fetchCart(locale);
  if (!cart || cart.items.length === 0) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">
            {tCart('empty')}
          </p>
          <Link href="/shop" className="btn btn-primary">
            {tCart('continue_shopping')}
          </Link>
        </div>
      </section>
    );
  }

  // Parallel data fetch — addresses, payment methods, zones, points, error cookie.
  const [addresses, methods, zones, pickups, errorKey, promoCode] = await Promise.all([
    apiFetch<Address[]>('/me/addresses', { locale, accessToken }).catch(() => [] as Address[]),
    apiFetch<SavedPaymentMethod[]>('/me/payment-methods', { locale, accessToken }).catch(
      () => [] as SavedPaymentMethod[],
    ),
    apiFetch<DeliveryZone[]>('/delivery-zones', { locale }).catch(() => [] as DeliveryZone[]),
    apiFetch<PickupPoint[]>('/pickup-points', { locale }).catch(() => [] as PickupPoint[]),
    readAndClearCheckoutError(),
    getActivePromoCode(),
  ]);

  // Re-evaluate promo for the live discount.
  let discount = '0';
  let totalWithDiscount = cart.total;
  if (promoCode) {
    try {
      const promo = await apiFetch<{ discount: string; subtotalAfter: string }>(
        '/me/cart/apply-promo',
        { method: 'POST', body: { code: promoCode }, accessToken, locale },
      );
      discount = promo.discount;
      totalWithDiscount = promo.subtotalAfter;
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <h1 className="mb-10 font-display text-h1">{t('title')}</h1>

        {errorKey && (
          <div
            role="alert"
            className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent"
          >
            {translateError(t, errorKey)}
          </div>
        )}

        <form action={placeOrderAction} className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-10">
            {/* Delivery */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('delivery.heading')}</legend>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="HOME_DELIVERY"
                    defaultChecked
                    className="mt-1"
                  />
                  <div>
                    <p className="font-display text-base text-foreground">
                      {t('delivery.home')}
                    </p>
                    <p className="font-body text-small text-foreground-muted">
                      {t('delivery.home_hint')}
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input type="radio" name="deliveryMode" value="STORE_PICKUP" className="mt-1" />
                  <div>
                    <p className="font-display text-base text-foreground">{t('delivery.store')}</p>
                    <p className="font-body text-small text-foreground-muted">
                      {t('delivery.store_hint')}
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input type="radio" name="deliveryMode" value="RELAY_PICKUP" className="mt-1" />
                  <div>
                    <p className="font-display text-base text-foreground">{t('delivery.relay')}</p>
                    <p className="font-body text-small text-foreground-muted">
                      {t('delivery.relay_hint')}
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Delivery details (zone + address OR pickup point) */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('delivery_details.heading')}</legend>
              <div className="space-y-4">
                <label className="block">
                  <span className="eyebrow mb-1 block">{t('delivery_details.zone')}</span>
                  <select name="deliveryZoneId" className="input-underline appearance-none bg-transparent">
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {pickLocalized(z.name, locale)} · {formatPriceXAF(z.fee, locale)}
                        {z.estimatedDays ? ` · ${pickLocalized(z.estimatedDays, locale)}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {addresses.length > 0 && (
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.saved_address')}</span>
                    <select
                      name="shippingAddressId"
                      defaultValue={defaultAddress?.id ?? ''}
                      className="input-underline appearance-none bg-transparent"
                    >
                      <option value="">{t('delivery_details.new_address')}</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} · {a.line1}, {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <details className="border border-border p-4">
                  <summary className="cursor-pointer font-display text-base text-foreground">
                    {t('delivery_details.inline_address')}
                  </summary>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="eyebrow mb-1 block">{t('delivery_details.address_line')}</span>
                      <input
                        type="text"
                        name="shippingAddress"
                        className="input-underline"
                        autoComplete="street-address"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow mb-1 block">{t('delivery_details.city')}</span>
                      <input
                        type="text"
                        name="shippingCity"
                        defaultValue="Douala"
                        className="input-underline"
                        autoComplete="address-level2"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow mb-1 block">{t('delivery_details.phone')}</span>
                      <input
                        type="tel"
                        name="shippingPhone"
                        placeholder="+237698123456"
                        className="input-underline"
                        autoComplete="tel"
                      />
                    </label>
                  </div>
                </details>

                {pickups.length > 0 && (
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.pickup_point')}</span>
                    <select
                      name="pickupPointId"
                      className="input-underline appearance-none bg-transparent"
                    >
                      <option value="">—</option>
                      {pickups.map((p) => (
                        <option key={p.id} value={p.id}>
                          {pickLocalized(p.name, locale)} · {p.address}, {p.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </fieldset>

            {/* Payment */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('payment.heading')}</legend>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input type="radio" name="paymentMethod" value="ORANGE_MONEY" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-display text-base text-foreground">{t('payment.orange')}</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input type="radio" name="paymentMethod" value="MTN_MOMO" className="mt-1" />
                  <div>
                    <p className="font-display text-base text-foreground">{t('payment.mtn')}</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent">
                  <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" className="mt-1" />
                  <div>
                    <p className="font-display text-base text-foreground">{t('payment.cash')}</p>
                    <p className="font-body text-small text-foreground-muted">
                      {t('payment.cash_hint')}
                    </p>
                  </div>
                </label>

                {methods.length > 0 && (
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('payment.saved_method')}</span>
                    <select
                      name="savedPaymentMethodId"
                      defaultValue={defaultMethod?.id ?? ''}
                      className="input-underline appearance-none bg-transparent"
                    >
                      <option value="">{t('payment.new_method')}</option>
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} · {m.method} · …{m.phoneNumber.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="eyebrow mb-1 block">{t('payment.phone_label')}</span>
                  <input
                    type="tel"
                    name="paymentPhoneNumber"
                    placeholder="+237698123456"
                    className="input-underline"
                    autoComplete="tel"
                  />
                </label>
              </div>
            </fieldset>

            <label className="block">
              <span className="eyebrow mb-1 block">{t('notes.label')}</span>
              <textarea
                name="notes"
                rows={3}
                className="input-underline w-full"
                placeholder={t('notes.placeholder')}
              />
            </label>
          </div>

          {/* Order summary */}
          <aside className="space-y-4 border border-border bg-background-alt p-6">
            <h2 className="eyebrow">{tCart('summary')}</h2>
            <ul className="space-y-2 font-body text-small">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-foreground-muted">
                    {pickLocalized(item.productName, locale)} × {item.quantity}
                  </span>
                  <span className="text-foreground">
                    {formatPriceXAF(item.lineTotal, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-border pt-3 font-body">
              <div className="flex justify-between">
                <dt className="text-foreground-muted">{tCart('subtotal')}</dt>
                <dd>{formatPriceXAF(cart.total, locale)}</dd>
              </div>
              {promoCode && (
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">
                    {tCart('discount')} ({promoCode})
                  </dt>
                  <dd className="text-accent">−{formatPriceXAF(discount, locale)}</dd>
                </div>
              )}
              <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                {tCart('delivery_at_checkout')}
              </p>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-display text-base text-foreground">{tCart('total')}</dt>
                <dd className="font-display text-base text-accent">
                  {formatPriceXAF(totalWithDiscount, locale)}
                </dd>
              </div>
              <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
                {tCart('vat_included')}
              </p>
            </dl>
            {promoCode && <input type="hidden" name="promoCode" value={promoCode} />}
            <button type="submit" className="btn btn-primary btn-block">
              {t('place_order')}
            </button>
            <Link href="/cart" className="btn btn-ghost btn-block">
              {t('back_to_cart')}
            </Link>
          </aside>
        </form>
      </div>
    </section>
  );
}

/**
 * Maps API error keys to checkout-local copy. Falls through to a generic
 * message for anything not explicitly handled.
 */
const translateError = (t: Awaited<ReturnType<typeof getTranslations<'checkout'>>>, key: string): string => {
  if (key.startsWith('errors.')) {
    const sub = key.replace('errors.', '');
    const map: Record<string, string> = {
      cart_empty: 'errors.cart_empty',
      delivery_zone_required: 'errors.delivery_zone_required',
      delivery_zone_unavailable: 'errors.delivery_zone_unavailable',
      pickup_point_required: 'errors.pickup_point_required',
      pickup_point_unavailable: 'errors.pickup_point_unavailable',
      shipping_address_not_found: 'errors.shipping_address_not_found',
      saved_payment_method_not_found: 'errors.saved_payment_method_not_found',
      saved_payment_method_mismatch: 'errors.saved_payment_method_mismatch',
      payment_phone_required: 'errors.payment_phone_required',
      cash_on_delivery_over_cap: 'errors.cash_over_cap',
      insufficient_stock: 'errors.insufficient_stock',
      invalid_phone: 'errors.invalid_phone',
    };
    const local = map[sub];
    if (local) return t(local);
  }
  return t('errors.unknown');
};
