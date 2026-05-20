import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

const SECTIONS = ['ordering', 'payment', 'delivery', 'returns'] as const;

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.terms');
  const updated = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date('2026-01-01'));

  return (
    <article className="container-celva max-w-prose py-section-gap">
      <header className="mb-12">
        <h1 className="mb-3 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-small text-foreground-muted">{t('updated', { date: updated })}</p>
      </header>
      <p className="mb-10 font-body text-lead text-foreground">{t('intro')}</p>
      <div className="space-y-10 font-body text-base text-foreground">
        {SECTIONS.map((key) => (
          <section key={key}>
            <h2 className="mb-3 font-display text-h3">{t(`sections.${key}.title`)}</h2>
            <p className="text-foreground-muted">{t(`sections.${key}.body`)}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
