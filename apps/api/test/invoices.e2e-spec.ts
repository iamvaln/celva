import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-inv-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Invoice PDF endpoints (Batch V):
 *   GET /me/orders/:id/invoice  — customer download (own only)
 *   GET /orders/:id/invoice     — admin/manager download
 * + verifies the OrderConfirmation email now attaches the PDF when an
 *   Invoice row exists.
 */
describe('Invoices (e2e)', () => {
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

  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 250));

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

    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
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

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Invoice Test', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
    mailSpy.clear();
  });

  const placeAndConfirmCashOrder = async (): Promise<{ id: string; paymentId: string }> => {
    await request(server)
      .post('/api/v1/me/cart/items')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const place = await request(server)
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
    const orderId = place.body.data.id as string;
    const paymentId = place.body.data.payment.id as string;
    // Admin confirms cash payment → Invoice row gets created
    await request(server)
      .post(`/api/v1/payments/${paymentId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ transactionRef: 'CASH-CHK-001' })
      .expect(200);
    return { id: orderId, paymentId };
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
    await app?.close();
  });

  describe('GET /me/orders/:id/invoice', () => {
    it('downloads a valid PDF after admin confirms cash payment', async () => {
      const { id } = await placeAndConfirmCashOrder();
      const res = await request(server)
        .get(`/api/v1/me/orders/${id}/invoice`)
        .set('Authorization', `Bearer ${clientToken}`)
        .buffer(true)
        .parse((response, cb) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/CLV-INV-\d{6}-\d{4}\.pdf/);
      const buffer = res.body as Buffer;
      expect(buffer.length).toBeGreaterThan(1000);
      // PDF files start with "%PDF-"
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('404 before the payment is confirmed (no Invoice row yet)', async () => {
      // Place a MoMo order — stays PENDING with no Invoice row.
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const place = await request(server)
        .post('/api/v1/me/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          deliveryMode: 'HOME_DELIVERY',
          deliveryZoneId: zoneId,
          shippingAddress: 'rue 1',
          shippingCity: 'Douala',
          shippingPhone: '+237698123456',
          paymentMethod: 'MTN_MOMO',
          paymentPhoneNumber: '+237677999888',
        })
        .expect(201);
      await request(server)
        .get(`/api/v1/me/orders/${place.body.data.id}/invoice`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);
    });

    it('403 for an order owned by another user', async () => {
      const { id } = await placeAndConfirmCashOrder();
      await request(server)
        .get(`/api/v1/me/orders/${id}/invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('401 anon', async () => {
      const { id } = await placeAndConfirmCashOrder();
      await request(server).get(`/api/v1/me/orders/${id}/invoice`).expect(401);
    });
  });

  describe('GET /orders/:id/invoice (admin)', () => {
    it('admin downloads any order PDF', async () => {
      const { id } = await placeAndConfirmCashOrder();
      const res = await request(server)
        .get(`/api/v1/orders/${id}/invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse((response, cb) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('client cannot use the admin route (403)', async () => {
      const { id } = await placeAndConfirmCashOrder();
      await request(server)
        .get(`/api/v1/orders/${id}/invoice`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('OrderConfirmation email attachment', () => {
    it('Admin confirming a cash payment attaches the PDF (fired from PaymentsService.markCompleted)', async () => {
      // Build the order, then strip its (auto-created on checkout) Invoice
      // so we can observe markCompleted creating it AND triggering the email.
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId, quantity: 1 })
        .expect(201);
      const place = await request(server)
        .post('/api/v1/me/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          deliveryMode: 'HOME_DELIVERY',
          deliveryZoneId: zoneId,
          shippingAddress: 'rue confirm',
          shippingCity: 'Douala',
          shippingPhone: '+237698123456',
          paymentMethod: 'MTN_MOMO',
          paymentPhoneNumber: '+237677111222',
        })
        .expect(201);
      await flush();
      mailSpy.clear();

      // retry-payment promotes order PENDING → CONFIRMED and creates Invoice.
      await request(server)
        .post(`/api/v1/me/orders/${place.body.data.id}/retry-payment`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201);
      await flush();

      const confirmation = mailSpy.sends.find((m) => m.tag === 'order_confirmation');
      expect(confirmation).toBeDefined();
      expect(confirmation?.attachments?.length).toBe(1);
      expect(confirmation?.attachments?.[0]?.filename).toMatch(/^CLV-INV-\d{6}-\d{4}\.pdf$/);
      expect(confirmation?.attachments?.[0]?.contentType).toBe('application/pdf');
      const pdf = confirmation!.attachments![0]!.content;
      expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('Cash checkout: confirmation fires WITHOUT an invoice attachment (Invoice not created until admin confirms payment)', async () => {
      await request(server)
        .post('/api/v1/me/cart/items')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ variantId, quantity: 1 })
        .expect(201);
      mailSpy.clear();
      await request(server)
        .post('/api/v1/me/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          deliveryMode: 'HOME_DELIVERY',
          deliveryZoneId: zoneId,
          shippingAddress: 'rue cash',
          shippingCity: 'Douala',
          shippingPhone: '+237698123456',
          paymentMethod: 'CASH_ON_DELIVERY',
        })
        .expect(201);
      await flush();
      const confirmation = mailSpy.sends.find((m) => m.tag === 'order_confirmation');
      expect(confirmation).toBeDefined();
      expect(confirmation?.attachments).toBeUndefined();
    });
  });
});
