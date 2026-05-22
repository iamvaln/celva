'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const FLASH_COOKIE = 'celva.addresses_flash';
const FLASH_TTL = 30;

const str = (v: FormDataEntryValue | null): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const revalidateAddresses = () => {
  for (const l of routing.locales) {
    revalidatePath(`/${l}/account/addresses`, 'page');
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

export const readAndClearAddressFlash = async (): Promise<string | null> => {
  const store = await cookies();
  const v = store.get(FLASH_COOKIE)?.value ?? null;
  if (v) store.delete(FLASH_COOKIE);
  return v;
};

const requireToken = async (locale: string): Promise<string> => {
  const t = await getAccessToken();
  if (!t) redirect(`/${locale}/login?next=/${locale}/account/addresses`);
  return t as string;
};

const buildBody = (formData: FormData): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    label: str(formData.get('label')) ?? '',
    fullName: str(formData.get('fullName')) ?? '',
    phone: str(formData.get('phone')) ?? '',
    line1: str(formData.get('line1')) ?? '',
    city: str(formData.get('city')) ?? '',
  };
  const line2 = str(formData.get('line2'));
  if (line2) body.line2 = line2;
  const zone = str(formData.get('zone'));
  if (zone) body.zone = zone;
  const country = str(formData.get('country'));
  if (country) body.country = country;
  if (formData.get('isDefault') === 'on') body.isDefault = true;
  return body;
};

export async function createAddressAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  try {
    await apiFetch('/me/addresses', {
      method: 'POST',
      body: buildBody(formData),
      accessToken,
      locale,
    });
    await setFlash('created');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateAddresses();
  redirect(`/${locale}/${locale === 'fr' ? 'compte' : 'account'}/${locale === 'fr' ? 'adresses' : 'addresses'}`);
}

export async function updateAddressAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const id = String(formData.get('id') ?? '');
  if (!id) {
    await setFlash('error:not_found');
    revalidateAddresses();
    redirect(`/${locale}/${locale === 'fr' ? 'compte' : 'account'}/${locale === 'fr' ? 'adresses' : 'addresses'}`);
  }
  try {
    await apiFetch(`/me/addresses/${id}`, {
      method: 'PATCH',
      body: buildBody(formData),
      accessToken,
      locale,
    });
    await setFlash('updated');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateAddresses();
  redirect(`/${locale}/${locale === 'fr' ? 'compte' : 'account'}/${locale === 'fr' ? 'adresses' : 'addresses'}`);
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const id = String(formData.get('id') ?? '');
  try {
    await apiFetch(`/me/addresses/${id}`, { method: 'DELETE', accessToken, locale });
    await setFlash('deleted');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateAddresses();
  redirect(`/${locale}/${locale === 'fr' ? 'compte' : 'account'}/${locale === 'fr' ? 'adresses' : 'addresses'}`);
}
