'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Monogram } from './Monogram';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';

const NAV_LINKS = [
  { href: '/shop', i18n: 'shop' },
  { href: '/collections', i18n: 'collections' },
  { href: '/studio', i18n: 'studio' },
  { href: '/journal', i18n: 'journal' },
] as const;

export const Header = () => {
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background transition-colors duration-color">
        <div className="container-celva grid grid-cols-[auto_1fr_auto] items-center gap-6 py-5">
          {/* LEFT — brand (+ mobile hamburger to keep responsive nav usable) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t('menu_open')}
              className="-ml-2 inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-accent md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
              </svg>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-display text-lg tracking-button text-accent hover:text-accent-hover"
              aria-label={t('brand')}
            >
              <Monogram className="h-8 w-8" />
              <span>CELVA</span>
            </Link>
          </div>

          {/* CENTER — primary nav (desktop) */}
          <ul className="hidden list-none gap-9 md:flex md:justify-center">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-body text-small font-medium uppercase tracking-nav text-foreground hover:text-accent"
                >
                  {t(item.i18n)}
                </Link>
              </li>
            ))}
          </ul>

          {/* RIGHT — actions (search, account, wishlist, cart) */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label={t('search')}
              className="inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-accent"
              onClick={() => setSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
            <Link
              href="/account"
              aria-label={t('account')}
              className="hidden h-10 w-10 items-center justify-center text-foreground hover:text-accent md:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
              </svg>
            </Link>
            <Link
              href="/wishlist"
              aria-label={t('wishlist')}
              className="inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path
                  d="M12 21s-7-4.5-9.5-9C1 9 2.6 5 6.5 5c2 0 3.6 1 5.5 3 1.9-2 3.5-3 5.5-3 3.9 0 5.5 4 4 7-2.5 4.5-9.5 9-9.5 9z"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/cart"
              aria-label={t('cart')}
              className="relative inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M5 7h14l-1.5 12.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 7z" strokeLinejoin="round" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
