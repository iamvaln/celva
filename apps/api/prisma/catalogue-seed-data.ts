import { Prisma } from '@prisma/client';

/**
 * Shared catalogue seed data, used by both:
 *   - upload-seed-images.ts → pushes the image originals to storage (R2/prod)
 *   - seed-catalogue.ts      → creates the DB rows that reference them
 *
 * Image keys are DETERMINISTIC (derived from slugs + filename), so the two
 * scripts agree without passing state, and re-running either is idempotent.
 */

export type BilingualJson = Prisma.InputJsonValue;
export const bi = (fr: string, en: string): BilingualJson =>
  ({ fr, en }) as Prisma.InputJsonValue;

export type ProductSpec = {
  slug: string;
  categorySlug: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  displayPrice: number;
  floorPrice: number;
  costPrice: number;
  productionType: 'INTERNAL' | 'SUBCONTRACTED' | 'PURCHASED';
  attributes: Array<{
    name: { fr: string; en: string };
    values: Array<{ fr: string; en: string }>;
  }>;
  variants: Array<{
    sku: string;
    pickByAttributeIndex: number[]; // index into each attribute's values array
    initialStock: number;
    priceOverride?: number;
  }>;
  images: Array<{
    file: string;
    altFr: string;
    altEn: string;
    /** FR value of the colour this image depicts (matches a Coloris value). */
    color?: string;
  }>;
};

