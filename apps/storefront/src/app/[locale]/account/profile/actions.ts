'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const FLASH_COOKIE = 'celva.profile_flash';
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

export const readAndClearProfileFlash = async (): Promise<string | null> => {
  const store = await cookies();
  const v = store.get(FLASH_COOKIE)?.value ?? null;
  if (v) store.delete(FLASH_COOKIE);
  return v;
};

const requireToken = async (locale: string): Promise<string> => {
  const t = await getAccessToken();
  if (!t) {
    redirect(`/${locale}/login`);
  }
  return t as string;
};

const profilePath = (locale: string): string =>
  locale === 'fr' ? '/fr/compte/profil' : '/en/account/profile';

const revalidateProfile = (): void => {
  for (const l of routing.locales) {
    revalidatePath(`/${l}/account/profile`, 'page');
    revalidatePath(`/${l}/account`, 'page');
  }
};

const trimOrUndefined = (v: FormDataEntryValue | null): string | undefined =>
  typeof v === 'string' ? v.trim() : undefined;

export async function updateProfileAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const name = trimOrUndefined(formData.get('name'));
  const phone = trimOrUndefined(formData.get('phone'));
  try {
    await apiFetch('/auth/me', {
      method: 'PATCH',
      body: { name, phone },
      accessToken,
      locale,
    });
    await setFlash('profile_saved');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateProfile();
  redirect(profilePath(locale));
}

export async function requestEmailChangeAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newEmail = String(formData.get('newEmail') ?? '').trim();
  if (!newEmail) {
    await setFlash('error:invalid_email');
    revalidateProfile();
    redirect(profilePath(locale));
  }
  try {
    await apiFetch('/auth/me/email-change-request', {
      method: 'POST',
      body: { currentPassword, newEmail },
      accessToken,
      locale,
    });
    await setFlash('email_change_requested');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateProfile();
  redirect(profilePath(locale));
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const accessToken = await requireToken(locale);
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (newPassword !== confirm) {
    await setFlash('error:password_mismatch');
    revalidateProfile();
    redirect(profilePath(locale));
  }

  try {
    await apiFetch('/auth/me/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      accessToken,
      locale,
    });
    await setFlash('password_changed');
  } catch (err) {
    await setFlash(`error:${err instanceof ApiError ? err.key : 'unknown'}`);
  }
  revalidateProfile();
  redirect(profilePath(locale));
}
