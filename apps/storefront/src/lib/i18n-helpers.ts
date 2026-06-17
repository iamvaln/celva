import type { Locale } from '@/i18n/routing';

/**
 * Client-safe bilingual picker. Same behaviour as lib/catalogue.pickLocalized
 * but in its own module so client components can import it without pulling
 * lib/api / server-only env into the browser bundle.
 */
export const pickLocalized = (
  text: { fr: string; en: string } | null | undefined,
  locale: Locale,
): string => {
  if (!text) return '';
  return text[locale] ?? text.fr ?? text.en ?? '';
};
