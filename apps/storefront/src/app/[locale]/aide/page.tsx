import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'static.help' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.help');

  return (
    <article className="container-celva max-w-prose py-section-gap">
      <header className="mb-12">
        <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      </header>

      <section id="livraison" className="mb-12 scroll-mt-28">
        <h2 className="mb-3 font-display text-h2">{t('shipping_title')}</h2>
        <div className="space-y-4 font-body text-base leading-relaxed text-foreground">
          <p>{t('shipping_p1')}</p>
          <p>{t('shipping_p2')}</p>
        </div>
      </section>

      <section id="retours" className="mb-12 scroll-mt-28">
        <h2 className="mb-3 font-display text-h2">{t('returns_title')}</h2>
        <div className="space-y-4 font-body text-base leading-relaxed text-foreground">
          <p>{t('returns_p1')}</p>
        </div>
      </section>

      <section id="entretien" className="scroll-mt-28">
        <h2 className="mb-3 font-display text-h2">{t('care_title')}</h2>
        <div className="space-y-4 font-body text-base leading-relaxed text-foreground">
          <p>{t('care_p1')}</p>
          <p>{t('care_p2')}</p>
        </div>
      </section>
    </article>
  );
}
