import { validateEnv } from './env';

const baseEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/celva',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CORS_ORIGINS: 'http://localhost:3000,http://localhost:3002',
};

describe('validateEnv', () => {
  it('accepts a valid minimal env and applies defaults', () => {
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
});
