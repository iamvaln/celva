import { PrismaClient, UserRole } from '@prisma/client';
import {
  COLLECTIONS,
  CATEGORIES,
  PRODUCTS,
  SEED_CATEGORY_SLUGS,
  SEED_COLLECTION_SLUGS,
  SEED_SLUG_PATTERN,
  bi,
  collectionImageKey,
  productImageKey,
} from './catalogue-seed-data';
import { isR2Configured, makeStorage } from './seed-storage';

/**
 * Catalogue seed for local dev, CI, and preprod smoke testing.
 *
 * Idempotent — re-running wipes the seed-tagged catalogue (slugs `mino`,
 * `nani`, `dafani`, `elegante`, the three seed categories, and the two seed
 * collections) and rebuilds it from scratch. Real admin-created products are
 * NOT touched (they use different slugs).
 *
 * Images are NOT handled here — they live in storage (R2 in preprod/prod) at the
 * deterministic keys from catalogue-seed-data.ts, uploaded once by
 * `upload-seed-images.ts`. This seed only creates the DB rows that reference
 * those keys, so it needs no image files on the box it runs on.
 *
 * Run order per environment:
 *   1. prisma/seed.ts              (admin, settings, base categories)
 *   2. prisma/upload-seed-images.ts (push originals to storage)
 *   3. prisma/seed-catalogue.ts    (this file)
 */

const prisma = new PrismaClient();

async function variantIds(productIds: string[]): Promise<string[]> {
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: { id: true },
  });
  return variants.map((v) => v.id);
}

async function cleanup(): Promise<void> {
  console.log('  → Wiping previous seed data…');
  const products = await prisma.product.findMany({
    where: { slug: { in: SEED_SLUG_PATTERN } },
    select: { id: true },
  });

  // Order matters: relations cascade where defined, but variants link to
  // stock movements (audit trail) — we wipe those first. Storage objects are
  // left alone: they live at deterministic keys managed by upload-seed-images.
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

async function main(): Promise<void> {
  console.log('🌱 Seeding catalogue…');
  console.log(
    `  → Image keys resolve against ${isR2Configured() ? 'R2' : 'local filesystem'} ` +
      '(run upload-seed-images.ts for the same env if images 404)',
  );

  // Builds image URLs only (no upload). On R2 this yields media.celva.store
  // URLs; on local FS, localhost URLs.
  const storage = makeStorage();

  // StockMovement rows need a creating user. The base seed (seed.ts) creates a
  // SUPER_ADMIN; accept either admin role so order-of-seeding doesn't matter.
  const seedUser = await prisma.user.findFirstOrThrow({
    where: { role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  await cleanup();

  // 1) Categories
  console.log('  → Categories');
  const categoryByslug = new Map<string, { id: string }>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: bi(c.name.fr, c.name.en), sortOrder: c.sortOrder },
      update: { name: bi(c.name.fr, c.name.en), sortOrder: c.sortOrder },
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
        data: { productId: product.id, name: bi(attrSpec.name.fr, attrSpec.name.en), sortOrder: i },
      });
      attributeIds.push(attribute.id);
      const created: string[] = [];
      for (let j = 0; j < attrSpec.values.length; j++) {
        const v = attrSpec.values[j]!;
        const value = await prisma.productAttributeValue.create({
          data: { attributeId: attribute.id, value: bi(v.fr, v.en), sortOrder: j },
        });
        created.push(value.id);
      }
      valueIdsByAttribute.push(created);
    }

    // Map colour value (fr) → id so each image can be tagged with the colour it
    // depicts (drives the storefront colour→image switch).
    const colorValueIdByFr = new Map<string, string>();
    for (let i = 0; i < spec.attributes.length; i++) {
      const nameFr = spec.attributes[i]!.name.fr.toLowerCase();
      if (nameFr.includes('coloris') || nameFr.includes('couleur')) {
        spec.attributes[i]!.values.forEach((val, j) => {
          colorValueIdByFr.set(val.fr, valueIdsByAttribute[i]![j]!);
        });
      }
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
              createdById: seedUser.id,
            },
          });
        });
      }
    }

    // Images: create rows referencing the deterministic storage keys (uploaded
    // separately by upload-seed-images.ts).
    for (let i = 0; i < spec.images.length; i++) {
      const img = spec.images[i]!;
      await prisma.productImage.create({
        data: {
          key: productImageKey(spec.slug, img.file),
          altText: bi(img.altFr, img.altEn),
          position: i,
          isPrimary: i === 0,
          productId: product.id,
          attributeValueId: img.color ? (colorValueIdByFr.get(img.color) ?? null) : null,
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
        // Storefront renders Collection.imageUrl directly (no transform
        // pipeline), so store the plain public URL of the uploaded key.
        imageUrl: c.image ? storage.publicUrl(collectionImageKey(c.slug, c.image)) : undefined,
        isActive: true,
        sortOrder: COLLECTIONS.indexOf(c),
      },
    });
    for (let i = 0; i < c.productSlugs.length; i++) {
      const productId = productIdBySlug.get(c.productSlugs[i]!);
      if (!productId) continue;
      await prisma.productCollection.create({
        data: { collectionId: collection.id, productId, sortOrder: i },
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
