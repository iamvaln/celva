import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-sup-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Suppliers (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  const createdIds: string[] = [];

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

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Supplier client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
  });

  afterAll(async () => {
    // Raw materials first (FK to supplier), then suppliers.
    await prisma.rawMaterial.deleteMany({
      where: { supplier: { name: { startsWith: SUITE_TAG } } },
    });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    if (createdIds.length > 0) {
      await prisma.supplier.deleteMany({ where: { id: { in: createdIds } } });
    }
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
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${SUITE_TAG} Fournisseur`, phone: '+237699000000', ...overrides })
      .expect(201);
    createdIds.push(res.body.data.id);
    return res.body.data.id;
  };

  describe('Guards', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/suppliers').expect(401);
    });
    it('403 client', async () => {
      await request(server)
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('CRUD', () => {
    it('creates a supplier', async () => {
      const res = await request(server)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${SUITE_TAG} Tissus Douala`,
          contact: 'Aïcha',
          email: 'aicha@example.com',
          phone: '+237699111222',
          address: 'Marché Central, Douala',
        })
        .expect(201);
      expect(res.body.data.name).toContain(SUITE_TAG);
      expect(res.body.data.email).toBe('aicha@example.com');
      createdIds.push(res.body.data.id);
    });

    it('rejects empty name (400)', async () => {
      await request(server)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('rejects malformed email (400)', async () => {
      await request(server)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${SUITE_TAG} X`, email: 'not-an-email' })
        .expect(400);
    });

    it('lists + search by name', async () => {
      await create({ name: `${SUITE_TAG} SearchMe` });
      const res = await request(server)
        .get(`/api/v1/suppliers?search=${SUITE_TAG}+SearchMe`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const names = (res.body.data.data as Array<{ name: string }>).map((s) => s.name);
      expect(names.some((n) => n.includes('SearchMe'))).toBe(true);
    });

    it('updates a supplier', async () => {
      const id = await create();
      const res = await request(server)
        .patch(`/api/v1/suppliers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contact: 'Updated Contact' })
        .expect(200);
      expect(res.body.data.contact).toBe('Updated Contact');
    });

    it('deletes an unreferenced supplier', async () => {
      const id = await create();
      await request(server)
        .delete(`/api/v1/suppliers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await request(server)
        .get(`/api/v1/suppliers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('refuses to delete a supplier with raw materials (409)', async () => {
      const id = await create();
      await prisma.rawMaterial.create({
        data: {
          name: `${SUITE_TAG} Coton`,
          type: 'FABRIC',
          unit: 'm',
          unitPrice: 1500,
          supplierId: id,
        },
      });
      await request(server)
        .delete(`/api/v1/suppliers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('client cannot delete (403)', async () => {
      const id = await create();
      await request(server)
        .delete(`/api/v1/suppliers/${id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });
});
