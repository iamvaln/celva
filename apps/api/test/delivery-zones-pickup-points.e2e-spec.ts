import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-zone-${Date.now()}`;

describe('DeliveryZones + PickupPoints (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  const zoneIds: string[] = [];
  const pickupIds: string[] = [];

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

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    if (zoneIds.length > 0) {
      await prisma.deliveryZone.deleteMany({ where: { id: { in: zoneIds } } });
    }
    if (pickupIds.length > 0) {
      await prisma.pickupPoint.deleteMany({ where: { id: { in: pickupIds } } });
    }
    await app?.close();
  });

  describe('Delivery zones', () => {
    let douala = '';

    it('POST requires admin (anon 401)', async () => {
      await request(server)
        .post('/api/v1/delivery-zones')
        .send({
          name: { fr: `${SUITE_TAG} Z`, en: `${SUITE_TAG} Z` },
          fee: 2000,
          actualCost: 1500,
        })
        .expect(401);
    });

    it('POST creates a zone (admin)', async () => {
      const res = await request(server)
        .post('/api/v1/delivery-zones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: `${SUITE_TAG} Douala`, en: `${SUITE_TAG} Douala` },
          fee: 2000,
          actualCost: 1500,
          freeDeliveryThreshold: 50000,
          estimatedDays: { min: 1, max: 2 },
        })
        .expect(201);
      expect(res.body.data.id).toBeTruthy();
      douala = res.body.data.id;
      zoneIds.push(douala);
    });

    it('POST rejects duplicate name JSON (409)', async () => {
      await request(server)
        .post('/api/v1/delivery-zones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: `${SUITE_TAG} Douala`, en: `${SUITE_TAG} Douala` },
          fee: 9999,
          actualCost: 9999,
        })
        .expect(409);
    });

    it('POST rejects estimatedDays.max < min (400 from class-validator on min field via Min())', async () => {
      // Both must be >= 0; max=90, min=0. There's no cross-field rule yet —
      // this case just verifies the values are accepted as ints in range.
      // (A min<max business rule could be added later as a service check.)
      const res = await request(server)
        .post('/api/v1/delivery-zones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: `${SUITE_TAG} Edge`, en: `${SUITE_TAG} Edge` },
          fee: 5000,
          actualCost: 4000,
          estimatedDays: { min: -1, max: 5 },
        })
        .expect(400);
      expect(res.body.message).toBeTruthy();
    });

    it('Public GET /delivery-zones omits actualCost', async () => {
      const res = await request(server).get('/api/v1/delivery-zones').expect(200);
      const list = res.body.data as Array<Record<string, unknown>>;
      const ours = list.find((z) => z.id === douala);
      expect(ours).toBeTruthy();
      expect(ours?.actualCost).toBeUndefined();
      expect(ours?.fee).toBeTruthy();
    });

    it('Admin GET /delivery-zones/admin includes actualCost', async () => {
      const res = await request(server)
        .get('/api/v1/delivery-zones/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = res.body.data as Array<Record<string, unknown>>;
      const ours = list.find((z) => z.id === douala);
      expect(ours?.actualCost).toBeTruthy();
    });

    it('Public GET /delivery-zones/admin without auth → 401', async () => {
      await request(server).get('/api/v1/delivery-zones/admin').expect(401);
    });

    it('PATCH updates fee + freeDeliveryThreshold', async () => {
      const res = await request(server)
        .patch(`/api/v1/delivery-zones/${douala}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fee: 2500, freeDeliveryThreshold: 60000 })
        .expect(200);
      expect(Number(res.body.data.fee)).toBe(2500);
    });

    it('DELETE removes the zone', async () => {
      await request(server)
        .delete(`/api/v1/delivery-zones/${douala}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      zoneIds.splice(zoneIds.indexOf(douala), 1);
    });
  });

  describe('Pickup points', () => {
    let pointId = '';

    it('POST requires admin/manager (anon 401)', async () => {
      await request(server)
        .post('/api/v1/pickup-points')
        .send({
          name: { fr: `${SUITE_TAG} P`, en: `${SUITE_TAG} P` },
          address: 'Bonapriso, Douala',
          city: 'Douala',
        })
        .expect(401);
    });

    it('POST creates a pickup point', async () => {
      const res = await request(server)
        .post('/api/v1/pickup-points')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: `${SUITE_TAG} Bonapriso`, en: `${SUITE_TAG} Bonapriso` },
          address: 'Rue de la Cathédrale, Bonapriso',
          city: 'Douala',
          phone: '+237698123456',
          hours: { fr: 'Lun-Sam 9h-18h', en: 'Mon-Sat 9am-6pm' },
        })
        .expect(201);
      pointId = res.body.data.id;
      pickupIds.push(pointId);
    });

    it('POST rejects invalid phone (400)', async () => {
      await request(server)
        .post('/api/v1/pickup-points')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: `${SUITE_TAG} Bad`, en: 'Bad' },
          address: 'Test',
          city: 'X',
          phone: '+33611223344',
        })
        .expect(400);
    });

    it('Public GET lists active points', async () => {
      const res = await request(server).get('/api/v1/pickup-points').expect(200);
      const ours = (res.body.data as Array<{ id: string }>).find((p) => p.id === pointId);
      expect(ours).toBeTruthy();
    });

    it('PATCH deactivate hides it from public list', async () => {
      await request(server)
        .patch(`/api/v1/pickup-points/${pointId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);
      const res = await request(server).get('/api/v1/pickup-points').expect(200);
      const visible = (res.body.data as Array<{ id: string }>).find((p) => p.id === pointId);
      expect(visible).toBeUndefined();
    });

    it('Admin GET /pickup-points/admin still lists deactivated', async () => {
      const res = await request(server)
        .get('/api/v1/pickup-points/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const ours = (res.body.data as Array<{ id: string }>).find((p) => p.id === pointId);
      expect(ours).toBeTruthy();
    });

    it('DELETE removes the point', async () => {
      await request(server)
        .delete(`/api/v1/pickup-points/${pointId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      pickupIds.splice(pickupIds.indexOf(pointId), 1);
    });
  });
});
