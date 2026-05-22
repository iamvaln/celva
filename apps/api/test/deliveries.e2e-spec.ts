import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-deliv-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const OTHER_EMAIL = `other-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Deliveries (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let otherToken = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let zoneId = '';

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
    await prisma.deliveryZone.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });

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
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 30 },
    });
    variantId = variant.id;
    const zone = await prisma.deliveryZone.create({
      data: {
        name: { fr: `${SUITE_TAG} Douala`, en: `${SUITE_TAG} Douala` },
        fee: 2000,
        actualCost: 1500,
      },
    });
    zoneId = zone.id;

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const clientSignup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Deliv Client', password: PASSWORD })
      .expect(201);
    clientToken = clientSignup.body.data.accessToken;

    const otherSignup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: OTHER_EMAIL, name: 'Other Client', password: PASSWORD })
      .expect(201);
    otherToken = otherSignup.body.data.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [CLIENT_EMAIL, OTHER_EMAIL] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      await prisma.stockMovement.deleteMany({ where: { variantId } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { in: [CLIENT_EMAIL, OTHER_EMAIL] } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({ where: { id: zoneId } });
    await app?.close();
  });

  const placeOrder = async (): Promise<{
    orderId: string;
    orderNumber: string;
    deliveryId: string;
  }> => {
    await request(server)
      .post('/api/v1/me/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'rue 1',
        shippingCity: 'Douala',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(201);
    return {
      orderId: res.body.data.id,
      orderNumber: res.body.data.orderNumber,
      deliveryId: res.body.data.delivery.id,
    };
  };

  describe('GET /deliveries (list)', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/deliveries').expect(401);
    });

    it('403 client', async () => {
      await request(server)
        .get('/api/v1/deliveries')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('admin gets paginated list', async () => {
      await placeOrder();
      const res = await request(server)
        .get('/api/v1/deliveries')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data as { data: unknown[]; total: number; page: number; pageSize: number };
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('filters by status=PENDING', async () => {
      const res = await request(server)
        .get('/api/v1/deliveries?status=PENDING&pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ status: string }>;
      expect(rows.every((r) => r.status === 'PENDING')).toBe(true);
    });

    it('search by orderNumber', async () => {
      const order = await placeOrder();
      const res = await request(server)
        .get(`/api/v1/deliveries?search=${order.orderNumber}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ id: string }>;
      expect(rows.map((r) => r.id)).toContain(order.deliveryId);
    });
  });

  describe('GET /deliveries/:id', () => {
    it('returns full hydration including order + user + pickup point', async () => {
      const order = await placeOrder();
      const res = await request(server)
        .get(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const d = res.body.data as {
        id: string;
        order: { orderNumber: string; user: { email: string } };
      };
      expect(d.id).toBe(order.deliveryId);
      expect(d.order.orderNumber).toBe(order.orderNumber);
      expect(d.order.user.email).toBe(CLIENT_EMAIL);
    });

    it('404 unknown id', async () => {
      await request(server)
        .get('/api/v1/deliveries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /deliveries/:id/transition', () => {
    it('PENDING → ASSIGNED sets assignedAt + trackingNote', async () => {
      const order = await placeOrder();
      const res = await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ASSIGNED', trackingNote: 'Coursier: Aïcha +237 698 000 000' })
        .expect(200);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.assignedAt).toBeTruthy();
      expect(res.body.data.trackingNote).toContain('Aïcha');
    });

    it('ASSIGNED → PICKED_UP sets pickedUpAt + auto-syncs Order → SHIPPED', async () => {
      const order = await placeOrder();
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ASSIGNED' })
        .expect(200);
      const res = await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PICKED_UP' })
        .expect(200);
      expect(res.body.data.status).toBe('PICKED_UP');
      expect(res.body.data.pickedUpAt).toBeTruthy();

      const ord = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
      expect(ord.status).toBe('SHIPPED');
    });

    it('PICKED_UP → DELIVERED sets deliveredAt + auto-syncs Order → DELIVERED', async () => {
      const order = await placeOrder();
      for (const status of ['ASSIGNED', 'PICKED_UP', 'DELIVERED']) {
        await request(server)
          .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status })
          .expect(200);
      }
      const ord = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
      expect(ord.status).toBe('DELIVERED');
    });

    it('PENDING → DELIVERED (skipping intermediate) is rejected (400)', async () => {
      const order = await placeOrder();
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' })
        .expect(400);
    });

    it('any non-terminal → FAILED works', async () => {
      const order = await placeOrder();
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'FAILED', trackingNote: 'Adresse introuvable' })
        .expect(200);
    });

    it('does NOT sync to Order if order is already CANCELLED', async () => {
      const order = await placeOrder();
      // Manually cancel the order first via admin route
      await request(server)
        .post(`/api/v1/orders/${order.orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // Now walk delivery forward — order should stay CANCELLED.
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ASSIGNED' })
        .expect(200);
      // PICKED_UP is allowed on the delivery state machine but should NOT
      // resurrect the cancelled order.
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PICKED_UP' })
        .expect(200);
      const ord = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
      expect(ord.status).toBe('CANCELLED');
    });

    it('client cannot transition (403)', async () => {
      const order = await placeOrder();
      await request(server)
        .post(`/api/v1/deliveries/${order.deliveryId}/transition`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'ASSIGNED' })
        .expect(403);
    });
  });

  describe('PATCH /deliveries/:id', () => {
    it('updates actualCost + trackingNote', async () => {
      const order = await placeOrder();
      const res = await request(server)
        .patch(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actualCost: 1750, trackingNote: 'Coursier: Bob' })
        .expect(200);
      expect(Number(res.body.data.actualCost)).toBe(1750);
      expect(res.body.data.trackingNote).toBe('Coursier: Bob');
    });

    it('empty trackingNote clears it to null', async () => {
      const order = await placeOrder();
      await request(server)
        .patch(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trackingNote: 'Will be cleared' })
        .expect(200);
      const res = await request(server)
        .patch(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trackingNote: '' })
        .expect(200);
      expect(res.body.data.trackingNote).toBeNull();
    });

    it('rejects negative actualCost (400)', async () => {
      const order = await placeOrder();
      await request(server)
        .patch(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actualCost: -10 })
        .expect(400);
    });
  });

  describe('GET /me/orders/by-number/:orderNumber/delivery', () => {
    it('customer reads own delivery; actualCost is stripped', async () => {
      const order = await placeOrder();
      await request(server)
        .patch(`/api/v1/deliveries/${order.deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actualCost: 2000, trackingNote: 'Coursier: Marie' })
        .expect(200);
      const res = await request(server)
        .get(`/api/v1/me/orders/by-number/${order.orderNumber}/delivery`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(order.deliveryId);
      expect(res.body.data.trackingNote).toBe('Coursier: Marie');
      expect(res.body.data.actualCost).toBeUndefined();
    });

    it('another user gets 403', async () => {
      const order = await placeOrder();
      await request(server)
        .get(`/api/v1/me/orders/by-number/${order.orderNumber}/delivery`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('401 anon', async () => {
      const order = await placeOrder();
      await request(server)
        .get(`/api/v1/me/orders/by-number/${order.orderNumber}/delivery`)
        .expect(401);
    });
  });
});
