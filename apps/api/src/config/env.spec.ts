import { validateEnv } from './env';

// All vars are required (no `.default(...)` anywhere). The base used here
// is the full set with valid test fixtures.
const baseEnv = {
  NODE_ENV: 'test',
  PORT: '3001',
  API_VERSION: 'v1',
  LOG_LEVEL: 'fatal',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/celva',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_REFRESH_EXPIRATION: '7d',
  R2_BUCKET_NAME: 'celva-media',
  CF_IMAGES_BASE_URL: 'https://example.test/cdn-cgi/image',
  CORS_ORIGINS: 'http://localhost:3000,http://localhost:3002',
  COOKIE_SECRET: 'c'.repeat(32),
  STOREFRONT_URL: 'http://localhost:3000',
  ADMIN_URL: 'http://localhost:3002',
  MAILGUN_REGION: 'us',
  SENTRY_TRACES_SAMPLE_RATE: '0.1',
};

describe('validateEnv', () => {
  it('accepts a full valid env', () => {
    const env = validateEnv(baseEnv);
    expect(env.PORT).toBe(3001);
    expect(env.API_VERSION).toBe('v1');
    expect(env.MAILGUN_REGION).toBe('us');
    expect(env.SENTRY_TRACES_SAMPLE_RATE).toBeCloseTo(0.1);
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      validateEnv({ ...baseEnv, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a non-URL DATABASE_URL', () => {
    expect(() => validateEnv({ ...baseEnv, DATABASE_URL: 'not-a-url' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects an out-of-range trace sample rate', () => {
    expect(() => validateEnv({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: '2.5' })).toThrow(
      /SENTRY_TRACES_SAMPLE_RATE/,
    );
  });

  it('coerces PORT and SENTRY_TRACES_SAMPLE_RATE from strings', () => {
    const env = validateEnv({ ...baseEnv, PORT: '4000', SENTRY_TRACES_SAMPLE_RATE: '0.25' });
    expect(env.PORT).toBe(4000);
    expect(env.SENTRY_TRACES_SAMPLE_RATE).toBeCloseTo(0.25);
  });

  it('rejects when a required var is missing', () => {
    const { COOKIE_SECRET: _omit, ...incomplete } = baseEnv;
    expect(() => validateEnv(incomplete)).toThrow(/COOKIE_SECRET/);
  });
});
