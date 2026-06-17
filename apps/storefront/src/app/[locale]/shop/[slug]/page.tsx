import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbLd, productLd } from '@/lib/structured-data';
import {
  type ApiProduct,
  type ApiProductImage,
  type ApiVariant,
  getProductBySlug,
  getProductById,
  listAttributeValues,
  listProductAttributes,
  listCategories,
  listProductImages,
  listProductVariants,
  listRelatedProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { fetchWishlistVariantIds } from '@/lib/cart';
import { getAccessToken } from '@/lib/auth-cookies';
import { listSizeGuidesByCategory } from '@/lib/size-guides';
import { ProductCard } from '@/components/ProductCard';
import { ProductBuyPanel, type BuyPanelAttribute } from '@/components/ProductBuyPanel';
import { readAndClearCartFlash } from '../../cart/actions';

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
  const tFooter = await getTranslations('footer');

  const [
    images,
    attributesPage,
    variantsPage,
    relatedCards,
    wishlistIds,
    flash,
    sizeGuides,
    categoriesPage,
  ] = await Promise.all([
    listProductImages(product.id, locale).catch(() => [] as ApiProductImage[]),
    listProductAttributes(product.id, locale).catch(() => ({
      data: [] as Array<{ id: string; name: { fr: string; en: string }; sortOrder: number }>,
    })),
    listProductVariants(product.id, locale).catch(() => ({ data: [] as ApiVariant[] })),
    loadRelatedCards(product.id, locale),
    fetchWishlistVariantIds(locale),
    readAndClearCartFlash(),
    listSizeGuidesByCategory(product.categoryId, locale).catch(() => []),
    listCategories(locale).catch(() => ({ data: [] as Array<{ id: string; name: { fr: string; en: string } }> })),
  ]);
  const hasSizeGuide = sizeGuides.length > 0;
  const categoryName = pickLocalized(
    categoriesPage.data.find((c) => c.id === product.categoryId)?.name,
    locale,
  );

  // Flash from the previous add-to-cart attempt that bounced back here on
  // error. Success redirects to /cart so we only ever see "error:..." here.
  const flashError =
    flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;

  const fromPath = `/${locale}/shop/${slug}`;
  // Drives server-cart (logged-in) vs guest-cart (localStorage) add-to-cart.
  const isAuthenticated = !!(await getAccessToken());

  const orderedAttributes = [...(attributesPage.data ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const attributesWithValues = await Promise.all(
    orderedAttributes.map(async (attr) => {
      const values = await listAttributeValues(attr.id, locale).catch(() => ({ data: [] }));
      return {
        attribute: attr,
        values: [...values.data].sort((a, b) => a.sortOrder - b.sortOrder),
      };
    }),
  );

  // Heuristic: which attribute is the "size" one (gets the size-guide link).
  const SIZE_RE = /taille|size|pointure/i;
  const panelAttributes: BuyPanelAttribute[] = attributesWithValues.map(
    ({ attribute, values }) => ({
      id: attribute.id,
      name: pickLocalized(attribute.name, locale),
      isSize: SIZE_RE.test(`${attribute.name.fr} ${attribute.name.en}`),
      values: values.map((v) => ({ id: v.id, label: pickLocalized(v.value, locale) })),
    }),
  );

  const orderedImages = [...images].sort((a, b) => a.position - b.position);
  const heroImage = orderedImages.find((i) => i.isPrimary) ?? orderedImages[0] ?? null;
  const galleryImages = orderedImages.filter((i) => i.id !== heroImage?.id);

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);

  // First line of the description doubles as the short teaser under the title;
  // the full text feeds the "Description complète" accordion.
  const shortDescription = description.split(/\n{2,}/)[0]?.trim() || description;

  const productPath = getPathname({
    href: { pathname: '/shop/[slug]', params: { slug } },
    locale,
  });
  const productJsonLd = productLd({
    name,
    description: description.slice(0, 300) || undefined,
    url: productPath,
    image: heroImage?.urls.original ?? heroImage?.urls.large,
    price: product.displayPrice,
    inStock: variantsPage.data.some((v) => v.stock > 0),
  });
  const breadcrumbJsonLd = breadcrumbLd([
    { name: 'Celva', path: `/${locale}` },
    { name: tFooter('boutique'), path: getPathname({ href: '/shop', locale }) },
    { name, path: productPath },
  ]);

  return (
    <article className="bg-background py-section-tight">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
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

          <ProductBuyPanel
            name={name}
            displayPrice={product.displayPrice}
            shortDescription={shortDescription}
            eyebrow={categoryName ? [categoryName] : []}
            attributes={panelAttributes}
            variants={variantsPage.data}
            locale={locale}
            fromPath={fromPath}
            wishlistVariantIds={wishlistIds}
            sizeGuideHash={hasSizeGuide ? `guide-${product.categoryId}` : undefined}
            longDescription={description}
            hasStudio
            isAuthenticated={isAuthenticated}
            productSlug={slug}
            imageUrl={heroImage?.urls.medium ?? heroImage?.urls.large}
          />
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
