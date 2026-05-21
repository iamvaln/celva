import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import {
  type ApiProduct,
  getCollectionBySlug,
  getProductById,
  listCollectionProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { ProductGrid } from '@/components/ProductGrid';

type Params = { locale: Locale; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await getCollectionBySlug(slug, locale);
  if (!collection) return { title: 'Celva' };
  return {
    title: pickLocalized(collection.name, locale),
    description: pickLocalized(collection.description, locale).slice(0, 160) || undefined,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = await getCollectionBySlug(slug, locale);
  if (!collection || !collection.isActive) notFound();

  const t = await getTranslations('collection');
  const tShop = await getTranslations('shop');

  const links = await listCollectionProducts(collection.id, locale);
  const ordered = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

  const productsRaw = await Promise.all(
    ordered.map((l) => getProductById(l.productId, locale).catch(() => null)),
  );
  const products = productsRaw.filter(
    (p): p is ApiProduct => p !== null && p.isActive,
  );

  const name = pickLocalized(collection.name, locale);
  const description = pickLocalized(collection.description, locale);

  return (
    <article className="bg-background">
      {collection.imageUrl ? (
        <section className="relative h-[40vh] min-h-[280px] w-full overflow-hidden bg-beige">
          <Image
            src={collection.imageUrl}
            alt={name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(26,26,24,0.45))]" />
          <div className="container-celva relative flex h-full items-end pb-10 text-cream">
            <div className="max-w-2xl">
              <p className="eyebrow mb-2 text-cream/80">{tShop('title')}</p>
              <h1 className="font-display text-h1">{name}</h1>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-section-tight">
          <div className="container-celva max-w-3xl">
            <p className="eyebrow mb-2">{tShop('title')}</p>
            <h1 className="font-display text-h1">{name}</h1>
          </div>
        </section>
      )}

      <section className="py-section-tight">
        <div className="container-celva">
          {description && (
            <p className="mb-10 max-w-prose font-body text-lead text-foreground-muted">
              {description}
            </p>
          )}

          <h2 className="mb-8 font-display text-h2">{t('products_heading')}</h2>

          <ProductGrid
            products={products}
            locale={locale}
            emptyLabel={t('empty')}
            imagePlaceholderLabel={tShop('product_card.view')}
          />
        </div>
      </section>
    </article>
  );
}
