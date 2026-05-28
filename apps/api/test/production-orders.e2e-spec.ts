import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-prod-${Date.now()}`;

describe('Production orders (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let supplierId = '';
  let materialId = '';
  let productId = '';
  let variantId = '';

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

    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    const supplier = await prisma.supplier.create({ data: { name: `${SUITE_TAG} Sup` } });
    supplierId = supplier.id;
    const material = await prisma.rawMaterial.create({
      data: {
        name: `${SUITE_TAG} Coton`,
        type: 'FABRIC',
        unit: 'm',
        unitPrice: 2000, // 2,000 / m
        stockQty: 100,
        supplierId,
      },
    });
    materialId = material.id;

    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 30000,
        floorPrice: 20000,
        costPrice: 0,
        productionType: 'INTERNAL',
        categoryId: cat.id,
      },
    });
    productId = product.id;
    const variant = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 0 },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    const pos = await prisma.productionOrder.findMany({
      where: { productId },
      select: { id: true },
    });
    const ids = pos.map((p) => p.id);
    if (ids.length > 0) {
      await prisma.transaction.deleteMany({ where: { productionOrderId: { in: ids } } });
      await prisma.materialConsumption.deleteMany({ where: { productionOrderId: { in: ids } } });
      await prisma.productionStage.deleteMany({ where: { productionOrderId: { in: ids } } });
      await prisma.stockMovement.deleteMany({ where: { productionOrderId: { in: ids } } });
      await prisma.productionOrder.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.stockMovement.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  const createOrder = async (overrides: Record<string, unknown> = {}): Promise<string> => {
    const res = await request(server)
      .post('/api/v1/production-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        type: 'INTERNAL',
        quantity: 5,
        laborCost: 10000,
        consumptions: [{ rawMaterialId: materialId, quantityUsed: 20 }], // 20m × 2,000 = 40,000
        stages: [{ name: 'Coupe' }, { name: 'Couture' }],
        ...overrides,
      })
      .expect(201);
    return res.body.data.id;
  };

  describe('Create', () => {
    it('creates a PLANNED order with consumptions + stages', async () => {
      const res = await request(server)
        .post('/api/v1/production-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          type: 'INTERNAL',
          quantity: 5,
          laborCost: 10000,
          consumptions: [{ rawMaterialId: materialId, quantityUsed: 20 }],
          stages: [{ name: 'Coupe' }, { name: 'Couture' }],
        })
        .expect(201);
      expect(res.body.data.status).toBe('PLANNED');
      expect(res.body.data.materialConsumptions).toHaveLength(1);
      expect(res.body.data.stages).toHaveLength(2);
    });

    it('rejects unknown product (400)', async () => {
      await request(server)
        .post('/api/v1/production-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          type: 'INTERNAL',
          quantity: 1,
          consumptions: [{ rawMaterialId: materialId, quantityUsed: 1 }],
        })
        .expect(400);
    });
  });

  describe('Start (consume materials)', () => {
    it('decrements raw material stock', async () => {
      const before = Number(
        (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialId } })).stockQty,
      );
      const id = await createOrder();
      await request(server)
        .post(`/api/v1/production-orders/${id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const after = Number(
        (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialId } })).stockQty,
      );
      expect(before - after).toBe(20);
    });

    it('rejects start with insufficient material (400)', async () => {
      const id = await createOrder({ consumptions: [{ rawMaterialId: materialId, quantityUsed: 100000 }] });
      await request(server)
        .post(`/api/v1/production-orders/${id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Complete (costPrice + finished stock + EXPENSE)', () => {
    it('recomputes costPrice, restocks finished variant, books labour EXPENSE', async () => {
      const id = await createOrder({ quantity: 5, laborCost: 10000 });
      await request(server)
        .post(`/api/v1/production-orders/${id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const variantBefore = Number(
        (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock,
      );

      await request(server)
        .post(`/api/v1/production-orders/${id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // costPrice = (20×2000 + 10000 labour) / 5 = 50000/5 = 10000
      const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      expect(Number(product.costPrice)).toBe(10000);

      // finished stock +5
      const variantAfter = Number(
        (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock,
      );
      expect(variantAfter - variantBefore).toBe(5);

      // labour EXPENSE / SALARY booked
      const tx = await prisma.transaction.findFirst({
        where: { productionOrderId: id, category: 'SALARY' },
      });
      expect(tx).toBeTruthy();
      expect(Number(tx!.amount)).toBe(10000);

      // PRODUCTION_IN movement booked
      const move = await prisma.stockMovement.findFirst({
        where: { productionOrderId: id, type: 'PRODUCTION_IN' },
      });
      expect(move).toBeTruthy();
      expect(move!.quantity).toBe(5);
    });

    it('cannot complete a PLANNED order (400)', async () => {
      const id = await createOrder();
      await request(server)
        .post(`/api/v1/production-orders/${id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Cancel', () => {
    it('cancel IN_PROGRESS restocks consumed materials', async () => {
      const id = await createOrder({ consumptions: [{ rawMaterialId: materialId, quantityUsed: 10 }] });
      await request(server)
        .post(`/api/v1/production-orders/${id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const afterStart = Number(
        (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialId } })).stockQty,
      );
      await request(server)
        .post(`/api/v1/production-orders/${id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const afterCancel = Number(
        (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialId } })).stockQty,
      );
      expect(afterCancel - afterStart).toBe(10);
    });

    it('cannot cancel a COMPLETED order (400)', async () => {
      const id = await createOrder({ consumptions: [{ rawMaterialId: materialId, quantityUsed: 5 }] });
      await request(server)
        .post(`/api/v1/production-orders/${id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(server)
        .post(`/api/v1/production-orders/${id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(server)
        .post(`/api/v1/production-orders/${id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('List', () => {
    it('filters by status + product', async () => {
      const res = await request(server)
        .get(`/api/v1/production-orders?productId=${productId}&status=PLANNED&pageSize=50`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ status: string }>;
      expect(rows.every((r) => r.status === 'PLANNED')).toBe(true);
    });
  });
});
