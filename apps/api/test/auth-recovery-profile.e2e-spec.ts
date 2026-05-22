import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

const SUITE_TAG = `e2e-rec-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const NEW_EMAIL = `client-${SUITE_TAG}-new@celva.test`;
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
    const where = { user: { email: { in: [CLIENT_EMAIL, NEW_EMAIL] } } };
    await prisma.refreshToken.deleteMany({ where });
    await prisma.passwordResetToken.deleteMany({ where });
    await prisma.emailChangeToken.deleteMany({ where });
    await prisma.auditLog.deleteMany({ where });
    await prisma.user.deleteMany({ where: { email: { in: [CLIENT_EMAIL, NEW_EMAIL] } } });
    await app?.close();
  });

  const signupFresh = async (
    opts: { acceptLanguage?: string } = {},
  ): Promise<string> => {
    await prisma.user.deleteMany({
      where: { email: { in: [CLIENT_EMAIL, NEW_EMAIL] } },
    });
    const req = request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Recovery Test', password: PASSWORD });
    if (opts.acceptLanguage) req.set('Accept-Language', opts.acceptLanguage);
    const res = await req.expect(201);
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

  describe('Email change (verify-before-change)', () => {
    const requestChange = async (
      token: string,
      body: { currentPassword: string; newEmail: string },
      expectStatus = 204,
    ): Promise<void> => {
      await request(server)
        .post('/api/v1/auth/me/email-change-request')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(expectStatus);
    };

    const grabTokenFromMail = async (): Promise<string> => {
      await new Promise((r) => setTimeout(r, 100));
      const mail = mailSpy.sends.find((m) => m.tag === 'email_change_confirm');
      expect(mail).toBeDefined();
      const m = mail!.text?.match(/token=([^\s&]+)/);
      expect(m).toBeTruthy();
      return m![1]!;
    };

    it('sends a verification email to the new address (not the old one)', async () => {
      const token = await signupFresh();
      mailSpy.clear();
      await requestChange(token, { currentPassword: PASSWORD, newEmail: NEW_EMAIL });
      await new Promise((r) => setTimeout(r, 100));
      const mail = mailSpy.sends.find((m) => m.tag === 'email_change_confirm');
      expect(mail).toBeDefined();
      expect(mail?.to).toBe(NEW_EMAIL);
      // Dev-mode contract: the URL includes the localized FR path so the
      // operator can grab it from logs and walk the flow manually.
      expect(mail?.text).toMatch(/confirmer-changement-email\?token=/);
    });

    it("does NOT change the user's email at request time", async () => {
      const token = await signupFresh();
      await requestChange(token, { currentPassword: PASSWORD, newEmail: NEW_EMAIL });
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.email).toBe(CLIENT_EMAIL);
    });

    it('rejects a wrong current password (400)', async () => {
      const token = await signupFresh();
      await requestChange(
        token,
        { currentPassword: 'nope', newEmail: NEW_EMAIL },
        400,
      );
    });

    it('rejects an email matching the current one (400 email_unchanged)', async () => {
      const token = await signupFresh();
      await requestChange(
        token,
        { currentPassword: PASSWORD, newEmail: CLIENT_EMAIL.toUpperCase() },
        400,
      );
    });

    it('rejects an email already used by another account (400)', async () => {
      // Seed a second user with NEW_EMAIL so it's taken.
      const token = await signupFresh();
      await request(server)
        .post('/api/v1/auth/signup')
        .send({ email: NEW_EMAIL, name: 'Other', password: PASSWORD })
        .expect(201);
      await requestChange(
        token,
        { currentPassword: PASSWORD, newEmail: NEW_EMAIL },
        400,
      );
    });

    it('rejects malformed new email (400)', async () => {
      const token = await signupFresh();
      await requestChange(
        token,
        { currentPassword: PASSWORD, newEmail: 'not-an-email' },
        400,
      );
    });

    it('401 anon on request', async () => {
      await request(server)
        .post('/api/v1/auth/me/email-change-request')
        .send({ currentPassword: PASSWORD, newEmail: NEW_EMAIL })
        .expect(401);
    });

    it('confirms with the token from email → user.email is swapped, sessions revoked', async () => {
      const token = await signupFresh();
      // Take a second session to verify it gets killed.
      const otherLogin = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD })
        .expect(200);
      expect(otherLogin.body.data.accessToken).toBeTruthy();

      mailSpy.clear();
      await requestChange(token, { currentPassword: PASSWORD, newEmail: NEW_EMAIL });
      const t = await grabTokenFromMail();

      const res = await request(server)
        .post('/api/v1/auth/email-change-confirm')
        .send({ token: t })
        .expect(200);
      expect(res.body.data.email).toBe(NEW_EMAIL);

      // Old email no longer logs in
      const oldLogin = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD });
      expect(oldLogin.status).toBe(401);

      // New email does
      const newLogin = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: NEW_EMAIL, password: PASSWORD });
      expect(newLogin.status).toBe(200);

      // All refresh tokens revoked
      const tokens = await prisma.refreshToken.findMany({
        where: { user: { email: NEW_EMAIL } },
      });
      // The fresh login above issues a new refresh token; everything BEFORE
      // it should be revoked.
      const olderRevoked = tokens.filter((t) => t.createdAt < new Date()).slice(0, -1);
      expect(olderRevoked.every((t) => t.revokedAt !== null || tokens.length === 1)).toBe(true);
    });

    it('rejects an invalid confirm token (400)', async () => {
      await request(server)
        .post('/api/v1/auth/email-change-confirm')
        .send({ token: 'totally-invalid-12345' })
        .expect(400);
    });

    it('a single token can only be consumed once', async () => {
      const token = await signupFresh();
      mailSpy.clear();
      await requestChange(token, { currentPassword: PASSWORD, newEmail: NEW_EMAIL });
      const t = await grabTokenFromMail();
      await request(server)
        .post('/api/v1/auth/email-change-confirm')
        .send({ token: t })
        .expect(200);
      await request(server)
        .post('/api/v1/auth/email-change-confirm')
        .send({ token: t })
        .expect(400);
    });
  });

  describe('User locale (persisted preference)', () => {
    it('signup captures Accept-Language → user.locale=en for english header', async () => {
      const token = await signupFresh({ acceptLanguage: 'en-US,en;q=0.9' });
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.locale).toBe('en');
    });

    it('signup defaults to fr when no Accept-Language header is sent', async () => {
      const token = await signupFresh();
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.locale).toBe('fr');
    });

    it('unsupported Accept-Language falls back to fr', async () => {
      const token = await signupFresh({ acceptLanguage: 'de-DE,de;q=0.9' });
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.locale).toBe('fr');
    });

    it('PATCH /auth/me updates locale', async () => {
      const token = await signupFresh();
      const res = await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'en' })
        .expect(200);
      expect(res.body.data.locale).toBe('en');
    });

    it('PATCH /auth/me rejects unsupported locales (400)', async () => {
      const token = await signupFresh();
      await request(server)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'de' })
        .expect(400);
    });

    it('forgot-password URL respects user.locale (en → EN path)', async () => {
      const token = await signupFresh({ acceptLanguage: 'en' });
      // confirm locale captured
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.locale).toBe('en');

      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: CLIENT_EMAIL })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      const reset = mailSpy.sends.find((m) => m.tag === 'password_reset');
      expect(reset?.text).toContain('/en/reset-password?token=');
      expect(reset?.text).not.toContain('/fr/reinitialiser-mot-de-passe');
    });

    it('forgot-password URL respects user.locale (fr → FR path)', async () => {
      const token = await signupFresh({ acceptLanguage: 'fr' });
      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(me.body.data.locale).toBe('fr');

      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: CLIENT_EMAIL })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      const reset = mailSpy.sends.find((m) => m.tag === 'password_reset');
      expect(reset?.text).toContain('/fr/reinitialiser-mot-de-passe?token=');
    });

    it('email-change confirm URL respects user.locale (en)', async () => {
      const token = await signupFresh({ acceptLanguage: 'en' });
      mailSpy.clear();
      await request(server)
        .post('/api/v1/auth/me/email-change-request')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newEmail: NEW_EMAIL })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      const mail = mailSpy.sends.find((m) => m.tag === 'email_change_confirm');
      expect(mail?.text).toContain('/en/confirm-email-change?token=');
    });
  });
});
