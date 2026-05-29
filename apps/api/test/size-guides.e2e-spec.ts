import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-sg-${Date.now()}`;

describe('Size guides (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let categoryId = '';

  const guideBody = (suffix: string) => ({
    name: { fr: `${SUITE_TAG} Robes ${suffix}`, en: `${SUITE_TAG} Dresses ${suffix}` },
    content: { fr: '| Taille | Tour |\n|---|---|\n| S | 84 |', en: '| Size | Bust |\n|---|---|\n| S | 84 |' },
    categoryId: '',
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

    await prisma.sizeGuide.deleteMany({
      where: { category: { slug: { startsWith: SUITE_TAG } } },
    });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    const cat = await prisma.category.create({
      data: { name: { fr: `${SUITE_TAG} Cat`, en: `${SUITE_TAG} Cat` }, slug: `${SUITE_TAG}-cat` },
    });
    categoryId = cat.id;

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.sizeGuide.deleteMany({ where: { categoryId } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  let createdId = '';

  describe('Admin CRUD', () => {
    it('POST /size-guides requires auth (401)', async () => {
      await request(server)
        .post('/api/v1/size-guides')
        .send({ ...guideBody('a'), categoryId })
        .expect(401);
    });

    it('POST /size-guides creates a guide', async () => {
      const res = await request(server)
        .post('/api/v1/size-guides')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...guideBody('a'), categoryId })
        .expect(201);
      expect(res.body.data.name.fr).toContain('Robes');
      expect(res.body.data.category.id).toBe(categoryId);
      createdId = res.body.data.id;
    });

    it('POST /size-guides rejects unknown category (400)', async () => {
      await request(server)
        .post('/api/v1/size-guides')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...guideBody('b'), categoryId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('PATCH /size-guides/admin/:id updates content', async () => {
      const res = await request(server)
        .patch(`/api/v1/size-guides/admin/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { fr: 'Nouveau', en: 'New' } })
        .expect(200);
      expect(res.body.data.content.en).toBe('New');
    });

    it('GET /size-guides/admin lists paginated for admin', async () => {
      const res = await request(server)
        .get('/api/v1/size-guides/admin')
        .query({ categoryId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Public', () => {
    it('GET /size-guides returns guides with category (no auth)', async () => {
      const res = await request(server).get('/api/v1/size-guides').expect(200);
      const mine = (res.body.data as Array<{ id: string; category: { id: string } }>).find(
        (g) => g.id === createdId,
      );
      expect(mine).toBeDefined();
      expect(mine?.category.id).toBe(categoryId);
    });

    it('GET /size-guides/by-category/:id returns the category guides', async () => {
      const res = await request(server)
        .get(`/api/v1/size-guides/by-category/${categoryId}`)
        .expect(200);
      expect((res.body.data as Array<{ id: string }>).map((g) => g.id)).toContain(createdId);
    });
  });

  describe('Delete', () => {
    it('DELETE /size-guides/admin/:id removes it (204)', async () => {
      await request(server)
        .delete(`/api/v1/size-guides/admin/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      const gone = await prisma.sizeGuide.findUnique({ where: { id: createdId } });
      expect(gone).toBeNull();
    });
  });
});
