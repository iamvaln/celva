'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { Locale } from '@/i18n/routing';

/**
 * Slide-down search overlay. The submit navigates with a full GET to
 * /<locale>/<shop-path>?q=… — the existing shop page already renders
 * search results server-side, so this component stays dumb.
 */
export const SearchOverlay = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslations('nav');
  const tShop = useTranslations('shop');
  const inputRef = useRef<HTMLInputElement>(null);
  const params = useParams<{ locale: Locale }>();
  const locale = params?.locale ?? 'fr';

  // Storefront uses always-prefixed locales and FR-localized slugs for shop.
  const shopPath = locale === 'fr' ? '/fr/boutique' : '/en/shop';

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('search')}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full border-b border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="container-celva flex items-center gap-4 py-5">
          <form
            action={shopPath}
            method="GET"
            className="flex-1"
            role="search"
            onSubmit={() => {
              // Close after submit; navigation happens via form GET.
              setTimeout(onClose, 0);
            }}
          >
            <label className="sr-only" htmlFor="header-search">
              {tShop('filter.search_label')}
            </label>
            <div className="flex items-center gap-3 border-b border-foreground">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-foreground-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                id="header-search"
                type="search"
                name="q"
                autoComplete="off"
                placeholder={tShop('filter.search_placeholder')}
                className="flex-1 bg-transparent py-3 font-display text-h3 text-foreground placeholder:text-foreground-muted focus:outline-none"
              />
            </div>
          </form>
          <button
            type="button"
            aria-label={t('menu_close')}
            className="h-10 w-10 text-foreground hover:text-accent"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
