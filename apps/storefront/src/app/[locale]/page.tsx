import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  type ApiProductImage,
  listProductImages,
  listProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { ProductGrid } from '@/components/ProductGrid';
import { NewsletterForm } from '@/components/NewsletterForm';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tShop = await getTranslations('shop');

  // Featured: 4 most recent active products. Renders the placeholder grid
  // gracefully if the catalogue is empty.
  const featuredPage = await listProducts(
    { pageSize: 4, sortBy: 'createdAt', sortDir: 'desc' },
    locale,
  ).catch(() => ({ data: [], total: 0, page: 1, pageSize: 4 }));

  // Hero image: the primary image of the first featured product. Falls
  // back to a plain beige hero when the catalogue is empty (pre-launch).
  let heroImage: ApiProductImage | null = null;
  let heroAlt = '';
  if (featuredPage.data[0]) {
    const first = featuredPage.data[0];
    heroAlt = pickLocalized(first.name, locale);
    const imgs = await listProductImages(first.id, locale).catch(
      () => [] as ApiProductImage[],
    );
    heroImage = imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null;
  }

  return (
    <>
      {/* Hero */}
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-beige" aria-hidden>
          {heroImage && (
            <Image
              src={heroImage.urls.large}
              alt={heroAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,26,24,0.15)_0%,transparent_45%,rgba(26,26,24,0.55))]" />
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
            <Link
              href="/process"
              className="btn btn-secondary border-cream text-cream hover:bg-cream hover:text-ink"
            >
              {t('hero.cta_secondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-background py-section-gap">
        <div className="container-celva">
          <header className="mb-12 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-2">{t('featured.eyebrow')}</p>
              <h2 className="font-display text-h2">{t('featured.title')}</h2>
              <p className="mt-2 max-w-prose font-body text-base text-foreground-muted">
                {t('featured.subtitle')}
              </p>
            </div>
            <Link href="/shop" className="btn btn-ghost self-start sm:self-end">
              {t('featured.cta')}
            </Link>
          </header>
          {featuredPage.data.length > 0 ? (
            <ProductGrid
              products={featuredPage.data}
              locale={locale}
              emptyLabel={t('featured.placeholder')}
              imagePlaceholderLabel={tShop('product_card.view')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-7 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-product-portrait bg-beige" aria-hidden />
                  <div className="space-y-1">
                    <p className="font-display text-base text-foreground">
                      {t('featured.placeholder')}
                    </p>
                    <p className="font-display text-small text-accent">— FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sur-mesure */}
      <section className="has-pattern bg-background-alt py-section-gap">
        <div className="container-celva grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">{t('studio.eyebrow')}</p>
            <h2 className="mb-4 font-display text-h2">{t('studio.title')}</h2>
            <p className="mb-6 max-w-prose font-body text-lead text-foreground">{t('studio.body')}</p>
            <Link href="/studio" className="btn btn-primary">
              {t('studio.cta')}
            </Link>
          </div>
          <div className="relative aspect-product-portrait overflow-hidden bg-olive/10">
            {featuredPage.data[1] && (
              <StudioImage
                productId={featuredPage.data[1].id}
                locale={locale}
                alt={pickLocalized(featuredPage.data[1].name, locale)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h2 className="mb-3 font-display text-h2">{t('newsletter.title')}</h2>
          <p className="mb-6 font-body text-base text-foreground-muted">{t('newsletter.body')}</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}

/**
 * Small async server component so the studio image fetch doesn't block the
 * homepage waterfall when products lack images.
 */
async function StudioImage({
  productId,
  locale,
  alt,
}: {
  productId: string;
  locale: Locale;
  alt: string;
}) {
  const imgs = await listProductImages(productId, locale).catch(
    () => [] as ApiProductImage[],
  );
  const img = imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null;
  if (!img) return null;
  return (
    <Image
      src={img.urls.large}
      alt={alt}
      fill
      sizes="(max-width: 1024px) 100vw, 50vw"
      className="object-cover"
    />
  );
}
