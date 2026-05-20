import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.about');
  return (
    <article className="container-celva max-w-prose py-section-gap">
      <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
      <p className="mb-10 font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      <div className="space-y-6 font-body text-base leading-relaxed text-foreground">
        <p>{t('p1')}</p>
        <p>{t('p2')}</p>
      </div>
    </article>
  );
}
