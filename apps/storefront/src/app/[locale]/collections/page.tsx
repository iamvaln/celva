import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { listCollections, pickLocalized } from '@/lib/catalogue';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collection' });
  return { title: t('index_title'), description: t('index_subtitle') };
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('collection');
  const tHome = await getTranslations('home');

  const page = await listCollections(locale);
  const collections = [...page.data].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-2">{t('index_subtitle')}</p>
          <h1 className="font-display text-h1">{t('index_title')}</h1>
        </header>

        {collections.length === 0 ? (
          <p className="font-body text-lead text-foreground-muted">{t('index_empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {collections.map((c, i) => (
              <Link
                key={c.id}
                href={{ pathname: '/collections/[slug]', params: { slug: c.slug } }}
                className="group block text-foreground"
              >
                <div className="relative aspect-product-portrait overflow-hidden bg-beige">
                  {c.imageUrl && (
                    <Image
                      src={c.imageUrl}
                      alt={pickLocalized(c.name, locale)}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-image ease-celva group-hover:scale-[1.015]"
                    />
                  )}
                </div>
                <div className="max-w-[36ch] pt-6">
                  <p className="eyebrow mb-2">
                    {String(i + 1).padStart(2, '0')} · {pickLocalized(c.name, locale)}
                  </p>
                  <h2 className="mb-3 font-display text-h2 text-foreground">
                    {pickLocalized(c.name, locale)}
                  </h2>
                  {c.description && (
                    <p className="mb-4 font-body text-base text-foreground-muted">
                      {pickLocalized(c.description, locale)}
                    </p>
                  )}
                  <span className="btn btn-ghost group-hover:border-accent group-hover:text-accent">
                    {tHome('collections_section.cta')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
