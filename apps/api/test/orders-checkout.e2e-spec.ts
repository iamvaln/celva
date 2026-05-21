import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const SUITE_TAG = `e2e-ord-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Orders / Checkout (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let token = '';
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

    // Clean slate
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.deliveryZone.deleteMany({ where: { name: { path: ['fr'], string_contains: SUITE_TAG } } });
    await prisma.pickupPoint.deleteMany({ where: { name: { path: ['fr'], string_contains: SUITE_TAG } } });

    // Catalogue fixture
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
      data: { sku: `${SUITE_TAG}-A`, productId, stock: 10 },
    });
    variantId = variant.id;

    // Delivery + pickup fixtures
    const zone = await prisma.deliveryZone.create({
      data: {
        name: { fr: `${SUITE_TAG} Douala`, en: `${SUITE_TAG} Douala` },
        fee: 2000,
        actualCost: 1500,
        freeDeliveryThreshold: 50000,
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

    // Client signup + cart fill
    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Client', password: PASSWORD })
      .expect(201);
    token = signup.body.data.accessToken;
  });

  const addToCart = async (qty: number): Promise<void> => {
    await request(server)
      .post('/api/v1/me/cart/items')
      .set('Authorization', `Bearer ${token}`)
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
      // Order chain: payments + deliveries + stock movements + order_items → orders
      const orders = await prisma.order.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
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

  it('POST /me/orders requires auth (401)', async () => {
    await request(server)
      .post('/api/v1/me/orders')
      .send({
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'X',
        shippingCity: 'X',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(401);
  });

  it('POST /me/orders rejects empty cart (400 cart_empty)', async () => {
    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept-Language', 'fr')
      .send({
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'rue 1',
        shippingCity: 'Douala',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(400);
    expect(res.body.message).toMatch(/panier/);
  });

  it('HOME_DELIVERY + Cash → Order CONFIRMED, stock decremented, cart cleared', async () => {
    await addToCart(2); // 2 × 10000 = 20000

    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'Rue 1, Bonapriso',
        shippingCity: 'Douala',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
        notes: 'Sonnez deux fois svp',
      })
      .expect(201);

    const order = res.body.data;
    expect(order.status).toBe('CONFIRMED');
    expect(order.orderNumber).toMatch(/^CLV-\d{8}-\d{4}$/);
    expect(Number(order.subtotal)).toBe(20000);
    expect(Number(order.deliveryFee)).toBe(2000); // < freeDeliveryThreshold 50000
    expect(Number(order.total)).toBe(22000);
    expect(order.items.length).toBe(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.payment.method).toBe('CASH_ON_DELIVERY');
    expect(order.payment.status).toBe('PENDING');
    expect(order.delivery.mode).toBe('HOME_DELIVERY');

    // Stock decremented
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(8);

    // Cart cleared
    const cartRes = await request(server)
      .get('/api/v1/me/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cartRes.body.data.items).toEqual([]);
  });

  it('Free-delivery threshold met → deliveryFee = 0', async () => {
    await addToCart(6); // 6 × 10000 = 60000 ≥ 50000

    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliveryMode: 'HOME_DELIVERY',
        deliveryZoneId: zoneId,
        shippingAddress: 'Rue 2',
        shippingCity: 'Douala',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(201);
    expect(Number(res.body.data.deliveryFee)).toBe(0);
    expect(Number(res.body.data.total)).toBe(60000);
  });

  it('STORE_PICKUP + MTN MoMo → Order PENDING (waiting for S callback)', async () => {
    await addToCart(1);

    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'MTN_MOMO',
        paymentPhoneNumber: '+237677999888',
      })
      .expect(201);

    const order = res.body.data;
    expect(order.status).toBe('PENDING');
    expect(Number(order.deliveryFee)).toBe(0); // pickup is free
    expect(order.delivery.mode).toBe('STORE_PICKUP');
    expect(order.delivery.pickupPointId).toBe(pickupId);
    expect(order.payment.method).toBe('MTN_MOMO');
    expect(order.payment.phoneNumber).toBe('+237677999888');
  });

  it('Missing zone on HOME_DELIVERY → 400 delivery_zone_required', async () => {
    await addToCart(1);
    await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliveryMode: 'HOME_DELIVERY',
        shippingAddress: 'X',
        shippingCity: 'X',
        shippingPhone: '+237698123456',
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(400);
  });

  it('Cash-on-delivery over cap → 400 cash_on_delivery_over_cap', async () => {
    // MAX_CASH_ON_DELIVERY = 100000 (from seed). 11 × 10000 = 110000 > cap.
    // Stock left: 10 - 2 - 6 - 1 = 1. We'd need to push variant stock.
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: 15 },
    });
    await prisma.stockMovement.create({
      data: {
        variantId,
        quantity: 14, // we just bumped stock by 14
        type: 'MANUAL_ADJUSTMENT',
        reason: 'Test top-up',
        createdById: (
          await prisma.user.findUniqueOrThrow({ where: { email: CLIENT_EMAIL } })
        ).id,
      },
    });
    await addToCart(11);

    const res = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deliveryMode: 'STORE_PICKUP',
        pickupPointId: pickupId,
        paymentMethod: 'CASH_ON_DELIVERY',
      })
      .expect(400);
    expect(res.body.message).toBeTruthy();

    // Clear the cart for the next test
    await request(server)
      .delete('/api/v1/me/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /me/orders lists my orders newest first', async () => {
    const res = await request(server)
      .get('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list = res.body.data as Array<{ orderNumber: string; createdAt: string }>;
    expect(list.length).toBeGreaterThanOrEqual(2);
    // Sorted desc by createdAt
    const times = list.map((o) => new Date(o.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('GET /me/orders/by-number/:orderNumber returns hydrated order', async () => {
    const list = await request(server)
      .get('/api/v1/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const first = list.body.data[0] as { orderNumber: string };
    const res = await request(server)
      .get(`/api/v1/me/orders/by-number/${first.orderNumber}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.items).toBeTruthy();
    expect(res.body.data.payment).toBeTruthy();
    expect(res.body.data.delivery).toBeTruthy();
  });
});
