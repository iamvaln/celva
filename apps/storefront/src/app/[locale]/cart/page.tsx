import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { fetchCart } from '@/lib/cart';
import { formatPriceXAF, pickLocalized } from '@/lib/catalogue';
import {
  clearCartAction,
  getActivePromoCode,
  removeCartItemAction,
  removePromoAction,
  updateCartItemAction,
} from './actions';
import { PromoCodeInput } from './PromoCodeInput';
import { StockBadge } from '@/components/StockBadge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cart' });
  return { title: t('title') };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('cart');

  const cart = await fetchCart(locale);

  // Re-validate the persisted promo code against the current subtotal.
  // If it no longer applies (subtotal changed, code deactivated, etc.) we
  // surface no discount line and the cookie is silently retained — the next
  // user submit will clear it.
  let promo: { code: string; discount: string; subtotalAfter: string } | null = null;
  const activeCode = await getActivePromoCode();
  if (cart && activeCode) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      try {
        promo = await apiFetch<{ code: string; discount: string; subtotalAfter: string }>(
          '/me/cart/apply-promo',
          { method: 'POST', body: { code: activeCode }, accessToken },
        );
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
      }
    }
  }

  // Logged-out
  if (!cart) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">
            {t('login_required')}
          </p>
          <Link href="/login" className="btn btn-primary">
            {t('login_required')}
          </Link>
        </div>
      </section>
    );
  }

  // Empty
  if (cart.items.length === 0) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">{t('empty')}</p>
          <Link href="/shop" className="btn btn-primary">
            {t('continue_shopping')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-10 flex items-end justify-between">
          <h1 className="font-display text-h1">{t('title')}</h1>
          <form action={clearCartAction}>
            <button type="submit" className="btn btn-ghost text-foreground-muted">
              {t('clear')}
            </button>
          </form>
        </header>

        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          {/* Items */}
          <ul className="divide-y divide-border border-y border-border">
            {cart.items.map((item) => {
              const name = pickLocalized(item.productName, locale);
              const unit = formatPriceXAF(item.unitPrice, locale);
              const line = formatPriceXAF(item.lineTotal, locale);
              return (
                <li key={item.id} className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="space-y-1">
                    <Link
                      href={{ pathname: '/shop/[slug]', params: { slug: item.productSlug } }}
                      className="font-display text-base text-foreground hover:text-accent"
                    >
                      {name}
                    </Link>
                    <p className="font-body text-small text-foreground-muted">
                      {item.sku} · {unit}
                    </p>
                    <div className="mt-1">
                      <StockBadge
                        stock={item.stockAvailable}
                        isAvailable={item.isAvailable && item.stockAvailable > 0}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <form action={updateCartItemAction} className="flex items-center gap-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>
                        {t('quantity')}
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        name="quantity"
                        defaultValue={item.quantity}
                        min={1}
                        max={Math.max(1, item.stockAvailable || 100)}
                        className="input-underline w-16 text-center"
                      />
                      <button type="submit" className="btn btn-ghost">
                        {t('update')}
                      </button>
                    </form>
                    <form action={removeCartItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        className="font-body text-small text-foreground-muted hover:text-accent"
                      >
                        {t('remove')}
                      </button>
                    </form>
                    <p className="ml-3 font-display text-base text-foreground">{line}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Summary */}
          <aside className="border border-border bg-background-alt p-6">
            <h2 className="eyebrow mb-4">{t('summary')}</h2>
            <dl className="space-y-3 font-body">
              <div className="flex justify-between">
                <dt className="text-foreground-muted">{t('subtotal')}</dt>
                <dd className="font-display text-base text-foreground">
                  {formatPriceXAF(cart.total, locale)}
                </dd>
              </div>
              {promo && (
                <div className="flex items-center justify-between">
                  <dt className="text-foreground-muted">
                    {t('discount')} ({promo.code}){' '}
                    <form action={removePromoAction} className="inline">
                      <button
                        type="submit"
                        className="ml-2 text-caption uppercase tracking-eyebrow text-foreground-muted hover:text-accent"
                      >
                        ×
                      </button>
                    </form>
                  </dt>
                  <dd className="font-display text-base text-accent">
                    −{formatPriceXAF(promo.discount, locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-small text-foreground-muted">
                <dt>{t('delivery_at_checkout')}</dt>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-display text-base text-foreground">{t('total')}</dt>
                <dd className="font-display text-base text-accent">
                  {formatPriceXAF(promo ? promo.subtotalAfter : cart.total, locale)}
                </dd>
              </div>
              <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
                {t('vat_included')}
              </p>
            </dl>

            <div className="mt-6 border-t border-border pt-4">
              <PromoCodeInput appliedCode={promo?.code ?? null} />
            </div>

            <button type="button" disabled className="btn btn-primary btn-block mt-6 opacity-60">
              {t('checkout')}
            </button>
            <p className="mt-3 text-center font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
              {t('checkout_coming_soon')}
            </p>
            <Link href="/shop" className="btn btn-ghost btn-block mt-2">
              {t('continue_shopping')}
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
