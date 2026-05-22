'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const STORAGE_KEY = 'celva.cookies.choice';

type Choice = 'accept' | 'reject';

export const CookieBanner = () => {
  const t = useTranslations('cookies');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY) as Choice | null;
    setChoice(stored);
  }, []);

  if (!mounted || choice !== null) return null;

  const persist = (next: Choice): void => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setChoice(next);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed bottom-24 left-6 z-[55] w-[min(380px,calc(100%-3rem))] border border-border bg-background p-6 shadow-drawer"
    >
      <p className="mb-4 font-body text-small leading-relaxed text-foreground">
        <strong id="cookie-title" className="mb-1 block font-display text-base font-normal">
          {t('title')}
        </strong>
        {t('body')}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => persist('accept')} className="btn btn-primary flex-1 px-4 py-2.5 text-[10px]">
          {t('accept')}
        </button>
        <button type="button" onClick={() => persist('reject')} className="btn btn-secondary flex-1 px-4 py-2.5 text-[10px]">
          {t('reject')}
        </button>
        <Link href="/privacy" className="btn btn-ghost px-2 py-2.5 text-[10px]">
          {t('learn_more')}
        </Link>
      </div>
    </div>
  );
};
