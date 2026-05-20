import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JWT } from '@celva/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const TEST_CLIENT_EMAIL = `client-e2e-${Date.now()}@celva.test`;
const TEST_CLIENT_PASSWORD = 'TestPass123!';
const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';

describe('Auth + Users + Settings (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;

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

    await prisma.user.deleteMany({ where: { email: TEST_CLIENT_EMAIL } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_CLIENT_EMAIL } });
    await app?.close();
  });

  describe('Signup → Login → /auth/me → Refresh → Logout', () => {
    let accessToken = '';
    let refreshCookie = '';

    it('POST /api/v1/auth/signup creates a client and returns access token + sets refresh cookie', async () => {
      const res = await request(server)
        .post('/api/v1/auth/signup')
        .send({
          email: TEST_CLIENT_EMAIL,
          name: 'Amara Test',
          password: TEST_CLIENT_PASSWORD,
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(TEST_CLIENT_EMAIL);
      expect(res.body.data.user.role).toBe('CLIENT');
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.some((c) => c.startsWith(`${JWT.REFRESH_COOKIE_NAME}=`))).toBe(true);
    });

    it('POST /api/v1/auth/login returns access token', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: TEST_CLIENT_EMAIL, password: TEST_CLIENT_PASSWORD })
        .expect(200);
      accessToken = res.body.data.accessToken;
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      const cookieHeader =
        setCookie.find((c) => c.startsWith(`${JWT.REFRESH_COOKIE_NAME}=`)) ?? '';
      refreshCookie = cookieHeader.split(';')[0] ?? '';
      expect(accessToken).toBeTruthy();
      expect(refreshCookie).toBeTruthy();
    });

    it('GET /api/v1/auth/me requires the bearer token', async () => {
      await request(server).get('/api/v1/auth/me').expect(401);
    });

    it('GET /api/v1/auth/me returns the profile with the access token', async () => {
      const res = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(TEST_CLIENT_EMAIL);
    });

    it('POST /api/v1/auth/refresh rotates tokens', async () => {
      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);
      expect(res.body.data.accessToken).toBeTruthy();
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      const newCookieFull =
        setCookie.find((c) => c.startsWith(`${JWT.REFRESH_COOKIE_NAME}=`)) ?? '';
      const newCookie = newCookieFull.split(';')[0] ?? '';
      expect(newCookie).toBeTruthy();
      expect(newCookie).not.toBe(refreshCookie);
    });

    it('POST /api/v1/auth/login wrong password returns 401', async () => {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: TEST_CLIENT_EMAIL, password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('Bilingual errors actually translate', () => {
    it('Accept-Language: fr returns French message', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .set('Accept-Language', 'fr')
        .send({ email: 'nope@celva.test', password: 'wrong' })
        .expect(401);
      expect(res.body.message).toBe('Identifiants invalides.');
    });

    it('Accept-Language: en returns English message', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .set('Accept-Language', 'en')
        .send({ email: 'nope@celva.test', password: 'wrong' })
        .expect(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });

  describe('Validation', () => {
    it('rejects signup with short password', async () => {
      await request(server)
        .post('/api/v1/auth/signup')
        .send({ email: `x${Date.now()}@celva.test`, name: 'X', password: 'short' })
        .expect(400);
    });

    it('rejects signup with invalid email', async () => {
      await request(server)
        .post('/api/v1/auth/signup')
        .send({ email: 'not-an-email', name: 'X', password: 'GoodPass123' })
        .expect(400);
    });
  });

  describe('Public settings (no auth)', () => {
    it('GET /api/v1/settings/public is reachable without a token', async () => {
      const res = await request(server).get('/api/v1/settings/public').expect(200);
      const data = res.body.data as Array<{ key: string }>;
      expect(Array.isArray(data)).toBe(true);
      const keys = data.map((s) => s.key);
      expect(keys).toContain('TAX_RATE');
      expect(keys).toContain('CONTACT_EMAIL');
      expect(keys).not.toContain('MAX_CASH_ON_DELIVERY');
    });

    it('GET /api/v1/settings (admin list) requires a token', async () => {
      await request(server).get('/api/v1/settings').expect(401);
    });
  });

  describe('Admin (logged in as seeded admin)', () => {
    let adminAccessToken = '';

    it('admin login works', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);
      adminAccessToken = res.body.data.accessToken;
    });

    it('admin can list users', async () => {
      const res = await request(server)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('admin can list settings (full)', async () => {
      const res = await request(server)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    });

    it('admin cannot self-deactivate', async () => {
      const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
      await request(server)
        .patch(`/api/v1/users/${adminUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(403);
    });
  });

  describe('Client cannot access admin endpoints', () => {
    let clientToken = '';

    it('login as client', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: TEST_CLIENT_EMAIL, password: TEST_CLIENT_PASSWORD })
        .expect(200);
      clientToken = res.body.data.accessToken;
    });

    it('client cannot list users (403)', async () => {
      await request(server)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('client cannot list (admin) settings (403)', async () => {
      await request(server)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });
});
