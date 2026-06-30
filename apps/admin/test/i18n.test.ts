import { describe, expect, it } from 'vitest';
import { i18nProvider } from '../src/i18nProvider';
import { uiFr, uiEn } from '../src/i18nUi';

/** Recursively collect every leaf key path of a nested message object. */
const leafKeys = (obj: unknown, prefix = ''): string[] => {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
};

describe('i18nProvider', () => {
  it('resolves the configured locales (FR default + EN)', () => {
    const locales = i18nProvider.getLocales?.() ?? [];
    expect(locales.map((l) => l.locale)).toEqual(['fr', 'en']);
  });

  it('resolves bespoke UI keys without echoing the raw key back', () => {
    // A raw key (untranslated) would resolve to itself; a real translation won't.
    const keys = [
      'ui.ai_metrics.title',
      'ui.ai_metrics.total_calls',
      'celva.login_subtitle',
      'menu.catalog',
      'shared.helpers.sort_order',
    ];
    for (const key of keys) {
      const fr = i18nProvider.translate(key);
      expect(fr, `FR translation for ${key}`).not.toBe(key);
      expect(fr.length).toBeGreaterThan(0);
    }
  });

  it('resolves core resource labels (singular + plural) in FR', () => {
    expect(i18nProvider.translate('resources.categories.name', { smart_count: 1 })).toBe(
      'Catégorie',
    );
    expect(i18nProvider.translate('resources.categories.name', { smart_count: 2 })).toBe(
      'Catégories',
    );
    expect(i18nProvider.translate('resources.products.fields.name_fr')).not.toBe(
      'resources.products.fields.name_fr',
    );
    expect(i18nProvider.translate('resources.collections.fields.name_fr')).not.toBe(
      'resources.collections.fields.name_fr',
    );
  });

  it('resolves EN translations once the locale is switched', async () => {
    await i18nProvider.changeLocale('en');
    try {
      expect(i18nProvider.translate('ui.ai_metrics.title')).toBe('AI metrics');
      expect(i18nProvider.translate('menu.catalog')).not.toBe('menu.catalog');
    } finally {
      await i18nProvider.changeLocale('fr');
    }
  });

  it('has identical key sets between the FR and EN UI message trees (parity)', () => {
    const frKeys = new Set(leafKeys(uiFr));
    const enKeys = new Set(leafKeys(uiEn));
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
    expect(missingInEn, `keys present in FR but missing in EN: ${missingInEn.join(', ')}`).toEqual(
      [],
    );
    expect(missingInFr, `keys present in EN but missing in FR: ${missingInFr.join(', ')}`).toEqual(
      [],
    );
  });
});
