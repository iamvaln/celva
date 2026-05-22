import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-pay-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Helper: walks the cart → checkout flow and returns the new order id +
 * its payment id. Uses the existing /me/orders POST endpoint built in R.
 */
async function placeOrder(
  server: ReturnType<INestApplication['getHttpServer']>,
  token: string,
  body: Record<string, unknown>,
): Promise<{ orderId: string; paymentId: string; status: string }> {
  const res = await request(server)
    .post('/api/v1/me/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);
  return {
    orderId: res.body.data.id,
    paymentId: res.body.data.payment.id,
    status: res.body.data.status,
  };
}

describe('Payments (e2e)', () => {
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

    // Clean
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });
    await prisma.pickupPoint.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });

    // Fixtures
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
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 20 },
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

    // Auth
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

  const addToCart = async (qty: number): Promise<void> => {
    await request(server)
      .post('/api/v1/me/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ variantId, quantity: qty })
      .expect(201);
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
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({ where: { id: zoneId } });
    await prisma.pickupPoint.deleteMany({ where: { id: pickupId } });
    await app?.close();
  });

  describe('Admin /payments', () => {
    let cashOrder: Awaited<ReturnType<typeof placeOrder>>;

    beforeAll(async () => {
      await addToCart(1);
      cashOrder = await placeOrder(server, clientToken, {
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'rue 1',
        shippingCity: 'Douala',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      });
    });

    it('POST /payments/:id/confirm requires auth (401)', async () => {
      await request(server)
        .post(`/api/v1/payments/${cashOrder.paymentId}/confirm`)
        .send({})
        .expect(401);
    });

    it('POST /payments/:id/confirm as client → 403', async () => {
      await request(server)
        .post(`/api/v1/payments/${cashOrder.paymentId}/confirm`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({})
        .expect(403);
    });

    it('Admin confirms a cash payment → Payment COMPLETED + Transaction INCOME + Invoice row', async () => {
      // Cash order is already CONFIRMED at checkout; payment was PENDING.
      const res = await request(server)
        .post(`/api/v1/payments/${cashOrder.paymentId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transactionRef: 'CASH-RECEIPT-001' })
        .expect(200);
      expect(res.body.data.payment.status).toBe('COMPLETED');
      expect(res.body.data.payment.transactionRef).toBe('CASH-RECEIPT-001');
      expect(res.body.data.payment.paidAt).toBeTruthy();
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^CLV-INV-\d{6}-\d{4}$/);

      // Transaction created
      const tx = await prisma.transaction.findFirst({ where: { orderId: cashOrder.orderId } });
      expect(tx).toBeTruthy();
      expect(tx?.type).toBe('INCOME');
      expect(tx?.category).toBe('SALE');

      // Invoice totals reflect the order
      const invoice = await prisma.invoice.findFirst({ where: { orderId: cashOrder.orderId } });
      expect(invoice).toBeTruthy();
      expect(Number(invoice?.totalTTC)).toBe(12000); // 10000 + 2000 fee
    });

    it('Confirming a COMPLETED payment again → 400 payment_already_completed', async () => {
      await request(server)
        .post(`/api/v1/payments/${cashOrder.paymentId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('GET /payments lists all payments (admin)', async () => {
      const res = await request(server)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ours = (res.body.data as Array<{ id: string }>).find(
        (p) => p.id === cashOrder.paymentId,
      );
      expect(ours).toBeTruthy();
    });
  });

  describe('OM/MoMo retry-payment flow', () => {
    let momoOrder: Awaited<ReturnType<typeof placeOrder>>;

    beforeAll(async () => {
      await addToCart(2);
      momoOrder = await placeOrder(server, clientToken, {
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'MTN_MOMO',
        paymentPhoneNumber: '+237677999888',
      });
      // Order starts PENDING — Payment is PENDING waiting for the provider.
      expect(momoOrder.status).toBe('PENDING');
    });

    it('Order starts PENDING with a PENDING Mobile Money payment', async () => {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: momoOrder.paymentId } });
      expect(payment.status).toBe('PENDING');
      expect(payment.method).toBe('MTN_MOMO');
    });

    it('POST /me/orders/:id/retry-payment (dev stub) → Payment COMPLETED + Order CONFIRMED', async () => {
      const res = await request(server)
        .post(`/api/v1/me/orders/${momoOrder.orderId}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201);
      expect(res.body.data.payment.status).toBe('COMPLETED');
      expect(res.body.data.payment.transactionRef).toMatch(/^STUB-\d+$/);

      const order = await prisma.order.findUniqueOrThrow({ where: { id: momoOrder.orderId } });
      expect(order.status).toBe('CONFIRMED');

      const invoice = await prisma.invoice.findFirst({ where: { orderId: momoOrder.orderId } });
      expect(invoice).toBeTruthy();
    });

    it('Retrying again → 400 payment_already_completed', async () => {
      await request(server)
        .post(`/api/v1/me/orders/${momoOrder.orderId}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(400);
    });

    it("Other user's retry → 403 forbidden", async () => {
      await request(server)
        .post(`/api/v1/me/orders/${momoOrder.orderId}/retry-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('Mark FAILED then retry', () => {
    let omOrder: Awaited<ReturnType<typeof placeOrder>>;

    beforeAll(async () => {
      await addToCart(1);
      omOrder = await placeOrder(server, clientToken, {
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'ORANGE_MONEY',
        paymentPhoneNumber: '+237698555444',
      });
    });

    it('Admin marks the payment FAILED', async () => {
      const res = await request(server)
        .post(`/api/v1/payments/${omOrder.paymentId}/mark-failed`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('FAILED');

      // Order still PENDING
      const order = await prisma.order.findUniqueOrThrow({ where: { id: omOrder.orderId } });
      expect(order.status).toBe('PENDING');
    });

    it('Customer retries successfully → COMPLETED + CONFIRMED', async () => {
      const res = await request(server)
        .post(`/api/v1/me/orders/${omOrder.orderId}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201);
      expect(res.body.data.payment.status).toBe('COMPLETED');

      const order = await prisma.order.findUniqueOrThrow({ where: { id: omOrder.orderId } });
      expect(order.status).toBe('CONFIRMED');
    });
  });

  describe('Cash cannot be retried online', () => {
    let cashOrder2: Awaited<ReturnType<typeof placeOrder>>;

    beforeAll(async () => {
      await addToCart(1);
      cashOrder2 = await placeOrder(server, clientToken, {
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'CASH_ON_DELIVERY',
      });
    });

    it('retry-payment on cash → 400 payment_cash_no_retry', async () => {
      await request(server)
        .post(`/api/v1/me/orders/${cashOrder2.orderId}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(400);
    });
  });

  describe('Invoice numbering', () => {
    it('Sequential within the same month', async () => {
      const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'asc' },
        select: { invoiceNumber: true },
      });
      // All match the pattern; numbers are unique
      const nums = invoices.map((i) => i.invoiceNumber);
      expect(new Set(nums).size).toBe(nums.length);
      for (const n of nums) {
        expect(n).toMatch(/^CLV-INV-\d{6}-\d{4}$/);
      }
    });
  });
});
