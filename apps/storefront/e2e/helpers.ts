import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the storefront e2e suite.
 *
 * Locale prefix is ALWAYS present (routing.localePrefix === 'always'), and the
 * localized pathnames come straight from src/i18n/routing.ts. We re-encode the
 * handful of paths the suite navigates so specs read in plain English while the
 * URLs stay correct for both locales.
 */

export type Locale = 'fr' | 'en';

/** Localized URL segments, mirroring routing.pathnames. */
const PATHS = {
  home: { fr: '', en: '' },
  shop: { fr: '/boutique', en: '/shop' },
  collections: { fr: '/collections', en: '/collections' },
  cart: { fr: '/panier', en: '/cart' },
  checkout: { fr: '/commande', en: '/checkout' },
  studio: { fr: '/studio', en: '/studio' },
  contact: { fr: '/contact', en: '/contact' },
  help: { fr: '/aide', en: '/help' },
  sizeGuides: { fr: '/guides-tailles', en: '/size-guides' },
  journal: { fr: '/journal', en: '/journal' },
  login: { fr: '/connexion', en: '/login' },
  signup: { fr: '/inscription', en: '/signup' },
} as const;

export type PathKey = keyof typeof PATHS;

/** Build a locale-prefixed path, e.g. localePath('shop','en') -> '/en/shop'. */
export const localePath = (key: PathKey, locale: Locale): string =>
  `/${locale}${PATHS[key][locale]}`;

/** Whether the suite is allowed to create real data (orders, rendez-vous). */
export const mutationsAllowed = (): boolean =>
  process.env.E2E_ALLOW_MUTATIONS === '1';

/**
 * Open the shop and click into the first product card, returning the product
 * detail page. Skips the calling test (via the returned flag) when the
 * catalogue is empty so read-only runs against a bare stack don't hard-fail.
 */
export const openFirstProduct = async (
  page: Page,
  locale: Locale,
): Promise<boolean> => {
  await page.goto(localePath('shop', locale));
  const firstCard = page
    .locator('main a[href*="/' + (locale === 'fr' ? 'boutique' : 'shop') + '/"]')
    .first();
  if ((await firstCard.count()) === 0) return false;
  await firstCard.click();
  await page.waitForLoadState('networkidle');
  // Product detail always renders an <h1> with the product name.
  await expect(page.locator('main h1').first()).toBeVisible();
  return true;
};

/** Reads the cart line count from the guest cart summary list, if present. */
export const cartLineCount = async (page: Page): Promise<number> =>
  page.locator('main ul li').count();
