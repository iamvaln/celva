import type { Locale } from '@celva/shared';
import { apiFetch, ApiError } from './api';
import { getAccessToken } from './auth-cookies';

export type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  sku: string;
  productSlug: string;
  productName: { fr: string; en: string };
  unitPrice: string;
  lineTotal: string;
  stockAvailable: number;
  isAvailable: boolean;
};

export type Cart = {
  id: string;
  userId: string;
  items: CartLine[];
  itemsCount: number;
  total: string;
};

const guardedFetch = async <T>(
  path: string,
  init: { method?: string; body?: unknown; locale: Locale },
): Promise<T | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    return await apiFetch<T>(path, {
      ...init,
      accessToken,
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
};

export const fetchCart = (locale: Locale): Promise<Cart | null> =>
  guardedFetch<Cart>('/me/cart', { locale });

export const fetchCartCount = async (locale: Locale): Promise<number> => {
  const cart = await fetchCart(locale);
  return cart?.itemsCount ?? 0;
};

export const fetchWishlistVariantIds = async (locale: Locale): Promise<string[]> => {
  const list = await guardedFetch<Array<{ variantId: string }>>('/me/wishlist', { locale });
  return (list ?? []).map((w) => w.variantId);
};
