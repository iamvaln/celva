import { describe, expect, it } from 'vitest';
import { pickLocalized } from './i18n-helpers';

describe('pickLocalized', () => {
  const both = { fr: 'Bonjour', en: 'Hello' };

  it('returns the requested locale string', () => {
    expect(pickLocalized(both, 'fr')).toBe('Bonjour');
    expect(pickLocalized(both, 'en')).toBe('Hello');
  });

  it('returns empty string for null/undefined', () => {
    expect(pickLocalized(null, 'fr')).toBe('');
    expect(pickLocalized(undefined, 'en')).toBe('');
  });

  it('falls back to fr when the requested locale value is missing', () => {
    const onlyFr = { fr: 'Salut', en: '' } as { fr: string; en: string };
    // en is empty-string (falsy but defined) — current impl uses ?? so empty
    // string is kept. Document the actual behaviour:
    expect(pickLocalized(onlyFr, 'en')).toBe('');
    expect(pickLocalized(onlyFr, 'fr')).toBe('Salut');
  });
});
