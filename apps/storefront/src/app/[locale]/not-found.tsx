import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// Localized 404. Renders inside the [locale] layout (header, footer,
// theme, locale switcher all still present). Triggered when a URL
// resolves to a valid locale but no page (e.g. /fr/bogus-page).
export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="container-celva grid min-h-[60vh] place-items-center py-section-gap">
      <div className="text-center">
        <p className="font-display text-[clamp(96px,16vw,200px)] leading-none text-accent">{t('title')}</p>
        <p className="mt-4 font-body text-lead text-foreground-muted">{t('message')}</p>
        <Link href="/" className="btn btn-primary mt-8 inline-block">
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
