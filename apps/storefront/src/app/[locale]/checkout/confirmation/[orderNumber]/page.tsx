import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { formatPriceXAF, pickLocalized } from '@/lib/catalogue';
import { completePaymentAction } from './actions';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  taxAmount: string;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPhone: string | null;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    variant: {
      sku: string;
      product: { name: { fr: string; en: string }; slug: string };
    };
  }>;
  payment: { method: string; status: string; phoneNumber: string | null } | null;
  delivery: {
    mode: string;
    pickupPointId: string | null;
    pickupPoint: { name: { fr: string; en: string }; address: string; city: string } | null;
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; orderNumber: string }>;
}): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  const t = await getTranslations({ locale, namespace: 'confirmation' });
  return { title: `${t('title')} · ${orderNumber}` };
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: Locale; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('confirmation');

  const accessToken = await getAccessToken();
  if (!accessToken) notFound();

  let order: Order;
  try {
    order = await apiFetch<Order>(
      `/me/orders/by-number/${encodeURIComponent(orderNumber)}`,
      { accessToken, locale, cache: 'no-store' },
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const statusKey =
    order.status === 'CONFIRMED' ? 'status.confirmed' : 'status.pending';

  // Show the dev "Complete payment" button when the order is still PENDING
  // and the payment method isn't cash (cash settles offline — a manager
  // confirms reception in the admin once the courier returns).
  const canCompletePayment =
    order.status === 'PENDING' &&
    order.payment?.status === 'PENDING' &&
    order.payment?.method !== 'CASH_ON_DELIVERY';

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva max-w-3xl">
        <header className="mb-10">
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="mb-2 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-lead text-foreground-muted">
            {t('intro', { orderNumber: order.orderNumber })}
          </p>
          <p className="mt-3 font-display text-base text-accent">{t(statusKey)}</p>
          {canCompletePayment && (
            <form action={completePaymentAction} className="mt-6 space-y-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <button type="submit" className="btn btn-primary">
                {t('complete_payment')}
              </button>
              <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                {t('complete_payment_hint')}
              </p>
            </form>
          )}
        </header>

        <section className="mb-8 border border-border p-6">
          <h2 className="eyebrow mb-4">{t('items_heading')}</h2>
          <ul className="space-y-2 font-body">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {pickLocalized(it.variant.product.name, locale)} · {it.variant.sku} ×{' '}
                  {it.quantity}
                </span>
                <span>
                  {formatPriceXAF(
                    String(Number(it.unitPrice) * it.quantity),
                    locale,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-border pt-4 font-body">
            <Row label={t('subtotal')} value={formatPriceXAF(order.subtotal, locale)} />
            {Number(order.discount) > 0 && (
              <Row
                label={t('discount')}
                value={`−${formatPriceXAF(order.discount, locale)}`}
              />
            )}
            <Row label={t('delivery_fee')} value={formatPriceXAF(order.deliveryFee, locale)} />
            <Row
              label={t('total')}
              value={formatPriceXAF(order.total, locale)}
              emphasis
            />
            <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
              {t('vat_included')}
            </p>
          </dl>
        </section>

        <section className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="border border-border p-6">
            <h2 className="eyebrow mb-2">{t('delivery_heading')}</h2>
            {order.delivery?.mode === 'HOME_DELIVERY' ? (
              <p className="font-body text-base text-foreground">
                {order.shippingAddress}
                <br />
                {order.shippingCity}
                <br />
                {order.shippingPhone}
              </p>
            ) : order.delivery?.pickupPoint ? (
              <p className="font-body text-base text-foreground">
                {pickLocalized(order.delivery.pickupPoint.name, locale)}
                <br />
                {order.delivery.pickupPoint.address}
                <br />
                {order.delivery.pickupPoint.city}
              </p>
            ) : (
              <p className="text-foreground-muted">—</p>
            )}
          </div>
          <div className="border border-border p-6">
            <h2 className="eyebrow mb-2">{t('payment_heading')}</h2>
            <p className="font-body text-base text-foreground">{order.payment?.method}</p>
            {order.payment?.phoneNumber && (
              <p className="font-body text-small text-foreground-muted">
                …{order.payment.phoneNumber.slice(-4)}
              </p>
            )}
            <p className="mt-3 font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
              {order.payment?.status}
            </p>
          </div>
        </section>

        {order.notes && (
          <section className="mb-8">
            <h2 className="eyebrow mb-2">{t('notes_heading')}</h2>
            <p className="font-body text-base text-foreground">{order.notes}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="btn btn-primary">
            {t('continue_shopping')}
          </Link>
          <Link href="/account" className="btn btn-ghost">
            {t('view_orders')}
          </Link>
        </div>
      </div>
    </section>
  );
}

const Row = ({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div
    className={`flex justify-between ${emphasis ? 'border-t border-border pt-3' : ''}`}
  >
    <dt className={emphasis ? 'font-display text-base text-foreground' : 'text-foreground-muted'}>
      {label}
    </dt>
    <dd className={emphasis ? 'font-display text-base text-accent' : 'text-foreground'}>
      {value}
    </dd>
  </div>
);
