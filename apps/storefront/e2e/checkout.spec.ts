import { test, expect } from '@playwright/test';
import { localePath, openFirstProduct, mutationsAllowed } from './helpers';

/**
 * Cart → Checkout → Order journey (guest flow).
 *
 * Validation + empty-state assertions are read-only and safe everywhere.
 * The ORDER-PLACING step posts to POST /checkout/guest and creates real data,
 * so it is gated behind E2E_ALLOW_MUTATIONS=1 and must only run against a
 * local/ephemeral stack — never the deployed preprod environment.
 */

/** Add the first available product to the guest cart, return false if none. */
const seedGuestCart = async (page: Parameters<typeof openFirstProduct>[0]) => {
  const opened = await openFirstProduct(page, 'en');
  if (!opened) return false;
  const addButton = page.getByRole('button', { name: /Add to cart/ }).first();
  if (await addButton.isDisabled()) return false;
  await addButton.click();
  await expect(page).toHaveURL(/\/en\/cart/);
  return true;
};

test.describe('Cart page', () => {
  test('shows the empty state with a continue-shopping link', async ({ page }) => {
    await page.goto(localePath('cart', 'en'));
    await expect(page.getByRole('heading', { name: 'Cart', level: 1 })).toBeVisible();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Continue shopping' }),
    ).toBeVisible();
  });

  test('adding an item then opening the cart shows the line + checkout CTA', async ({
    page,
  }) => {
    const seeded = await seedGuestCart(page);
    test.skip(!seeded, 'No purchasable product available to seed the cart.');

    await expect(page.locator('main ul li').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Checkout' })).toBeVisible();
  });
});

test.describe('Checkout form', () => {
  test('empty cart redirects checkout to the empty state', async ({ page }) => {
    await page.goto(localePath('checkout', 'en'));
    // Guest checkout with no items renders the cart-empty message.
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });

  test('shows validation errors for empty required fields', async ({ page }) => {
    const seeded = await seedGuestCart(page);
    test.skip(!seeded, 'No purchasable product available to seed the cart.');

    await page.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/en\/checkout/);
    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();

    // Required fields use native HTML constraint validation (required attr).
    const name = page.locator('input[name="name"]');
    const email = page.locator('input[name="email"]');
    await expect(name).toHaveAttribute('required', '');
    await expect(email).toHaveAttribute('required', '');

    // Submitting empty must NOT navigate away (native validation blocks it).
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/en\/checkout/);
    // The first invalid control is the focused/invalid one.
    await expect(name).toHaveJSProperty('validity.valid', false);
  });

  test('rejects an invalid email format', async ({ page }) => {
    const seeded = await seedGuestCart(page);
    test.skip(!seeded, 'No purchasable product available to seed the cart.');

    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.locator('input[name="name"]').fill('Test Buyer');
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.getByRole('button', { name: 'Place order' }).click();
    // type="email" + invalid value blocks submission; stays on checkout.
    await expect(page).toHaveURL(/\/en\/checkout/);
    await expect(page.locator('input[name="email"]')).toHaveJSProperty(
      'validity.valid',
      false,
    );
  });

  test('reveals home-delivery fields by default and pickup on switch', async ({
    page,
  }) => {
    const seeded = await seedGuestCart(page);
    test.skip(!seeded, 'No purchasable product available to seed the cart.');

    await page.getByRole('link', { name: 'Checkout' }).click();

    // HOME_DELIVERY is the default → address fields visible.
    await expect(page.locator('input[name="shippingAddress"]')).toBeVisible();
    await expect(page.locator('select[name="deliveryZoneId"]')).toBeVisible();

    // Switch to store pickup → pickup-point select appears, address hidden.
    await page.locator('input[name="deliveryMode"][value="STORE_PICKUP"]').check();
    await expect(page.locator('select[name="pickupPointId"]')).toBeVisible();
    await expect(page.locator('input[name="shippingAddress"]')).toHaveCount(0);
  });
});

test.describe('Order placement (mutating)', () => {
  test.skip(
    !mutationsAllowed(),
    'Order placement creates real data — set E2E_ALLOW_MUTATIONS=1 on a local stack to run.',
  );

  test('places a guest order and reaches the confirmation page', async ({ page }) => {
    const seeded = await seedGuestCart(page);
    test.skip(!seeded, 'No purchasable product available to seed the cart.');

    await page.getByRole('link', { name: 'Checkout' }).click();
    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();

    // Contact.
    await page.locator('input[name="name"]').fill('E2E Test Buyer');
    await page
      .locator('input[name="email"]')
      .fill(`e2e+${Date.now()}@example.test`);
    await page.locator('input[name="phone"]').fill('+237698123456');

    // Home delivery (default). Pick the first delivery zone.
    const zone = page.locator('select[name="deliveryZoneId"]');
    await zone.selectOption({ index: 0 });
    await page.locator('input[name="shippingAddress"]').fill('12 Rue Foch');
    await page.locator('input[name="shippingCity"]').fill('Douala');
    await page.locator('input[name="shippingPhone"]').fill('+237698123456');

    // Cash on delivery avoids the Mobile Money phone requirement.
    await page
      .locator('input[name="paymentMethod"][value="CASH_ON_DELIVERY"]')
      .check();

    await page.getByRole('button', { name: 'Place order' }).click();

    // INTENDED success flow: confirmation page for the new order number.
    await expect(page).toHaveURL(/\/en\/checkout\/confirmation\//, {
      timeout: 20_000,
    });
    await expect(
      page.getByRole('heading', { name: /Thank you for your order/ }),
    ).toBeVisible();
  });
});
