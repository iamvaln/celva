import { defineConfig, devices } from '@playwright/test';

/**
 * Celva storefront — Playwright e2e config.
 *
 * Target selection
 * ----------------
 * `E2E_BASE_URL` (default http://localhost:3000) points the suite at whatever
 * stack you want to exercise:
 *   - a locally built+served storefront wired to a local API (the default), or
 *   - a deployed read-only environment (e.g. https://preprod.celva.store).
 *
 * Read-only journeys (browse, navigation, i18n, form validation) are safe
 * against any target. Data-MUTATING journeys (placing a real order, posting a
 * studio rendez-vous) are GATED behind `E2E_ALLOW_MUTATIONS=1` so the suite can
 * never pollute a production-like environment by accident — see the spec files.
 *
 * Local stack (recommended for the full suite)
 * --------------------------------------------
 *   1. npm run db:up                              # from repo root: Postgres
 *   2. (in apps/api) npm run prisma:migrate:deploy && npm run prisma:seed
 *                                                 # schema + seed catalogue
 *   3. (in apps/api) npm run dev                  # API on :3001
 *   4. E2E_ALLOW_MUTATIONS=1 npm run test:e2e     # from apps/storefront
 *
 * By default `webServer` builds and starts the storefront for you (set
 * E2E_NO_WEBSERVER=1 to skip — e.g. when targeting a deployed URL or a
 * storefront you already have running).
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const useWebServer =
  process.env.E2E_NO_WEBSERVER !== '1' && baseURL.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Build + start the storefront when targeting localhost. The storefront reads
  // API_INTERNAL_URL from apps/storefront/.env (copy from .env.example).
  ...(useWebServer
    ? {
        webServer: {
          command: 'npm run build && npm run start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      }
    : {}),
});
