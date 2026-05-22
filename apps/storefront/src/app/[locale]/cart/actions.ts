'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const PROMO_COOKIE = 'celva.promo';
const PROMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const CART_FLASH_COOKIE = 'celva.cart_flash';
const CART_FLASH_MAX_AGE = 30; // 30 seconds — long enough for the next render

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
  // Revalidate every locale variant of /cart, /shop, /shop/[slug], and the
  // homepage — anything that may render cart-count or in-cart state. The
  // 'layout' scope catches dynamic [slug] children too.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/cart`, 'page');
    revalidatePath(`/${locale}/shop`, 'layout');
    revalidatePath(`/${locale}`, 'page');
  }
};

/**
 * Adds a variant to the cart. Three branches:
 *   - not logged in → redirect to /login with a `next` query so the user
 *     comes back where they were
 *   - API error → stash a one-shot flash cookie keyed to the source page so
 *     the next render can show a banner
 *   - success → stash a "added" flash cookie + redirect to /cart so the
 *     user has unambiguous feedback (mirrors most ecommerce UX)
 */
export async function addToCartAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const fromPath = String(formData.get('fromPath') ?? `/${locale}/shop`);
  const variantId = String(formData.get('variantId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/${locale}/login?next=${encodeURIComponent(fromPath)}`);
  }

  const result = await callApi<{ id: string }>('/me/cart/items', {
    method: 'POST',
    body: { variantId, quantity },
  });
  if (result.ok) {
    await setFlash('added');
    revalidateCart();
    redirect(`/${locale}/cart`);
  }
  await setFlash(`error:${result.error}`);
  revalidateCart();
  redirect(fromPath);
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

/**
 * Cart "flash" cookie — one-shot UX hint set by addToCartAction and
 * consumed by the next page render. Possible values:
 *   - "added": last add succeeded → show success banner
 *   - "error:<api.error.key>": last add failed → show error banner
 */
const setFlash = async (value: string): Promise<void> => {
  const store = await cookies();
  store.set(CART_FLASH_COOKIE, value, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_FLASH_MAX_AGE,
  });
};

export const readAndClearCartFlash = async (): Promise<string | null> => {
  const store = await cookies();
  const value = store.get(CART_FLASH_COOKIE)?.value ?? null;
  if (value) store.delete(CART_FLASH_COOKIE);
  return value;
};
