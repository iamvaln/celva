import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  type ApiCollection,
  type ApiProduct,
  type ApiProductImage,
  listCollections,
  listProductImages,
  listProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { listArticles, type Article } from '@/lib/articles';
import { ProductGrid } from '@/components/ProductGrid';
import { NewsletterForm } from '@/components/NewsletterForm';

// Editorial image for the newsletter block. Reuses an existing R2 lookbook shot;
// swap this URL for any other catalogue/collection image.
const NEWSLETTER_IMAGE =
  'https://media.celva.store/seed/collections/soirees-chic/celva-coll-01.png';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tShop = await getTranslations('shop');

  // Top 6 most recent active products. data[0] = hero, data[5] = sur-mesure
  // section image, and data[1..4] is the featured grid (reversed so the
  // oldest of the grid sits top-left, matching the handoff).
  const featuredPage = await listProducts(
    { pageSize: 6, sortBy: 'createdAt', sortDir: 'desc' },
    locale,
  ).catch(() => ({ data: [] as ApiProduct[], total: 0, page: 1, pageSize: 6 }));

  const heroProduct = featuredPage.data[0] ?? null;
  const gridProducts = featuredPage.data.slice(1, 5).reverse();
  const surMesureProduct = featuredPage.data[5] ?? featuredPage.data[1] ?? null;

  let heroImage: ApiProductImage | null = null;
  let heroAlt = '';
  if (heroProduct) {
    heroAlt = pickLocalized(heroProduct.name, locale);
    const imgs = await listProductImages(heroProduct.id, locale).catch(
      () => [] as ApiProductImage[],
    );
    heroImage = imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null;
  }

  // Collections + journal lists — best-effort.
  const collectionsPage = await listCollections(locale).catch(() => ({
    data: [] as ApiCollection[],
    total: 0,
    page: 1,
    pageSize: 200,
  }));
  const seededCollectionSlugs = ['ceremonie', 'boubous-soir', 'quotidien'];
  const collections = seededCollectionSlugs
    .map((slug) => collectionsPage.data.find((c) => c.slug === slug))
    .filter((c): c is ApiCollection => Boolean(c))
    .slice(0, 3);

  const journalPage = await listArticles({ pageSize: 3 }, locale).catch(() => ({
    data: [] as Article[],
    total: 0,
    page: 1,
    pageSize: 3,
  }));

  return (
    <>
      {/* Hero — split layout: text-left, image-right */}
      <section className="relative border-b border-border bg-background">
        <div className="grid min-h-[86vh] grid-cols-1 lg:grid-cols-[1fr_minmax(0,760px)]">
          <div className="flex max-w-2xl flex-col justify-center px-6 py-16 sm:px-12 lg:justify-self-end lg:px-24">
            <p className="eyebrow mb-6">{t('hero.eyebrow')}</p>
            <h1 className="mb-8 font-display text-h1 text-foreground sm:text-display">
              {t('hero.title_a')}
              <br />
              <em className="not-italic text-accent" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                {t('hero.title_em')}
              </em>
            </h1>
            <p className="mb-10 max-w-lead font-body text-lead text-foreground">{t('hero.lede')}</p>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/shop" className="btn btn-primary">
                {t('hero.cta_primary')}
              </Link>
              <Link href="/studio" className="btn btn-ghost">
                {t('hero.cta_secondary')}
              </Link>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-6 border-t border-border pt-7">
              <div>
                <span className="eyebrow block mb-1.5">{t('hero.meta_season_label')}</span>
                <p className="font-display text-base text-foreground">{t('hero.meta_season_value')}</p>
              </div>
              <div>
                <span className="eyebrow block mb-1.5">{t('hero.meta_atelier_label')}</span>
                <p className="font-display text-base text-foreground">{t('hero.meta_atelier_value')}</p>
              </div>
              <div>
                <span className="eyebrow block mb-1.5">{t('hero.meta_materials_label')}</span>
                <p className="font-display text-base text-foreground">{t('hero.meta_materials_value')}</p>
              </div>
            </div>
          </div>
          <div className="relative order-first h-[60vh] min-h-[380px] overflow-hidden bg-beige lg:order-none lg:h-auto">
            {heroImage && (
              <Image
                src={heroImage.urls.large}
                alt={heroAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover object-[50%_28%]"
              />
            )}
            {heroProduct && (
              <span className="absolute bottom-5 left-5 z-10 bg-ink/45 px-3.5 py-2 font-body text-[11px] font-medium uppercase tracking-eyebrow text-cream backdrop-blur-sm">
                {pickLocalized(heroProduct.name, locale)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-background py-section-gap">
        <div className="container-celva">
          <header className="mb-14 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3.5">{t('featured.eyebrow')}</p>
              <h2 className="font-display text-h1 text-foreground">{t('featured.title')}</h2>
            </div>
            <Link href="/shop" className="btn btn-ghost self-start sm:self-end">
              {t('featured.cta')}
            </Link>
          </header>
          {gridProducts.length > 0 ? (
            <ProductGrid
              products={gridProducts}
              locale={locale}
              emptyLabel={t('featured.placeholder')}
              imagePlaceholderLabel={tShop('product_card.view')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-7 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-product-portrait bg-beige" aria-hidden />
                  <p className="font-display text-base text-foreground">
                    {t('featured.placeholder')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sur-mesure */}
      <section id="sur-mesure" className="has-pattern bg-background-alt py-section-gap">
        <div className="container-celva grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-24">
          <div>
            <p className="eyebrow mb-3">{t('studio.eyebrow')}</p>
            <h2 className="mb-6 font-display text-h1 text-foreground">
              {t('studio.title_a')}
              <br />
              <em className="not-italic text-accent" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                {t('studio.title_em')}
              </em>
            </h2>
            <p className="mb-8 max-w-prose font-body text-lead text-foreground">{t('studio.body')}</p>
            <ul className="mb-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
              {(['step_1', 'step_2', 'step_3', 'step_4'] as const).map((key, i) => (
                <li key={key} className="flex items-baseline gap-3.5 text-base text-foreground">
                  <span className="flex-shrink-0 font-display text-small uppercase tracking-eyebrow text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{t(`studio.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Link href="/studio" className="btn btn-secondary">
              {t('studio.cta')}
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden bg-olive/10">
            {surMesureProduct && (
              <SurMesureImage
                productId={surMesureProduct.id}
                locale={locale}
                alt={pickLocalized(surMesureProduct.name, locale)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Collections — three picks of the season */}
      {collections.length > 0 && (
        <section className="bg-background py-section-gap">
          <div className="container-celva">
            <header className="mb-14">
              <p className="eyebrow mb-3.5">{t('collections_section.eyebrow')}</p>
              <h2 className="font-display text-h1 text-foreground">
                {t('collections_section.title_a')}
                <br />
                <em className="not-italic text-accent" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                  {t('collections_section.title_em')}
                </em>
              </h2>
            </header>
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
                    <h3 className="mb-3 font-display text-h2 text-foreground">
                      {pickLocalized(c.name, locale)}
                    </h3>
                    {c.description && (
                      <p className="mb-4 font-body text-base text-foreground-muted">
                        {pickLocalized(c.description, locale)}
                      </p>
                    )}
                    <span className="btn btn-ghost group-hover:border-accent group-hover:text-accent">
                      {t('collections_section.cta')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial band */}
      <section className="bg-olive py-section-gap text-cream dark:bg-olive-dark">
        <div className="container-celva">
          <p className="eyebrow mb-8 text-cream/60">{t('testimonials.eyebrow')}</p>
          <figure className="max-w-[1000px]">
            <blockquote className="mb-9 font-display text-cream [font-size:clamp(28px,3.4vw,48px)] [line-height:1.2] [text-wrap:balance]">
              <em style={{ fontStyle: 'italic', fontWeight: 400 }}>
                «&nbsp;{t('testimonials.quote')}&nbsp;»
              </em>
            </blockquote>
            <figcaption className="flex items-center gap-5 text-cream/75">
              <span className="font-display text-base text-cream">
                {t('testimonials.name')}
              </span>
              <span className="font-body text-small italic">
                {t('testimonials.city')}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Journal */}
      {journalPage.data.length > 0 && (
        <section className="bg-background-alt py-section-gap">
          <div className="container-celva">
            <header className="mb-14 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow mb-3.5">{t('journal.eyebrow')}</p>
                <h2 className="font-display text-h1 text-foreground">{t('journal.title')}</h2>
              </div>
              <Link href="/journal" className="btn btn-ghost self-start sm:self-end">
                {t('journal.cta')}
              </Link>
            </header>
            <div className="grid grid-cols-1 gap-9 lg:grid-cols-3">
              {journalPage.data.slice(0, 3).map((a) => (
                <Link
                  key={a.id}
                  href={{ pathname: '/journal/[slug]', params: { slug: a.slug } }}
                  className="group block text-foreground"
                >
                  <div className="relative mb-5 aspect-[4/5] overflow-hidden bg-beige">
                    {a.coverImage && (
                      <Image
                        src={a.coverImage}
                        alt={pickLocalized(a.title, locale)}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover transition-transform duration-image ease-celva group-hover:scale-[1.015]"
                      />
                    )}
                  </div>
                  <p className="eyebrow mb-2">
                    {formatJournalDate(a.publishedAt ?? a.createdAt, locale)}
                  </p>
                  <h3 className="mb-2 font-display text-h3 text-foreground">
                    {pickLocalized(a.title, locale)}
                  </h3>
                  {a.excerpt && (
                    <p className="font-body text-base text-foreground-muted">
                      {pickLocalized(
                        { fr: a.excerpt.fr ?? '', en: a.excerpt.en ?? '' },
                        locale,
                      )}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-background-alt py-section-gap">
        <div className="container-celva grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden bg-beige">
            <Image
              src={NEWSLETTER_IMAGE}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="eyebrow mb-3">{t('newsletter.eyebrow')}</p>
            <h2 className="mb-6 font-display text-h1 text-foreground">
              {t('newsletter.title_a')}
              <br />
              <em className="not-italic text-accent" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                {t('newsletter.title_em')}
              </em>
            </h2>
            <p className="mb-8 font-body text-lead text-foreground">{t('newsletter.body')}</p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}

function formatJournalDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Async server component so the sur-mesure image fetch doesn't block the
 * homepage waterfall when products lack images.
 */
async function SurMesureImage({
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
      sizes="(max-width: 1024px) 100vw, 40vw"
      className="object-cover"
    />
  );
}
