import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@celva/shared';
import {
  type ApiProduct,
  type ApiProductImage,
  formatPriceXAF,
  pickLocalized,
} from '@/lib/catalogue';

type Props = {
  product: ApiProduct;
  image: ApiProductImage | null;
  locale: Locale;
  imagePlaceholderLabel: string;
};

/**
 * Grid tile for the shop listing & collection pages. Server-rendered so the
 * heaviest path (image URLs, prices) ships as pure HTML. Image element uses
 * `medium` for ~600px tiles; falls back to a neutral block if the product
 * has no images yet.
 */
export const ProductCard = ({ product, image, locale, imagePlaceholderLabel }: Props) => {
  const name = pickLocalized(product.name, locale);
  const price = formatPriceXAF(product.displayPrice, locale);
  const alt = image?.altText
    ? pickLocalized(image.altText, locale) || name
    : name;

  return (
    <Link
      href={{ pathname: '/shop/[slug]', params: { slug: product.slug } }}
      className="group block"
    >
      <div className="relative aspect-product-portrait overflow-hidden bg-beige">
        {image ? (
          <Image
            src={image.urls.medium}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-foreground-muted"
            aria-hidden
          >
            <span className="font-body text-caption uppercase tracking-eyebrow">
              {imagePlaceholderLabel}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <p className="font-display text-base text-foreground transition-colors group-hover:text-accent">
          {name}
        </p>
        <p className="font-display text-small text-accent">{price}</p>
      </div>
    </Link>
  );
};
