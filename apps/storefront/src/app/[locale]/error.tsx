'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Branded error boundary for the storefront. Catches uncaught errors thrown by
 * pages within the [locale] layout (header/footer/theme stay rendered) and
 * shows a styled recovery screen instead of Next's bare default. `reset` retries
 * the segment; the link returns home.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    // Surface the real error in the console (and any attached monitoring).
    console.error(error);
  }, [error]);

  return (
    <section className="container-celva grid min-h-[60vh] place-items-center py-section-gap">
      <div className="text-center">
        <p className="font-display text-[clamp(72px,12vw,140px)] leading-none text-accent">
          {t('title')}
        </p>
        <p className="mx-auto mt-4 max-w-prose font-body text-lead text-foreground-muted">
          {t('message')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            {t('retry')}
          </button>
          <Link href="/" className="btn btn-ghost">
            {t('home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
