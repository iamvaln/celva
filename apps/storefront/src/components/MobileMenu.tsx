'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Monogram } from './Monogram';

export const MobileMenu = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslations('nav');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, hydrated]);

  return (
    <>
      <div
        aria-hidden
        className={`fixed inset-0 z-[70] bg-ink/40 transition-opacity duration-color ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <nav
        aria-label={t('menu_open')}
        className={`fixed left-0 top-0 z-[80] flex h-screen w-[min(360px,88vw)] flex-col border-r border-border bg-background transition-transform duration-drawer ease-celva ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-7 py-5">
          <Link
            href="/"
            onClick={onClose}
            className="inline-flex items-center gap-2 font-display text-base tracking-button text-accent"
          >
            <Monogram className="h-7 w-7" />
            <span>CELVA</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('menu_close')}
            className="h-10 w-10 text-foreground hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
            </svg>
          </button>
        </div>
        <ul className="flex-1 list-none overflow-y-auto p-7">
          {[
            { href: '/shop' as const, label: t('shop') },
            { href: '/journal' as const, label: t('journal') },
            { href: '/studio' as const, label: t('studio') },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="block border-b border-border py-4 font-display text-h3 text-foreground hover:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-border bg-background-alt px-7 py-5">
          <Link
            href="/login"
            onClick={onClose}
            className="font-body text-small uppercase tracking-button text-foreground-muted hover:text-accent"
          >
            {t('login')}
          </Link>
        </div>
      </nav>
    </>
  );
};
