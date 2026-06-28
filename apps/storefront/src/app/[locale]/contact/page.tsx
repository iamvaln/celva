import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { buildWhatsAppHref, getPublicSettings } from '@/lib/public-settings';
import { Link } from '@/i18n/navigation';
import { ContactForm } from '@/components/ContactForm';

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.contact');
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const settings = await getPublicSettings(locale);

  const email = settings.contactEmail ?? 'contact@celva.store';
  const phone = settings.contactPhone;
  const whatsapp = settings.contactWhatsapp;

  return (
    <article className="container-celva max-w-prose py-section-gap">
      <header className="mb-12">
        <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      </header>
      <dl className="space-y-6 font-body text-base">
        <Row label={t('email_label')} value={email} href={`mailto:${email}`} />
        {phone && <Row label={t('phone_label')} value={phone} href={`tel:${phone.replace(/\s/g, '')}`} />}
        {whatsapp && (
          <Row
            label={t('whatsapp_label')}
            value={whatsapp}
            href={buildWhatsAppHref(whatsapp, tNav('whatsapp_prelude'))}
          />
        )}
        <Row label={t('address_label')} value={t('address_value')} />
        <Row label={t('hours_label')} value={t('hours_value')} />
      </dl>

      <p className="mt-10 font-body text-base text-foreground-muted">
        {t('appointment_text')}{' '}
        <Link
          href={{ pathname: '/studio', hash: 'book' }}
          className="italic text-accent underline decoration-accent underline-offset-2 hover:text-accent-hover"
        >
          {t('appointment_cta')}
        </Link>
      </p>

      <section className="mt-section-gap border-t border-border pt-10">
        <h2 className="mb-6 font-display text-h2">{t('form.heading')}</h2>
        <ContactForm />
      </section>
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
