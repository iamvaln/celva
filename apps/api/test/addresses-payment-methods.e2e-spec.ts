import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const SUITE_TAG = `e2e-addr-${Date.now()}`;
const ALICE_EMAIL = `alice-${SUITE_TAG}@celva.test`;
const BOB_EMAIL = `bob-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Addresses + SavedPaymentMethods (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let aliceToken = '';
  let bobToken = '';

  const signup = async (email: string): Promise<string> => {
    const res = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email, name: 'Test Client', password: PASSWORD })
      .expect(201);
    return res.body.data.accessToken;
  };

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

    await prisma.user.deleteMany({ where: { email: { in: [ALICE_EMAIL, BOB_EMAIL] } } });

    aliceToken = await signup(ALICE_EMAIL);
    bobToken = await signup(BOB_EMAIL);
  });

  afterAll(async () => {
    // AuditLog.userId is a non-cascading FK (audit trail outlives users).
    // For the test we wipe the logs we generated before removing the users.
    const users = await prisma.user.findMany({
      where: { email: { in: [ALICE_EMAIL, BOB_EMAIL] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { in: [ALICE_EMAIL, BOB_EMAIL] } } });
    await app?.close();
  });

  describe('/me/addresses', () => {
    let firstAddressId = '';
    let secondAddressId = '';

    it('GET requires auth (401)', async () => {
      await request(server).get('/api/v1/me/addresses').expect(401);
    });

    it('POST first address auto-promotes to default', async () => {
      const res = await request(server)
        .post('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          label: 'Maison',
          fullName: 'Alice Mboma',
          phone: '+237698123456',
          line1: 'Rue 1.234, Bonapriso',
          city: 'Douala',
          zone: 'douala-central',
        })
        .expect(201);
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.country).toBe('CM');
      firstAddressId = res.body.data.id;
    });

    it('POST second address stays non-default by default', async () => {
      const res = await request(server)
        .post('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          label: 'Bureau',
          fullName: 'Alice Mboma',
          phone: '+237698999000',
          line1: 'Akwa, immeuble Vista, 3e étage',
          city: 'Douala',
        })
        .expect(201);
      expect(res.body.data.isDefault).toBe(false);
      secondAddressId = res.body.data.id;
    });

    it('POST rejects invalid phone (400)', async () => {
      await request(server)
        .post('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          label: 'Mauvais',
          fullName: 'X',
          phone: '+33611223344', // not Cameroon
          line1: 'rue X',
          city: 'Paris',
        })
        .expect(400);
    });

    it('GET lists both with default first', async () => {
      const res = await request(server)
        .get('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      const list = res.body.data as Array<{ id: string; isDefault: boolean }>;
      expect(list.length).toBe(2);
      expect(list[0]?.isDefault).toBe(true);
    });

    it('PATCH promote 2nd to default flips the 1st off', async () => {
      await request(server)
        .patch(`/api/v1/me/addresses/${secondAddressId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ isDefault: true })
        .expect(200);
      const res = await request(server)
        .get('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      const list = res.body.data as Array<{ id: string; isDefault: boolean }>;
      const defaults = list.filter((a) => a.isDefault);
      expect(defaults.length).toBe(1);
      expect(defaults[0]?.id).toBe(secondAddressId);
    });

    it('GET another user\'s address is forbidden (403)', async () => {
      await request(server)
        .get(`/api/v1/me/addresses/${firstAddressId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(403);
    });

    it('DELETE default address promotes the remaining one to default', async () => {
      await request(server)
        .delete(`/api/v1/me/addresses/${secondAddressId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(204);
      const res = await request(server)
        .get('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      const list = res.body.data as Array<{ id: string; isDefault: boolean }>;
      expect(list.length).toBe(1);
      expect(list[0]?.id).toBe(firstAddressId);
      expect(list[0]?.isDefault).toBe(true);
    });

    it('DELETE last address leaves an empty list', async () => {
      await request(server)
        .delete(`/api/v1/me/addresses/${firstAddressId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(204);
      const res = await request(server)
        .get('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('/me/payment-methods', () => {
    let omId = '';
    let momoId = '';

    it('POST first method auto-promotes to default', async () => {
      const res = await request(server)
        .post('/api/v1/me/payment-methods')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          method: 'ORANGE_MONEY',
          label: 'OM perso',
          phoneNumber: '+237698123456',
        })
        .expect(201);
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.method).toBe('ORANGE_MONEY');
      omId = res.body.data.id;
    });

    it('POST rejects CASH_ON_DELIVERY (400, not saveable)', async () => {
      await request(server)
        .post('/api/v1/me/payment-methods')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          method: 'CASH_ON_DELIVERY',
          label: 'Cash',
          phoneNumber: '+237698123456',
        })
        .expect(400);
    });

    it('POST a MoMo method does not steal default', async () => {
      const res = await request(server)
        .post('/api/v1/me/payment-methods')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          method: 'MTN_MOMO',
          label: 'MTN bureau',
          phoneNumber: '+237677456789',
        })
        .expect(201);
      expect(res.body.data.isDefault).toBe(false);
      momoId = res.body.data.id;
    });

    it('PATCH switching default flips the previous one off', async () => {
      await request(server)
        .patch(`/api/v1/me/payment-methods/${momoId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ isDefault: true })
        .expect(200);
      const res = await request(server)
        .get('/api/v1/me/payment-methods')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      const list = res.body.data as Array<{ id: string; isDefault: boolean }>;
      expect(list.filter((m) => m.isDefault).length).toBe(1);
      expect(list.find((m) => m.isDefault)?.id).toBe(momoId);
    });

    it('PATCH cannot change method (whitelist strips it)', async () => {
      // forbidNonWhitelisted: extra/forbidden fields rejected 400
      await request(server)
        .patch(`/api/v1/me/payment-methods/${omId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ method: 'MTN_MOMO' })
        .expect(400);
    });

    it('Other user cannot access (403)', async () => {
      await request(server)
        .get(`/api/v1/me/payment-methods/${omId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(403);
    });

    it('Cleans up at the end', async () => {
      await request(server)
        .delete(`/api/v1/me/payment-methods/${momoId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(204);
      const res = await request(server)
        .get('/api/v1/me/payment-methods')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      const list = res.body.data as Array<{ id: string; isDefault: boolean }>;
      expect(list.length).toBe(1);
      expect(list[0]?.isDefault).toBe(true); // OM promoted back to default
    });
  });
});
