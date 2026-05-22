import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-mail-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Transactional emails on the order lifecycle (Batch W). We override
 * MailService with a recorder so we can assert that the right template
 * fires at each lifecycle hop without hitting Mailgun.
 *
 * The dispatch is fire-and-forget — we await a microtask before assertions
 * to let the promise settle.
 */
describe('Order transactional emails (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let mailSpy: { sends: MailMessage[]; clear: () => void };
  let adminToken = '';
  let clientToken = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let zoneId = '';
  let pickupId = '';

  /**
   * Order emails are dispatched fire-and-forget and include a Prisma
   * round-trip inside the promise. We need to yield long enough for the
   * promise chain to settle before asserting on the spy.
   */
  const flush = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 150));
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    mailSpy = {
      sends: [],
      clear() {
        this.sends.length = 0;
      },
    };
    const mailMock: Partial<MailService> = {
      send: async (m: MailMessage) => {
        mailSpy.sends.push(m);
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();
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

    // Fixtures
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });
    await prisma.pickupPoint.deleteMany({
      where: { name: { path: ['fr'], string_contains: SUITE_TAG } },
    });

    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    categoryId = cat.id;
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: `${SUITE_TAG} Dress` },
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

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Email Test', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
    mailSpy.clear(); // drop the welcome email
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

  const placePendingMomoOrder = async (): Promise<{
    id: string;
    orderNumber: string;
    paymentId: string;
  }> => {
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
    return {
      id: res.body.data.id,
      orderNumber: res.body.data.orderNumber,
      paymentId: res.body.data.payment.id,
    };
  };

  afterEach(() => {
    mailSpy.clear();
  });

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

  describe('OrderConfirmation', () => {
    it('Cash order → confirmation email sent at checkout', async () => {
      const order = await placeCashOrder();
      await flush();
      const confirmation = mailSpy.sends.find((m) => m.tag === 'order_confirmation');
      expect(confirmation).toBeDefined();
      expect(confirmation?.to).toBe(CLIENT_EMAIL);
      expect(confirmation?.subject).toContain(order.orderNumber);
      // bilingual body present
      expect(confirmation?.text).toMatch(/confirmée/);
      expect(confirmation?.text).toMatch(/confirmed/);
    });

    it("MTN MoMo order: no confirmation at checkout (Order still PENDING)", async () => {
      await placePendingMomoOrder();
      await flush();
      expect(mailSpy.sends.filter((m) => m.tag === 'order_confirmation')).toHaveLength(0);
    });

    it('MTN MoMo → retry-payment promotes to CONFIRMED → confirmation email sent', async () => {
      const order = await placePendingMomoOrder();
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201);
      await flush();
      const confirmation = mailSpy.sends.find((m) => m.tag === 'order_confirmation');
      expect(confirmation).toBeDefined();
      expect(confirmation?.subject).toContain(order.orderNumber);
    });

    it('Admin confirms cash payment again → no duplicate confirmation email (order was already CONFIRMED)', async () => {
      const order = await placeCashOrder();
      const orderRow = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { payment: true },
      });
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/payments/${orderRow.payment!.id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await flush();
      expect(mailSpy.sends.filter((m) => m.tag === 'order_confirmation')).toHaveLength(0);
    });
  });

  describe('OrderStatusChanged', () => {
    it('CONFIRMED → PROCESSING transition sends status email', async () => {
      const order = await placeCashOrder();
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PROCESSING' })
        .expect(200);
      await flush();
      const email = mailSpy.sends.find((m) => m.tag === 'order_status_processing');
      expect(email).toBeDefined();
      expect(email?.subject).toContain(order.orderNumber);
      expect(email?.text).toMatch(/préparation|prepared/i);
    });

    it('DELIVERED → COMPLETED is admin-only, no customer email', async () => {
      const order = await placeCashOrder();
      // Walk to DELIVERED (we don't care about emails along the way).
      for (const next of ['PROCESSING', 'READY', 'SHIPPED', 'DELIVERED']) {
        await request(server)
          .post(`/api/v1/orders/${order.id}/transition`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: next })
          .expect(200);
      }
      await flush();
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);
      await flush();
      expect(mailSpy.sends.filter((m) => m.tag?.startsWith('order_status_'))).toHaveLength(0);
    });

    it('READY for STORE_PICKUP includes pickup point reminder in body', async () => {
      const order = await placePendingMomoOrder();
      // promote PENDING → CONFIRMED
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201);
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PROCESSING' })
        .expect(200);
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY' })
        .expect(200);
      await flush();
      const email = mailSpy.sends.find((m) => m.tag === 'order_status_ready');
      expect(email).toBeDefined();
      // Pickup point name was "{SUITE_TAG} Bonapriso"
      expect(email?.text).toContain(`${SUITE_TAG} Bonapriso`);
    });
  });

  describe('OrderCancelled', () => {
    it('admin cancel → cancellation email sent', async () => {
      const order = await placeCashOrder();
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Out of fabric' })
        .expect(200);
      await flush();
      const email = mailSpy.sends.find((m) => m.tag === 'order_cancelled');
      expect(email).toBeDefined();
      expect(email?.subject).toContain(order.orderNumber);
      expect(email?.text).toContain('Out of fabric');
    });

    it('customer self-cancel → cancellation email sent', async () => {
      const order = await placePendingMomoOrder();
      mailSpy.clear();
      await request(server)
        .post(`/api/v1/me/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Wrong size' })
        .expect(200);
      await flush();
      const email = mailSpy.sends.find((m) => m.tag === 'order_cancelled');
      expect(email).toBeDefined();
      expect(email?.text).toContain('Wrong size');
    });
  });
});
