import { describe, expect, it } from 'vitest';
import {
  selectFeaturedGrid,
  selectHeroProduct,
  selectSurMesureProduct,
} from './featured';

// Use simple labelled items; the logic is index-based and type-agnostic.
const seq = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `p${i}`);

describe('selectFeaturedGrid', () => {
  it('with a healthy catalogue (>4), keeps the hero out and takes [1..4], reversed', () => {
    // p0 is the hero; grid should be p1..p4 reversed → p4,p3,p2,p1.
    expect(selectFeaturedGrid(seq(6))).toEqual(['p4', 'p3', 'p2', 'p1']);
  });

  it('with exactly 5 products, still drops the hero and takes [1..4]', () => {
    expect(selectFeaturedGrid(seq(5))).toEqual(['p4', 'p3', 'p2', 'p1']);
  });

  it('with exactly 4 products, includes the hero so the grid stays full', () => {
    expect(selectFeaturedGrid(seq(4))).toEqual(['p3', 'p2', 'p1', 'p0']);
  });

  it('with fewer than 4, returns all available (reversed)', () => {
    expect(selectFeaturedGrid(seq(2))).toEqual(['p1', 'p0']);
  });

  it('returns an empty array for an empty catalogue', () => {
    expect(selectFeaturedGrid([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = seq(6);
    const copy = [...input];
    selectFeaturedGrid(input);
    expect(input).toEqual(copy);
  });
});

describe('selectHeroProduct', () => {
  it('is the first (most recent) product', () => {
    expect(selectHeroProduct(seq(3))).toBe('p0');
  });
  it('is null for an empty catalogue', () => {
    expect(selectHeroProduct([])).toBeNull();
  });
});

describe('selectSurMesureProduct', () => {
  it('is the 6th product when available', () => {
    expect(selectSurMesureProduct(seq(6))).toBe('p5');
  });
  it('falls back to the 2nd product on a small catalogue', () => {
    expect(selectSurMesureProduct(seq(3))).toBe('p1');
  });
  it('is null when fewer than 2 products exist', () => {
    expect(selectSurMesureProduct(seq(1))).toBeNull();
    expect(selectSurMesureProduct([])).toBeNull();
  });
});
