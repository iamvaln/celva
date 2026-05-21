import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-img-${Date.now()}`;
const UPLOAD_ROOT = resolve(process.cwd(), 'uploads');

// 1×1 PNG (red), valid PNG header + IDAT chunk. Avoids the Sharp dep.
const TINY_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108020000009077' +
    '53DE0000000C4944415408D763F8CFC0F01F00050001A0D7D6BB0000000049454E44AE426082',
  'hex',
);

describe('ProductImages (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let productId = '';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';
    // Force the local-FS storage backend for the test run.
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_ENDPOINT;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
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
        name: { fr: `${SUITE_TAG} Cat`, en: 'Cat' },
        slug: `${SUITE_TAG}-cat`,
      },
    });
    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 25000,
        floorPrice: 20000,
        productionType: 'INTERNAL',
        categoryId: cat.id,
      },
    });
    productId = product.id;

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await rm(resolve(UPLOAD_ROOT, 'products', productId), { recursive: true, force: true });
    await app?.close();
  });

  let firstImageId = '';
  let secondImageId = '';

  it('POST /products/:id/images requires auth (401)', async () => {
    await request(server)
      .post(`/api/v1/products/${productId}/images`)
      .attach('files', TINY_PNG, 'a.png')
      .expect(401);
  });

  it('POST /products/:id/images uploads the original (no Sharp variants) + returns transform URLs', async () => {
    const res = await request(server)
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('altText[fr]', 'Robe rouge')
      .field('altText[en]', 'Red dress')
      .attach('files', TINY_PNG, 'a.png')
      .expect(201);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    const data = res.body.data[0];
    expect(data.position).toBe(0);
    expect(data.isPrimary).toBe(true);
    expect(data.key).toMatch(/^products\/[^/]+\/[^.]+\.png$/);
    expect(data.urls.original).toMatch(/\.png$/);
    // Local backend: transformed URLs equal the original (no CF transforms in dev).
    expect(data.urls.thumb).toBe(data.urls.original);
    firstImageId = data.id;

    // Verify the original file landed on disk (only one — no variants generated).
    const target = resolve(UPLOAD_ROOT, 'products', productId, `${firstImageId}.png`);
    expect(existsSync(target)).toBe(true);
  });

  it('POST /products/:id/images accepts up to 5 files in one request', async () => {
    const res = await request(server)
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('files', TINY_PNG, 'b.png')
      .attach('files', TINY_PNG, 'c.png')
      .expect(201);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].position).toBe(1);
    expect(res.body.data[1].position).toBe(2);
    expect(res.body.data[0].isPrimary).toBe(false);
    secondImageId = res.body.data[0].id;
  });

  it('POST rejects unsupported MIME (400)', async () => {
    await request(server)
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('files', Buffer.from('not an image'), {
        filename: 'fake.gif',
        contentType: 'image/gif',
      })
      .expect(400);
  });

  it('GET /products/:id/images is public and returns position order', async () => {
    const res = await request(server)
      .get(`/api/v1/products/${productId}/images`)
      .expect(200);
    const list = res.body.data as Array<{ id: string; position: number; urls: { thumb: string } }>;
    expect(list.length).toBe(3);
    expect(list[0]?.position).toBe(0);
    expect(list[0]?.urls.thumb).toContain(`products/${productId}/`);
  });

  it('PATCH /products/:id/images/order moves positions', async () => {
    // Move secondImageId to the front, leave the rest in the relative order.
    const before = await request(server)
      .get(`/api/v1/products/${productId}/images`)
      .expect(200);
    const ids = before.body.data
      .map((i: { id: string }) => i.id)
      .filter((id: string) => id !== secondImageId);
    const newOrder = [secondImageId, ...ids];
    const res = await request(server)
      .patch(`/api/v1/products/${productId}/images/order`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: newOrder })
      .expect(200);
    expect(res.body.data[0].id).toBe(secondImageId);
    expect(res.body.data[0].position).toBe(0);
  });

  it('PATCH /products/:id/images/order rejects mismatched id set (400)', async () => {
    await request(server)
      .patch(`/api/v1/products/${productId}/images/order`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [secondImageId] })
      .expect(400);
  });

  it('PATCH /products/:id/images/:imageId/primary moves the flag atomically', async () => {
    const res = await request(server)
      .patch(`/api/v1/products/${productId}/images/${secondImageId}/primary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = res.body.data as Array<{ id: string; isPrimary: boolean }>;
    const primary = list.filter((i) => i.isPrimary);
    expect(primary.length).toBe(1);
    expect(primary[0]?.id).toBe(secondImageId);
  });

  it('DELETE /products/:id/images/:imageId removes the original file and promotes next primary', async () => {
    const target = resolve(UPLOAD_ROOT, 'products', productId, `${secondImageId}.png`);
    expect(existsSync(target)).toBe(true);
    await request(server)
      .delete(`/api/v1/products/${productId}/images/${secondImageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    expect(existsSync(target)).toBe(false);

    const remaining = await request(server)
      .get(`/api/v1/products/${productId}/images`)
      .expect(200);
    const list = remaining.body.data as Array<{ id: string; isPrimary: boolean }>;
    expect(list.length).toBe(2);
    expect(list.filter((i) => i.isPrimary).length).toBe(1);
  });
});
