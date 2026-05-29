import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-news-${Date.now()}`;
const EMAIL_A = `${SUITE_TAG}-a@celva.test`;
const EMAIL_B = `${SUITE_TAG}-b@celva.test`;

describe('Newsletter (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';

  const cleanup = () =>
    prisma.newsletterSubscriber.deleteMany({
      where: { email: { contains: SUITE_TAG } },
    });

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

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('Public subscribe', () => {
    it('POST /newsletter/subscribe creates a subscriber (204)', async () => {
      await request(server)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: EMAIL_A, name: 'Amara' })
        .expect(204);

      const row = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL_A } });
      expect(row).not.toBeNull();
      expect(row?.isActive).toBe(true);
      expect(row?.name).toBe('Amara');
    });

    it('is idempotent — subscribing the same email again still returns 204', async () => {
      await request(server)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: EMAIL_A })
        .expect(204);

      const rows = await prisma.newsletterSubscriber.findMany({
        where: { email: EMAIL_A },
      });
      expect(rows).toHaveLength(1);
      // Existing name must not be clobbered by a later nameless submission.
      expect(rows[0]?.name).toBe('Amara');
    });

    it('normalizes email to lowercase', async () => {
      await request(server)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: EMAIL_B.toUpperCase() })
        .expect(204);

      const row = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL_B } });
      expect(row).not.toBeNull();
    });

    it('rejects an invalid email (400)', async () => {
      await request(server)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('Admin management', () => {
    it('GET /newsletter/admin requires auth (401)', async () => {
      await request(server).get('/api/v1/newsletter/admin').expect(401);
    });

    it('GET /newsletter/admin returns a paginated envelope', async () => {
      const res = await request(server)
        .get('/api/v1/newsletter/admin')
        .query({ search: SUITE_TAG })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('GET /newsletter/admin?isActive=true filters active subscribers', async () => {
      const res = await request(server)
        .get('/api/v1/newsletter/admin')
        .query({ search: SUITE_TAG, isActive: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (res.body.data.data as Array<{ isActive: boolean }>).every((s) => s.isActive),
      ).toBe(true);
    });

    it('POST /newsletter/admin/:id/unsubscribe deactivates the subscriber', async () => {
      const row = await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: EMAIL_A },
      });
      const res = await request(server)
        .post(`/api/v1/newsletter/admin/${row.id}/unsubscribe`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.unsubscribedAt).not.toBeNull();
    });

    it('re-subscribing a deactivated email reactivates it', async () => {
      await request(server)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: EMAIL_A })
        .expect(204);

      const row = await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: EMAIL_A },
      });
      expect(row.isActive).toBe(true);
      expect(row.unsubscribedAt).toBeNull();
    });

    it('DELETE /newsletter/admin/:id removes the subscriber (204)', async () => {
      const row = await prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: EMAIL_B },
      });
      await request(server)
        .delete(`/api/v1/newsletter/admin/${row.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const gone = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL_B } });
      expect(gone).toBeNull();
    });
  });
});
