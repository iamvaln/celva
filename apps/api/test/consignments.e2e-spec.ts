import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-cons-${Date.now()}`;

describe('Consignments (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let salesRepId = '';
  let categoryId = '';
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

    await prisma.user.deleteMany({ where: { email: { startsWith: SUITE_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    categoryId = cat.id;
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 10_000,
        floorPrice: 8_000,
        productionType: 'INTERNAL',
        categoryId,
      },
    });
    productId = product.id;
    const variant = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 20 },
    });
    variantId = variant.id;

    const rep = await prisma.user.create({
      data: {
        email: `${SUITE_TAG}-rep@celva.test`,
        name: 'Sales Rep',
        passwordHash: 'x',
        role: 'SALES_REP',
      },
    });
    salesRepId = rep.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: SUITE_TAG } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const consignments = await prisma.consignment.findMany({
      where: { salesRepId: { in: userIds } },
      select: { id: true },
    });
    const conIds = consignments.map((c) => c.id);
    if (conIds.length > 0) {
      await prisma.stockMovement.deleteMany({ where: { consignmentId: { in: conIds } } });
      await prisma.consignmentItem.deleteMany({ where: { consignmentId: { in: conIds } } });
      await prisma.consignment.deleteMany({ where: { id: { in: conIds } } });
    }
    await prisma.transaction.deleteMany({
      where: { description: { contains: SUITE_TAG } },
    });
    await prisma.stockMovement.deleteMany({ where: { variantId } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: SUITE_TAG } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  describe('Release', () => {
    it('decrements variant.stock + bumps consignedStock', async () => {
      const before = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      const res = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          salesRepId,
          notes: `${SUITE_TAG} pop-up Bonapriso`,
          items: [{ variantId, quantity: 5 }],
        })
        .expect(201);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.items).toHaveLength(1);
      const after = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      expect(after.stock).toBe(before.stock - 5);
      expect(after.consignedStock).toBe(before.consignedStock + 5);
    });

    it('refuses insufficient stock — atomic rollback', async () => {
      const before = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          salesRepId,
          items: [{ variantId, quantity: before.stock + 1000 }],
        })
        .expect(400);
      const after = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      expect(after.stock).toBe(before.stock);
    });

    it('rejects unknown salesRepId (400)', async () => {
      await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          salesRepId: '00000000-0000-0000-0000-000000000000',
          items: [{ variantId, quantity: 1 }],
        })
        .expect(400);
    });
  });

  describe('Reconcile', () => {
    it('sold + returned restores returned stock, records INCOME for sold, variance is audited', async () => {
      // Fresh consignment of 6 units.
      const release = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          salesRepId,
          notes: `${SUITE_TAG} reconcile test`,
          items: [{ variantId, quantity: 6 }],
        })
        .expect(201);
      const consignmentId = release.body.data.id;
      const itemId = release.body.data.items[0].id;
      const beforeStock = (
        await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })
      ).stock;

      // sold 3, returned 2, variance 1 (lost/damaged).
      const res = await request(server)
        .post(`/api/v1/consignments/${consignmentId}/reconcile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ id: itemId, quantitySold: 3, quantityReturned: 2 }],
        })
        .expect(200);
      expect(res.body.data.status).toBe('RECONCILED');
      expect(res.body.data.reconciledAt).toBeTruthy();

      // Stock: only the 2 returned came back.
      const after = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      expect(after.stock).toBe(beforeStock + 2);
      // consignedStock should be fully cleared for this batch.

      // INCOME transaction recorded for 3 × 10,000 = 30,000.
      const tx = await prisma.transaction.findFirst({
        where: {
          type: 'INCOME',
          category: 'SALE',
          description: { contains: consignmentId },
        },
      });
      expect(tx).toBeTruthy();
      expect(Number(tx!.amount)).toBe(30_000);

      // Audit trail: 1 CONSIGNMENT_RETURN for actual returns + 1 for
      // variance + 1 MANUAL_ADJUSTMENT for variance net-out.
      const moves = await prisma.stockMovement.findMany({
        where: { consignmentId, type: { in: ['CONSIGNMENT_RETURN', 'MANUAL_ADJUSTMENT'] } },
      });
      expect(moves.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects overflow (sold + returned > taken)', async () => {
      const release = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          salesRepId,
          items: [{ variantId, quantity: 2 }],
        })
        .expect(201);
      await request(server)
        .post(`/api/v1/consignments/${release.body.data.id}/reconcile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              id: release.body.data.items[0].id,
              quantitySold: 2,
              quantityReturned: 2,
            },
          ],
        })
        .expect(400);
    });

    it('refuses to reconcile twice', async () => {
      const release = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ salesRepId, items: [{ variantId, quantity: 1 }] })
        .expect(201);
      const id = release.body.data.id;
      const itemId = release.body.data.items[0].id;
      await request(server)
        .post(`/api/v1/consignments/${id}/reconcile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemId, quantitySold: 0, quantityReturned: 1 }] })
        .expect(200);
      await request(server)
        .post(`/api/v1/consignments/${id}/reconcile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemId, quantitySold: 0, quantityReturned: 1 }] })
        .expect(400);
    });
  });

  describe('Cancel', () => {
    it('cancel returns everything + status CANCELLED', async () => {
      const before = (
        await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })
      ).stock;
      const release = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ salesRepId, items: [{ variantId, quantity: 2 }] })
        .expect(201);
      const res = await request(server)
        .post(`/api/v1/consignments/${release.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('CANCELLED');
      const after = (
        await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })
      ).stock;
      expect(after).toBe(before); // net zero
    });

    it('cannot cancel a RECONCILED consignment', async () => {
      const release = await request(server)
        .post('/api/v1/consignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ salesRepId, items: [{ variantId, quantity: 1 }] })
        .expect(201);
      await request(server)
        .post(`/api/v1/consignments/${release.body.data.id}/reconcile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              id: release.body.data.items[0].id,
              quantitySold: 0,
              quantityReturned: 1,
            },
          ],
        })
        .expect(200);
      await request(server)
        .post(`/api/v1/consignments/${release.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Listing', () => {
    it('paginated list filters by status + salesRep', async () => {
      const res = await request(server)
        .get(`/api/v1/consignments?salesRepId=${salesRepId}&status=ACTIVE&pageSize=50`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ status: string; salesRepId: string }>;
      expect(rows.every((r) => r.status === 'ACTIVE')).toBe(true);
      expect(rows.every((r) => r.salesRepId === salesRepId)).toBe(true);
    });
  });
});
