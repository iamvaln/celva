import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const SUITE_TAG = `e2e-cart-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const OTHER_EMAIL = `other-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Cart + Wishlist (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let clientToken = '';
  let otherToken = '';
  let categoryId = '';
  let productId = '';
  let variantA = ''; // stock 5
  let variantB = ''; // stock 1

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

    await prisma.user.deleteMany({ where: { email: { in: [CLIENT_EMAIL, OTHER_EMAIL] } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    // Fixture: 1 category, 1 product, 2 variants with different stock levels.
    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    categoryId = cat.id;

    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 25000,
        floorPrice: 20000,
        productionType: 'INTERNAL',
        categoryId,
      },
    });
    productId = product.id;

    const a = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 5 },
    });
    const b = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-B`, productId, stock: 1 },
    });
    variantA = a.id;
    variantB = b.id;

    // Sign up two clients via the public endpoint (carts auto-created).
    const client = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Client', password: PASSWORD })
      .expect(201);
    clientToken = client.body.data.accessToken;

    const other = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: OTHER_EMAIL, name: 'Other', password: PASSWORD })
      .expect(201);
    otherToken = other.body.data.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [CLIENT_EMAIL, OTHER_EMAIL] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    // Users → cascades Cart → CartItem. Variants then have no FK refs (WishlistItem cascades from variant).
    await prisma.user.deleteMany({ where: { email: { in: [CLIENT_EMAIL, OTHER_EMAIL] } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  describe('/me/cart', () => {
    let firstItemId = '';

    it('GET requires auth (401)', async () => {
      await request(server).get('/api/v1/me/cart').expect(401);
    });

    it('GET on a fresh user returns an empty cart', async () => {
      const res = await request(server)
        .get('/api/v1/me/cart')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.itemsCount).toBe(0);
      expect(res.body.data.total).toBe('0.00');
    });

    it('POST /items adds a variant and returns hydrated totals', async () => {
      const res = await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA, quantity: 2 })
        .expect(201);
      const cart = res.body.data;
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].unitPrice).toBe('25000.00');
      expect(cart.items[0].lineTotal).toBe('50000.00');
      expect(cart.itemsCount).toBe(2);
      expect(cart.total).toBe('50000.00');
      firstItemId = cart.items[0].id;
    });

    it('POST /items adding the same variant increments the existing line', async () => {
      const res = await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA, quantity: 1 })
        .expect(201);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(3);
    });

    it('POST /items rejects when quantity would exceed stock', async () => {
      // variantA has stock 5, cart already has 3 — adding 3 more would hit 6
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA, quantity: 3 })
        .expect(400);
    });

    it('POST /items can add a different variant as a new line', async () => {
      const res = await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantB, quantity: 1 })
        .expect(201);
      expect(res.body.data.items.length).toBe(2);
    });

    it('POST /items rejects an unknown variantId (400)', async () => {
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        })
        .expect(400);
    });

    it('PATCH /items/:id sets absolute quantity', async () => {
      const res = await request(server)
        .patch(`/api/v1/me/cart/items/${firstItemId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ quantity: 5 })
        .expect(200);
      const line = (res.body.data.items as Array<{ id: string; quantity: number }>).find(
        (i) => i.id === firstItemId,
      );
      expect(line?.quantity).toBe(5);
    });

    it('PATCH /items/:id 0 removes the line', async () => {
      const res = await request(server)
        .patch(`/api/v1/me/cart/items/${firstItemId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ quantity: 0 })
        .expect(200);
      expect(res.body.data.items.length).toBe(1); // only the B variant left
    });

    it('Another user cannot manipulate this cart\'s items (403)', async () => {
      // Add a fresh item to the original client's cart
      const seed = await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA, quantity: 1 })
        .expect(201);
      const fresh = (seed.body.data.items as Array<{ id: string; variantId: string }>).find(
        (i) => i.variantId === variantA,
      )!;

      await request(server)
        .patch(`/api/v1/me/cart/items/${fresh.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ quantity: 1 })
        .expect(403);
    });

    it('DELETE /me/cart empties the whole cart', async () => {
      const res = await request(server)
        .delete('/api/v1/me/cart')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe('0.00');
    });
  });

  describe('/me/wishlist', () => {
    it('GET on a fresh user returns []', async () => {
      const res = await request(server)
        .get('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('POST adds a variant', async () => {
      const res = await request(server)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA })
        .expect(201);
      expect(res.body.data.variantId).toBe(variantA);
    });

    it('POST adding the same variant twice returns 409', async () => {
      await request(server)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: variantA })
        .expect(409);
    });

    it('POST rejects unknown variantId (400)', async () => {
      await request(server)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('GET lists the wishlisted variant', async () => {
      const res = await request(server)
        .get('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].variantId).toBe(variantA);
    });

    it('Two users have isolated wishlists', async () => {
      await request(server)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ variantId: variantB })
        .expect(201);
      const res = await request(server)
        .get('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].variantId).toBe(variantB);
    });

    it('DELETE /:variantId removes it; second DELETE 404s', async () => {
      await request(server)
        .delete(`/api/v1/me/wishlist/${variantA}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(204);
      await request(server)
        .delete(`/api/v1/me/wishlist/${variantA}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);
    });
  });
});
