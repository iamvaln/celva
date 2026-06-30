import type { Locale } from '@/i18n/routing';

/**
 * Client-safe XAF formatter. Mirrors lib/catalogue.formatPriceXAF but lives in
 * its own module so client components can import it without pulling lib/api
 * (which reads server-only env and crashes the browser bundle).
 */
export const formatPriceXAF = (value: string | number, locale: Locale): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '';
  return `${new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(n)} XAF`;
};
