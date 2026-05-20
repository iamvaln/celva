import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <>
      {/* Hero */}
      <section className="relative h-screen min-h-[640px] w-full">
        <div className="absolute inset-0 bg-beige" aria-hidden>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(26,26,24,0.4))]" />
        </div>
        <div className="container-celva relative z-10 flex h-full flex-col justify-end pb-20 text-cream">
          <p className="eyebrow mb-4 text-cream/80">{t('hero.eyebrow')}</p>
          <h1 className="mb-6 max-w-3xl whitespace-pre-line font-display text-h1 sm:text-display">
            {t('hero.title')}
          </h1>
          <p className="mb-8 max-w-xl font-body text-lead text-cream/90">{t('hero.subtitle')}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/shop" className="btn btn-primary">
              {t('hero.cta_primary')}
            </Link>
            <Link href="/process" className="btn btn-secondary text-cream border-cream hover:bg-cream hover:text-ink">
              {t('hero.cta_secondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured (placeholder until Phase 2 catalog) */}
      <section className="bg-background py-section-gap">
        <div className="container-celva">
          <header className="mb-12 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-2">{t('featured.eyebrow')}</p>
              <h2 className="font-display text-h2">{t('featured.title')}</h2>
              <p className="mt-2 max-w-prose font-body text-base text-foreground-muted">{t('featured.subtitle')}</p>
            </div>
            <Link href="/shop" className="btn btn-ghost self-start sm:self-end">
              {t('featured.cta')}
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-7 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-product-portrait bg-beige" aria-hidden />
                <div className="space-y-1">
                  <p className="font-display text-base text-foreground">{t('featured.placeholder')}</p>
                  <p className="font-display text-small text-accent">— FCFA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sur-mesure */}
      <section className="has-pattern bg-background-alt py-section-gap">
        <div className="container-celva grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">{t('studio.eyebrow')}</p>
            <h2 className="mb-4 font-display text-h2">{t('studio.title')}</h2>
            <p className="mb-6 max-w-prose font-body text-lead text-foreground">{t('studio.body')}</p>
            <Link href="/contact" className="btn btn-primary">
              {t('studio.cta')}
            </Link>
          </div>
          <div className="aspect-product-portrait bg-olive/10" aria-hidden />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h2 className="mb-3 font-display text-h2">{t('newsletter.title')}</h2>
          <p className="mb-6 font-body text-base text-foreground-muted">{t('newsletter.body')}</p>
          <form className="flex flex-col items-stretch gap-3 sm:flex-row" aria-label={t('newsletter.title')}>
            <label className="sr-only" htmlFor="newsletter-email">
              {t('newsletter.email_label')}
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder={t('newsletter.email_placeholder')}
              className="input-underline flex-1 text-center sm:text-left"
            />
            <button type="submit" className="btn btn-primary">
              {t('newsletter.submit')}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
