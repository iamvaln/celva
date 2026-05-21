'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

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
  revalidateCart();
}
