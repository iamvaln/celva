import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Robes longues')).toBe('robes-longues');
  });

  it('strips accents (FR)', () => {
    expect(slugify('Tenues élégantes pour soirée')).toBe('tenues-elegantes-pour-soiree');
  });

  it('removes apostrophes', () => {
    expect(slugify("L'été à Douala")).toBe('lete-a-douala');
  });

  it('collapses non-alphanumeric runs', () => {
    expect(slugify('Sac  /  pochette — petits modèles')).toBe(
      'sac-pochette-petits-modeles',
    );
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('--Bonjour--')).toBe('bonjour');
  });

  it('caps length at 80 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it('returns empty string for purely punctuation input', () => {
    expect(slugify('!!!---???')).toBe('');
  });
});
