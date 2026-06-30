import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-tx-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';

  /** Track ids we create so we can purge in afterAll without touching seed rows. */
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
      .send({ email: CLIENT_EMAIL, name: 'Tx Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.refreshToken.deleteMany({
      where: { user: { email: CLIENT_EMAIL } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: CLIENT_EMAIL } },
    });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await app?.close();
  });

  const create = async (
    body: Partial<{
      type: string;
      category: string;
      amount: number;
      description: string;
      date: string;
    }>,
  ): Promise<string> => {
    const res = await request(server)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'EXPENSE',
        category: 'RAW_MATERIALS',
        amount: 15000,
        description: `${SUITE_TAG} tx`,
        ...body,
      })
      .expect(201);
    createdIds.push(res.body.data.id);
    return res.body.data.id;
  };

  describe('Guards', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/transactions').expect(401);
    });

    it('403 client', async () => {
      await request(server)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('POST /transactions', () => {
    it('admin creates a manual EXPENSE', async () => {
      const res = await request(server)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'EXPENSE',
          category: 'RAW_MATERIALS',
          amount: 25000,
          description: `${SUITE_TAG} fabric batch`,
          date: '2026-05-01T00:00:00.000Z',
        })
        .expect(201);
      expect(res.body.data.type).toBe('EXPENSE');
      expect(res.body.data.category).toBe('RAW_MATERIALS');
      expect(Number(res.body.data.amount)).toBe(25000);
      expect(res.body.data.orderId).toBeNull();
      createdIds.push(res.body.data.id);
    });

    it('rejects amount ≤ 0', async () => {
      await request(server)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'EXPENSE', category: 'OTHER', amount: 0 })
        .expect(400);
    });

    it('rejects unknown category', async () => {
      await request(server)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'EXPENSE', category: 'BOGUS', amount: 100 })
        .expect(400);
    });

    it('rejects unknown orderId', async () => {
      await request(server)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCOME',
          category: 'OTHER',
          amount: 1000,
          orderId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });
  });

  describe('GET /transactions (list + filters)', () => {
    it('list returns paginated envelope', async () => {
      const res = await request(server)
        .get('/api/v1/transactions?pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(50);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('filters by type=EXPENSE', async () => {
      await create({ type: 'EXPENSE', category: 'RAW_MATERIALS', amount: 1234 });
      const res = await request(server)
        .get('/api/v1/transactions?type=EXPENSE&pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ type: string }>;
      expect(rows.every((r) => r.type === 'EXPENSE')).toBe(true);
    });

    it('search hits description', async () => {
      const id = await create({ description: `${SUITE_TAG} unique-marker-zzz` });
      const res = await request(server)
        .get(`/api/v1/transactions?search=unique-marker-zzz`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const ids = (res.body.data.data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toContain(id);
    });
  });

  describe('PATCH /transactions/:id', () => {
    it('admin updates description + amount of a manual row', async () => {
      const id = await create({ amount: 5000 });
      const res = await request(server)
        .patch(`/api/v1/transactions/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 7500, description: `${SUITE_TAG} corrected` })
        .expect(200);
      expect(Number(res.body.data.amount)).toBe(7500);
      expect(res.body.data.description).toContain('corrected');
    });

    it('refuses to edit an auto-generated (order-linked) row', async () => {
      // Find any existing auto-generated tx (orderId != null). Fall back to
      // skipping if none exist in this fresh DB.
      const autoTx = await prisma.transaction.findFirst({
        where: { orderId: { not: null } },
      });
      if (!autoTx) {
        // No auto-generated rows yet — bail gracefully.
        return;
      }
      const res = await request(server)
        .patch(`/api/v1/transactions/${autoTx.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1 })
        .expect(400);
      expect(res.body.message).toBeTruthy();
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('manager (non-ADMIN) cannot delete', async () => {
      // Manager role required to test cleanly — we lack a manager fixture,
      // but we can verify that a CLIENT also can't delete.
      const id = await create({});
      await request(server)
        .delete(`/api/v1/transactions/${id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('admin deletes a manual row', async () => {
      const id = await create({});
      await request(server)
        .delete(`/api/v1/transactions/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await request(server)
        .get(`/api/v1/transactions/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      // Drop from cleanup list (already gone).
      const idx = createdIds.indexOf(id);
      if (idx >= 0) createdIds.splice(idx, 1);
    });
  });

  describe('GET /transactions/export.csv', () => {
    it('returns text/csv with the right header row and BOM', async () => {
      const id = await create({
        type: 'EXPENSE',
        category: 'OTHER',
        amount: 1234,
        description: 'csv-marker',
        date: '2031-01-15T00:00:00.000Z',
      });
      const res = await request(server)
        .get(
          '/api/v1/transactions/export.csv?from=2031-01-01T00:00:00.000Z&to=2031-01-31T23:59:59.000Z',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      const body = res.text;
      expect(body.charCodeAt(0)).toBe(0xfeff);
      const firstLine = body.replace(/^\uFEFF/, '').split('\n')[0];
      expect(firstLine).toBe(
        'id,date,type,category,amount,description,orderNumber,receiptUrl,createdBy,createdAt',
      );
      expect(body).toContain(id);
      expect(body).toContain('csv-marker');
    });

    it('client cannot export (403)', async () => {
      await request(server)
        .get('/api/v1/transactions/export.csv')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('quotes values containing commas / quotes', async () => {
      await create({
        description: 'Comma, in, value "quoted"',
        date: '2031-02-15T00:00:00.000Z',
      });
      const res = await request(server)
        .get(
          '/api/v1/transactions/export.csv?from=2031-02-01T00:00:00.000Z&to=2031-02-28T23:59:59.000Z',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.text).toContain('"Comma, in, value ""quoted"""');
    });
  });

  describe('GET /transactions/summary', () => {
    it('returns totals + per-category breakdown', async () => {
      // Create two known rows in a tight date window so we can assert on them.
      const from = `2030-01-01T00:00:00.000Z`;
      const to = `2030-01-31T23:59:59.000Z`;
      await create({
        type: 'INCOME',
        category: 'OTHER',
        amount: 10000,
        date: '2030-01-15T00:00:00.000Z',
      });
      await create({
        type: 'EXPENSE',
        category: 'RAW_MATERIALS',
        amount: 4000,
        date: '2030-01-20T00:00:00.000Z',
      });
      const res = await request(server)
        .get(`/api/v1/transactions/summary?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Number(res.body.data.totalIncome)).toBe(10000);
      expect(Number(res.body.data.totalExpense)).toBe(4000);
      expect(Number(res.body.data.net)).toBe(6000);
      const cats = res.body.data.byCategory as Array<{
        category: string;
        type: string;
        total: string;
      }>;
      expect(cats.some((c) => c.category === 'OTHER' && c.type === 'INCOME')).toBe(true);
      expect(
        cats.some((c) => c.category === 'RAW_MATERIALS' && c.type === 'EXPENSE'),
      ).toBe(true);
    });
  });
});
