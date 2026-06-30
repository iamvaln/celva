import { apiFetch, ApiError } from '@/lib/api';
import type { Locale } from '@/i18n/routing';

export type PublicSetting = { key: string; value: string };

export type PublicSettings = {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  invoiceCompanyName: string | null;
};

const EMPTY: PublicSettings = {
  contactEmail: null,
  contactPhone: null,
  contactWhatsapp: null,
  invoiceCompanyName: null,
};

/**
 * Fetch the admin-editable public settings. Cached for 5 minutes via
 * Next.js `next.revalidate` — these change rarely, and a fresh API call
 * on every page render would be wasteful.
 *
 * Failures degrade silently to empty — the UI just hides whatever
 * setting-dependent affordance is missing rather than throwing.
 */
export const getPublicSettings = async (locale: Locale): Promise<PublicSettings> => {
  try {
    const rows = await apiFetch<PublicSetting[]>('/settings/public', {
      locale,
      next: { revalidate: 300 },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const pick = (key: string): string | null => {
      const v = map.get(key);
      return v && v.trim().length > 0 ? v.trim() : null;
    };
    return {
      contactEmail: pick('CONTACT_EMAIL'),
      contactPhone: pick('CONTACT_PHONE'),
      contactWhatsapp: pick('CONTACT_WHATSAPP'),
      invoiceCompanyName: pick('INVOICE_COMPANY_NAME'),
    };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return EMPTY;
  }
};

/**
 * Build a wa.me URL. Strips non-digits from the phone (Mailgun-safe,
 * URL-safe) and URL-encodes the prelude.
 */
export const buildWhatsAppHref = (phone: string, prelude?: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const base = `https://wa.me/${cleaned}`;
  return prelude ? `${base}?text=${encodeURIComponent(prelude)}` : base;
};
