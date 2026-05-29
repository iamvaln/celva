import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-margin-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Per-order net margin (spec §12.7). Builds a controlled order graph so the
 * breakdown is exact:
 *   revenueHt   = total(12000) − tax(2000)           = 10000
 *   productCost = costPrice(3000) × qty(1)            =  3000
 *   packaging   = 2 boxes × 500                       =  1000
 *   deliveryCost= delivery.actualCost                 =  1500
 *   commissions = one commission                      =   800
 *   netMargin   = 10000 − 3000 − 1000 − 1500 − 800    =  3700
 */
describe('Order margin (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let userId = '';
  let orderId = '';

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

    await cleanup();

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Margin Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
    userId = signup.body.data.user.id;

    const supplier = await prisma.supplier.create({ data: { name: `${SUITE_TAG} Supplier` } });
    const box = await prisma.rawMaterial.create({
      data: {
        name: `${SUITE_TAG} Box`,
        type: 'PACKAGING',
        unit: 'unit',
        unitPrice: 500,
        stockQty: 100,
        supplierId: supplier.id,
      },
    });
    const category = await prisma.category.create({
      data: { name: { fr: SUITE_TAG, en: SUITE_TAG }, slug: `${SUITE_TAG}-cat` },
    });
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 10000,
        floorPrice: 8000,
        costPrice: 3000,
        productionType: 'INTERNAL',
        categoryId: category.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: { sku: `${SUITE_TAG}-A`, productId: product.id, stock: 30 },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: `CLV-MARGIN-${Date.now()}`,
        status: 'CONFIRMED',
        channel: 'WEBSITE',
        subtotal: 10000,
        deliveryFee: 2000,
        discount: 0,
        taxAmount: 2000,
        total: 12000,
      },
    });
    orderId = order.id;
    const item = await prisma.orderItem.create({
      data: { orderId, variantId: variant.id, quantity: 1, unitPrice: 10000, taxRate: 0.1925 },
    });
    const delivery = await prisma.delivery.create({
      data: { orderId, mode: 'HOME_DELIVERY', status: 'DELIVERED', actualCost: 1500 },
    });
    await prisma.packagingConsumption.create({
      data: { deliveryId: delivery.id, rawMaterialId: box.id, quantity: 2 },
    });
    await prisma.salesCommission.create({
      data: {
        orderId,
        orderItemId: item.id,
        salesRepId: userId,
        amount: 800,
        status: 'PENDING',
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const orders = await prisma.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const deliveries = await prisma.delivery.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      });
      await prisma.packagingConsumption.deleteMany({
        where: { deliveryId: { in: deliveries.map((d) => d.id) } },
      });
      await prisma.salesCommission.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    // Variant before product — product_variants_productId_fkey.
    await prisma.productVariant.deleteMany({ where: { sku: { startsWith: SUITE_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
  }

  it('GET /finance/orders/:id/margin requires auth (401)', async () => {
    await request(server).get(`/api/v1/finance/orders/${orderId}/margin`).expect(401);
  });

  it('client (CLIENT role) is forbidden (403)', async () => {
    await request(server)
      .get(`/api/v1/finance/orders/${orderId}/margin`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('returns the §12.7 breakdown with exact figures', async () => {
    const res = await request(server)
      .get(`/api/v1/finance/orders/${orderId}/margin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toMatchObject({
      saleTtc: '12000.00',
      tax: '2000.00',
      revenueHt: '10000.00',
      productCost: '3000.00',
      packagingCost: '1000.00',
      deliveryCost: '1500.00',
      commissions: '800.00',
      netMargin: '3700.00',
    });
  });

  it('404 for unknown order', async () => {
    await request(server)
      .get('/api/v1/finance/orders/00000000-0000-0000-0000-000000000000/margin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
