import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-var-${Date.now()}`;
const SKU_TAG = SUITE_TAG.toUpperCase().replace(/-/g, '_');

describe('Variants (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let productId = '';
  let attrSizeId = '';
  let attrColorId = '';
  let sizeS = '';
  let sizeM = '';
  let colorRed = '';
  let colorBlue = '';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser(process.env.COOKIE_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    await prisma.productVariant.deleteMany({ where: { sku: { startsWith: SKU_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const cat = await prisma.category.create({
      data: {
        name: { fr: `${SUITE_TAG} Cat`, en: 'Cat' },
        slug: `${SUITE_TAG}-cat`,
      },
    });
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 25000,
        floorPrice: 20000,
        productionType: 'INTERNAL',
        categoryId: cat.id,
      },
    });
    productId = product.id;

    const attrSize = await prisma.productAttribute.create({
      data: { name: { fr: 'Taille', en: 'Size' }, sortOrder: 0, productId },
    });
    const attrColor = await prisma.productAttribute.create({
      data: { name: { fr: 'Couleur', en: 'Colour' }, sortOrder: 1, productId },
    });
    attrSizeId = attrSize.id;
    attrColorId = attrColor.id;

    sizeS = (
      await prisma.productAttributeValue.create({
        data: { value: { fr: 'S', en: 'S' }, sortOrder: 0, attributeId: attrSizeId },
      })
    ).id;
    sizeM = (
      await prisma.productAttributeValue.create({
        data: { value: { fr: 'M', en: 'M' }, sortOrder: 1, attributeId: attrSizeId },
      })
    ).id;
    colorRed = (
      await prisma.productAttributeValue.create({
        data: { value: { fr: 'Rouge', en: 'Red' }, sortOrder: 0, attributeId: attrColorId },
      })
    ).id;
    colorBlue = (
      await prisma.productAttributeValue.create({
        data: { value: { fr: 'Bleu', en: 'Blue' }, sortOrder: 1, attributeId: attrColorId },
      })
    ).id;

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    // Test fixtures: clear stock movements first (audit trail constraint
    // blocks variant delete in prod, but tests are allowed to wipe).
    const variants = await prisma.productVariant.findMany({
      where: { sku: { startsWith: SKU_TAG } },
      select: { id: true },
    });
    await prisma.stockMovement.deleteMany({
      where: { variantId: { in: variants.map((v) => v.id) } },
    });
    await prisma.productVariant.deleteMany({ where: { sku: { startsWith: SKU_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  let variantId = '';

  it('POST /variants requires auth (401)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .send({
        productId,
        sku: `${SKU_TAG}-S-RED`,
        attributeValueIds: [sizeS, colorRed],
      })
      .expect(401);
  });

  it('POST /variants creates with initial stock applied via StockMovementsService', async () => {
    const res = await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-S-RED`,
        attributeValueIds: [sizeS, colorRed],
        initialStock: 5,
      })
      .expect(201);
    expect(res.body.data.sku).toBe(`${SKU_TAG}-S-RED`);
    expect(res.body.data.stock).toBe(5);
    expect(res.body.data.attributeValues).toHaveLength(2);
    variantId = res.body.data.id;

    const movement = await prisma.stockMovement.findFirst({
      where: { variantId, type: 'MANUAL_ADJUSTMENT' },
    });
    expect(movement?.quantity).toBe(5);
  });

  it('POST /variants rejects duplicate combination (409)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-S-RED-DUP`,
        attributeValueIds: [sizeS, colorRed],
      })
      .expect(409);
  });

  it('POST /variants rejects two picks on the same axis (400)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-DUPAX`,
        attributeValueIds: [sizeS, sizeM],
      })
      .expect(400);
  });

  it('POST /variants rejects mismatched attribute count (400)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-MIS`,
        attributeValueIds: [sizeM],
      })
      .expect(400);
  });

  it('POST /variants rejects invalid attribute-value (400)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-INV`,
        attributeValueIds: [sizeM, '00000000-0000-0000-0000-000000000000'],
      })
      .expect(400);
  });

  it('POST /variants rejects duplicate SKU (409)', async () => {
    await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-S-RED`,
        attributeValueIds: [sizeM, colorBlue],
      })
      .expect(409);
  });

  it('GET /variants is public and filters by productId', async () => {
    const res = await request(server)
      .get(`/api/v1/variants?productId=${productId}`)
      .expect(200);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /variants/:id updates SKU + priceOverride + isActive', async () => {
    const res = await request(server)
      .patch(`/api/v1/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `${SKU_TAG}-S-RED-2`, priceOverride: 24000, isActive: false })
      .expect(200);
    expect(res.body.data.sku).toBe(`${SKU_TAG}-S-RED-2`);
    expect(Number(res.body.data.priceOverride)).toBe(24000);
    expect(res.body.data.isActive).toBe(false);
  });

  it('PATCH /variants/:id rejects updating stock directly (whitelist)', async () => {
    await request(server)
      .patch(`/api/v1/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 999 })
      .expect(400);
  });

  it('POST /variants/:id/adjust-stock requires non-zero qty (400)', async () => {
    await request(server)
      .post(`/api/v1/variants/${variantId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 0, reason: 'Test' })
      .expect(400);
  });

  it('POST /variants/:id/adjust-stock applies +delta via StockMovementsService', async () => {
    await request(server)
      .post(`/api/v1/variants/${variantId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 3, reason: 'Recount' })
      .expect(201);
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(8);
  });

  it('POST /variants/:id/adjust-stock applies -delta and refuses to go negative (400)', async () => {
    await request(server)
      .post(`/api/v1/variants/${variantId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: -3, reason: 'Damage' })
      .expect(201);
    let variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(5);

    await request(server)
      .post(`/api/v1/variants/${variantId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: -100, reason: 'Should fail' })
      .expect(400);
    variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(5);
  });

  it('DELETE /variants/:id refuses while stock > 0 (409)', async () => {
    await request(server)
      .delete(`/api/v1/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('DELETE /variants/:id refuses once stock movements exist (audit trail)', async () => {
    await request(server)
      .post(`/api/v1/variants/${variantId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: -5, reason: 'Clearing for deletion' })
      .expect(201);
    // Stock now 0, but movements still recorded → variant_has_movements (409).
    await request(server)
      .delete(`/api/v1/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('DELETE /variants/:id succeeds for a variant with no movements', async () => {
    const fresh = await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-M-RED`,
        attributeValueIds: [sizeM, colorRed],
      })
      .expect(201);

    await request(server)
      .delete(`/api/v1/variants/${fresh.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('PATCH /variants/:id rejects invalid SKU shape (400)', async () => {
    const tmp = await request(server)
      .post('/api/v1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        sku: `${SKU_TAG}-M-BLU`,
        attributeValueIds: [sizeM, colorBlue],
      })
      .expect(201);

    await request(server)
      .patch(`/api/v1/variants/${tmp.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'lowercase' })
      .expect(400);
  });
});
