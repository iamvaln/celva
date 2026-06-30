import { test, expect } from '@playwright/test';
import { localePath } from './helpers';

/**
 * Internationalisation — locale prefix routing (always-on), localized
 * pathnames, <html lang>, and the locale switcher. All read-only.
 */

test.describe('Locale routing', () => {
  test('bare root redirects to the default locale (fr)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('renders French copy under /fr', async ({ page }) => {
    await page.goto(localePath('home', 'fr'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    // Hero title_a in French.
    await expect(page.locator('section').first().locator('h1')).toContainText(
      'Tissé pour',
    );
  });

  test('renders English copy under /en', async ({ page }) => {
    await page.goto(localePath('home', 'en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('section').first().locator('h1')).toContainText(
      'Woven to',
    );
  });

  test('uses localized pathnames (fr=/boutique, en=/shop)', async ({ page }) => {
    await page.goto(localePath('shop', 'fr'));
    await expect(page).toHaveURL(/\/fr\/boutique/);
    await expect(page.getByRole('heading', { name: 'Boutique', level: 1 })).toBeVisible();

    await page.goto(localePath('shop', 'en'));
    await expect(page).toHaveURL(/\/en\/shop/);
    await expect(page.getByRole('heading', { name: 'Shop', level: 1 })).toBeVisible();
  });
});

test.describe('Locale switcher', () => {
  test('switches FR → EN and rewrites the URL + content', async ({ page }) => {
    await page.goto(localePath('home', 'fr'));
    // On an FR page the switcher offers "EN".
    const toEn = page.getByRole('button', { name: 'Language' }).first();
    // aria-label resolves to nav.language; fall back to the visible "EN" label.
    const switcher = (await toEn.count())
      ? toEn
      : page.getByRole('button', { name: 'EN' }).first();
    await switcher.click();

    await expect(page).toHaveURL(/\/en(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
