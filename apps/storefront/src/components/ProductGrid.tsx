import type { Locale } from '@celva/shared';
import { listProductImages, type ApiProduct } from '@/lib/catalogue';
import { ProductCard } from './ProductCard';

type Props = {
  products: ApiProduct[];
  locale: Locale;
  emptyLabel: string;
  imagePlaceholderLabel: string;
};

/**
 * Fetches the primary image for each product in parallel, then renders the
 * grid. N+1 by design — fine at 12-50 products per page. A bulk endpoint
 * (?include=images) is a sensible follow-up if listings grow.
 */
export const ProductGrid = async ({
  products,
  locale,
  emptyLabel,
  imagePlaceholderLabel,
}: Props) => {
  if (products.length === 0) {
    return <p className="py-12 text-center text-foreground-muted">{emptyLabel}</p>;
  }

  const images = await Promise.all(
    products.map(async (p) => {
      try {
        const list = await listProductImages(p.id, locale);
        return list.find((i) => i.isPrimary) ?? list[0] ?? null;
      } catch {
        return null;
      }
    }),
  );

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, idx) => (
        <ProductCard
          key={product.id}
          product={product}
          image={images[idx] ?? null}
          locale={locale}
          imagePlaceholderLabel={imagePlaceholderLabel}
        />
      ))}
    </div>
  );
};
