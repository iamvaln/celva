import { describe, expect, it } from 'vitest';
import fr from './fr.json';
import en from './en.json';

const collectKeys = (obj: unknown, prefix = ''): string[] => {
  if (obj === null || typeof obj !== 'object') return [prefix];
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => collectKeys(v, `${prefix}[${i}]`));
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeys(v, prefix ? `${prefix}.${k}` : k),
  );
};

describe('i18n message bundles', () => {
  it('FR and EN expose the same set of keys', () => {
    const frKeys = new Set(collectKeys(fr));
    const enKeys = new Set(collectKeys(en));
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInFr).toEqual([]);
  });

  it('every value is a non-empty string', () => {
    const allValues = (obj: unknown): string[] => {
      if (obj === null) return [];
      if (typeof obj === 'string') return [obj];
      if (Array.isArray(obj)) return obj.flatMap(allValues);
      if (typeof obj === 'object') return Object.values(obj as Record<string, unknown>).flatMap(allValues);
      return [];
    };
    for (const value of [...allValues(fr), ...allValues(en)]) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
