import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { formatPriceXAF, pickLocalized } from '@/lib/catalogue';
import { cancelOrderAction, readAndClearOrderFlash } from './actions';
import { DeliveryTimeline } from './DeliveryTimeline';

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

const STATUS_KEYS: Record<string, string> = {
  PENDING: 'status_pending',
  CONFIRMED: 'status_confirmed',
  PROCESSING: 'status_processing',
  READY: 'status_ready',
  SHIPPED: 'status_shipped',
  DELIVERED: 'status_delivered',
  COMPLETED: 'status_completed',
  CANCELLED: 'status_cancelled',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; orderNumber: string }>;
}): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  const t = await getTranslations({ locale, namespace: 'account.order_detail' });
  return { title: `${t('title')} · ${orderNumber}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account.order_detail');
  const tList = await getTranslations('account.orders_page');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect({ href: '/login', locale } as never);

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

  const statusKey = STATUS_KEYS[order.status] ?? 'status_pending';
  const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(order.createdAt));

  const flash = await readAndClearOrderFlash();
  const flashOk = flash === 'cancelled';
  const flashError = flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;
  const canCancel = order.status === 'PENDING';
  // Invoice is created when the payment is marked COMPLETED. Cash orders
  // CONFIRMED at checkout still wait for the admin to confirm the cash
  // received before the Invoice row materializes.
  const hasInvoice = order.payment?.status === 'COMPLETED';

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva max-w-3xl">
        <header className="mb-10">
          <Link href="/account/orders" className="btn btn-ghost mb-4 inline-flex">
            ← {tList('back_to_orders')}
          </Link>
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="mb-2 font-display text-h1">{order.orderNumber}</h1>
          <p className="font-body text-lead text-foreground-muted">{date}</p>
          <p className="mt-3 font-display text-base text-accent">{tList(statusKey)}</p>
        </header>

        <section className="mb-8 border border-border p-6">
          <h2 className="eyebrow mb-4">{t('items_heading')}</h2>
          <ul className="space-y-2 font-body">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {pickLocalized(it.variant.product.name, locale)} · {it.variant.sku} × {it.quantity}
                </span>
                <span>
                  {formatPriceXAF(String(Number(it.unitPrice) * it.quantity), locale)}
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
            <Row label={t('total')} value={formatPriceXAF(order.total, locale)} emphasis />
            <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
              {t('vat_included')}
            </p>
          </dl>
        </section>

        <DeliveryTimeline
          orderNumber={order.orderNumber}
          locale={locale}
          accessToken={accessToken}
        />

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

        {hasInvoice && (
          <section className="mb-8">
            <a
              href={`/${locale}/account/invoice/${order.id}`}
              className="btn btn-secondary"
              download
            >
              {t('download_invoice')}
            </a>
          </section>
        )}

        {flashOk && (
          <div className="mb-8 border border-foreground bg-cream px-4 py-3 font-body text-base text-foreground">
            {t('cancel_success')}
          </div>
        )}
        {flashError && (
          <div className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent">
            {flashError === 'order_customer_cancel_too_late'
              ? t('cancel_too_late')
              : t('cancel_error')}
          </div>
        )}

        {canCancel && (
          <section className="mt-8 border border-border p-6">
            <h2 className="eyebrow mb-2">{t('cancel_heading')}</h2>
            <p className="mb-4 font-body text-base text-foreground-muted">
              {t('cancel_explainer')}
            </p>
            <form action={cancelOrderAction} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <label className="block">
                <span className="eyebrow mb-1 block">{t('cancel_reason_label')}</span>
                <textarea
                  name="reason"
                  rows={3}
                  maxLength={280}
                  placeholder={t('cancel_reason_placeholder')}
                  className="input-underline w-full"
                />
              </label>
              <button type="submit" className="btn btn-primary">
                {t('cancel_submit')}
              </button>
            </form>
          </section>
        )}
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
  <div className={`flex justify-between ${emphasis ? 'border-t border-border pt-3' : ''}`}>
    <dt className={emphasis ? 'font-display text-base text-foreground' : 'text-foreground-muted'}>
      {label}
    </dt>
    <dd className={emphasis ? 'font-display text-base text-accent' : 'text-foreground'}>
      {value}
    </dd>
  </div>
);
