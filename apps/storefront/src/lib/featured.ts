/**
 * Home-page "signature pieces" selection logic, extracted as a pure function
 * so it can be unit-tested without rendering the page or hitting the API.
 *
 * Input is the top-N most-recent active products (data[0] = hero candidate).
 * The featured grid wants exactly 4 cards:
 *   - With a healthy catalogue (> 4 products) we keep the hero out and take
 *     products[1..4].
 *   - With a small catalogue (≤ 4) we include the hero so the 4-up grid stays
 *     as full as possible.
 * The result is reversed so the oldest of the slice sits top-left.
 */
export const selectFeaturedGrid = <T>(products: readonly T[]): T[] => {
  const source =
    products.length > 4 ? products.slice(1, 5) : products.slice(0, 4);
  return [...source].reverse();
};

/** Hero product = the most recent active product, if any. */
export const selectHeroProduct = <T>(products: readonly T[]): T | null =>
  products[0] ?? null;

/**
 * Image for the "sur-mesure" block: the 6th product when available, otherwise
 * fall back to the 2nd so the section is never empty on a small catalogue.
 */
export const selectSurMesureProduct = <T>(products: readonly T[]): T | null =>
  products[5] ?? products[1] ?? null;
