'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const FLASH_COOKIE = 'celva.methods_flash';
const FLASH_TTL = 30;

const str = (v: FormDataEntryValue | null): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const revalidateMethods = () => {
  for (const l of routing.locales) {
    revalidatePath(`/${l}/account/payment-methods`, 'page');
    revalidatePath(`/${l}/checkout`, 'page');
  }
};

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

export const readAndClearMethodFlash = async (): Promise<string | null> => {
  const store = await cookies();
  const v = store.get(FLASH_COOKIE)?.value ?? null;
  if (v) store.delete(FLASH_COOKIE);
  return v;
};

const requireToken = async (locale: string): Promise<string> => {
  const t = await getAccessToken();
  if (!t) {
    redirect(`/${locale}/login?next=/${locale}/account/payment-methods`);
  }
  return t as string;
};

const methodsPath = (locale: string): string =>
  `/${locale}/${locale === 'fr' ? 'compte/methodes-paiement' : 'account/payment-methods'}`;

export async function createMethodAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const body: Record<string, unknown> = {
    method: str(formData.get('method')) ?? 'ORANGE_MONEY',
    label: str(formData.get('label')) ?? '',
    phoneNumber: str(formData.get('phoneNumber')) ?? '',
  };
  if (formData.get('isDefault') === 'on') body.isDefault = true;
  try {
    await apiFetch('/me/payment-methods', {
      method: 'POST',
      body,
      accessToken,
      locale,
    });
    await setFlash('created');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateMethods();
  redirect(methodsPath(locale));
}

export async function deleteMethodAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const id = String(formData.get('id') ?? '');
  try {
    await apiFetch(`/me/payment-methods/${id}`, {
      method: 'DELETE',
      accessToken,
      locale,
    });
    await setFlash('deleted');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateMethods();
  redirect(methodsPath(locale));
}

export async function setDefaultMethodAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const id = String(formData.get('id') ?? '');
  try {
    await apiFetch(`/me/payment-methods/${id}`, {
      method: 'PATCH',
      body: { isDefault: true },
      accessToken,
      locale,
    });
    await setFlash('updated');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateMethods();
  redirect(methodsPath(locale));
}
