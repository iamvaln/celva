/**
 * Tiny deterministic slugifier: lowercases, strips diacritics, collapses
 * non-alphanumeric runs into single `-`, trims leading/trailing `-`.
 * Good enough for category/product/collection slugs in FR + EN.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
