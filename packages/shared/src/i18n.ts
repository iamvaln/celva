export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export type LocalizedText = {
  fr: string;
  en: string;
};

export type PartialLocalizedText = Partial<LocalizedText>;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const resolveLocale = (acceptLanguage: string | null | undefined): Locale => {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const first = acceptLanguage
    .split(',')[0]
    ?.split(';')[0]
    ?.trim()
    .toLowerCase()
    .split('-')[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
};

export const pickLocalized = (
  text: LocalizedText | PartialLocalizedText | null | undefined,
  locale: Locale,
): string => {
  if (!text) return '';
  return text[locale] ?? text[DEFAULT_LOCALE] ?? '';
};
