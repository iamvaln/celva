import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-fin-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Finance dashboard (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let adminUserId = '';

  // Far-future window — keeps the test isolated from any other data in
  // the dev DB.
  const FROM = '2099-04-01T00:00:00.000Z';
  const TO = '2099-04-30T23:59:59.000Z';
  const txIds: string[] = [];

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
    adminUserId = (await prisma.user.findUniqueOrThrow({
      where: { email: ADMIN_EMAIL },
      select: { id: true },
    })).id;

    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Fin Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;

    // Seed three known transactions inside the test window. Skip the
    // API route — it forbids backdated rows in the far future, and we
    // want full control over the date field.
    const seed = async (
      type: 'INCOME' | 'EXPENSE',
      category: string,
      amount: number,
      day: number,
    ) => {
      const tx = await prisma.transaction.create({
        data: {
          type,
          category: category as never,
          amount,
          description: `${SUITE_TAG} ${type} ${category}`,
          date: new Date(`2099-04-${String(day).padStart(2, '0')}T12:00:00.000Z`),
          createdById: adminUserId,
        },
      });
      txIds.push(tx.id);
    };
    await seed('INCOME', 'SALE', 50_000, 5);
    await seed('INCOME', 'OTHER', 15_000, 10);
    await seed('EXPENSE', 'RAW_MATERIALS', 20_000, 7);
    await seed('EXPENSE', 'MARKETING', 5_000, 12);
  });

  afterAll(async () => {
    if (txIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { id: { in: txIds } } });
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

  describe('Guards', () => {
    it('401 anon', async () => {
      await request(server).get('/api/v1/finance/dashboard').expect(401);
    });

    it('403 client', async () => {
      await request(server)
        .get('/api/v1/finance/dashboard')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('GET /finance/dashboard', () => {
    it('returns the composite payload with our seeded window', async () => {
      const res = await request(server)
        .get(`/api/v1/finance/dashboard?from=${FROM}&to=${TO}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data as {
        window: { from: string; to: string };
        kpis: {
          revenue: string;
          expenses: string;
          net: string;
          orderCount: number;
        };
        timeseries: Array<{ month: string; revenue: string; expenses: string }>;
        revenueByChannel: Array<{ channel: string; total: string }>;
        expensesByCategory: Array<{ category: string; total: string }>;
      };

      // KPIs
      expect(Number(body.kpis.revenue)).toBe(65_000);
      expect(Number(body.kpis.expenses)).toBe(25_000);
      expect(Number(body.kpis.net)).toBe(40_000);
      expect(typeof body.kpis.orderCount).toBe('number');

      // Window echoed back
      expect(body.window.from).toBe(FROM);
      expect(body.window.to).toBe(TO);

      // Timeseries: always 12 months ending current month
      expect(body.timeseries).toHaveLength(12);
      const last = body.timeseries[body.timeseries.length - 1]!;
      expect(last.month).toMatch(/^\d{4}-\d{2}$/);

      // Expenses by category: ours should be present and sorted desc.
      const cats = body.expensesByCategory.map((c) => c.category);
      expect(cats).toContain('RAW_MATERIALS');
      expect(cats).toContain('MARKETING');
      // RAW_MATERIALS (20k) > MARKETING (5k) — order check.
      const rmIdx = cats.indexOf('RAW_MATERIALS');
      const mkIdx = cats.indexOf('MARKETING');
      expect(rmIdx).toBeLessThan(mkIdx);
    });

    it('default window without query params still returns a valid payload', async () => {
      const res = await request(server)
        .get('/api/v1/finance/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data;
      expect(body.window.from).toBeTruthy();
      expect(body.window.to).toBeTruthy();
      // First-of-month for `from`.
      expect(body.window.from).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
      expect(body.timeseries).toHaveLength(12);
    });

    it('rejects invalid from date (400)', async () => {
      await request(server)
        .get('/api/v1/finance/dashboard?from=not-a-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
