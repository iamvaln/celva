'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatPriceXAF } from '@/lib/money';
import { pickLocalized } from '@/lib/i18n-helpers';
import { useGuestCart, clearGuestCart } from '@/lib/guest-cart';

export type GuestZone = {
  id: string;
  name: { fr: string; en: string };
  fee: string;
  /** Localized free-text estimate, e.g. "1-2 jours" / "1-2 days". */
  estimatedDays?: { fr: string; en: string } | null;
};

export type GuestPickup = {
  id: string;
  name: { fr: string; en: string };
  address: string;
  city: string;
};

type DeliveryMode = 'HOME_DELIVERY' | 'STORE_PICKUP' | 'RELAY_PICKUP';
type PaymentMethod = 'ORANGE_MONEY' | 'MTN_MOMO' | 'CASH_ON_DELIVERY';

/** Maps an API error key to checkout-local copy, falling back to a generic one. */
const ERROR_KEYS: Record<string, string> = {
  cart_empty: 'errors.cart_empty',
  cart_variant_unavailable: 'errors.unknown',
  delivery_zone_required: 'errors.delivery_zone_required',
  delivery_zone_unavailable: 'errors.delivery_zone_unavailable',
  pickup_point_required: 'errors.pickup_point_required',
  pickup_point_unavailable: 'errors.pickup_point_unavailable',
  payment_phone_required: 'errors.payment_phone_required',
  cash_on_delivery_over_cap: 'errors.cash_over_cap',
  insufficient_stock: 'errors.insufficient_stock',
  invalid_phone: 'errors.invalid_phone',
  invalid_email: 'guest.invalid_email',
};

/**
 * Guest checkout (no account). Reads the localStorage cart, collects contact +
 * delivery + payment, and posts to the public POST /checkout/guest endpoint,
 * which find-or-creates a passwordless account and places the order. On success
 * the guest cart is cleared and we land on the order confirmation page.
 */
