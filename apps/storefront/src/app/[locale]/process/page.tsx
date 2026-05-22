import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

const STEP_KEYS = ['design', 'fabric', 'cut', 'sew', 'deliver'] as const;

export default async function ProcessPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.process');
  return (
    <article className="container-celva py-section-gap">
      <header className="mb-16 max-w-prose">
        <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      </header>
      <ol className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="border-t border-border pt-6">
            <span className="eyebrow mb-3 block">0{i + 1}</span>
            <h2 className="mb-3 font-display text-h3">{t(`steps.${key}.title`)}</h2>
            <p className="font-body text-base text-foreground-muted">{t(`steps.${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
