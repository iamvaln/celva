'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const callApi = async (
  path: string,
  init: { method: 'POST' | 'DELETE'; body?: unknown },
): Promise<{ ok: boolean; error?: string }> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: 'auth_required' };
  try {
    await apiFetch(path, { ...init, accessToken });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.key };
    return { ok: false, error: 'unknown' };
  }
};

const revalidateWishlist = () => {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/wishlist`, 'page');
    // `layout` scope so /shop and /shop/[slug] dynamic children both refresh
    // (the heart toggle on the product page is read from the wishlist set).
    revalidatePath(`/${locale}/shop`, 'layout');
  }
};

export async function addToWishlistAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const fromPath = String(formData.get('fromPath') ?? `/${locale}/shop`);
  const variantId = String(formData.get('variantId') ?? '');

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/${locale}/login?next=${encodeURIComponent(fromPath)}`);
  }

  await callApi('/me/wishlist', {
    method: 'POST',
    body: { variantId },
  });
  revalidateWishlist();
}

export async function removeFromWishlistAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const fromPath = String(formData.get('fromPath') ?? `/${locale}/shop`);
  const variantId = String(formData.get('variantId') ?? '');

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/${locale}/login?next=${encodeURIComponent(fromPath)}`);
  }

  await callApi(`/me/wishlist/${variantId}`, { method: 'DELETE' });
  revalidateWishlist();
}
