import { test, expect } from '@playwright/test';
import { localePath, mutationsAllowed } from './helpers';

/**
 * Studio rendez-vous journey.
 *
 * The booking form must render even with an empty fabric catalogue (the page
 * degrades to a focused "book a rendez-vous" form). Layout + validation are
 * read-only. Submitting the form posts to the API (creates a studio request),
 * so the submit test is gated behind E2E_ALLOW_MUTATIONS=1.
 */

test.describe('Studio page', () => {
  test('renders the intro and the rendez-vous form even with empty catalogue', async ({
    page,
  }) => {
    await page.goto(localePath('studio', 'en'));

    // Intro <h1> (split a + <em>em</em>).
    const intro = page.locator('h1').first();
    await expect(intro).toContainText('Pick the fabric');

    // The rendez-vous form anchor (#book) and its title are present.
    await expect(page.locator('#book')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Book an appointment' }),
    ).toBeVisible();

    // Core form fields exist.
    await expect(page.getByText('Full name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book my appointment' })).toBeVisible();
  });

  test('shows the two-column layout with the atelier aside', async ({ page }) => {
    await page.goto(localePath('studio', 'en'));

    // The aside lives inside the #book section and carries the atelier address.
    const bookSection = page.locator('#book');
    const aside = bookSection.locator('aside');
    await expect(aside).toBeVisible();
    // The aside renders an address + hours block (3 bullet points). Assert it
    // holds list content distinguishing it from the form column.
    await expect(aside.locator('li').first()).toBeVisible();
  });

  test('form validation flags an empty required name/phone', async ({ page }) => {
    await page.goto(localePath('studio', 'en'));

    // The form is noValidate + react-hook-form/zod: submitting empty surfaces
    // inline error spans rather than native bubbles.
    await page.getByRole('button', { name: 'Book my appointment' }).click();

    // At least one inline field error must appear (name "required" / phone).
    const errors = page.locator('#book span').filter({ hasText: /.+/ });
    // Required + phone errors render; assert the name error copy is shown.
    await expect(
      page.locator('#book').getByText(/required|Required|requis/i).first(),
    ).toBeVisible();
    void errors;
  });

  test('rejects an invalid phone number format', async ({ page }) => {
    await page.goto(localePath('studio', 'en'));

    await page.locator('#book input[type="text"]').first().fill('Ada Lovelace');
    await page.locator('#book input[type="tel"]').fill('123'); // not a CM number
    await page.getByRole('button', { name: 'Book my appointment' }).click();

    // Phone error copy appears and the success heading does NOT.
    await expect(
      page.locator('#book').getByText(/phone|téléphone|numéro/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Appointment booked|rendez-vous/i)).toHaveCount(0);
  });
});

test.describe('Studio rendez-vous submission (mutating)', () => {
  test.skip(
    !mutationsAllowed(),
    'Submitting a rendez-vous creates real data — set E2E_ALLOW_MUTATIONS=1 on a local stack.',
  );

  test('submits a valid rendez-vous and shows the success panel', async ({ page }) => {
    await page.goto(localePath('studio', 'en'));

    await page.locator('#book input[type="text"]').first().fill('E2E Studio Client');
    await page.locator('#book input[type="tel"]').fill('+237698123456');
    await page
      .locator('#book input[type="email"]')
      .fill(`studio+${Date.now()}@example.test`);

    // Mode/date/slot have sane defaults from the form; submit directly.
    await page.getByRole('button', { name: 'Book my appointment' }).click();

    // Success state replaces the form with a confirmation panel.
    await expect(
      page.locator('#book').getByText(/booked|confirmed|rendez-vous/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
