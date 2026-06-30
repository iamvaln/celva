import { test, expect } from '@playwright/test';
import { localePath, openFirstProduct } from './helpers';

/**
 * Browse journey — home → shop → product detail → add to cart.
 *
 * Read-only: safe against any target. Product-detail / add-to-cart assertions
 * gracefully skip when the catalogue is empty (bare stack) instead of failing.
 */

test.describe('Home page', () => {
  test('renders the hero and the "signature pieces" featured grid', async ({ page }) => {
    await page.goto(localePath('home', 'en'));

    // Hero <h1> is split across title_a + <em>title_em</em>.
    const hero = page.locator('section').first().locator('h1');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('Woven to');
    await expect(hero).toContainText('be seen');

    // Primary CTA links into the shop.
    const cta = page.getByRole('link', { name: 'Discover the collection' });
    await expect(cta).toBeVisible();

    // Featured section heading.
    await expect(
      page.getByRole('heading', { name: 'Our signature pieces' }),
    ).toBeVisible();
  });

  test('hero CTA navigates to the shop', async ({ page }) => {
    await page.goto(localePath('home', 'en'));
    await page.getByRole('link', { name: 'Discover the collection' }).click();
    await expect(page).toHaveURL(/\/en\/shop/);
    await expect(page.getByRole('heading', { name: 'Shop', level: 1 })).toBeVisible();
  });
});

test.describe('Shop listing', () => {
  test('renders the heading and the filter form', async ({ page }) => {
    await page.goto(localePath('shop', 'en'));
    await expect(page.getByRole('heading', { name: 'Shop', level: 1 })).toBeVisible();

    // Filter form controls are always present regardless of catalogue size.
    await expect(page.locator('input[type="search"][name="q"]')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();
    await expect(page.locator('select[name="sort"]')).toBeVisible();
  });

  test('lists products (or shows the empty state)', async ({ page }) => {
    await page.goto(localePath('shop', 'en'));
    const productLinks = page.locator('main a[href*="/shop/"]');
    const count = await productLinks.count();
    if (count === 0) {
      // Empty catalogue — the empty label is rendered by ProductGrid.
      await expect(page.getByText('No products', { exact: false })).toBeVisible();
      test.info().annotations.push({
        type: 'note',
        description: 'Catalogue empty — product listing assertions skipped.',
      });
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('Product detail', () => {
  test('opens from the shop and shows a title + add-to-cart', async ({ page }) => {
    const opened = await openFirstProduct(page, 'en');
    test.skip(!opened, 'No products in catalogue to open.');

    await expect(page.locator('main h1').first()).toBeVisible();
    // Add-to-cart button text starts with "Add to cart" (may carry a price).
    await expect(
      page.getByRole('button', { name: /Add to cart/ }).first(),
    ).toBeVisible();
  });

  test('thumbnail click promotes an alternate image to the main frame', async ({
    page,
  }) => {
    const opened = await openFirstProduct(page, 'en');
    test.skip(!opened, 'No products in catalogue to open.');

    // Thumbnails only render when a product has > 1 image. They expose
    // aria-pressed; clicking a non-active one should make it active.
    const thumbs = page.locator('button[aria-pressed]').filter({ has: page.locator('img') });
    const thumbCount = await thumbs.count();
    test.skip(thumbCount < 2, 'Product has fewer than 2 gallery images.');

    const inactive = thumbs.filter({ hasNot: page.locator('[aria-pressed="true"]') });
    // Click the second thumbnail and assert it becomes the pressed/active one.
    await thumbs.nth(1).click();
    await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed', 'true');
    void inactive;
  });

  test('selecting a colour/attribute value updates the selection', async ({ page }) => {
    const opened = await openFirstProduct(page, 'en');
    test.skip(!opened, 'No products in catalogue to open.');

    // Attribute value buttons carry aria-pressed (size/colour swatches).
    const valueButtons = page
      .locator('button[aria-pressed]')
      .filter({ hasNot: page.locator('img') });
    const enabled = valueButtons.filter({ hasNot: page.locator('[disabled]') });
    const count = await enabled.count();
    test.skip(count < 2, 'Product has no alternate selectable attribute values.');

    // Pick an unpressed, enabled value and confirm it becomes pressed.
    const target = enabled.filter({
      hasNot: page.locator('[aria-pressed="true"]'),
    }).first();
    await target.click();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
  });

  test('add-to-cart (guest) lands on the cart with the line present', async ({
    page,
  }) => {
    const opened = await openFirstProduct(page, 'en');
    test.skip(!opened, 'No products in catalogue to open.');

    const addButton = page.getByRole('button', { name: /Add to cart/ }).first();
    // Disabled means the chosen variant is sold out — skip rather than fail.
    test.skip(await addButton.isDisabled(), 'Selected variant is sold out.');

    await addButton.click();
    // Guest add-to-cart pushes to /cart.
    await expect(page).toHaveURL(/\/en\/cart/);
    await expect(page.getByRole('heading', { name: 'Cart', level: 1 })).toBeVisible();
    // The cart line list should now hold at least one item.
    await expect(page.locator('main ul li').first()).toBeVisible();
  });
});
