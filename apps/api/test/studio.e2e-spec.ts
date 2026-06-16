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
  let modelId = '';
  let modelSlug = '';
  let fabricId = '';
  let otherFabricId = ''; // belongs to a different model — used for cross-model rejection

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

    // Seed two models + fabrics directly via Prisma — simpler than going
    // through the admin endpoints for fixture setup.
    const dafani = await prisma.studioModel.create({
      data: {
        slug: `${SUITE_TAG}-dafani`,
        name: { fr: 'Robe Dafani', en: 'Dafani Dress' },
        material: { fr: 'Coton toghu', en: 'Toghu cotton' },
        basePrice: 66000,
        delayLabel: { fr: '4 à 6 semaines', en: '4 to 6 weeks' },
        sortOrder: 0,
      },
    });
    modelId = dafani.id;
    modelSlug = dafani.slug;

    const fabric = await prisma.studioFabric.create({
      data: {
        modelId: dafani.id,
        name: { fr: 'Toghu Royal', en: 'Royal Toghu' },
      },
    });
    fabricId = fabric.id;

    const nani = await prisma.studioModel.create({
      data: {
        slug: `${SUITE_TAG}-nani`,
        name: { fr: 'Boubou Nani', en: 'Nani Boubou' },
        basePrice: 65000,
        delayLabel: { fr: '4 à 6 semaines', en: '4 to 6 weeks' },
        sortOrder: 1,
      },
    });
    const otherFabric = await prisma.studioFabric.create({
      data: {
        modelId: nani.id,
        name: { fr: 'Satin Braise', en: 'Ember Satin' },
      },
    });
    otherFabricId = otherFabric.id;

    // CONTACT_EMAIL setting is seeded by the API seed; ensure it exists for
    // the internal-email dispatch.
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
    await prisma.studioRequest.deleteMany({
      where: { customerPhone: { contains: SUITE_TAG } },
    });
    await prisma.studioGalleryItem.deleteMany({
      where: { model: { slug: { startsWith: SUITE_TAG } } },
    });
    await prisma.studioFabric.deleteMany({
      where: { model: { slug: { startsWith: SUITE_TAG } } },
    });
    await prisma.studioModel.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
  }

  // The customer phone embeds SUITE_TAG so cleanup can scope deletions.
  const phoneFor = (n: number): string => `+237600${SUITE_TAG.slice(-6)}${String(n).padStart(2, '0')}`.slice(0, 13);

  describe('Public — POST /studio/requests', () => {
    it('creates an ORDER request and fires 2 mails', async () => {
      mailSpy.clear();
      const res = await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          type: 'ORDER',
          customerName: 'Amara N.',
          customerPhone: '+237600000001',
          customerEmail: `order-${SUITE_TAG}@celva.test`,
          modelId,
          fabricId,
          sizeRef: 'M / 38',
          measurementMode: 'WHATSAPP',
          gender: 'FEMME',
          skinToneIndex: 4,
          silhouetteSize: 'M',
          silhouetteHeight: 168,
        })
        .expect(201);
      expect(res.body.data.id).toBeTruthy();

      // Wait briefly for the fire-and-forget dispatch.
      await new Promise((r) => setTimeout(r, 120));
      const customerMail = mailSpy.sends.find((m) => m.tag === 'studio_request_received');
      const internalMail = mailSpy.sends.find((m) => m.tag === 'studio_request_internal');
      expect(customerMail).toBeDefined();
      expect(internalMail).toBeDefined();
      expect(internalMail?.to).toBe('stylist@celva.test');

      const row = await prisma.studioRequest.findUniqueOrThrow({
        where: { id: res.body.data.id },
      });
      expect(row.type).toBe('ORDER');
      expect(row.appSource).toBe('WEB_STORE');
      expect(row.modelId).toBe(modelId);
      expect(row.fabricId).toBe(fabricId);
      expect(row.sizeRef).toBe('M / 38');
      // For cleanup scoping
      await prisma.studioRequest.update({
        where: { id: row.id },
        data: { customerPhone: phoneFor(1) },
      });
    });

    it('creates an APPOINTMENT request', async () => {
      mailSpy.clear();
      const res = await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          type: 'APPOINTMENT',
          customerName: 'Léa',
          customerPhone: '+237600000002',
          appointmentMode: 'ATELIER',
          appointmentDate: '2026-07-01',
          appointmentSlot: '14:00',
        })
        .expect(201);
      expect(res.body.data.id).toBeTruthy();

      await prisma.studioRequest.update({
        where: { id: res.body.data.id },
        data: { customerPhone: phoneFor(2) },
      });
    });

    it('rejects ORDER without modelId/fabricId/sizeRef/measurementMode (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          type: 'ORDER',
          customerName: 'Missing',
          customerPhone: '+237600000003',
        })
        .expect(400);
    });

    it('rejects APPOINTMENT without date/slot (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          type: 'APPOINTMENT',
          customerName: 'Missing',
          customerPhone: '+237600000004',
          appointmentMode: 'VISIO',
        })
        .expect(400);
    });

    it('rejects ORDER when fabric belongs to a different model (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .set('X-App-Source', 'WEB_STORE')
        .send({
          type: 'ORDER',
          customerName: 'Mismatch',
          customerPhone: '+237600000005',
          modelId,
          fabricId: otherFabricId,
          sizeRef: 'M / 38',
          measurementMode: 'ATELIER',
        })
        .expect(400);
    });

    it('rejects an invalid Cameroon phone (400)', async () => {
      await request(server)
        .post('/api/v1/studio/requests')
        .send({
          type: 'APPOINTMENT',
          customerName: 'BadPhone',
          customerPhone: '1234',
          appointmentMode: 'ATELIER',
          appointmentDate: '2026-07-01',
          appointmentSlot: '10:00',
        })
        .expect(400);
    });
  });

  describe('Public — GET /studio/models', () => {
    it('returns active models with fabrics + galleryItems', async () => {
      const res = await request(server).get('/api/v1/studio/models').expect(200);
      const rows = res.body.data.data as Array<{
        id: string;
        slug: string;
        fabrics: unknown[];
        galleryItems: unknown[];
      }>;
      const dafani = rows.find((r) => r.id === modelId);
      expect(dafani).toBeDefined();
      expect(dafani?.fabrics.length).toBeGreaterThanOrEqual(1);
    });

    it('GET by-slug returns the model', async () => {
      const res = await request(server)
        .get(`/api/v1/studio/models/by-slug/${modelSlug}`)
        .expect(200);
      expect(res.body.data.id).toBe(modelId);
    });
  });

  describe('Admin — /studio/requests/admin', () => {
    let pendingId = '';

    beforeAll(async () => {
      // Seed a fresh PENDING request for the transition flow.
      const row = await prisma.studioRequest.create({
        data: {
          type: 'ORDER',
          customerName: 'Transition',
          customerPhone: phoneFor(9),
          modelId,
          fabricId,
          sizeRef: 'L / 40',
          measurementMode: 'ATELIER',
          appSource: 'WEB_STORE',
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

    it('admin lists with status filter', async () => {
      const res = await request(server)
        .get('/api/v1/studio/requests/admin')
        .query({ status: 'PENDING', search: SUITE_TAG.slice(-6) })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data.data)).toBe(true);
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
});
