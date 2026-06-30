import { test, expect } from '@playwright/test';
import { localePath, mutationsAllowed } from './helpers';

/**
 * Contact form + static content pages (help, size-guides). Read-only except
 * the contact POST, which is gated behind E2E_ALLOW_MUTATIONS=1.
 */

test.describe('Contact form', () => {
  test('renders name/email/message fields and a send button', async ({ page }) => {
    await page.goto(localePath('contact', 'en'));
    await expect(page.getByRole('heading', { name: 'Get in touch' })).toBeVisible();

    await expect(page.locator('input[type="text"][autocomplete="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('flags invalid input via zod (no navigation, no POST)', async ({ page }) => {
    await page.goto(localePath('contact', 'en'));

    // Form is noValidate; react-hook-form + zod block submit on empty/invalid.
    await page.locator('input[type="email"]').fill('bad-email');
    await page.getByRole('button', { name: 'Send' }).click();

    // aria-invalid flips on the failing controls; success copy must not appear.
    await expect(page.locator('input[type="email"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByText(/message has been sent|reçu votre message/i)).toHaveCount(
      0,
    );
  });
});

test.describe('Contact submission (mutating)', () => {
  test.skip(
    !mutationsAllowed(),
    'Posting a contact message creates real data — set E2E_ALLOW_MUTATIONS=1 on a local stack.',
  );

  test('submits a valid message and shows the success status', async ({ page }) => {
    await page.goto(localePath('contact', 'en'));
    await page.locator('input[type="text"][autocomplete="name"]').fill('E2E Contact');
    await page
      .locator('input[type="email"]')
      .fill(`contact+${Date.now()}@example.test`);
    await page.locator('textarea').fill('Hello from the e2e suite.');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Static content pages', () => {
  test('help page renders its sections', async ({ page }) => {
    await page.goto(localePath('help', 'en'));
    await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
    // Section anchors are stable ids.
    await expect(page.locator('#livraison')).toBeVisible();
    await expect(page.locator('#retours')).toBeVisible();
    await expect(page.locator('#entretien')).toBeVisible();
  });

  test('size-guides page renders (heading + content or coming-soon)', async ({
    page,
  }) => {
    await page.goto(localePath('sizeGuides', 'en'));
    await expect(
      page.getByRole('heading', { name: 'Size guides', level: 1 }),
    ).toBeVisible();
  });
});
