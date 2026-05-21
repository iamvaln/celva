import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';

const SUITE_TAG = `e2e-cat-${Date.now()}`;

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let categoryId = '';

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

    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  it('POST /categories rejects anonymous calls (401)', async () => {
    await request(server)
      .post('/api/v1/categories')
      .send({ name: { fr: 'Robes', en: 'Dresses' } })
      .expect(401);
  });

  it('POST /categories creates a category with auto-generated slug', async () => {
    const res = await request(server)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Robes`, en: 'Dresses' },
        sortOrder: 5,
      })
      .expect(201);
    const data = res.body.data;
    expect(data.id).toBeTruthy();
    expect(data.slug).toBe(`${SUITE_TAG}-robes`);
    expect(data.name).toEqual({ fr: `${SUITE_TAG} Robes`, en: 'Dresses' });
    expect(data.sortOrder).toBe(5);
    categoryId = data.id;
  });

  it('POST /categories rejects duplicate slug (409)', async () => {
    await request(server)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Robes`, en: 'Dresses again' },
      })
      .expect(409);
  });

  it('POST /categories rejects missing FR/EN side of name (400)', async () => {
    await request(server)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: { fr: 'Sacs' } })
      .expect(400);
  });

  it('GET /categories is public and returns the new category', async () => {
    const res = await request(server).get('/api/v1/categories').expect(200);
    const slugs = (res.body.data.data as Array<{ slug: string }>).map((c) => c.slug);
    expect(slugs).toContain(`${SUITE_TAG}-robes`);
  });

  it('GET /categories/by-slug/:slug returns the category', async () => {
    const res = await request(server)
      .get(`/api/v1/categories/by-slug/${SUITE_TAG}-robes`)
      .expect(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('PATCH /categories/:id updates sortOrder + description', async () => {
    const res = await request(server)
      .patch(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sortOrder: 2,
        description: { fr: 'Description FR', en: 'EN description' },
      })
      .expect(200);
    expect(res.body.data.sortOrder).toBe(2);
    expect(res.body.data.description).toEqual({ fr: 'Description FR', en: 'EN description' });
  });

  it('DELETE /categories/:id blocked while it has products (409)', async () => {
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe Y2K`, en: 'Y2K Dress' },
        slug: `${SUITE_TAG}-robe-y2k`,
        displayPrice: 25000,
        floorPrice: 20000,
        costPrice: 12000,
        productionType: 'INTERNAL',
        categoryId,
      },
    });

    await request(server)
      .delete(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await prisma.product.delete({ where: { id: product.id } });
  });

  it('DELETE /categories/:id succeeds once empty', async () => {
    await request(server)
      .delete(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await request(server).get(`/api/v1/categories/${categoryId}`).expect(404);
  });
});
