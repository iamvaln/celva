import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-pkg-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Packaging consumption (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let userId = '';
  let orderId = '';
  let deliveryId = '';
  let supplierId = '';
  let boxId = '';
  let fabricId = '';

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
      .send({ email: CLIENT_EMAIL, name: 'Pkg Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
    userId = signup.body.data.user.id;

    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber: `CLV-PKG-${Date.now()}`,
        status: 'CONFIRMED',
        channel: 'WEBSITE',
        subtotal: 0,
        deliveryFee: 0,
        discount: 0,
        taxAmount: 0,
        total: 0,
      },
    });
    orderId = order.id;
    const delivery = await prisma.delivery.create({
      data: { orderId, mode: 'HOME_DELIVERY', status: 'PENDING', actualCost: 0 },
    });
    deliveryId = delivery.id;

    const supplier = await prisma.supplier.create({ data: { name: `${SUITE_TAG} Supplier` } });
    supplierId = supplier.id;
    const box = await prisma.rawMaterial.create({
      data: {
        name: `${SUITE_TAG} Box`,
        type: 'PACKAGING',
        unit: 'unit',
        unitPrice: 500,
        stockQty: 100,
        supplierId,
      },
    });
    boxId = box.id;
    const fabric = await prisma.rawMaterial.create({
      data: {
        name: `${SUITE_TAG} Fabric`,
        type: 'FABRIC',
        unit: 'm',
        unitPrice: 2000,
        stockQty: 50,
        supplierId,
      },
    });
    fabricId = fabric.id;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.packagingConsumption.deleteMany({
      where: { rawMaterial: { name: { startsWith: SUITE_TAG } } },
    });
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
      select: { id: true },
    });
    const orders = await prisma.order.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.auditLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
  }

  const stockOf = async (id: string): Promise<number> => {
    const m = await prisma.rawMaterial.findUniqueOrThrow({ where: { id } });
    return Number(m.stockQty);
  };

  let consumptionId = '';

  it('POST requires auth (401)', async () => {
    await request(server)
      .post(`/api/v1/deliveries/${deliveryId}/packaging`)
      .send({ rawMaterialId: boxId, quantity: 1 })
      .expect(401);
  });

  it('client (CLIENT role) is forbidden (403)', async () => {
    await request(server)
      .post(`/api/v1/deliveries/${deliveryId}/packaging`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rawMaterialId: boxId, quantity: 1 })
      .expect(403);
  });

  it('records a packaging consumption and decrements stock', async () => {
    const before = await stockOf(boxId);
    const res = await request(server)
      .post(`/api/v1/deliveries/${deliveryId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rawMaterialId: boxId, quantity: 3 })
      .expect(201);
    expect(Number(res.body.data.quantity)).toBe(3);
    consumptionId = res.body.data.id;
    expect(await stockOf(boxId)).toBe(before - 3);
  });

  it('rejects a non-PACKAGING material (400)', async () => {
    await request(server)
      .post(`/api/v1/deliveries/${deliveryId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rawMaterialId: fabricId, quantity: 1 })
      .expect(400);
  });

  it('rejects quantity beyond stock (400, insufficient_raw_material)', async () => {
    await request(server)
      .post(`/api/v1/deliveries/${deliveryId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rawMaterialId: boxId, quantity: 1000000 })
      .expect(400);
  });

  it('GET lists consumptions with the total cost (qty × unitPrice)', async () => {
    const res = await request(server)
      .get(`/api/v1/deliveries/${deliveryId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    // 3 boxes × 500 = 1500.00
    expect(res.body.data.totalCost).toBe('1500.00');
    expect(res.body.data.items[0].rawMaterial.id).toBe(boxId);
  });

  it('DELETE restores the stock (204)', async () => {
    const before = await stockOf(boxId);
    await request(server)
      .delete(`/api/v1/deliveries/${deliveryId}/packaging/${consumptionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    expect(await stockOf(boxId)).toBe(before + 3);
    const gone = await prisma.packagingConsumption.findUnique({ where: { id: consumptionId } });
    expect(gone).toBeNull();
  });

  it('404 for unknown delivery', async () => {
    await request(server)
      .get('/api/v1/deliveries/00000000-0000-0000-0000-000000000000/packaging')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