export const PRODUCTS: ProductSpec[] = [
  {
    slug: 'mino',
    categorySlug: 'robes',
    name: { fr: 'Robe Mino', en: 'Mino Dress' },
    description: {
      fr: "La Mino épouse la silhouette en douceur. Coupe ajustée, tombé fluide, finitions main. Pensée pour les soirées chaudes de Douala.",
      en: 'The Mino hugs the silhouette gently. Fitted cut, flowing drape, hand-finished. Made for warm Douala evenings.',
    },
    displayPrice: 38000,
    floorPrice: 28000,
    costPrice: 15000,
    productionType: 'INTERNAL',
    attributes: [
      {
        name: { fr: 'Coloris', en: 'Colour' },
        values: [
          { fr: 'Rose', en: 'Pink' },
          { fr: 'Mauve', en: 'Purple' },
          { fr: 'Blanc', en: 'White' },
        ],
      },
      {
        name: { fr: 'Longueur', en: 'Length' },
        values: [
          { fr: 'Court', en: 'Short' },
          { fr: 'Long', en: 'Long' },
        ],
      },
    ],
    variants: [
      { sku: 'CLV-MINO-PINK-S', pickByAttributeIndex: [0, 0], initialStock: 4 }, // Rose × Court
      { sku: 'CLV-MINO-PURPLE-S', pickByAttributeIndex: [1, 0], initialStock: 3 }, // Mauve × Court
      { sku: 'CLV-MINO-PURPLE-L', pickByAttributeIndex: [1, 1], initialStock: 2 }, // Mauve × Long
      { sku: 'CLV-MINO-WHITE-S', pickByAttributeIndex: [2, 0], initialStock: 5 }, // Blanc × Court
    ],
    images: [
      { file: 'mino-pink.png', altFr: 'Robe Mino — coloris rose', altEn: 'Mino dress — pink', color: 'Rose' },
      { file: 'mino-purple-short.png', altFr: 'Robe Mino — mauve court', altEn: 'Mino dress — purple short', color: 'Mauve' },
      { file: 'mino-purple-long.png', altFr: 'Robe Mino — mauve long', altEn: 'Mino dress — purple long', color: 'Mauve' },
      { file: 'mino-white.png', altFr: 'Robe Mino — blanc', altEn: 'Mino dress — white', color: 'Blanc' },
    ],
  },
  {
    slug: 'nani',
    categorySlug: 'robes',
    name: { fr: 'Robe Nani', en: 'Nani Dress' },
    description: {
      fr: 'Une pièce structurée, manches courtes, ligne A. Tissu opaque sélectionné pour sa tenue. Parfaite du jour au soir.',
      en: 'A structured piece, short sleeves, A-line silhouette. Opaque fabric selected for its hold. Day-to-night versatility.',
    },
    displayPrice: 42000,
    floorPrice: 32000,
    costPrice: 17000,
    productionType: 'INTERNAL',
    attributes: [
      {
        name: { fr: 'Coloris', en: 'Colour' },
        values: [
          { fr: 'Noir', en: 'Black' },
          { fr: 'Mauve', en: 'Purple' },
          { fr: 'Rouge terracotta', en: 'Terracotta red' },
        ],
      },
    ],
    variants: [
      { sku: 'CLV-NANI-BLACK', pickByAttributeIndex: [0], initialStock: 3 },
      { sku: 'CLV-NANI-PURPLE', pickByAttributeIndex: [1], initialStock: 4 },
      { sku: 'CLV-NANI-RED', pickByAttributeIndex: [2], initialStock: 2 },
    ],
    images: [
      { file: 'nani-black.png', altFr: 'Robe Nani — noir', altEn: 'Nani dress — black', color: 'Noir' },
      { file: 'nani-purple.png', altFr: 'Robe Nani — mauve', altEn: 'Nani dress — purple', color: 'Mauve' },
      { file: 'nani-red.png', altFr: 'Robe Nani — rouge terracotta', altEn: 'Nani dress — terracotta red', color: 'Rouge terracotta' },
    ],
  },
  {
    slug: 'dafani',
    categorySlug: 'robes',
    name: { fr: 'Robe Dafani', en: 'Dafani Dress' },
    description: {
      fr: "La Dafani revisite le tissage traditionnel à rayures dans une coupe tunique fluide, finie par des franges. Coton tissé main, généreux et confortable, à porter avec ou sans accessoire.",
      en: 'The Dafani reinterprets traditional striped weaving in a flowing tunic cut, finished with fringe. Hand-woven cotton, generous and comfortable, to wear with or without accessories.',
    },
    displayPrice: 45000,
    floorPrice: 35000,
    costPrice: 18000,
    productionType: 'INTERNAL',
    attributes: [
      {
        name: { fr: 'Coloris', en: 'Colour' },
        values: [
          { fr: 'Bleu roi', en: 'Royal blue' },
          { fr: 'Magenta', en: 'Magenta' },
          { fr: 'Vert & orange', en: 'Green & orange' },
        ],
      },
    ],
    variants: [
      { sku: 'CLV-DAFANI-BLUE', pickByAttributeIndex: [0], initialStock: 4 },
      { sku: 'CLV-DAFANI-PURPLE', pickByAttributeIndex: [1], initialStock: 3 },
      { sku: 'CLV-DAFANI-GREEN-ORANGE', pickByAttributeIndex: [2], initialStock: 3 },
    ],
    images: [
      { file: 'dafani-blue.png', altFr: 'Robe Dafani — bleu roi', altEn: 'Dafani dress — royal blue', color: 'Bleu roi' },
      { file: 'dafani-blue-alt.png', altFr: 'Robe Dafani — bleu roi, autre vue', altEn: 'Dafani dress — royal blue, alternate view', color: 'Bleu roi' },
      { file: 'dafani-purple.png', altFr: 'Robe Dafani — magenta', altEn: 'Dafani dress — magenta', color: 'Magenta' },
      { file: 'dafani-green-orange.png', altFr: 'Robe Dafani — vert et orange', altEn: 'Dafani dress — green and orange', color: 'Vert & orange' },
      { file: 'celva-coll-01.png', altFr: 'Robe Dafani — vue 1', altEn: 'Dafani dress — view 1' },
      { file: 'celva-coll-02.png', altFr: 'Robe Dafani — vue 2', altEn: 'Dafani dress — view 2' },
      { file: 'celva-coll-03.png', altFr: 'Robe Dafani — vue 3', altEn: 'Dafani dress — view 3' },
      { file: 'celva-coll-04.png', altFr: 'Robe Dafani — vue 4', altEn: 'Dafani dress — view 4' },
      { file: 'celva-coll-05.png', altFr: 'Robe Dafani — vue 5', altEn: 'Dafani dress — view 5' },
      { file: 'celva-coll-06.png', altFr: 'Robe Dafani — vue 6', altEn: 'Dafani dress — view 6' },
      { file: 'celva-coll-07.png', altFr: 'Robe Dafani — vue 7', altEn: 'Dafani dress — view 7' },
    ],
  },
  {
    slug: 'elegante',
    categorySlug: 'robes',
    name: { fr: 'Robe Élégante', en: 'Élégante Dress' },
    description: {
      fr: "Coupe droite manches longues, rayures vertes profondes rehaussées de franges dorées aux poignets et à l’ourlet. Une pièce de réception, à porter pour les grandes occasions.",
      en: 'Straight cut with long sleeves, deep green stripes accented by golden fringe at the cuffs and hem. A statement piece for formal occasions.',
    },
    displayPrice: 55000,
    floorPrice: 42000,
    costPrice: 22000,
    productionType: 'INTERNAL',
    attributes: [
      {
        name: { fr: 'Coloris', en: 'Colour' },
        values: [{ fr: 'Vert émeraude', en: 'Emerald green' }],
      },
    ],
    variants: [
      { sku: 'CLV-ELEGANTE-GREEN', pickByAttributeIndex: [0], initialStock: 2 },
    ],
    images: [
      { file: 'elegante-green.png', altFr: 'Robe Élégante — vert émeraude', altEn: 'Élégante dress — emerald green', color: 'Vert émeraude' },
      { file: 'robe_elegante_01.png', altFr: 'Robe Élégante — vue 1', altEn: 'Élégante dress — view 1', color: 'Vert émeraude' },
      { file: 'robe_elegante_02.png', altFr: 'Robe Élégante — vue 2', altEn: 'Élégante dress — view 2', color: 'Vert émeraude' },
    ],
  },
];

