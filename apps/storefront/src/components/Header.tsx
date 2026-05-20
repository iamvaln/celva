'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Monogram } from './Monogram';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';

export const Header = () => {
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background transition-colors duration-color">
        <div className="container-celva grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-5">
          <div className="flex items-center md:justify-start">
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
            <ul className="hidden list-none gap-9 md:flex">
              {[
                { href: '/shop' as const, label: t('shop') },
                { href: '/about' as const, label: t('account') /* placeholder until collections page */ },
                { href: '/journal' as const, label: t('journal') },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-body text-small font-medium uppercase tracking-nav text-foreground hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-self-center gap-3 font-display text-lg tracking-button text-accent hover:text-accent-hover"
            aria-label={t('brand')}
          >
            <Monogram className="h-8 w-8" />
            <span>CELVA</span>
          </Link>
          <div className="flex items-center justify-end gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />
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
            <button
              type="button"
              aria-label={t('cart')}
              className="relative inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M5 7h14l-1.5 12.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 7z" strokeLinejoin="round" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};
