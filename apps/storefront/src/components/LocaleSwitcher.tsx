'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale } from '@/i18n/routing';
import { syncLocaleAction } from '@/lib/locale-sync';
import { useTransition } from 'react';

export const LocaleSwitcher = ({ className = '' }: { className?: string }) => {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ locale: Locale }>();
  const [, startTransition] = useTransition();

  const next: Locale = params?.locale === 'fr' ? 'en' : 'fr';

  return (
    <button
      type="button"
      aria-label={t('language')}
      className={`font-body text-caption font-medium uppercase tracking-eyebrow text-foreground transition-colors hover:text-accent ${className}`}
      onClick={() => {
        // Persist on the user row when signed in — silent failure if
        // anon. Don't await: the navigation is the user-visible action.
        void syncLocaleAction(next);
        startTransition(() => {
          router.replace(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pathname as any,
            { locale: next },
          );
        });
      }}
    >
      {next.toUpperCase()}
    </button>
  );
};
