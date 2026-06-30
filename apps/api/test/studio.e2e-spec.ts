import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-studio-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

describe('Studio sur-mesure (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let mailSpy: { sends: MailMessage[]; clear: () => void };
  let adminToken = '';
  let clientToken = '';
  let familyId = '';
  let familySlug = '';
  let garmentId = '';
  let fabricA = '';
  let fabricB = '';
  let inactiveFabric = '';

  beforeAll(async () => {
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

    await cleanup();

    // Admin login
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    // Client signup (used for the 403 check)
    const signup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Studio Client', password: PASSWORD })
      .expect(201);
    clientToken = signup.body.data.accessToken;

    // Seed: one family with one garment + two photos + three fabrics
    // (two active, one inactive — used to test the active-only filter).
    const family = await prisma.studioFabricFamily.create({
      data: {
        slug: `${SUITE_TAG}-kente`,
        name: { fr: 'Kente', en: 'Kente' },
        description: { fr: 'Tissage doré', en: 'Golden weave' },
        sortOrder: 0,
      },
    });
    familyId = family.id;
    familySlug = family.slug;

    const garment = await prisma.studioGarment.create({
      data: {
        familyId: family.id,
        name: { fr: 'Robe droite à fente V', en: 'V-slit straight dress' },
        sortOrder: 0,
      },
    });
    garmentId = garment.id;

    await prisma.studioModel.createMany({
      data: [
        { garmentId: garment.id, imageKey: 'studio/test/front.jpg', angle: 'FRONT', sortOrder: 0 },
        { garmentId: garment.id, imageKey: 'studio/test/side.jpg', angle: 'SIDE', sortOrder: 1 },
      ],
    });

    const f1 = await prisma.studioFabric.create({
      data: {
        familyId: family.id,
        name: { fr: 'Kente Magenta Or', en: 'Magenta Gold Kente' },
        sortOrder: 0,
      },
    });
    fabricA = f1.id;

    const f2 = await prisma.studioFabric.create({
      data: {
        familyId: family.id,
        name: { fr: 'Kente Bleu Royal', en: 'Royal Blue Kente' },
        sortOrder: 1,
      },
    });
    fabricB = f2.id;

    const fInactive = await prisma.studioFabric.create({
      data: {
        familyId: family.id,
        name: { fr: 'Kente Retiré', en: 'Retired Kente' },
        isActive: false,
        sortOrder: 99,
      },
    });
    inactiveFabric = fInactive.id;

    await prisma.setting.upsert({
      where: { key: 'CONTACT_EMAIL' },
      create: { key: 'CONTACT_EMAIL', value: 'stylist@celva.test', label: { fr: 'Email', en: 'Email' } },
      update: { value: 'stylist@celva.test' },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function cleanup(): Promise<void> {
    // Wipe any request that references one of our family's fabrics (the
    // M2M FK is Restrict, so leftover requests would block the family
    // delete). Use the SUITE_TAG suffix on customerPhone as a fallback in
    // case a row was created before the photo-only test path.
    await prisma.studioRequest.deleteMany({
      where: {
        OR: [
          { customerPhone: { contains: SUITE_TAG.slice(-6) } },
          {
            selectedFabrics: {
              some: { fabric: { family: { slug: { startsWith: SUITE_TAG } } } },
            },
          },
        ],
      },
    });
    // Cascade from family drops garments → photos → fabrics.
    await prisma.studioFabricFamily.deleteMany({
      where: { slug: { startsWith: SUITE_TAG } },
    });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
  }

  // Customer phone embeds SUITE_TAG so cleanup can scope deletions.
  const phoneFor = (n: number): string =>
    `+237600${SUITE_TAG.slice(-6)}${String(n).padStart(2, '0')}`.slice(0, 13);

  describe('Public — POST /studio/requests', () => {
    it('books an appointment with a multi-fabric selection', async () => {
      mailSpy.clear();
      const res = await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          customerName: 'Amara N.',
          customerPhone: '+237600000001',
          customerEmail: `pick-${SUITE_TAG}@celva.test`,
          appointmentMode: 'ATELIER',
          appointmentDate: '2026-07-01',
          appointmentSlot: '14:00',
          selectedFabricIds: [fabricA, fabricB],
        })
        .expect(201);
      expect(res.body.data.id).toBeTruthy();

      await new Promise((r) => setTimeout(r, 120));
      const customerMail = mailSpy.sends.find((m) => m.tag === 'studio_request_received');
      const internalMail = mailSpy.sends.find((m) => m.tag === 'studio_request_internal');
      expect(customerMail).toBeDefined();
      expect(internalMail).toBeDefined();
      expect(internalMail?.to).toBe('stylist@celva.test');

      const row = await prisma.studioRequest.findUniqueOrThrow({
        where: { id: res.body.data.id },
        include: { selectedFabrics: true },
      });
      expect(row.type).toBe('APPOINTMENT');
      expect(row.appSource).toBe('WEB_STORE');
      expect(row.appointmentSlot).toBe('14:00');
      expect(row.selectedFabrics).toHaveLength(2);
      expect(row.selectedFabrics.map((s) => s.fabricId).sort()).toEqual(
        [fabricA, fabricB].sort(),
      );

      await prisma.studioRequest.update({
        where: { id: row.id },
        data: { customerPhone: phoneFor(1) },
      });
    });

    it('books an appointment with no preselection', async () => {
      const res = await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          customerName: 'Léa',
          customerPhone: '+237600000002',
          appointmentMode: 'VISIO',
          appointmentDate: '2026-07-05',
          appointmentSlot: '10:00',
        })
        .expect(201);

      const row = await prisma.studioRequest.findUniqueOrThrow({
        where: { id: res.body.data.id },
        include: { selectedFabrics: true },
      });
      expect(row.selectedFabrics).toHaveLength(0);

      await prisma.studioRequest.update({
        where: { id: row.id },
        data: { customerPhone: phoneFor(2) },
      });
    });

    it('rejects an inactive fabric in the selection (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          customerName: 'Inactive',
          customerPhone: '+237600000003',
          appointmentMode: 'ATELIER',
          appointmentDate: '2026-07-01',
          appointmentSlot: '10:00',
          selectedFabricIds: [fabricA, inactiveFabric],
        })
        .expect(400);
    });

    it('rejects missing appointment fields (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          customerName: 'Missing',
          customerPhone: '+237600000004',
          appointmentMode: 'ATELIER',
        })
        .expect(400);
    });

    it('rejects an invalid Cameroon phone (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .send({
          customerName: 'BadPhone',
          customerPhone: '1234',
          appointmentMode: 'ATELIER',
          appointmentDate: '2026-07-01',
          appointmentSlot: '10:00',
        })
        .expect(400);
    });
  });

  describe('Public — GET /studio/families', () => {
    it('returns active families with garments + photos + fabrics, inactive fabrics excluded', async () => {
      const res = await request(server).get('/api/v1/studio/families').expect(200);
      const rows = res.body.data.data as Array<{
        id: string;
        slug: string;
        fabrics: Array<{ id: string; isActive: boolean }>;
        garments: Array<{ id: string; photos: Array<{ id: string }> }>;
      }>;
      const kente = rows.find((r) => r.id === familyId);
      expect(kente).toBeDefined();
      expect(kente?.garments.length).toBe(1);
      expect(kente?.garments[0]?.photos.length).toBe(2);
      // Two active fabrics, the inactive one excluded.
      expect(kente?.fabrics.length).toBe(2);
      expect(kente?.fabrics.some((f) => f.id === inactiveFabric)).toBe(false);
    });

    it('GET by-slug returns the family hydrated', async () => {
      const res = await request(server)
        .get(`/api/v1/studio/families/by-slug/${familySlug}`)
        .expect(200);
      expect(res.body.data.id).toBe(familyId);
      expect(res.body.data.garments).toHaveLength(1);
    });
  });

  describe('Admin — /studio/requests/admin', () => {
    let pendingId = '';

    beforeAll(async () => {
      const row = await prisma.studioRequest.create({
        data: {
          type: 'APPOINTMENT',
          customerName: 'Transition',
          customerPhone: phoneFor(9),
          appointmentMode: 'ATELIER',
          appointmentDate: new Date('2026-07-10'),
          appointmentSlot: '11:30',
          appSource: 'WEB_STORE',
          selectedFabrics: {
            create: [{ fabricId: fabricA, sortOrder: 0 }],
          },
        },
      });
      pendingId = row.id;
    });

    it('requires auth (401)', async () => {
      await request(server).get('/api/v1/studio/requests/admin').expect(401);
    });

    it('forbids CLIENT (403)', async () => {
      await request(server)
        .get('/api/v1/studio/requests/admin')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('admin lists includes selected fabrics with family', async () => {
      const res = await request(server)
        .get('/api/v1/studio/requests/admin')
        .query({ status: 'PENDING', search: SUITE_TAG.slice(-6) })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{
        id: string;
        selectedFabrics: Array<{ fabric: { family: { id: string } } }>;
      }>;
      const target = rows.find((r) => r.id === pendingId);
      expect(target).toBeDefined();
      expect(target?.selectedFabrics).toHaveLength(1);
      expect(target?.selectedFabrics[0]?.fabric.family.id).toBe(familyId);
    });

    it('walks the lifecycle PENDING → CONTACTED → CONFIRMED → COMPLETED', async () => {
      const transitionTo = async (status: string) => {
        const res = await request(server)
          .post(`/api/v1/studio/requests/admin/${pendingId}/transition`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status, internalNote: `→ ${status}` })
          .expect(200);
        expect(res.body.data.status).toBe(status);
      };
      await transitionTo('CONTACTED');
      await transitionTo('CONFIRMED');
      await transitionTo('COMPLETED');
    });

    it('rejects an invalid transition (COMPLETED → CONTACTED)', async () => {
      await request(server)
        .post(`/api/v1/studio/requests/admin/${pendingId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONTACTED' })
        .expect(400);
    });
  });

  describe('Admin — /studio/families/admin', () => {
    it('admin can list families including inactive ones', async () => {
      const res = await request(server)
        .get('/api/v1/studio/families/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });
  });

  describe('Admin — /studio/garments/admin', () => {
    it('admin can list garments filtered by familyId', async () => {
      const res = await request(server)
        .get('/api/v1/studio/garments/admin')
        .query({ familyId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ id: string }>;
      expect(rows.some((r) => r.id === garmentId)).toBe(true);
    });
  });
});
