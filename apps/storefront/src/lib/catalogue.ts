import type { Locale } from '@celva/shared';
import { apiFetch, ApiError } from './api';

export type Bilingual = { fr?: string; en?: string };

export type ApiCategory = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: Bilingual | null;
  sortOrder: number;
};

export type ApiProduct = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: Bilingual | null;
  displayPrice: string;
  floorPrice: string;
  costPrice: string;
  productionType: 'INTERNAL' | 'SUBCONTRACTED' | 'PURCHASED';
  isActive: boolean;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiCollection = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: Bilingual | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ApiProductImage = {
  id: string;
  key: string;
  position: number;
  isPrimary: boolean;
  altText?: Bilingual | null;
  urls: {
    original: string;
    large: string;
    medium: string;
    thumb: string;
  };
};

export type ApiAttribute = {
  id: string;
  productId: string;
  name: { fr: string; en: string };
  sortOrder: number;
};

export type ApiAttributeValue = {
  id: string;
  attributeId: string;
  value: { fr: string; en: string };
  sortOrder: number;
  /** Hex swatch (#RRGGBB) for colour values; null for non-colour values. */
  colorHex?: string | null;
};

export type ApiRelatedProduct = {
  productId: string;
  relatedProductId: string;
  sortOrder: number;
};

export type ApiVariant = {
  id: string;
  sku: string;
  stock: number;
  consignedStock: number;
  priceOverride: string | null;
  isActive: boolean;
  productId: string;
  attributeValues: Array<{ attributeId: string; attributeValueId: string }>;
};

type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number };

const ISR = { next: { revalidate: 60 } } as const;

export const pickLocalized = (
  text: Bilingual | { fr: string; en: string } | null | undefined,
  locale: Locale,
): string => {
  if (!text) return '';
  return text[locale] ?? text.fr ?? text.en ?? '';
};

export const formatPriceXAF = (value: string | number, locale: Locale): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '';
  const formatter = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 0,
  });
  return `${formatter.format(n)} XAF`;
};

export type ShopFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  sortBy?: 'createdAt' | 'displayPrice' | 'slug';
  sortDir?: 'asc' | 'desc';
};

const SHOP_PAGE_SIZE = 12;

const buildShopQuery = (filters: ShopFilters): string => {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? SHOP_PAGE_SIZE));
  params.set('isActive', 'true');
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  params.set('sortBy', filters.sortBy ?? 'createdAt');
  params.set('sortDir', filters.sortDir ?? 'desc');
  return params.toString();
};

export const listProducts = (
  filters: ShopFilters,
  locale: Locale,
): Promise<Paginated<ApiProduct>> =>
  apiFetch<Paginated<ApiProduct>>(`/products?${buildShopQuery(filters)}`, {
    locale,
    ...ISR,
  });

export const listCategories = (locale: Locale): Promise<Paginated<ApiCategory>> =>
  apiFetch<Paginated<ApiCategory>>('/categories?pageSize=200', {
    locale,
    ...ISR,
  });

export const listCollections = (locale: Locale): Promise<Paginated<ApiCollection>> =>
  apiFetch<Paginated<ApiCollection>>('/collections?pageSize=200&isActive=true', {
    locale,
    ...ISR,
  });

export const getProductBySlug = async (
  slug: string,
  locale: Locale,
): Promise<ApiProduct | null> => {
  try {
    return await apiFetch<ApiProduct>(`/products/by-slug/${encodeURIComponent(slug)}`, {
      locale,
      ...ISR,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

export const getCollectionBySlug = async (
  slug: string,
  locale: Locale,
): Promise<ApiCollection | null> => {
  try {
    return await apiFetch<ApiCollection>(
      `/collections/by-slug/${encodeURIComponent(slug)}`,
      { locale, ...ISR },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

export const listProductImages = (
  productId: string,
  locale: Locale,
): Promise<ApiProductImage[]> =>
  apiFetch<ApiProductImage[]>(`/products/${productId}/images`, { locale, ...ISR });

export const listProductAttributes = (
  productId: string,
  locale: Locale,
): Promise<Paginated<ApiAttribute>> =>
  apiFetch<Paginated<ApiAttribute>>(
    `/attributes?productId=${productId}&pageSize=50`,
    { locale, ...ISR },
  );

export const listAttributeValues = (
  attributeId: string,
  locale: Locale,
): Promise<Paginated<ApiAttributeValue>> =>
  apiFetch<Paginated<ApiAttributeValue>>(
    `/attribute-values?attributeId=${attributeId}&pageSize=200`,
    { locale, ...ISR },
  );

export const listRelatedProducts = (
  productId: string,
  locale: Locale,
): Promise<ApiRelatedProduct[]> =>
  apiFetch<ApiRelatedProduct[]>(`/products/${productId}/related`, {
    locale,
    ...ISR,
  });

export const listCollectionProducts = (
  collectionId: string,
  locale: Locale,
): Promise<Array<{ productId: string; collectionId: string; sortOrder: number }>> =>
  apiFetch<Array<{ productId: string; collectionId: string; sortOrder: number }>>(
    `/collections/${collectionId}/products`,
    { locale, ...ISR },
  );

export const getProductById = (productId: string, locale: Locale): Promise<ApiProduct> =>
  apiFetch<ApiProduct>(`/products/${productId}`, { locale, ...ISR });

export const listProductVariants = (
  productId: string,
  locale: Locale,
): Promise<Paginated<ApiVariant>> =>
  apiFetch<Paginated<ApiVariant>>(
    `/variants?productId=${productId}&isActive=true&pageSize=200&sortBy=sku&sortDir=asc`,
    { locale, ...ISR },
  );
