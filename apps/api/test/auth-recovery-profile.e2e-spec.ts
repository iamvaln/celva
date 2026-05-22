import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

const SUITE_TAG = `e2e-rec-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'OldPass123!';
const NEW_PASSWORD = 'NewPass456!';

/**
 * Batch X — auth recovery (forgot/reset password) + self-service profile
 * (PATCH /auth/me, POST /auth/me/password).
 */
describe('Auth recovery + profile (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let mailSpy: { sends: MailMessage[]; clear: () => void };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    mailSpy = {
      sends: [],
      clear() {
        this.sends.length = 0;
      },
    };
    const mailMock: Partial<MailService> = {
      send: async (m: MailMessage) => {
        mailSpy.sends.push(m);
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();
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
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { user: { email: CLIENT_EMAIL } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: CLIENT_EMAIL } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: CLIENT_EMAIL } },
    });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await app?.close();
  });

  const signupFresh = async (): Promise<string> => {
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    const res = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Recovery Test', password: PASSWORD })
      .expect(201);
    return res.body.data.accessToken as string;
  };

  const loginWith = async (password: string): Promise<number> => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: CLIENT_EMAIL, password });
    return res.status;
  };

  describe('PATCH /auth/me — profile update', () => {
    it('updates name + phone', async () => {
      const token = await signupFresh();
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Customer', phone: '+237698111222' })
        .expect(200);
      expect(res.body.data.name).toBe('Renamed Customer');
      expect(res.body.data.phone).toBe('+237698111222');
    });

    it('empty phone unsets it', async () => {
      const token = await signupFresh();
      await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+237698111222' })
        .expect(200);
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '' })
        .expect(200);
      expect(res.body.data.phone).toBeNull();
    });

    it('rejects malformed phone (400)', async () => {
      const token = await signupFresh();
      await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '1234' })
        .expect(400);
    });

    it('rejects extra fields per whitelist (cannot self-promote)', async () => {
      const token = await signupFresh();
      await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    it('401 anon', async () => {
      await request(server)
        .patch('/api/v1/auth/me')
        .send({ name: 'x' })
        .expect(401);
    });
  });

  describe('POST /auth/me/password — change password', () => {
    it('changes password; old password no longer works, new one does', async () => {
      const token = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);
      expect(await loginWith(PASSWORD)).toBe(401);
      expect(await loginWith(NEW_PASSWORD)).toBe(200);
    });

    it('rejects wrong current password (400)', async () => {
      const token = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong', newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('rejects too-short new password (400)', async () => {
      const token = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newPassword: 'short' })
        .expect(400);
    });

    it('revokes other refresh tokens after password change', async () => {
      await signupFresh();
      // Two parallel logins → two refresh tokens
      const login1 = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD })
        .expect(200);
      const login2 = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD })
        .expect(200);
      const cookies1 = login1.headers['set-cookie'] as unknown;
      const cookieArray = Array.isArray(cookies1) ? cookies1 : cookies1 ? [String(cookies1)] : [];
      const refresh1 = cookieArray.find((c) => c.startsWith('celva_refresh='));
      expect(refresh1).toBeDefined();

      const token2 = login2.body.data.accessToken as string;
      await request(server)
        .post('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${token2}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      // The first session's refresh token should no longer work.
      const tokens = await prisma.refreshToken.findMany({
        where: { user: { email: CLIENT_EMAIL } },
      });
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
    });
  });

  describe('POST /auth/forgot-password — request reset', () => {
    it('always returns 204 (no email enumeration)', async () => {
      await signupFresh();
      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: CLIENT_EMAIL })
        .expect(204);
      // Unknown emails still get 204
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: `nope-${SUITE_TAG}@celva.test` })
        .expect(204);
    });

    it('sends a reset email tagged password_reset for an existing user', async () => {
      await signupFresh();
      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: CLIENT_EMAIL })
        .expect(204);
      // The send is fire-and-forget — give it a beat.
      await new Promise((r) => setTimeout(r, 100));
      const reset = mailSpy.sends.find((m) => m.tag === 'password_reset');
      expect(reset).toBeDefined();
      expect(reset?.to).toBe(CLIENT_EMAIL);
      // URL embeds the FR localized path + a token query.
      expect(reset?.text).toMatch(/reinitialiser-mot-de-passe\?token=/);
    });

    it('silent for an unknown email — no email sent', async () => {
      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: `nobody-${SUITE_TAG}@celva.test` })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      expect(mailSpy.sends.filter((m) => m.tag === 'password_reset')).toHaveLength(0);
    });
  });

  describe('POST /auth/reset-password — consume token', () => {
    it('consumes a valid token and sets a new password', async () => {
      await signupFresh();
      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: CLIENT_EMAIL })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      const reset = mailSpy.sends.find((m) => m.tag === 'password_reset');
      const match = reset?.text?.match(/token=([^\s&]+)/);
      expect(match).toBeTruthy();
      const token = match![1]!;

      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(204);

      expect(await loginWith(PASSWORD)).toBe(401);
      expect(await loginWith(NEW_PASSWORD)).toBe(200);
    });

    it('rejects an invalid token (400)', async () => {
      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'totally-invalid', newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('rejects a too-short new password (400)', async () => {
      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'whatever', newPassword: 'short' })
        .expect(400);
    });
  });
});
