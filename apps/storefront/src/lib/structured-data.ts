/**
 * schema.org structured-data builders (JSON-LD). Kept framework-agnostic —
 * each returns a plain object that <JsonLd> serializes.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://celva.store';

const abs = (path: string): string =>
  path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

export const organizationLd = (): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Celva',
  url: SITE_URL,
  logo: abs('/android-chrome-512x512.png'),
});

export const websiteLd = (): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Celva',
  url: SITE_URL,
});

export const breadcrumbLd = (
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: abs(item.path),
  })),
});

export const productLd = (input: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  sku?: string;
  price: string | number;
  inStock: boolean;
}): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: input.name,
  ...(input.description ? { description: input.description } : {}),
  ...(input.image ? { image: input.image } : {}),
  ...(input.sku ? { sku: input.sku } : {}),
  brand: { '@type': 'Brand', name: 'Celva' },
  offers: {
    '@type': 'Offer',
    url: abs(input.url),
    priceCurrency: 'XAF',
    price: String(input.price),
    availability: input.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
});

export const articleLd = (input: {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: input.headline,
  ...(input.description ? { description: input.description } : {}),
  ...(input.image ? { image: input.image } : {}),
  mainEntityOfPage: abs(input.url),
  ...(input.datePublished ? { datePublished: input.datePublished } : {}),
  ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  author: { '@type': 'Organization', name: input.authorName ?? 'Celva' },
  publisher: organizationLd(),
});
