import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('i18n routing', () => {
  it('defaults to French', () => {
    expect(routing.defaultLocale).toBe('fr');
  });

  it('supports fr and en', () => {
    expect(routing.locales).toEqual(['fr', 'en']);
  });

  it('always prefixes the locale (no bare /)', () => {
    expect(routing.localePrefix).toBe('always');
  });

  it.each([
    ['/shop', '/boutique', '/shop'],
    ['/cart', '/panier', '/cart'],
    ['/login', '/connexion', '/login'],
    ['/signup', '/inscription', '/signup'],
    ['/about', '/a-propos', '/about'],
    ['/process', '/processus', '/process'],
    ['/terms', '/cgv', '/terms'],
    ['/privacy', '/confidentialite', '/privacy'],
  ])('localizes %s as fr=%s / en=%s', (key, fr, en) => {
    const entry = routing.pathnames?.[key as keyof typeof routing.pathnames] as
      | { fr: string; en: string }
      | undefined;
    expect(entry).toBeDefined();
    expect(entry?.fr).toBe(fr);
    expect(entry?.en).toBe(en);
  });
});
