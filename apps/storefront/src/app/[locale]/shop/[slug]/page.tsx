import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  type ApiProduct,
  type ApiProductImage,
  formatPriceXAF,
  getProductBySlug,
  getProductById,
  listAttributeValues,
  listProductAttributes,
  listProductImages,
  listRelatedProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { ProductCard } from '@/components/ProductCard';

type Params = { locale: Locale; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug, locale);
  if (!product) return { title: 'Celva' };
  return {
    title: pickLocalized(product.name, locale),
    description: pickLocalized(product.description, locale).slice(0, 160) || undefined,
  };
}

const loadRelatedCards = async (
  productId: string,
  locale: Locale,
): Promise<Array<{ product: ApiProduct; image: ApiProductImage | null }>> => {
  const links = await listRelatedProducts(productId, locale);
  const ordered = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
  const products = await Promise.all(
    ordered.map((l) => getProductById(l.relatedProductId, locale).catch(() => null)),
  );
  const cards = await Promise.all(
    products.map(async (p) => {
      if (!p || !p.isActive) return null;
      const imgs = await listProductImages(p.id, locale).catch(() => [] as ApiProductImage[]);
      return {
        product: p,
        image: imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null,
      };
    }),
  );
  return cards.filter((c): c is { product: ApiProduct; image: ApiProductImage | null } => c !== null);
};

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug, locale);
  if (!product || !product.isActive) notFound();

  const t = await getTranslations('product');

  const [images, attributesPage, relatedCards] = await Promise.all([
    listProductImages(product.id, locale).catch(() => [] as ApiProductImage[]),
    listProductAttributes(product.id, locale).catch(() => ({
      data: [] as Array<{ id: string; name: { fr: string; en: string }; sortOrder: number }>,
    })),
    loadRelatedCards(product.id, locale),
  ]);

  const attributesWithValues = await Promise.all(
    (attributesPage.data ?? []).map(async (attr) => {
      const values = await listAttributeValues(attr.id, locale).catch(() => ({ data: [] }));
      return { attribute: attr, values: values.data };
    }),
  );

  const orderedImages = [...images].sort((a, b) => a.position - b.position);
  const heroImage = orderedImages.find((i) => i.isPrimary) ?? orderedImages[0] ?? null;
  const galleryImages = orderedImages.filter((i) => i.id !== heroImage?.id);

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const price = formatPriceXAF(product.displayPrice, locale);

  return (
    <article className="bg-background py-section-tight">
      <div className="container-celva">
        <Link href="/shop" className="btn btn-ghost mb-6 inline-flex">
          ← {t('back')}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-product-portrait overflow-hidden bg-beige">
              {heroImage ? (
                <Image
                  src={heroImage.urls.large}
                  alt={pickLocalized(heroImage.altText, locale) || name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-foreground-muted">
                  <span className="eyebrow">{t('no_image')}</span>
                </div>
              )}
            </div>
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {galleryImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden bg-beige"
                  >
                    <Image
                      src={img.urls.medium}
                      alt={pickLocalized(img.altText, locale) || name}
                      fill
                      sizes="(max-width: 1024px) 33vw, 16vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="mb-4 font-display text-h2">{name}</h1>
            <p className="mb-8 font-display text-h3 text-accent">{price}</p>

            {description && (
              <section className="mb-10">
                <h2 className="eyebrow mb-3">{t('description_heading')}</h2>
                <p className="whitespace-pre-line font-body text-base text-foreground">
                  {description}
                </p>
              </section>
            )}

            {attributesWithValues.length > 0 && (
              <section className="mb-10">
                <h2 className="eyebrow mb-3">{t('attributes_heading')}</h2>
                <dl className="space-y-3">
                  {attributesWithValues.map(({ attribute, values }) => (
                    <div key={attribute.id} className="flex flex-wrap items-baseline gap-3">
                      <dt className="font-body text-small font-medium text-foreground-muted">
                        {pickLocalized(attribute.name, locale)} :
                      </dt>
                      <dd className="flex flex-wrap gap-2 font-body text-base text-foreground">
                        {values.length === 0
                          ? '—'
                          : values
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((v) => pickLocalized(v.value, locale))
                              .join(', ')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>

        {relatedCards.length > 0 && (
          <section className="mt-section-gap border-t border-border pt-10">
            <h2 className="mb-8 font-display text-h2">{t('related_heading')}</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {relatedCards.map(({ product: p, image }) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  image={image}
                  locale={locale}
                  imagePlaceholderLabel={t('no_image')}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
