import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-com-${Date.now()}`;

describe('Sales commissions (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let salesRepId = '';
  let clientUserId = '';
  let productAId = ''; // 10% default
  let productBId = ''; // FIXED 500 default
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

    // Clean slate
    await prisma.user.deleteMany({ where: { email: { startsWith: SUITE_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    // Admin token
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    // Seed catalogue: one PERCENTAGE 10% product, one FIXED 500/unit product.
    const cat = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    const productA = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} A`, en: 'A' },
        slug: `${SUITE_TAG}-a`,
        displayPrice: 10000,
        floorPrice: 8000,
        productionType: 'INTERNAL',
        categoryId: cat.id,
        defaultCommissionType: 'PERCENTAGE',
        defaultCommissionValue: 10, // 10% of lineTotal
      },
    });
    productAId = productA.id;
    const variantA = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId: productAId, stock: 100 },
    });
    variantAId = variantA.id;

    const productB = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} B`, en: 'B' },
        slug: `${SUITE_TAG}-b`,
        displayPrice: 5000,
        floorPrice: 4000,
        productionType: 'INTERNAL',
        categoryId: cat.id,
        defaultCommissionType: 'FIXED',
        defaultCommissionValue: 500, // 500 per unit
      },
    });
    productBId = productB.id;
    const variantB = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-B`, productId: productBId, stock: 100 },
    });
    variantBId = variantB.id;

    // Seed two CLIENT users (one acts as sales rep — role-flipped to SALES_REP)
    // and a separate buyer.
    const rep = await prisma.user.create({
      data: {
        email: `${SUITE_TAG}-rep@celva.test`,
        name: 'Sales Rep',
        passwordHash: 'x',
        role: 'SALES_REP',
      },
    });
    salesRepId = rep.id;
    const client = await prisma.user.create({
      data: {
        email: `${SUITE_TAG}-buyer@celva.test`,
        name: 'Buyer',
        passwordHash: 'x',
        role: 'CLIENT',
        cart: { create: {} },
      },
    });
    clientUserId = client.id;
  });

  afterAll(async () => {
    // Wipe what we created. FK order: salesCommission → orderItem → order → user/product.
    const users = await prisma.user.findMany({
      where: { email: { startsWith: SUITE_TAG } },
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
        await prisma.salesCommission.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      // Pay-out transactions (no order link) created by markPaid — clean by description.
      await prisma.transaction.deleteMany({
        where: { description: { contains: SUITE_TAG } },
      });
      await prisma.salesCommission.deleteMany({ where: { salesRepId: { in: userIds } } });
      await prisma.stockMovement.deleteMany({
        where: { variantId: { in: [variantAId, variantBId] } },
      });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { startsWith: SUITE_TAG } } });
    await prisma.productVariant.deleteMany({
      where: { productId: { in: [productAId, productBId] } },
    });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  /**
   * Helper: place an order directly via prisma (bypassing checkout) so
   * we can attach a salesRepId — the storefront route doesn't expose
   * one (that's the manual-order §7.4 path, deferred from API).
   */
  const placeOrder = async (opts: {
    items: Array<{ variantId: string; quantity: number; unitPrice: number }>;
    initialStatus?: 'PENDING' | 'CONFIRMED';
    withSalesRep?: boolean;
  }): Promise<{ orderId: string }> => {
    const subtotal = opts.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const order = await prisma.order.create({
      data: {
        orderNumber: `${SUITE_TAG}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: opts.initialStatus ?? 'PENDING',
        channel: 'WHATSAPP',
        subtotal,
        deliveryFee: 0,
        discount: 0,
        total: subtotal,
        taxAmount: 0,
        userId: clientUserId,
        salesRepId: opts.withSalesRep === false ? null : salesRepId,
        items: {
          create: opts.items.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: 0.1925,
          })),
        },
      },
    });
    return { orderId: order.id };
  };

  describe('Guards', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/sales-commissions').expect(401);
    });
  });

  describe('Generation on order CONFIRMED', () => {
    it('admin transitions PENDING → CONFIRMED → commissions appear (10% + 500*qty)', async () => {
      const { orderId } = await placeOrder({
        items: [
          { variantId: variantAId, quantity: 2, unitPrice: 10_000 }, // 10% × 20k = 2,000
          { variantId: variantBId, quantity: 3, unitPrice: 5_000 }, // 500 × 3 = 1,500
        ],
      });

      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const rows = await prisma.salesCommission.findMany({ where: { orderId } });
      expect(rows).toHaveLength(2);
      const total = rows.reduce((s, r) => s + Number(r.amount), 0);
      expect(total).toBe(3_500);
      expect(rows.every((r) => r.status === 'PENDING')).toBe(true);
    });

    it('storefront order without a salesRep generates no commission', async () => {
      const { orderId } = await placeOrder({
        items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
        withSalesRep: false,
      });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const count = await prisma.salesCommission.count({ where: { orderId } });
      expect(count).toBe(0);
    });

    it('re-transitioning is idempotent (no duplicates)', async () => {
      const { orderId } = await placeOrder({
        items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
        initialStatus: 'CONFIRMED',
      });
      // Manually call generateForOrder via re-transition path. Since we
      // can't transition INTO CONFIRMED from CONFIRMED, simulate via the
      // service indirectly by transitioning forward and back — but
      // backwards is forbidden. Easier: invoke generateForOrder via the
      // public path on the orderId twice using a re-CONFIRM hop. Skip
      // that and instead test idempotency directly via the unique
      // constraint: try inserting twice in raw and rely on the fact
      // that generateForOrder's covered-set check prevents duplicates.
      const first = await prisma.salesCommission.count({ where: { orderId } });
      // Force a second generate by stamping the order PENDING then back
      // to CONFIRMED — but ALLOWED_TRANSITIONS blocks that. Instead,
      // we leverage the fact that generateForOrder is called on each
      // CONFIRMED transition and was already called by the seed-time
      // raw create above. Currently the raw-create doesn't call the
      // generator — so the row count starts at 0. Promote via the
      // controller to trigger it.
      void first;
      await prisma.order.update({ where: { id: orderId }, data: { status: 'PENDING' } });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const a = await prisma.salesCommission.count({ where: { orderId } });
      // Now flip backwards (which the API blocks) via prisma + retrigger.
      await prisma.order.update({ where: { id: orderId }, data: { status: 'PENDING' } });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const b = await prisma.salesCommission.count({ where: { orderId } });
      expect(b).toBe(a);
      expect(b).toBe(1);
    });
  });

  describe('Cancellation cleanup', () => {
    it('cancel deletes PENDING commissions for the order', async () => {
      const { orderId } = await placeOrder({
        items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
      });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(await prisma.salesCommission.count({ where: { orderId } })).toBe(1);
      await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'test' })
        .expect(200);
      expect(await prisma.salesCommission.count({ where: { orderId } })).toBe(0);
    });

    it('cancel refuses if a commission is already PAID', async () => {
      const { orderId } = await placeOrder({
        items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
      });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const [com] = await prisma.salesCommission.findMany({ where: { orderId } });
      await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [com!.id] })
        .expect(200);
      await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Listing + summary', () => {
    it('GET /sales-commissions paginates, filters by salesRepId', async () => {
      const res = await request(server)
        .get(`/api/v1/sales-commissions?salesRepId=${salesRepId}&pageSize=50`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ salesRepId: string }>;
      expect(rows.every((r) => r.salesRepId === salesRepId)).toBe(true);
    });

    it('GET /sales-commissions/summary aggregates by sales rep', async () => {
      const res = await request(server)
        .get('/api/v1/sales-commissions/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data as Array<{
        salesRep: { id: string };
        pendingAmount: string;
        paidAmount: string;
      }>;
      const ours = rows.find((r) => r.salesRep.id === salesRepId);
      expect(ours).toBeTruthy();
    });
  });

  describe('Mark paid + EXPENSE Transaction', () => {
    it('marking PENDING rows paid creates COMMISSION EXPENSE Transaction(s)', async () => {
      const { orderId } = await placeOrder({
        items: [
          { variantId: variantAId, quantity: 1, unitPrice: 10_000 }, // 1k
          { variantId: variantBId, quantity: 2, unitPrice: 5_000 }, // 1k
        ],
      });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const rows = await prisma.salesCommission.findMany({ where: { orderId } });
      expect(rows).toHaveLength(2);
      const ids = rows.map((r) => r.id);
      const res = await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids })
        .expect(200);
      expect(res.body.data.paid).toBe(2);
      expect(Number(res.body.data.totalAmount)).toBe(2_000);
      expect(Array.isArray(res.body.data.transactionIds)).toBe(true);
      expect(res.body.data.transactionIds.length).toBe(1); // single rep → single tx
      const tx = await prisma.transaction.findUniqueOrThrow({
        where: { id: res.body.data.transactionIds[0] },
      });
      expect(tx.type).toBe('EXPENSE');
      expect(tx.category).toBe('COMMISSION');
      expect(Number(tx.amount)).toBe(2_000);
    });

    it('refuses to re-pay an already-PAID commission (400)', async () => {
      const { orderId } = await placeOrder({
        items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
      });
      await request(server)
        .post(`/api/v1/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      const [com] = await prisma.salesCommission.findMany({ where: { orderId } });
      await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [com!.id] })
        .expect(200);
      await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [com!.id] })
        .expect(400);
    });

    it('rejects unknown ids (404)', async () => {
      await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: ['00000000-0000-0000-0000-000000000000'] })
        .expect(404);
    });

    it('rejects empty ids list (400)', async () => {
      await request(server)
        .post('/api/v1/sales-commissions/mark-paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [] })
        .expect(400);
    });
  });

  describe('CommissionRule override', () => {
    it('per-rule override beats product default', async () => {
      // Bespoke rule: rep gets 20% on product A instead of the 10% default.
      await prisma.commissionRule.create({
        data: {
          userId: salesRepId,
          productId: productAId,
          type: 'PERCENTAGE',
          value: 20,
        },
      });
      try {
        const { orderId } = await placeOrder({
          items: [{ variantId: variantAId, quantity: 1, unitPrice: 10_000 }],
        });
        await request(server)
          .post(`/api/v1/orders/${orderId}/transition`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
        const [com] = await prisma.salesCommission.findMany({ where: { orderId } });
        expect(Number(com!.amount)).toBe(2_000); // 20% × 10,000
      } finally {
        await prisma.commissionRule.deleteMany({
          where: { userId: salesRepId, productId: productAId },
        });
      }
    });
  });
});
