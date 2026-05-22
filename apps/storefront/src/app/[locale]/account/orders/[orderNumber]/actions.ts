'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const FLASH_COOKIE = 'celva.order_flash';
const FLASH_TTL = 30;

const setFlash = async (key: string): Promise<void> => {
  const store = await cookies();
  store.set(FLASH_COOKIE, key, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: FLASH_TTL,
  });
};

export const readAndClearOrderFlash = async (): Promise<string | null> => {
  const store = await cookies();
  const v = store.get(FLASH_COOKIE)?.value ?? null;
  if (v) store.delete(FLASH_COOKIE);
  return v;
};

const requireToken = async (locale: string, orderNumber: string): Promise<string> => {
  const t = await getAccessToken();
  if (!t) {
    const detailPath =
      locale === 'fr'
        ? `/fr/compte/commandes/${orderNumber}`
        : `/en/account/orders/${orderNumber}`;
    redirect(`/${locale}/login?next=${encodeURIComponent(detailPath)}`);
  }
  return t as string;
};

const orderDetailPath = (locale: string, orderNumber: string): string =>
  locale === 'fr'
    ? `/fr/compte/commandes/${orderNumber}`
    : `/en/account/orders/${orderNumber}`;

const revalidateOrder = (orderNumber: string): void => {
  for (const l of routing.locales) {
    const path =
      l === 'fr'
        ? `/fr/compte/commandes/${orderNumber}`
        : `/en/account/orders/${orderNumber}`;
    revalidatePath(path, 'page');
    revalidatePath(`/${l}/account/orders`, 'page');
  }
};

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const orderId = String(formData.get('orderId') ?? '');
  const orderNumber = String(formData.get('orderNumber') ?? '');
  const reasonRaw = formData.get('reason');
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  if (!orderId || !orderNumber) {
    await setFlash('error:unknown');
    redirect(orderDetailPath(locale, orderNumber || ''));
  }

  const accessToken = await requireToken(locale, orderNumber);

  try {
    await apiFetch(`/me/orders/${orderId}/cancel`, {
      method: 'POST',
      body: reason.length > 0 ? { reason } : {},
      accessToken,
      locale,
    });
    await setFlash('cancelled');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateOrder(orderNumber);
  redirect(orderDetailPath(locale, orderNumber));
}
