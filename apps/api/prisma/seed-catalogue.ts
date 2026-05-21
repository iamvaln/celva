import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Catalogue seed for local dev / smoke testing.
 *
 * Idempotent — re-running wipes the seed-tagged catalogue (slugs `mino`,
 * `nani`, the three seed categories, and the two seed collections) and
 * rebuilds it from scratch. Real admin-created products are NOT touched
 * (they use different slugs).
 *
 * Images come from <repo>/images/*.png (gitignored — supply your own).
 * Expected filenames:
 *   - mino-pink.png
 *   - mino-purple-short.png
 *   - mino-purple-long.png
 *   - mino-white.png
 *   - nani-black.png
 *   - nani-purple.png
 *   - nani-red.png
 *
 * Files are copied to apps/api/uploads/products/<id>/<uuid>.png (local-FS
 * storage backend) and matching ProductImage rows are created. When R2 is
 * configured later, re-upload the same originals through the admin and
 * they'll land in R2 with the same key structure.
 */

const prisma = new PrismaClient();

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const IMAGES_DIR = resolve(REPO_ROOT, 'images');
const UPLOAD_ROOT = resolve(__dirname, '..', 'uploads');

type BilingualJson = Prisma.InputJsonValue;
const bi = (fr: string, en: string): BilingualJson => ({ fr, en }) as Prisma.InputJsonValue;

type ProductSpec = {
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
  }>;
};

const PRODUCTS: ProductSpec[] = [
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
      { file: 'mino-pink.png', altFr: 'Robe Mino — coloris rose', altEn: 'Mino dress — pink' },
      { file: 'mino-purple-short.png', altFr: 'Robe Mino — mauve court', altEn: 'Mino dress — purple short' },
      { file: 'mino-purple-long.png', altFr: 'Robe Mino — mauve long', altEn: 'Mino dress — purple long' },
      { file: 'mino-white.png', altFr: 'Robe Mino — blanc', altEn: 'Mino dress — white' },
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
      { file: 'nani-black.png', altFr: 'Robe Nani — noir', altEn: 'Nani dress — black' },
      { file: 'nani-purple.png', altFr: 'Robe Nani — mauve', altEn: 'Nani dress — purple' },
      { file: 'nani-red.png', altFr: 'Robe Nani — rouge terracotta', altEn: 'Nani dress — terracotta red' },
    ],
  },
];

const CATEGORIES: Array<{ slug: string; name: { fr: string; en: string }; sortOrder: number }> = [
  { slug: 'robes', name: { fr: 'Robes', en: 'Dresses' }, sortOrder: 0 },
  { slug: 'tops', name: { fr: 'Tops', en: 'Tops' }, sortOrder: 1 },
  { slug: 'accessoires', name: { fr: 'Accessoires', en: 'Accessories' }, sortOrder: 2 },
];

const COLLECTIONS: Array<{
  slug: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  productSlugs: string[];
}> = [
  {
    slug: 'soirees-chic',
    name: { fr: 'Soirées Chic', en: 'Evening Wear' },
    description: {
      fr: 'Sélection pour les nuits qui méritent une pièce qu’on retient.',
      en: 'Picks for nights that deserve a memorable piece.',
    },
    productSlugs: ['mino', 'nani'],
  },
  {
    slug: 'signature',
    name: { fr: 'Pièces signature', en: 'Signature pieces' },
    description: {
      fr: 'Les essentiels qui définissent l’atelier Celva.',
      en: 'The essentials that define the Celva atelier.',
    },
    productSlugs: ['mino', 'nani'],
  },
];

const SEED_SLUG_PATTERN = ['mino', 'nani'];
const SEED_CATEGORY_SLUGS = ['robes', 'tops', 'accessoires'];
const SEED_COLLECTION_SLUGS = ['soirees-chic', 'signature'];

async function cleanup(): Promise<void> {
  console.log('  → Wiping previous seed data…');
  const products = await prisma.product.findMany({
    where: { slug: { in: SEED_SLUG_PATTERN } },
    select: { id: true, slug: true },
  });

  // Remove the local-FS image originals that belong to seeded products.
  for (const p of products) {
    const dir = resolve(UPLOAD_ROOT, 'products', p.id);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }

  // Order matters: relations cascade where defined, but variants link to
  // stock movements (audit trail) — we wipe those first.
  const productIds = products.map((p) => p.id);
  if (productIds.length > 0) {
    await prisma.stockMovement.deleteMany({ where: { variantId: { in: await variantIds(productIds) } } });
    await prisma.variantAttributeValue.deleteMany({});
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productAttributeValue.deleteMany({});
    await prisma.productAttribute.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.relatedProduct.deleteMany({
      where: { OR: [{ productId: { in: productIds } }, { relatedProductId: { in: productIds } }] },
    });
    await prisma.productCollection.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  await prisma.collection.deleteMany({ where: { slug: { in: SEED_COLLECTION_SLUGS } } });
  await prisma.category.deleteMany({ where: { slug: { in: SEED_CATEGORY_SLUGS } } });
}

async function variantIds(productIds: string[]): Promise<string[]> {
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: { id: true },
  });
  return variants.map((v) => v.id);
}

