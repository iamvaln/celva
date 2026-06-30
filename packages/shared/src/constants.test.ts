import { describe, expect, it } from 'vitest';
import {
  API_VERSION,
  APP_SOURCE_HEADER,
  BCRYPT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  PHONE_CAMEROON_PATTERN,
  RATE_LIMITS,
  SETTING_KEYS,
  TAX_RATE_CAMEROON,
} from './constants';

describe('API constants', () => {
  it('exposes versioned API path', () => {
    expect(API_VERSION).toBe('v1');
  });

  it('exposes the X-App-Source header name', () => {
    expect(APP_SOURCE_HEADER).toBe('X-App-Source');
  });
});

describe('Cameroon tax', () => {
  it('TVA = 17.5% + CAC 10% = 19.25%', () => {
    expect(TAX_RATE_CAMEROON).toBe(0.1925);
  });
});

describe('SETTING_KEYS', () => {
  it.each([
    'TAX_RATE',
    'MAX_CASH_ON_DELIVERY',
    'INVOICE_COMPANY_NAME',
    'CONTACT_EMAIL',
    'ORDER_NOTIFICATION_EMAIL',
    'FREE_DELIVERY_ENABLED',
    'R2_BUCKET_URL',
  ])('includes %s', (key) => {
    expect(Object.values(SETTING_KEYS)).toContain(key);
  });
});

describe('Security defaults', () => {
  it('bcrypt rounds ≥ 10 (spec §0)', () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10);
  });

  it('password min length ≥ 8 (spec §3.1)', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('login rate limit = 5 per 15 minutes (spec §3.2)', () => {
    expect(RATE_LIMITS.LOGIN_PER_15_MIN).toBe(5);
  });
});

describe('PHONE_CAMEROON_PATTERN', () => {
  it.each(['+237699112233', '+237233440011', '+237677889900'])('matches %s', (phone) => {
    expect(PHONE_CAMEROON_PATTERN.test(phone)).toBe(true);
  });

  it.each(['237699112233', '+237199112233', '+33699112233', '+23769911223', '+2376991122334'])(
    'rejects %s',
    (phone) => {
      expect(PHONE_CAMEROON_PATTERN.test(phone)).toBe(false);
    },
  );
});