export function GuestCheckoutForm({
  locale,
  zones,
  pickups,
}: {
  locale: Locale;
  zones: GuestZone[];
  pickups: GuestPickup[];
}) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const router = useRouter();
  const items = useGuestCart();

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('HOME_DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ORANGE_MONEY');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.unitPrice) * it.quantity,
    0,
  );

  const translateError = (key: string | undefined): string => {
    if (key && key.startsWith('errors.')) {
      const local = ERROR_KEYS[key.replace('errors.', '')];
      if (local) return t(local);
    }
    return t('errors.unknown');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError(t('errors.cart_empty'));
      return;
    }
    const fd = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      email: String(fd.get('email') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      deliveryMode,
      paymentMethod,
      items: items.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
    };
    const phone = String(fd.get('phone') ?? '').trim();
    if (phone) body.phone = phone;

    if (deliveryMode === 'HOME_DELIVERY') {
      body.deliveryZoneId = String(fd.get('deliveryZoneId') ?? '');
      body.shippingAddress = String(fd.get('shippingAddress') ?? '').trim();
      body.shippingCity = String(fd.get('shippingCity') ?? '').trim();
      body.shippingPhone = String(fd.get('shippingPhone') ?? '').trim();
    } else {
      body.pickupPointId = String(fd.get('pickupPointId') ?? '');
    }

    if (paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'MTN_MOMO') {
      body.paymentPhoneNumber = String(fd.get('paymentPhoneNumber') ?? '').trim();
    }

    const notes = String(fd.get('notes') ?? '').trim();
    if (notes) body.notes = notes;

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/checkout/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
          'X-App-Source': 'WEB_STORE',
        },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        data?: { orderNumber: string };
        message?: string;
      };
      if (!res.ok) {
        setError(translateError(payload?.message));
        setSubmitting(false);
        return;
      }
      const orderNumber = payload.data?.orderNumber;
      clearGuestCart();
      if (orderNumber) {
        router.push({
          pathname: '/checkout/confirmation/[orderNumber]',
          params: { orderNumber },
        });
      } else {
        router.push('/');
      }
    } catch {
      setError(t('errors.unknown'));
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">{tCart('empty')}</p>
          <Link href="/shop" className="btn btn-primary">
            {tCart('continue_shopping')}
          </Link>
        </div>
      </section>
    );
  }

  const radioCls =
    'flex cursor-pointer items-start gap-3 border border-border p-4 has-[:checked]:border-accent';

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <h1 className="mb-2 font-display text-h1">{t('title')}</h1>
        <p className="mb-10 font-body text-base text-foreground-muted">
          {t('guest.subtitle')}{' '}
          <Link href="/login" className="text-accent underline underline-offset-2">
            {t('guest.login_link')}
          </Link>
        </p>

        {error && (
          <div
            role="alert"
            className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            {/* Contact */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('guest.contact_heading')}</legend>
              <div className="space-y-4">
                <label className="block">
                  <span className="eyebrow mb-1 block">{t('guest.name')}</span>
                  <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    className="input-underline"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block">{t('guest.email')}</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className="input-underline"
                  />
                  <span className="mt-1 block font-body text-small text-foreground-muted">
                    {t('guest.email_hint')}
                  </span>
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block">{t('guest.phone')}</span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+237698123456"
                    autoComplete="tel"
                    className="input-underline"
                  />
                </label>
              </div>
            </fieldset>

            {/* Delivery mode */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('delivery.heading')}</legend>
              <div className="space-y-3">
                {(
                  [
                    ['HOME_DELIVERY', 'home', 'home_hint'],
                    ['STORE_PICKUP', 'store', 'store_hint'],
                    ['RELAY_PICKUP', 'relay', 'relay_hint'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className={radioCls}>
                    <input
                      type="radio"
                      name="deliveryMode"
                      value={value}
                      checked={deliveryMode === value}
                      onChange={() => setDeliveryMode(value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-display text-base text-foreground">
                        {t(`delivery.${label}`)}
                      </p>
                      <p className="font-body text-small text-foreground-muted">
                        {t(`delivery.${hint}`)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Delivery details */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('delivery_details.heading')}</legend>
              {deliveryMode === 'HOME_DELIVERY' ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.zone')}</span>
                    <select
                      name="deliveryZoneId"
                      required
                      className="input-underline appearance-none bg-transparent"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {pickLocalized(z.name, locale)} · {formatPriceXAF(z.fee, locale)}
                          {z.estimatedDays ? ` · ${pickLocalized(z.estimatedDays, locale)}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.address_line')}</span>
                    <input
                      type="text"
                      name="shippingAddress"
                      required
                      autoComplete="street-address"
                      className="input-underline"
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.city')}</span>
                    <input
                      type="text"
                      name="shippingCity"
                      defaultValue="Douala"
                      required
                      autoComplete="address-level2"
                      className="input-underline"
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('delivery_details.phone')}</span>
                    <input
                      type="tel"
                      name="shippingPhone"
                      required
                      placeholder="+237698123456"
                      autoComplete="tel"
                      className="input-underline"
                    />
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="eyebrow mb-1 block">{t('delivery_details.pickup_point')}</span>
                  <select
                    name="pickupPointId"
                    required
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
            </fieldset>

            {/* Payment */}
            <fieldset>
              <legend className="eyebrow mb-4 block">{t('payment.heading')}</legend>
              <div className="space-y-3">
                {(
                  [
                    ['ORANGE_MONEY', 'orange', null],
                    ['MTN_MOMO', 'mtn', null],
                    ['CASH_ON_DELIVERY', 'cash', 'cash_hint'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className={radioCls}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-display text-base text-foreground">
                        {t(`payment.${label}`)}
                      </p>
                      {hint && (
                        <p className="font-body text-small text-foreground-muted">
                          {t(`payment.${hint}`)}
                        </p>
                      )}
                    </div>
                  </label>
                ))}

                {(paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'MTN_MOMO') && (
                  <label className="block">
                    <span className="eyebrow mb-1 block">{t('payment.phone_label')}</span>
                    <input
                      type="tel"
                      name="paymentPhoneNumber"
                      required
                      placeholder="+237698123456"
                      autoComplete="tel"
                      className="input-underline"
                    />
                  </label>
                )}
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
              {items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-3">
                  <span className="text-foreground-muted">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-foreground">
                    {formatPriceXAF(Number(item.unitPrice) * item.quantity, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-border pt-3 font-body">
              <div className="flex justify-between">
                <dt className="text-foreground-muted">{tCart('subtotal')}</dt>
                <dd>{formatPriceXAF(subtotal, locale)}</dd>
              </div>
              <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                {tCart('delivery_at_checkout')}
              </p>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-display text-base text-foreground">{tCart('total')}</dt>
                <dd className="font-display text-base text-accent">
                  {formatPriceXAF(subtotal, locale)}
                </dd>
              </div>
              <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
                {tCart('vat_included')}
              </p>
            </dl>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-block disabled:opacity-60"
            >
              {submitting ? t('guest.placing') : t('place_order')}
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
