import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import {
  type ApiProductImage,
  formatPriceXAF,
  getProductById,
  listProductImages,
  pickLocalized,
} from '@/lib/catalogue';
import { addToCartAction } from '../cart/actions';
import { removeFromWishlistAction } from './actions';
import { StockBadge } from '@/components/StockBadge';

type WishlistRow = { id: string; variantId: string; createdAt: string };

type WishlistItemView = {
  id: string;
  variantId: string;
  sku: string;
  productName: { fr: string; en: string };
  productSlug: string;
  price: string;
  image: ApiProductImage | null;
  inStock: boolean;
  stock: number;
  isActive: boolean;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wishlist' });
  return { title: t('title') };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('wishlist');

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">
            {t('login_required')}
          </p>
          <Link href="/login" className="btn btn-primary">
            {t('login_required')}
          </Link>
        </div>
      </section>
    );
  }

  let rows: WishlistRow[] = [];
  try {
    rows = await apiFetch<WishlistRow[]>('/me/wishlist', {
      locale,
      accessToken,
      cache: 'no-store',
    });
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 401 && err.status !== 403)) throw err;
  }

  // Hydrate each wishlist row with variant + product + image. Skip rows whose
  // product/variant got deleted upstream — they'd render as broken cards.
  const items: WishlistItemView[] = (
    await Promise.all(
      rows.map(async (row) => {
        const variant = await apiFetch<{
          id: string;
          sku: string;
          stock: number;
          isActive: boolean;
          priceOverride: string | null;
          productId: string;
        }>(`/variants/${row.variantId}`, { locale, accessToken }).catch(() => null);
        if (!variant) return null;
        const product = await getProductById(variant.productId, locale).catch(() => null);
        if (!product || !product.isActive) return null;
        const imgs = await listProductImages(product.id, locale).catch(
          () => [] as ApiProductImage[],
        );
        const price = variant.priceOverride ?? product.displayPrice;
        return {
          id: row.id,
          variantId: variant.id,
          sku: variant.sku,
          productName: product.name,
          productSlug: product.slug,
          price,
          image: imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null,
          inStock: variant.isActive && variant.stock > 0,
          stock: variant.stock,
          isActive: variant.isActive,
        } satisfies WishlistItemView;
      }),
    )
  ).filter((it): it is WishlistItemView => it !== null);

  if (items.length === 0) {
    return (
      <section className="bg-background py-section-tight">
        <div className="container-celva max-w-prose text-center">
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="mb-8 font-body text-lead text-foreground-muted">{t('empty')}</p>
          <Link href="/shop" className="btn btn-primary">
            {t('add_to_cart')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <h1 className="mb-10 font-display text-h1">{t('title')}</h1>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="space-y-3">
              <Link
                href={{ pathname: '/shop/[slug]', params: { slug: item.productSlug } }}
                className="block"
              >
                <div className="relative aspect-product-portrait overflow-hidden bg-beige">
                  {item.image && (
                    <Image
                      src={item.image.urls.medium}
                      alt={pickLocalized(item.productName, locale)}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-3 font-display text-base text-foreground hover:text-accent">
                  {pickLocalized(item.productName, locale)}
                </p>
                <p className="font-display text-small text-accent">
                  {formatPriceXAF(item.price, locale)}
                </p>
              </Link>
              <StockBadge stock={item.stock} isAvailable={item.isActive && item.stock > 0} />
              <div className="flex items-center gap-3">
                <form action={addToCartAction}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="fromPath" value={`/${locale}/wishlist`} />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!item.inStock}
                    aria-disabled={!item.inStock}
                  >
                    {t('add_to_cart')}
                  </button>
                </form>
                <form action={removeFromWishlistAction}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="fromPath" value={`/${locale}/wishlist`} />
                  <button
                    type="submit"
                    className="font-body text-small text-foreground-muted hover:text-accent"
                  >
                    {t('remove')}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