async function copyImage(file: string, productId: string, imageId: string): Promise<string> {
  const source = resolve(IMAGES_DIR, file);
  const ext = file.split('.').pop()!.toLowerCase();
  const key = `products/${productId}/${imageId}.${ext}`;
  const target = resolve(UPLOAD_ROOT, key);
  await mkdir(dirname(target), { recursive: true });
  const buffer = await readFile(source);
  await writeFile(target, buffer);
  return key;
}

async function main(): Promise<void> {
  console.log('🌱 Seeding catalogue…');

  if (!existsSync(IMAGES_DIR)) {
    throw new Error(`Images directory not found: ${IMAGES_DIR}`);
  }

  await cleanup();

  // 1) Categories
  console.log('  → Categories');
  const categoryByslug = new Map<string, { id: string }>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: bi(c.name.fr, c.name.en),
        sortOrder: c.sortOrder,
      },
      update: {
        name: bi(c.name.fr, c.name.en),
        sortOrder: c.sortOrder,
      },
    });
    categoryByslug.set(c.slug, cat);
  }

  // 2) Products + attributes + values + variants + images
  console.log('  → Products');
  const productIdBySlug = new Map<string, string>();

  for (const spec of PRODUCTS) {
    const category = categoryByslug.get(spec.categorySlug);
    if (!category) throw new Error(`Unknown category slug ${spec.categorySlug}`);

    const product = await prisma.product.create({
      data: {
        slug: spec.slug,
        name: bi(spec.name.fr, spec.name.en),
        description: bi(spec.description.fr, spec.description.en),
        displayPrice: spec.displayPrice,
        floorPrice: spec.floorPrice,
        costPrice: spec.costPrice,
        productionType: spec.productionType,
        categoryId: category.id,
        isActive: true,
      },
    });
    productIdBySlug.set(spec.slug, product.id);
    console.log(`    ✓ Product ${product.slug}`);

    // Attributes + values
    const attributeIds: string[] = [];
    const valueIdsByAttribute: string[][] = [];
    for (let i = 0; i < spec.attributes.length; i++) {
      const attrSpec = spec.attributes[i]!;
      const attribute = await prisma.productAttribute.create({
        data: {
          productId: product.id,
          name: bi(attrSpec.name.fr, attrSpec.name.en),
          sortOrder: i,
        },
      });
      attributeIds.push(attribute.id);
      const created: string[] = [];
      for (let j = 0; j < attrSpec.values.length; j++) {
        const v = attrSpec.values[j]!;
        const value = await prisma.productAttributeValue.create({
          data: {
            attributeId: attribute.id,
            value: bi(v.fr, v.en),
            sortOrder: j,
          },
        });
        created.push(value.id);
      }
      valueIdsByAttribute.push(created);
    }

    // Variants + attribute-value links + initial stock via StockMovement
    for (const v of spec.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          priceOverride: v.priceOverride,
          isActive: true,
          attributeValues: {
            create: v.pickByAttributeIndex.map((valueIdx, attrIdx) => ({
              attributeId: attributeIds[attrIdx]!,
              attributeValueId: valueIdsByAttribute[attrIdx]![valueIdx]!,
            })),
          },
        },
      });

      if (v.initialStock > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { increment: v.initialStock } },
          });
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              quantity: v.initialStock,
              type: 'MANUAL_ADJUSTMENT',
              reason: 'Seed initial stock',
              createdById: (await tx.user.findFirstOrThrow({ where: { role: 'ADMIN' } })).id,
            },
          });
        });
      }
    }

    // Images: copy file to uploads/, create ProductImage row
    for (let i = 0; i < spec.images.length; i++) {
      const img = spec.images[i]!;
      const imageId = randomUUID();
      const key = await copyImage(img.file, product.id, imageId);
      await prisma.productImage.create({
        data: {
          id: imageId,
          key,
          altText: bi(img.altFr, img.altEn),
          position: i,
          isPrimary: i === 0,
          productId: product.id,
        },
      });
    }
  }

  // 3) Collections
  console.log('  → Collections');
  for (const c of COLLECTIONS) {
    const collection = await prisma.collection.create({
      data: {
        slug: c.slug,
        name: bi(c.name.fr, c.name.en),
        description: bi(c.description.fr, c.description.en),
        isActive: true,
        sortOrder: COLLECTIONS.indexOf(c),
      },
    });
    for (let i = 0; i < c.productSlugs.length; i++) {
      const productId = productIdBySlug.get(c.productSlugs[i]!);
      if (!productId) continue;
      await prisma.productCollection.create({
        data: {
          collectionId: collection.id,
          productId,
          sortOrder: i,
        },
      });
    }
    console.log(`    ✓ Collection ${collection.slug} (${c.productSlugs.length} products)`);
  }

  // 4) Cross-sell: Mino ↔ Nani
  console.log('  → Cross-sell links');
  const minoId = productIdBySlug.get('mino')!;
  const naniId = productIdBySlug.get('nani')!;
  await prisma.relatedProduct.create({
    data: { productId: minoId, relatedProductId: naniId, sortOrder: 0 },
  });
  await prisma.relatedProduct.create({
    data: { productId: naniId, relatedProductId: minoId, sortOrder: 0 },
  });

  console.log('✅ Catalogue seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
