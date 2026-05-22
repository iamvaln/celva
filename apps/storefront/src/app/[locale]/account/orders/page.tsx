import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { formatPriceXAF } from '@/lib/catalogue';

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
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

export default async function OrdersListPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account.orders_page');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect({ href: '/login', locale } as never);

  let orders: OrderSummary[] = [];
  try {
    orders = await apiFetch<OrderSummary[]>('/me/orders', { locale, accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect({ href: '/login', locale } as never);
    }
    throw err;
  }

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-display text-h1">{t('title')}</h1>
            <p className="mt-2 font-body text-lead text-foreground-muted">{t('subtitle')}</p>
          </div>
          <Link href="/account" className="btn btn-ghost self-end">
            ← {t('back')}
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="border border-border bg-background-alt p-10 text-center">
            <p className="mb-6 font-body text-lead text-foreground-muted">{t('empty')}</p>
            <Link href="/shop" className="btn btn-primary">
              {t('go_to_shop')}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {orders.map((order) => {
              const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(order.createdAt));
              const statusKey = STATUS_KEYS[order.status] ?? 'status_pending';
              return (
                <li key={order.id} className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-display text-base text-foreground">
                      {order.orderNumber}
                    </p>
                    <p className="font-body text-small text-foreground-muted">
                      {date} · {formatPriceXAF(order.total, locale)}
                    </p>
                    <p className="mt-1 font-body text-caption uppercase tracking-eyebrow text-accent">
                      {t(statusKey)}
                    </p>
                  </div>
                  <Link
                    href={{
                      pathname: '/account/orders/[orderNumber]',
                      params: { orderNumber: order.orderNumber },
                    }}
                    className="btn btn-ghost self-start sm:self-center"
                  >
                    {t('view')}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
