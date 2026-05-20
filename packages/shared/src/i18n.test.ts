import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isLocale,
  pickLocalized,
  resolveLocale,
} from './i18n.js';

describe('i18n constants', () => {
  it('defaults to French', () => {
    expect(DEFAULT_LOCALE).toBe('fr');
  });

  it('supports exactly fr and en', () => {
    expect(SUPPORTED_LOCALES).toEqual(['fr', 'en']);
  });
});

describe('isLocale', () => {
  it.each(['fr', 'en'])('returns true for %s', (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it.each(['de', 'es', '', null, undefined, 123, {}])('returns false for %s', (value) => {
    expect(isLocale(value)).toBe(false);
  });
});

describe('resolveLocale', () => {
  it('returns default when header is missing', () => {
    expect(resolveLocale(null)).toBe('fr');
    expect(resolveLocale(undefined)).toBe('fr');
    expect(resolveLocale('')).toBe('fr');
  });

  it('parses simple language tag', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('fr')).toBe('fr');
  });

  it('parses language-region tag', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('fr-CA')).toBe('fr');
  });

  it('parses Accept-Language with q-values', () => {
    expect(resolveLocale('en-US,en;q=0.9,fr;q=0.8')).toBe('en');
    expect(resolveLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
  });

  it('falls back to default for unsupported languages', () => {
    expect(resolveLocale('de-DE,de;q=0.9')).toBe('fr');
    expect(resolveLocale('zh-CN')).toBe('fr');
  });

  it('handles whitespace and case', () => {
    expect(resolveLocale(' EN-us ')).toBe('en');
    expect(resolveLocale('FR')).toBe('fr');
  });
});

describe('pickLocalized', () => {
  it('returns text for the requested locale', () => {
    expect(pickLocalized({ fr: 'Bonjour', en: 'Hello' }, 'fr')).toBe('Bonjour');
    expect(pickLocalized({ fr: 'Bonjour', en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('falls back to default locale when target is missing', () => {
    expect(pickLocalized({ fr: 'Bonjour' }, 'en')).toBe('Bonjour');
  });

  it('returns empty string when text is null or undefined', () => {
    expect(pickLocalized(null, 'fr')).toBe('');
    expect(pickLocalized(undefined, 'en')).toBe('');
  });

  it('returns empty string when neither locale is present', () => {
    expect(pickLocalized({}, 'fr')).toBe('');
  });
});
