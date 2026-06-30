import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-audit-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';
const ENTITY_TAG = `Suite-${Date.now()}`;

describe('Audit logs admin read (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';
  let userId = '';

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
      .send({ email: CLIENT_EMAIL, name: 'Audit Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;
    userId = signup.body.data.user.id;

    // Seed 3 audit rows with controlled fields/timestamps.
    const now = Date.now();
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: ENTITY_TAG,
        entityId: 'a-1',
        appSource: 'WEB_ADMIN',
        createdAt: new Date(now - 3000),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: ENTITY_TAG,
        entityId: 'a-1',
        appSource: 'WEB_ADMIN',
        createdAt: new Date(now - 2000),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: ENTITY_TAG,
        entityId: 'a-2',
        appSource: 'WEB_ADMIN',
        createdAt: new Date(now - 1000),
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
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    // Also any rows we tagged through this run (defence in depth).
    await prisma.auditLog.deleteMany({ where: { entity: ENTITY_TAG } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
  }

  it('GET /audit-logs/admin requires auth (401)', async () => {
    await request(server).get('/api/v1/audit-logs/admin').expect(401);
  });

  it('client role is forbidden (403)', async () => {
    await request(server)
      .get('/api/v1/audit-logs/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('admin gets a paginated envelope, scoped to our seeded entity', async () => {
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.data).toHaveLength(3);
  });

  it('rows are ordered newest first and include user', async () => {
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const rows = res.body.data.data as Array<{
      action: string;
      user: { id: string; name: string; email: string };
    }>;
    expect(rows.map((r) => r.action)).toEqual(['DELETE', 'UPDATE', 'CREATE']);
    expect(rows[0]?.user?.id).toBe(userId);
    expect(rows[0]?.user?.email).toBe(CLIENT_EMAIL);
  });

  it('filters by action', async () => {
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG, action: 'UPDATE' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].action).toBe('UPDATE');
  });

  it('filters by userId', async () => {
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG, userId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.total).toBe(3);
  });

  it('action filter is case-insensitive partial match', async () => {
    // The admin uses a SearchInput, so partial / wrong-case input must still
    // hit (e.g. "DEL" → DELETE, "update" → UPDATE).
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG, action: 'del' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].action).toBe('DELETE');
  });

  it('entity filter is case-insensitive partial match', async () => {
    const res = await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG.slice(0, 10).toLowerCase() })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.total).toBe(3);
  });

  it('accepts the admin dataProvider sortBy/sortDir params (regression)', async () => {
    // The React-Admin dataProvider always sends these for paginated resources.
    // forbidNonWhitelisted previously rejected them — keep this test so it
    // can't regress to a 400 from the admin UI.
    await request(server)
      .get('/api/v1/audit-logs/admin')
      .query({ entity: ENTITY_TAG, sortBy: 'createdAt', sortDir: 'desc' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
