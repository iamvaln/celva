import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { waitFor } from './utils/wait-for';

const SUITE_TAG = `e2e-dz-${Date.now()}`;
const CLIENT_EMAIL = `dz-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

/**
 * Account "danger zone" — sign-out-all-devices and self-delete
 * (anonymize). Both gated by current password.
 */
describe('Account danger zone (e2e)', () => {
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

    await sweepUsers(prisma, [CLIENT_EMAIL]);
  });

  afterAll(async () => {
    // Self-delete anonymizes to deleted-<uuid>@celva.deleted, so we sweep
    // by id range too. Find any deleted-emails created during this run.
    const all = await prisma.user.findMany({
      where: {
        OR: [
          { email: CLIENT_EMAIL },
          { email: { endsWith: '@celva.deleted' } },
        ],
      },
      select: { id: true, email: true },
    });
    const emails = all.map((u) => u.email);
    await sweepUsers(prisma, emails);
    await app?.close();
  });

  const signupFresh = async (): Promise<{
    token: string;
    userId: string;
  }> => {
    await sweepUsers(prisma, [CLIENT_EMAIL]);
    const res = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Danger Zone Test', password: PASSWORD })
      .expect(201);
    return { token: res.body.data.accessToken, userId: res.body.data.user.id };
  };

  describe('POST /auth/me/sign-out-all', () => {
    it('revokes every refresh token on the account', async () => {
      const { token, userId } = await signupFresh();
      // Two more logins → three refresh tokens total
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD })
        .expect(200);
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD })
        .expect(200);

      await request(server)
        .post('/api/v1/auth/me/sign-out-all')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);

      const tokens = await prisma.refreshToken.findMany({ where: { userId } });
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
    });

    it('writes a SIGN_OUT_ALL_DEVICES audit entry', async () => {
      const { token, userId } = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/sign-out-all')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);
      // Fire-and-forget interceptor write — poll instead of reading once.
      const log = await waitFor(() =>
        prisma.auditLog.findFirst({
          where: { userId, action: 'SIGN_OUT_ALL_DEVICES' },
        }),
      );
      expect(log).toBeTruthy();
      expect(log?.entityId).toBe(userId);
    });

    it('rejects wrong password (400)', async () => {
      const { token } = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/sign-out-all')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'nope' })
        .expect(400);
    });

    it('401 anon', async () => {
      await request(server)
        .post('/api/v1/auth/me/sign-out-all')
        .send({ currentPassword: PASSWORD })
        .expect(401);
    });
  });

  describe('POST /auth/me/delete', () => {
    it('anonymizes the user: scrubs PII, marks inactive, kills login', async () => {
      const { token, userId } = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);

      const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(after.email).toBe(`deleted-${userId}@celva.deleted`);
      expect(after.name).toBe('Compte supprimé');
      expect(after.phone).toBeNull();
      expect(after.isActive).toBe(false);
      expect(after.passwordHash).not.toMatch(/^\$2[aby]\$/); // not bcrypt

      // Old email no longer logs in
      const loginOld = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: CLIENT_EMAIL, password: PASSWORD });
      expect([401, 403]).toContain(loginOld.status);

      // Refresh tokens all revoked
      const tokens = await prisma.refreshToken.findMany({ where: { userId } });
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
    });

    it('writes an ACCOUNT_DELETE audit entry with the previous email', async () => {
      const { token, userId } = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);
      const log = await prisma.auditLog.findFirst({
        where: { userId, action: 'ACCOUNT_DELETE' },
      });
      expect(log).toBeTruthy();
      const meta = log!.metadata as { previousEmail?: string };
      expect(meta.previousEmail).toBe(CLIENT_EMAIL);
    });

    it('rejects wrong password (400)', async () => {
      const { token } = await signupFresh();
      await request(server)
        .post('/api/v1/auth/me/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'nope' })
        .expect(400);
    });

    it('blocks deletion when an order is in flight (PENDING/CONFIRMED)', async () => {
      const { token, userId } = await signupFresh();
      // Fake an in-flight order. We can't easily walk checkout from here
      // without a full catalogue fixture; create a minimal Order row
      // directly with raw Prisma — it just needs to exist with the
      // blocking status, the delete check only counts.
      await prisma.order.create({
        data: {
          userId,
          orderNumber: `CLV-DZ-${Date.now()}-0001`,
          status: 'CONFIRMED',
          channel: 'WEBSITE',
          subtotal: 0,
          deliveryFee: 0,
          discount: 0,
          taxAmount: 0,
          total: 0,
        },
      });

      const res = await request(server)
        .post('/api/v1/auth/me/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(400);
      expect(res.body.message).toBeTruthy();

      // User still active
      const me = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(me.isActive).toBe(true);
      expect(me.email).toBe(CLIENT_EMAIL);
    });

    it('allows deletion after the only order is COMPLETED', async () => {
      const { token, userId } = await signupFresh();
      await prisma.order.create({
        data: {
          userId,
          orderNumber: `CLV-DZ-${Date.now()}-0002`,
          status: 'COMPLETED',
          channel: 'WEBSITE',
          subtotal: 0,
          deliveryFee: 0,
          discount: 0,
          taxAmount: 0,
          total: 0,
        },
      });
      await request(server)
        .post('/api/v1/auth/me/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);
    });

    it('401 anon', async () => {
      await request(server)
        .post('/api/v1/auth/me/delete')
        .send({ currentPassword: PASSWORD })
        .expect(401);
    });
  });
});

// ── helpers ───────────────────────────────────────────────────────────────

async function sweepUsers(prisma: PrismaService, emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  // Same FK order as auth-recovery-profile: peel auth tokens, audit logs,
  // and the order chain (orders → orderItems / payment / delivery / stock
  // movements) BEFORE the user delete.
  const userWhere = { userId: { in: userIds } };
  await prisma.auditLog.deleteMany({ where: userWhere });
  await prisma.refreshToken.deleteMany({ where: userWhere });
  await prisma.passwordResetToken.deleteMany({ where: userWhere });
  await prisma.emailChangeToken.deleteMany({ where: userWhere });

  const orders = await prisma.order.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
