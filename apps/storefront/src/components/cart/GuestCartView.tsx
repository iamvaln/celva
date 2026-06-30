'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatPriceXAF } from '@/lib/money';
import {
  useGuestCart,
  setGuestQty,
  removeGuestItem,
  clearGuestCart,
} from '@/lib/guest-cart';

/**
 * Cart page for guests (not logged in). Renders the localStorage cart with
 * quantity controls and a working checkout link. Logged-in users get the
 * server-cart view instead (see cart/page.tsx).
 */
export function GuestCartView({ locale }: { locale: Locale }) {
  const t = useTranslations('cart');
  const items = useGuestCart();

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.unitPrice) * it.quantity,
    0,
  );

  if (items.length === 0) {
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
          <button
            type="button"
            onClick={() => clearGuestCart()}
            className="btn btn-ghost text-foreground-muted"
          >
            {t('clear')}
          </button>
        </header>

        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          {/* Items */}
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => {
              const line = formatPriceXAF(
                Number(item.unitPrice) * item.quantity,
                locale,
              );
              return (
                <li
                  key={item.variantId}
                  className="grid gap-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <div className="relative hidden h-20 w-16 overflow-hidden bg-beige sm:block">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Link
                      href={{ pathname: '/shop/[slug]', params: { slug: item.productSlug } }}
                      className="font-display text-base text-foreground hover:text-accent"
                    >
                      {item.name}
                    </Link>
                    {item.options && (
                      <p className="font-body text-small text-foreground-muted">
                        {item.options}
                      </p>
                    )}
                    <p className="font-body text-small text-foreground-muted">
                      {formatPriceXAF(item.unitPrice, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="inline-flex items-center border border-border">
                      <button
                        type="button"
                        aria-label={t('quantity')}
                        disabled={item.quantity <= 1}
                        onClick={() => setGuestQty(item.variantId, item.quantity - 1)}
                        className="flex h-10 w-9 items-center justify-center text-foreground hover:text-accent disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center font-display text-base tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={t('quantity')}
                        disabled={item.quantity >= item.maxStock}
                        onClick={() => setGuestQty(item.variantId, item.quantity + 1)}
                        className="flex h-10 w-9 items-center justify-center text-foreground hover:text-accent disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGuestItem(item.variantId)}
                      className="font-body text-small text-foreground-muted hover:text-accent"
                    >
                      {t('remove')}
                    </button>
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
                  {formatPriceXAF(subtotal, locale)}
                </dd>
              </div>
              <div className="flex justify-between text-small text-foreground-muted">
                <dt>{t('delivery_at_checkout')}</dt>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-display text-base text-foreground">{t('total')}</dt>
                <dd className="font-display text-base text-accent">
                  {formatPriceXAF(subtotal, locale)}
                </dd>
              </div>
              <p className="text-caption uppercase tracking-eyebrow text-foreground-muted">
                {t('vat_included')}
              </p>
            </dl>

            <Link href="/checkout" className="btn btn-primary btn-block mt-6">
              {t('checkout')}
            </Link>
            <p className="mt-3 text-center font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
              {t('guest.no_account_needed')}
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
