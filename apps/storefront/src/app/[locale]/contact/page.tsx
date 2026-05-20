import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.contact');
  const whatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? '237000000000';

  return (
    <article className="container-celva max-w-prose py-section-gap">
      <header className="mb-12">
        <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      </header>
      <dl className="space-y-6 font-body text-base">
        <Row label={t('email_label')} value="contact@celva.store" href="mailto:contact@celva.store" />
        <Row label={t('whatsapp_label')} value="+237 6XX XXX XXX" href={`https://wa.me/${whatsapp}`} />
        <Row label={t('address_label')} value={t('address_value')} />
        <Row label={t('hours_label')} value={t('hours_value')} />
      </dl>
    </article>
  );
}

const Row = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <div className="grid gap-1 border-b border-border pb-4 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-6">
    <dt className="eyebrow">{label}</dt>
    <dd>
      {href ? (
        <a href={href} className="text-foreground hover:text-accent" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
          {value}
        </a>
      ) : (
        <span className="text-foreground">{value}</span>
      )}
    </dd>
  </div>
);
