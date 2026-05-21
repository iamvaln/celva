import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';

const SUITE_TAG = `e2e-prod-${Date.now()}`;

describe('Products (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let categoryId = '';
  let productId = '';

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

    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const cat = await prisma.category.create({
      data: {
        name: { fr: `${SUITE_TAG} Robes`, en: 'Dresses' },
        slug: `${SUITE_TAG}-robes`,
      },
    });
    categoryId = cat.id;

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  it('POST /products rejects anonymous calls (401)', async () => {
    await request(server)
      .post('/api/v1/products')
      .send({
        name: { fr: 'X', en: 'X' },
        displayPrice: 1000,
        floorPrice: 800,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(401);
  });

  it('POST /products creates a product with auto-generated slug', async () => {
    const res = await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Robe Soirée`, en: 'Evening Dress' },
        description: { fr: 'Description', en: 'Description' },
        displayPrice: 25000,
        floorPrice: 20000,
        costPrice: 12000,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(201);
    const data = res.body.data;
    expect(data.id).toBeTruthy();
    expect(data.slug).toBe(`${SUITE_TAG}-robe-soiree`);
    expect(data.isActive).toBe(true);
    expect(Number(data.displayPrice)).toBe(25000);
    productId = data.id;
  });

  it('POST /products rejects displayPrice < floorPrice (400)', async () => {
    await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Cher`, en: 'Cheap' },
        displayPrice: 100,
        floorPrice: 200,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(400);
  });

  it('POST /products rejects unknown categoryId (400)', async () => {
    await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Orphan`, en: 'Orphan' },
        displayPrice: 1000,
        floorPrice: 1000,
        categoryId: '00000000-0000-0000-0000-000000000000',
        productionType: 'INTERNAL',
      })
      .expect(400);
  });

  it('POST /products rejects duplicate slug (409)', async () => {
    await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { fr: `${SUITE_TAG} Robe Soirée`, en: 'Evening Dress II' },
        displayPrice: 25000,
        floorPrice: 20000,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(409);
  });

  it('GET /products is public and returns the new product', async () => {
    const res = await request(server)
      .get(`/api/v1/products?categoryId=${categoryId}`)
      .expect(200);
    const slugs = (res.body.data.data as Array<{ slug: string }>).map((p) => p.slug);
    expect(slugs).toContain(`${SUITE_TAG}-robe-soiree`);
  });

  it('GET /products/by-slug/:slug returns the product', async () => {
    const res = await request(server)
      .get(`/api/v1/products/by-slug/${SUITE_TAG}-robe-soiree`)
      .expect(200);
    expect(res.body.data.id).toBe(productId);
  });

  it('PATCH /products/:id updates description + price', async () => {
    const res = await request(server)
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayPrice: 30000,
        floorPrice: 22000,
        description: { fr: 'Nouvelle desc', en: 'New desc' },
      })
      .expect(200);
    expect(Number(res.body.data.displayPrice)).toBe(30000);
    expect(res.body.data.description).toEqual({ fr: 'Nouvelle desc', en: 'New desc' });
  });

  it('PATCH /products/:id rejects displayPrice < floorPrice (400)', async () => {
    await request(server)
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayPrice: 1000 })
      .expect(400);
  });

  it('POST /products/:id/duplicate copies with -copy slug and isActive=false', async () => {
    const res = await request(server)
      .post(`/api/v1/products/${productId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(res.body.data.id).not.toBe(productId);
    expect(res.body.data.slug).toBe(`${SUITE_TAG}-robe-soiree-copy`);
    expect(res.body.data.isActive).toBe(false);
    // Calling duplicate again should auto-suffix the slug
    const second = await request(server)
      .post(`/api/v1/products/${productId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(second.body.data.slug).toBe(`${SUITE_TAG}-robe-soiree-copy-2`);
  });

  it('DELETE /products/:id succeeds for an unreferenced product', async () => {
    await request(server)
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await request(server).get(`/api/v1/products/${productId}`).expect(404);
  });

  it('Bilingual error translates per Accept-Language', async () => {
    const resFr = await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Accept-Language', 'fr')
      .send({
        name: { fr: 'X', en: 'X' },
        displayPrice: 10,
        floorPrice: 100,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(400);
    expect(resFr.body.message).toContain('prix affiché');

    const resEn = await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Accept-Language', 'en')
      .send({
        name: { fr: 'X', en: 'X' },
        displayPrice: 10,
        floorPrice: 100,
        categoryId,
        productionType: 'INTERNAL',
      })
      .expect(400);
    expect(resEn.body.message.toLowerCase()).toContain('display price');
  });
});
