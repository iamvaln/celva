/**
 * E2E test env fixtures. validateEnv (apps/api/src/config/env.ts) has no
 * `.default(...)` anywhere — every required var must exist at boot, including
 * in tests. Setting them here once keeps each spec free of boilerplate.
 *
 * Uses `??=` so a real `.env` (or CI env) wins; we only fill the gaps.
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3001';
process.env.API_VERSION ??= 'v1';
process.env.LOG_LEVEL ??= 'fatal';

process.env.DATABASE_URL ??=
  'postgresql://valentine@localhost:5432/celva?schema=public';

process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
process.env.JWT_ACCESS_EXPIRATION ??= '15m';
process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
process.env.JWT_REFRESH_EXPIRATION ??= '7d';
process.env.COOKIE_SECRET ??= 'c'.repeat(32);

process.env.R2_BUCKET_NAME ??= 'celva-media';
process.env.CF_IMAGES_BASE_URL ??= 'https://example.test/cdn-cgi/image';

process.env.CORS_ORIGINS ??= 'http://localhost:3000,http://localhost:3002';
process.env.STOREFRONT_URL ??= 'http://localhost:3000';
process.env.ADMIN_URL ??= 'http://localhost:3002';

process.env.MAILGUN_REGION ??= 'us';
process.env.SENTRY_TRACES_SAMPLE_RATE ??= '0';
