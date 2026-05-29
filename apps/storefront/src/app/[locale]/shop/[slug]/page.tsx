import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  type ApiProduct,
  type ApiProductImage,
  type ApiVariant,
  formatPriceXAF,
  getProductBySlug,
  getProductById,
  listAttributeValues,
  listProductAttributes,
  listProductImages,
  listProductVariants,
  listRelatedProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { fetchWishlistVariantIds } from '@/lib/cart';
import { listSizeGuidesByCategory } from '@/lib/size-guides';
import { ProductCard } from '@/components/ProductCard';
import { StockBadge } from '@/components/StockBadge';
import { addToCartAction, readAndClearCartFlash } from '../../cart/actions';
import { addToWishlistAction, removeFromWishlistAction } from '../../wishlist/actions';

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
  const tCart = await getTranslations('cart');
  const tWishlist = await getTranslations('wishlist');
  const tFooter = await getTranslations('footer');

  const [images, attributesPage, variantsPage, relatedCards, wishlistIds, flash, sizeGuides] =
    await Promise.all([
      listProductImages(product.id, locale).catch(() => [] as ApiProductImage[]),
      listProductAttributes(product.id, locale).catch(() => ({
        data: [] as Array<{ id: string; name: { fr: string; en: string }; sortOrder: number }>,
      })),
      listProductVariants(product.id, locale).catch(() => ({ data: [] as ApiVariant[] })),
      loadRelatedCards(product.id, locale),
      fetchWishlistVariantIds(locale),
      readAndClearCartFlash(),
      listSizeGuidesByCategory(product.categoryId, locale).catch(() => []),
    ]);
  const hasSizeGuide = sizeGuides.length > 0;

  // Flash from the previous add-to-cart attempt that bounced back here on
  // error. Success redirects to /cart so we only ever see "error:..." here.
  const flashError =
    flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;

  const fromPath = `/${locale}/shop/${slug}`;

  const attributesWithValues = await Promise.all(
    (attributesPage.data ?? []).map(async (attr) => {
      const values = await listAttributeValues(attr.id, locale).catch(() => ({ data: [] }));
      return { attribute: attr, values: values.data };
    }),
  );

  // Map attributeValueId → { attribute name, value name } for rendering each variant's combo.
  const valueLabelById = new Map<string, { attribute: string; value: string }>();
  for (const { attribute, values } of attributesWithValues) {
    for (const v of values) {
      valueLabelById.set(v.id, {
        attribute: pickLocalized(attribute.name, locale),
        value: pickLocalized(v.value, locale),
      });
    }
  }

  const orderedImages = [...images].sort((a, b) => a.position - b.position);
  const heroImage = orderedImages.find((i) => i.isPrimary) ?? orderedImages[0] ?? null;
  const galleryImages = orderedImages.filter((i) => i.id !== heroImage?.id);

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const wishlistSet = new Set(wishlistIds);

  const formatVariantCombo = (variant: ApiVariant): string =>
    variant.attributeValues
      .map((av) => valueLabelById.get(av.attributeValueId)?.value)
      .filter((v): v is string => !!v)
      .join(' · ') || variant.sku;

  const variantPrice = (variant: ApiVariant): string =>
    variant.priceOverride ?? product.displayPrice;

  return (
    <article className="bg-background py-section-tight">
      <div className="container-celva">
        <Link href="/shop" className="btn btn-ghost mb-6 inline-flex">
          ← {t('back')}
        </Link>

        {flashError && (
          <div
            role="alert"
            className="mb-6 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent"
          >
            {tCart(flashError === 'insufficient_stock' ? 'flash.insufficient_stock' : 'flash.add_failed')}
          </div>
        )}

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
                  <div key={img.id} className="relative aspect-square overflow-hidden bg-beige">
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
            <p className="mb-8 font-display text-h3 text-accent">
              {formatPriceXAF(product.displayPrice, locale)}
            </p>

            {description && (
              <section className="mb-10">
                <h2 className="eyebrow mb-3">{t('description_heading')}</h2>
                <p className="whitespace-pre-line font-body text-base text-foreground">
                  {description}
                </p>
              </section>
            )}

            {/* Variants — each row is its own add-to-cart + wishlist form. */}
            {variantsPage.data.length > 0 && (
              <section className="mb-10">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <h2 className="eyebrow">{t('attributes_heading')}</h2>
                  {hasSizeGuide && (
                    <Link
                      href={{ pathname: '/size-guides', hash: `guide-${product.categoryId}` }}
                      className="font-body text-small text-accent underline hover:text-accent-hover"
                    >
                      {tFooter('links.size_guide')}
                    </Link>
                  )}
                </div>
                <ul className="divide-y divide-border border-y border-border">
                  {variantsPage.data.map((variant) => {
                    const inStock = variant.stock > 0;
                    const wished = wishlistSet.has(variant.id);
                    return (
                      <li
                        key={variant.id}
                        className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-display text-base text-foreground">
                            {formatVariantCombo(variant)}
                          </p>
                          <p className="font-body text-small text-foreground-muted">
                            {variant.sku} · {formatPriceXAF(variantPrice(variant), locale)}
                          </p>
                          <div className="mt-1">
                            <StockBadge stock={variant.stock} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <form action={addToCartAction}>
                            <input type="hidden" name="variantId" value={variant.id} />
                            <input type="hidden" name="quantity" value="1" />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="fromPath" value={fromPath} />
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={!inStock}
                              aria-disabled={!inStock}
                            >
                              {tWishlist('add_to_cart')}
                            </button>
                          </form>
                          <form
                            action={
                              wished ? removeFromWishlistAction : addToWishlistAction
                            }
                          >
                            <input type="hidden" name="variantId" value={variant.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="fromPath" value={fromPath} />
                            <button
                              type="submit"
                              aria-label={wished ? tWishlist('remove') : tWishlist('add_to_cart')}
                              className={`inline-flex h-11 w-11 items-center justify-center border ${
                                wished
                                  ? 'border-accent bg-accent text-cream'
                                  : 'border-border text-foreground hover:border-accent hover:text-accent'
                              }`}
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
                                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
