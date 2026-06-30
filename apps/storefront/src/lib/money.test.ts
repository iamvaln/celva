import { describe, expect, it } from 'vitest';
import { formatPriceXAF } from './money';

describe('formatPriceXAF', () => {
  it('formats integers with the XAF suffix', () => {
    expect(formatPriceXAF(25000, 'en')).toBe('25,000 XAF');
  });

  it('accepts numeric strings', () => {
    expect(formatPriceXAF('25000', 'en')).toBe('25,000 XAF');
  });

  it('drops fractional digits (XAF has no minor unit)', () => {
    expect(formatPriceXAF(25000.75, 'en')).toBe('25,001 XAF');
  });

  it('groups thousands per locale (fr uses a narrow no-break space)', () => {
    const fr = formatPriceXAF(1234567, 'fr');
    expect(fr.endsWith('XAF')).toBe(true);
    // fr-FR groups with U+202F (narrow no-break space), not a comma.
    expect(fr).not.toContain(',');
    expect(fr.replace(/\s| | /g, '')).toBe('1234567XAF');
  });

  it('groups thousands with commas in English', () => {
    expect(formatPriceXAF(1234567, 'en')).toBe('1,234,567 XAF');
  });

  it('returns an empty string for non-finite input', () => {
    expect(formatPriceXAF('not-a-number', 'en')).toBe('');
    expect(formatPriceXAF(Number.NaN, 'fr')).toBe('');
    expect(formatPriceXAF(Infinity, 'en')).toBe('');
  });

  it('handles zero', () => {
    expect(formatPriceXAF(0, 'en')).toBe('0 XAF');
  });
});