export const CATEGORIES: Array<{ slug: string; name: { fr: string; en: string }; sortOrder: number }> = [
  { slug: 'robes', name: { fr: 'Robes', en: 'Dresses' }, sortOrder: 0 },
  { slug: 'tops', name: { fr: 'Tops', en: 'Tops' }, sortOrder: 1 },
  { slug: 'accessoires', name: { fr: 'Accessoires', en: 'Accessories' }, sortOrder: 2 },
];

export const COLLECTIONS: Array<{
  slug: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  image?: string;
  productSlugs: string[];
}> = [
  {
    slug: 'soirees-chic',
    name: { fr: 'Soirées Chic', en: 'Evening Wear' },
    description: {
      fr: 'Sélection pour les nuits qui méritent une pièce qu’on retient.',
      en: 'Picks for nights that deserve a memorable piece.',
    },
    image: 'celva-coll-01.png',
    productSlugs: ['mino', 'nani', 'elegante'],
  },
  {
    slug: 'signature',
    name: { fr: 'Pièces signature', en: 'Signature pieces' },
    description: {
      fr: 'Les essentiels qui définissent l’atelier Celva.',
      en: 'The essentials that define the Celva atelier.',
    },
    image: 'celva-coll-02.png',
    productSlugs: ['mino', 'nani', 'dafani', 'elegante'],
  },
];

export const SEED_SLUG_PATTERN = ['mino', 'nani', 'dafani', 'elegante'];
export const SEED_CATEGORY_SLUGS = ['robes', 'tops', 'accessoires'];
export const SEED_COLLECTION_SLUGS = ['soirees-chic', 'signature'];

export const CONTENT_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Deterministic storage key for a product image. */
export function productImageKey(productSlug: string, file: string): string {
  return `seed/products/${productSlug}/${file}`;
}

/** Deterministic storage key for a collection hero image. */
export function collectionImageKey(collectionSlug: string, file: string): string {
  return `seed/collections/${collectionSlug}/${file}`;
}

/** Flat manifest of every seed image and its target key — drives the uploader. */
export function allSeedImages(): Array<{ file: string; key: string }> {
  const out: Array<{ file: string; key: string }> = [];
  for (const p of PRODUCTS) {
    for (const img of p.images) out.push({ file: img.file, key: productImageKey(p.slug, img.file) });
  }
  for (const c of COLLECTIONS) {
    if (c.image) out.push({ file: c.image, key: collectionImageKey(c.slug, c.image) });
  }
  return out;
}
