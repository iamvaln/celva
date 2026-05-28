import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-rm-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Raw materials (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let supplierId = '';

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
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'RM client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;

    const supplier = await prisma.supplier.create({
      data: { name: `${SUITE_TAG} Supplier` },
    });
    supplierId = supplier.id;
  });

  afterAll(async () => {
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    const users = await prisma.user.findMany({
      where: { email: CLIENT_EMAIL },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await app?.close();
  });

  const create = async (overrides: Record<string, unknown> = {}): Promise<string> => {
    const res = await request(server)
      .post('/api/v1/raw-materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `${SUITE_TAG} Coton`,
        type: 'FABRIC',
        unit: 'm',
        unitPrice: 1500,
        stockQty: 100,
        supplierId,
        ...overrides,
      })
      .expect(201);
    return res.body.data.id;
  };

  describe('Guards', () => {
    it('403 client', async () => {
      await request(server)
        .get('/api/v1/raw-materials')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('CRUD + flag', () => {
    it('creates a material; isLowStock false when above threshold', async () => {
      const res = await request(server)
        .post('/api/v1/raw-materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${SUITE_TAG} Soie`,
          type: 'FABRIC',
          unit: 'm',
          unitPrice: 5000,
          stockQty: 50,
          alertThreshold: 10,
          supplierId,
        })
        .expect(201);
      expect(res.body.data.isLowStock).toBe(false);
      expect(Number(res.body.data.stockQty)).toBe(50);
    });

    it('isLowStock true when stock at/below threshold', async () => {
      const res = await request(server)
        .post('/api/v1/raw-materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${SUITE_TAG} Boutons`,
          type: 'ACCESSORY',
          unit: 'pièce',
          unitPrice: 50,
          stockQty: 5,
          alertThreshold: 10,
          supplierId,
        })
        .expect(201);
      expect(res.body.data.isLowStock).toBe(true);
    });

    it('rejects unknown supplier (400)', async () => {
      await request(server)
        .post('/api/v1/raw-materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${SUITE_TAG} X`,
          type: 'OTHER',
          unit: 'kg',
          unitPrice: 100,
          supplierId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });

    it('rejects bad type (400)', async () => {
      await request(server)
        .post('/api/v1/raw-materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${SUITE_TAG} Y`, type: 'BOGUS', unit: 'm', unitPrice: 1, supplierId })
        .expect(400);
    });

    it('lowStock=true filter returns only low rows', async () => {
      const res = await request(server)
        .get(`/api/v1/raw-materials?lowStock=true&supplierId=${supplierId}&pageSize=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ isLowStock: boolean }>;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.isLowStock)).toBe(true);
    });

    it('filters by type', async () => {
      const res = await request(server)
        .get(`/api/v1/raw-materials?type=ACCESSORY&supplierId=${supplierId}&pageSize=100`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ type: string }>;
      expect(rows.every((r) => r.type === 'ACCESSORY')).toBe(true);
    });

    it('updates stock + recomputes flag', async () => {
      const id = await create({ stockQty: 100, alertThreshold: 20 });
      const res = await request(server)
        .patch(`/api/v1/raw-materials/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQty: 15 })
        .expect(200);
      expect(res.body.data.isLowStock).toBe(true);
    });

    it('deletes an unreferenced material', async () => {
      const id = await create();
      await request(server)
        .delete(`/api/v1/raw-materials/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('client cannot delete (403)', async () => {
      const id = await create();
      await request(server)
        .delete(`/api/v1/raw-materials/${id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });
});
