import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';

const SUITE_TAG = `e2e-promo-${Date.now()}`;
const CODE_BASE = `SEED${Date.now().toString().slice(-6)}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('PromoCodes (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
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

    await prisma.promoCode.deleteMany({ where: { code: { startsWith: CODE_BASE } } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    // Cart fixture for the cart preview tests.
    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    categoryId = cat.id;
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 10000,
        floorPrice: 8000,
        productionType: 'INTERNAL',
        categoryId,
      },
    });
    productId = product.id;
    const variant = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 5 },
    });
    variantId = variant.id;

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const clientSignup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Client', password: PASSWORD })
      .expect(201);
    clientToken = clientSignup.body.data.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.promoCode.deleteMany({ where: { code: { startsWith: CODE_BASE } } });
    await app?.close();
  });

  describe('Admin CRUD', () => {
    let codeId = '';

    it('POST requires auth (401)', async () => {
      await request(server)
        .post('/api/v1/promo-codes')
        .send({ code: `${CODE_BASE}_X`, type: 'PERCENTAGE', value: 10 })
        .expect(401);
    });

    it('POST as a client is forbidden (403)', async () => {
      await request(server)
        .post('/api/v1/promo-codes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_C`, type: 'PERCENTAGE', value: 10 })
        .expect(403);
    });

    it('POST creates a percentage code (admin)', async () => {
      const res = await request(server)
        .post('/api/v1/promo-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `${CODE_BASE}_W10`,
          type: 'PERCENTAGE',
          value: 10,
          minOrderAmount: 5000,
        })
        .expect(201);
      expect(res.body.data.code).toBe(`${CODE_BASE}_W10`); // upper-cased
      codeId = res.body.data.id;
    });

    it('POST rejects duplicate code (409)', async () => {
      await request(server)
        .post('/api/v1/promo-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: `${CODE_BASE}_W10`, type: 'PERCENTAGE', value: 5 })
        .expect(409);
    });

    it('POST rejects PERCENTAGE value > 100 (400)', async () => {
      await request(server)
        .post('/api/v1/promo-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: `${CODE_BASE}_BAD`, type: 'PERCENTAGE', value: 150 })
        .expect(400);
    });

    it('POST rejects start >= expiry (400)', async () => {
      await request(server)
        .post('/api/v1/promo-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `${CODE_BASE}_BAD2`,
          type: 'FIXED',
          value: 1000,
          startsAt: '2026-12-31T00:00:00Z',
          expiresAt: '2026-01-01T00:00:00Z',
        })
        .expect(400);
    });

    it('PATCH cannot change the code string (whitelist strips it)', async () => {
      await request(server)
        .patch(`/api/v1/promo-codes/${codeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'OTHER' })
        .expect(400);
    });

    it('PATCH updates value + isActive', async () => {
      const res = await request(server)
        .patch(`/api/v1/promo-codes/${codeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 15, isActive: false })
        .expect(200);
      expect(Number(res.body.data.value)).toBe(15);
      expect(res.body.data.isActive).toBe(false);
    });

    it('GET list as admin returns the code', async () => {
      const res = await request(server)
        .get(`/api/v1/promo-codes?search=${CODE_BASE}_W10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const codes = (res.body.data.data as Array<{ code: string }>).map((p) => p.code);
      expect(codes).toContain(`${CODE_BASE}_W10`);
    });

    it('DELETE removes the code (no order references)', async () => {
      await request(server)
        .delete(`/api/v1/promo-codes/${codeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Cart apply-promo (stateless validation)', () => {
    it('Inactive code → 400 invalid_promo_code (key mapped fr/en)', async () => {
      await prisma.promoCode.create({
        data: { code: `${CODE_BASE}_INACTIVE`, type: 'PERCENTAGE', value: 10, isActive: false },
      });
      // Need a cart subtotal > 0 for the request to be meaningful — add an item.
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId, quantity: 2 }) // 2 × 10000 = 20000
        .expect(201);

      const res = await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept-Language', 'fr')
        .send({ code: `${CODE_BASE}_INACTIVE` })
        .expect(400);
      expect(res.body.message).toMatch(/Code promo invalide/);
    });

    it('Valid PERCENTAGE code returns discount + subtotalAfter', async () => {
      await prisma.promoCode.create({
        data: {
          code: `${CODE_BASE}_PCT20`,
          type: 'PERCENTAGE',
          value: 20,
        },
      });
      const res = await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE.toLowerCase()}_pct20` }) // upper-cased server-side
        .expect(201);
      expect(res.body.data.code).toBe(`${CODE_BASE}_PCT20`);
      expect(res.body.data.discount).toBe('4000.00'); // 20% of 20000
      expect(res.body.data.subtotalAfter).toBe('16000.00');
    });

    it('FIXED code capped at subtotal (never negative total)', async () => {
      await prisma.promoCode.create({
        data: {
          code: `${CODE_BASE}_FIXED_HUGE`,
          type: 'FIXED',
          value: 50000, // > subtotal of 20000
        },
      });
      const res = await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_FIXED_HUGE` })
        .expect(201);
      expect(res.body.data.discount).toBe('20000.00'); // capped
      expect(res.body.data.subtotalAfter).toBe('0.00');
    });

    it('minOrderAmount not met → 400 promo_code_min_order', async () => {
      await prisma.promoCode.create({
        data: {
          code: `${CODE_BASE}_MIN`,
          type: 'PERCENTAGE',
          value: 10,
          minOrderAmount: 100_000,
        },
      });
      await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_MIN` })
        .expect(400);
    });

    it('expiresAt in the past → 400', async () => {
      await prisma.promoCode.create({
        data: {
          code: `${CODE_BASE}_EXPIRED`,
          type: 'PERCENTAGE',
          value: 10,
          expiresAt: new Date('2020-01-01T00:00:00Z'),
        },
      });
      await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_EXPIRED` })
        .expect(400);
    });

    it('maxUses reached → 400 promo_code_exhausted', async () => {
      await prisma.promoCode.create({
        data: {
          code: `${CODE_BASE}_FULL`,
          type: 'PERCENTAGE',
          value: 10,
          maxUses: 5,
          usedCount: 5,
        },
      });
      await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_FULL` })
        .expect(400);
    });

    it('Unknown code → 400 invalid_promo_code', async () => {
      await request(server)
        .post('/api/v1/me/cart/apply-promo')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ code: `${CODE_BASE}_NEVER` })
        .expect(400);
    });
  });
});
