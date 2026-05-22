'use server';

import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * Persist the user's preferred locale on their profile if they're signed
 * in. Silent: any API failure (token expired, network) is swallowed so
 * the locale toggle never blocks the navigation. Anonymous visitors are
 * a no-op — there's no user row to update.
 */
export async function syncLocaleAction(locale: 'fr' | 'en'): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  try {
    await apiFetch('/auth/me', {
      method: 'PATCH',
      body: { locale },
      accessToken,
      locale,
    });
  } catch {
    // Fire-and-forget — the URL switch is the real UX, persistence is
    // best-effort and the storefront keeps working without it.
  }
}
