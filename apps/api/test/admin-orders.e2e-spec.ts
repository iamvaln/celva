import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-aord-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Admin order management (spec §7.4 + §7.5):
 *   - listForAdmin: filters, search, pagination
 *   - findByIdForAdmin: full hydration
 *   - transitionStatus: lifecycle validation
 *   - cancel: atomic — Order → CANCELLED, stock restored, promo decremented
 */
describe('Admin Orders (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let zoneId = '';
  let pickupId = '';
  let promoCodeId = '';

  const promoLabel = `${SUITE_TAG}-PROMO`.toUpperCase();

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

    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });
    await prisma.pickupPoint.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });
    await prisma.promoCode.deleteMany({ where: { code: promoLabel } });

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
    const point = await prisma.pickupPoint.create({
      data: {
        name: { fr: `${SUITE_TAG} Bonapriso`, en: `${SUITE_TAG} Bonapriso` },
        address: 'Bonapriso, Douala',
        city: 'Douala',
      },
    });
    pickupId = point.id;

    const promo = await prisma.promoCode.create({
      data: {
        code: promoLabel,
        type: 'PERCENTAGE',
        value: 10,
        maxUses: 100,
      },
    });
    promoCodeId = promo.id;

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const clientSignup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Client Admin Test', password: PASSWORD })
      .expect(201);
    clientToken = clientSignup.body.data.accessToken;
  });

  const addToCart = async (qty: number): Promise<void> => {
    await request(server)
      .post('/api/v1/me/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ variantId, quantity: qty })
      .expect(201);
  };

  const placeCashOrder = async (): Promise<{ id: string; orderNumber: string }> => {
    await addToCart(1);
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
    return { id: res.body.data.id, orderNumber: res.body.data.orderNumber };
  };

  const placePendingMomoOrder = async (): Promise<{ id: string; orderNumber: string }> => {
    await addToCart(1);
    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'MTN_MOMO',
        paymentPhoneNumber: '+237677999888',
      })
      .expect(201);
    return { id: res.body.data.id, orderNumber: res.body.data.orderNumber };
  };

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
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
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.promoCode.deleteMany({ where: { id: promoCodeId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({ where: { id: zoneId } });
    await prisma.pickupPoint.deleteMany({ where: { id: pickupId } });
    await app?.close();
  });

  describe('Guards', () => {
    it('GET /orders requires auth (401)', async () => {
      await request(server).get('/api/v1/orders').expect(401);
    });

    it('GET /orders as client → 403', async () => {
      await request(server)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('GET /orders (list + filters)', () => {
    let cashOrder: { id: string; orderNumber: string };
    let momoOrder: { id: string; orderNumber: string };

    beforeAll(async () => {
      cashOrder = await placeCashOrder();
      momoOrder = await placePendingMomoOrder();
    });

    it('lists orders for admin (paginated envelope)', async () => {
      const res = await request(server)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data as {
        data: Array<{ id: string; status: string; user: { email: string } }>;
        total: number;
        page: number;
        pageSize: number;
      };
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.total).toBeGreaterThanOrEqual(2);
      const ids = body.data.map((o) => o.id);
      expect(ids).toContain(cashOrder.id);
      expect(ids).toContain(momoOrder.id);
    });

    it('filters by status=PENDING', async () => {
      const res = await request(server)
        .get('/api/v1/orders?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ id: string; status: string }>;
      expect(rows.every((o) => o.status === 'PENDING')).toBe(true);
      expect(rows.map((o) => o.id)).toContain(momoOrder.id);
      expect(rows.map((o) => o.id)).not.toContain(cashOrder.id);
    });

    it('search by orderNumber finds the order', async () => {
      const res = await request(server)
        .get(`/api/v1/orders?search=${cashOrder.orderNumber}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ id: string }>;
      expect(rows.map((o) => o.id)).toContain(cashOrder.id);
    });

    it('search by client email matches', async () => {
      const res = await request(server)
        .get(`/api/v1/orders?search=${encodeURIComponent(CLIENT_EMAIL)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ id: string; user: { email: string } }>;
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.every((o) => o.user.email === CLIENT_EMAIL)).toBe(true);
    });
  });

  describe('GET /orders/:id (detail)', () => {
    it('returns full hydration (items, payment, delivery, user)', async () => {
      const order = await placeCashOrder();
      const res = await request(server)
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data as {
        items: Array<{ variant: { product: { id: string } } }>;
        payment: { method: string };
        delivery: { mode: string };
        user: { email: string };
      };
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.items[0]!.variant.product.id).toBe(productId);
      expect(data.payment.method).toBe('CASH_ON_DELIVERY');
      expect(data.delivery.mode).toBe('HOME_DELIVERY');
      expect(data.user.email).toBe(CLIENT_EMAIL);
    });

    it('404 for unknown id', async () => {
      await request(server)
        .get('/api/v1/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /orders/:id/transition', () => {
    it('PENDING → CONFIRMED is allowed', async () => {
      const order = await placePendingMomoOrder();
      const res = await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('PENDING → READY is rejected (invalid_order_transition)', async () => {
      const order = await placePendingMomoOrder();
      const res = await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY' })
        .expect(400);
      expect(res.body.message).toBeTruthy();
    });

    it('rejects terminal orders (order_terminal)', async () => {
      const order = await placeCashOrder();
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(400);
    });

    it('rejects CANCELLED in body (whitelist via DTO → 400)', async () => {
      const order = await placeCashOrder();
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(400);
    });

    it('client cannot transition (403)', async () => {
      const order = await placePendingMomoOrder();
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('cancels CONFIRMED order, restores stock, decrements promo', async () => {
      // Place an order with a promo applied. Use cash so it lands at CONFIRMED.
      await addToCart(2);
      const place = await request(server)
        .post('/api/v1/me/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          deliveryMode: 'HOME_DELIVERY',
          deliveryZoneId: zoneId,
          shippingAddress: 'rue promo',
          shippingCity: 'Douala',
          shippingPhone: '+237698123456',
          paymentMethod: 'CASH_ON_DELIVERY',
          promoCode: promoLabel,
        })
        .expect(201);

      const orderId = place.body.data.id as string;
      const variantBefore = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      const promoBefore = await prisma.promoCode.findUniqueOrThrow({
        where: { id: promoCodeId },
      });
      expect(promoBefore.usedCount).toBeGreaterThanOrEqual(1);

      const res = await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer changed their mind' })
        .expect(200);
      expect(res.body.data.status).toBe('CANCELLED');

      // Stock restored on the variant
      const variantAfter = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      expect(variantAfter.stock).toBe(variantBefore.stock + 2);

      // CANCELLATION_RETURN movement booked
      const ret = await prisma.stockMovement.findFirst({
        where: { orderId, type: 'CANCELLATION_RETURN' },
      });
      expect(ret).toBeTruthy();
      expect(ret?.quantity).toBe(2);

      // Promo usedCount decremented
      const promoAfter = await prisma.promoCode.findUniqueOrThrow({
        where: { id: promoCodeId },
      });
      expect(promoAfter.usedCount).toBe(promoBefore.usedCount - 1);
    });

    it('double-cancel → 400 order_already_cancelled', async () => {
      const order = await placeCashOrder();
      await request(server)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(server)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('cancel after SHIPPED → 400 order_too_late_to_cancel', async () => {
      const order = await placeCashOrder();
      await prisma.order.update({ where: { id: order.id }, data: { status: 'SHIPPED' } });
      await request(server)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('client cannot cancel via admin route (403)', async () => {
      const order = await placeCashOrder();
      await request(server)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('POST /me/orders/:id/cancel (customer self-cancel)', () => {
    it('cancels a PENDING order and restores stock', async () => {
      const order = await placePendingMomoOrder();
      const variantBefore = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      const res = await request(server)
        .post(`/api/v1/me/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Wrong size' })
        .expect(200);
      expect(res.body.data.status).toBe('CANCELLED');
      const variantAfter = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      expect(variantAfter.stock).toBe(variantBefore.stock + 1);
    });

    it('cannot cancel a CONFIRMED order (cash) → 400 order_customer_cancel_too_late', async () => {
      const order = await placeCashOrder(); // cash → starts CONFIRMED
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(400);
    });

    it("another user's cancel → 403", async () => {
      const order = await placePendingMomoOrder();
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('anon cancel → 401', async () => {
      const order = await placePendingMomoOrder();
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/cancel`)
        .expect(401);
    });
  });
});
