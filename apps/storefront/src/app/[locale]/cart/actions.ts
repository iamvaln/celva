'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const PROMO_COOKIE = 'celva.promo';
const PROMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const callApi = async <T>(
  path: string,
  init: { method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: 'auth_required' };
  try {
    const data = await apiFetch<T>(path, { ...init, accessToken });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.key };
    return { ok: false, error: 'unknown' };
  }
};

const revalidateCart = () => {
  // Revalidate every locale variant of /cart, /shop/[slug], and the homepage —
  // anything that may render cart-count or in-cart state.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/cart`, 'page');
    revalidatePath(`/${locale}/shop`, 'page');
    revalidatePath(`/${locale}`, 'page');
  }
};

export async function addToCartAction(formData: FormData): Promise<void> {
  const variantId = String(formData.get('variantId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);
  await callApi('/me/cart/items', {
    method: 'POST',
    body: { variantId, quantity },
  });
  revalidateCart();
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);
  await callApi(`/me/cart/items/${itemId}`, {
    method: 'PATCH',
    body: { quantity },
  });
  revalidateCart();
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  await callApi(`/me/cart/items/${itemId}`, { method: 'DELETE' });
  revalidateCart();
}

export async function clearCartAction(): Promise<void> {
  await callApi('/me/cart', { method: 'DELETE' });
  await clearPromoCookie();
  revalidateCart();
}

/**
 * Applies a promo code against the cart subtotal. Server-side validation is
 * stateless — usedCount increments only at order creation (Batch R). We keep
 * the validated code in a 7-day cookie so the price preview stays consistent
 * across /cart and (later) /checkout.
 */
export type PromoActionResult = {
  ok: boolean;
  code?: string;
  discount?: string;
  subtotalAfter?: string;
  error?: string;
};

export async function applyPromoAction(
  _prev: PromoActionResult | null,
  formData: FormData,
): Promise<PromoActionResult> {
  const code = String(formData.get('code') ?? '').trim();
  if (!code) {
    await clearPromoCookie();
    revalidateCart();
    return { ok: true };
  }
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: 'auth_required' };
  try {
    const data = await apiFetch<{ code: string; discount: string; subtotalAfter: string }>(
      '/me/cart/apply-promo',
      { method: 'POST', body: { code }, accessToken },
    );
    await setPromoCookie(data.code);
    revalidateCart();
    return {
      ok: true,
      code: data.code,
      discount: data.discount,
      subtotalAfter: data.subtotalAfter,
    };
  } catch (err) {
    await clearPromoCookie();
    revalidateCart();
    return {
      ok: false,
      error: err instanceof ApiError ? err.key : 'unknown',
    };
  }
}

export async function removePromoAction(): Promise<void> {
  await clearPromoCookie();
  revalidateCart();
}

const setPromoCookie = async (code: string): Promise<void> => {
  const store = await cookies();
  store.set(PROMO_COOKIE, code, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PROMO_COOKIE_MAX_AGE,
  });
};

const clearPromoCookie = async (): Promise<void> => {
  const store = await cookies();
  store.delete(PROMO_COOKIE);
};

export const getActivePromoCode = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(PROMO_COOKIE)?.value ?? null;
};
