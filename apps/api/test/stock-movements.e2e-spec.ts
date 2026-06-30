import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { StockMovementsService } from '../src/modules/stock-movements/stock-movements.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-sm-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Stock movements (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let stockMovements: StockMovementsService;
  let adminToken = '';
  let clientToken = '';
  let adminUserId = '';
  let categoryId = '';
  let productId = '';
  let variantAId = '';
  let variantBId = '';

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
    stockMovements = app.get(StockMovementsService);

    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
    adminUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { email: ADMIN_EMAIL },
        select: { id: true },
      })
    ).id;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'SM client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;

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
    const va = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 0 },
    });
    const vb = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-B`, productId, stock: 0 },
    });
    variantAId = va.id;
    variantBId = vb.id;

    // Seed a handful of movements directly through the service so types
    // / signs are correct. Different timestamps via small delays.
    await stockMovements.apply({
      variantId: variantAId,
      quantity: 50,
      type: 'PURCHASE_IN',
      userId: adminUserId,
      reason: `${SUITE_TAG} purchase`,
    });
    await stockMovements.apply({
      variantId: variantAId,
      quantity: -3,
      type: 'SALE_OUT',
      userId: adminUserId,
    });
    await stockMovements.apply({
      variantId: variantBId,
      quantity: 10,
      type: 'MANUAL_ADJUSTMENT',
      userId: adminUserId,
      reason: `${SUITE_TAG} opening`,
    });
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({
      where: { variantId: { in: [variantAId, variantBId] } },
    });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await app?.close();
  });

  describe('Guards', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/stock-movements').expect(401);
    });

    it('403 client', async () => {
      await request(server)
        .get('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('GET /stock-movements', () => {
    it('returns paginated envelope hydrated with variant + product', async () => {
      const res = await request(server)
        .get(`/api/v1/stock-movements?variantId=${variantAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data as {
        data: Array<{ type: string; quantity: number; variant: { sku: string } }>;
        total: number;
      };
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(body.data.every((r) => r.variant.sku === `${SUITE_TAG}-A`)).toBe(true);
    });

    it('filters by type=SALE_OUT', async () => {
      const res = await request(server)
        .get(`/api/v1/stock-movements?type=SALE_OUT&variantId=${variantAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ type: string; quantity: number }>;
      expect(rows.every((r) => r.type === 'SALE_OUT')).toBe(true);
      expect(rows.every((r) => r.quantity < 0)).toBe(true);
    });

    it('search by SKU narrows results', async () => {
      const res = await request(server)
        .get(`/api/v1/stock-movements?search=${SUITE_TAG}-B`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ variant: { sku: string } }>;
      expect(rows.every((r) => r.variant.sku === `${SUITE_TAG}-B`)).toBe(true);
    });

    it('rejects unknown type (400)', async () => {
      await request(server)
        .get('/api/v1/stock-movements?type=BOGUS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /stock-movements/summary', () => {
    it('returns per-type signed totals across all movements', async () => {
      const res = await request(server)
        .get('/api/v1/stock-movements/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data as Array<{
        type: string;
        total: number;
        count: number;
      }>;
      const sale = rows.find((r) => r.type === 'SALE_OUT');
      const purchase = rows.find((r) => r.type === 'PURCHASE_IN');
      expect(sale?.total).toBeLessThan(0);
      expect(purchase?.total).toBeGreaterThan(0);
    });
  });
});
