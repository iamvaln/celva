import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-coll-${Date.now()}`;

describe('Collections + Cross-sell (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let categoryId = '';
  const productIds: string[] = [];

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

    await prisma.collection.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });

    const cat = await prisma.category.create({
      data: {
        name: { fr: `${SUITE_TAG} Cat`, en: 'Cat' },
        slug: `${SUITE_TAG}-cat`,
      },
    });
    categoryId = cat.id;

    for (let i = 0; i < 8; i++) {
      const p = await prisma.product.create({
        data: {
          name: { fr: `${SUITE_TAG} P${i}`, en: `P${i}` },
          slug: `${SUITE_TAG}-p${i}`,
          displayPrice: 1000 * (i + 1),
          floorPrice: 800 * (i + 1),
          productionType: 'INTERNAL',
          categoryId,
        },
      });
      productIds.push(p.id);
    }

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.relatedProduct.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.collection.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  describe('Collections CRUD', () => {
    let collectionId = '';

    it('POST /collections requires auth (401)', async () => {
      await request(server)
        .post('/api/v1/collections')
        .send({ name: { fr: 'Noël', en: 'Christmas' } })
        .expect(401);
    });

    it('POST /collections creates with auto slug + defaults', async () => {
      const res = await request(server)
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: `${SUITE_TAG} Noel`, en: 'Christmas' }, sortOrder: 3 })
        .expect(201);
      const data = res.body.data;
      expect(data.id).toBeTruthy();
      expect(data.slug).toBe(`${SUITE_TAG}-noel`);
      expect(data.isActive).toBe(true);
      expect(data.sortOrder).toBe(3);
      collectionId = data.id;
    });

    it('POST /collections rejects duplicate slug (409)', async () => {
      await request(server)
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: `${SUITE_TAG} Noel`, en: 'Christmas Again' } })
        .expect(409);
    });

    it('PATCH /collections/:id updates description + isActive', async () => {
      const res = await request(server)
        .patch(`/api/v1/collections/${collectionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: { fr: 'Fêtes', en: 'Holidays' },
          isActive: false,
        })
        .expect(200);
      expect(res.body.data.description).toEqual({ fr: 'Fêtes', en: 'Holidays' });
      expect(res.body.data.isActive).toBe(false);
    });

    it('GET /collections is public', async () => {
      const res = await request(server).get('/api/v1/collections').expect(200);
      const slugs = (res.body.data.data as Array<{ slug: string }>).map((c) => c.slug);
      expect(slugs).toContain(`${SUITE_TAG}-noel`);
    });

    it('GET /collections/by-slug/:slug works', async () => {
      const res = await request(server)
        .get(`/api/v1/collections/by-slug/${SUITE_TAG}-noel`)
        .expect(200);
      expect(res.body.data.id).toBe(collectionId);
    });

    it('PUT /collections/:id/products replaces the product list in order', async () => {
      const items = [
        { productId: productIds[2]! },
        { productId: productIds[0]! },
        { productId: productIds[1]! },
      ];
      const res = await request(server)
        .put(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items })
        .expect(200);
      const list = res.body.data as Array<{ productId: string; sortOrder: number }>;
      expect(list.map((l) => l.productId)).toEqual([
        productIds[2],
        productIds[0],
        productIds[1],
      ]);
      expect(list.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
    });

    it('PUT /collections/:id/products replaces (drops removed) and updates order', async () => {
      const items = [
        { productId: productIds[1]! },
        { productId: productIds[2]! },
      ];
      const res = await request(server)
        .put(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items })
        .expect(200);
      expect((res.body.data as unknown[]).length).toBe(2);
    });

    it('PUT /collections/:id/products rejects unknown productId (400)', async () => {
      await request(server)
        .put(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: '00000000-0000-0000-0000-000000000000' }],
        })
        .expect(400);
    });

    it('PUT /collections/:id/products empty list clears the collection', async () => {
      const res = await request(server)
        .put(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [] })
        .expect(200);
      expect((res.body.data as unknown[]).length).toBe(0);
    });

    it('DELETE /collections/:id succeeds (links cascade away)', async () => {
      await request(server)
        .put(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: productIds[0]! }] })
        .expect(200);

      await request(server)
        .delete(`/api/v1/collections/${collectionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const orphans = await prisma.productCollection.count({ where: { collectionId } });
      expect(orphans).toBe(0);
    });
  });

  describe('Cross-sell (RelatedProduct)', () => {
    it('GET /products/:id/related is public and empty by default', async () => {
      const res = await request(server)
        .get(`/api/v1/products/${productIds[0]}/related`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('PUT /products/:id/related rejects self-reference (400)', async () => {
      await request(server)
        .put(`/api/v1/products/${productIds[0]}/related`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ relatedProductId: productIds[0]! }] })
        .expect(400);
    });

    it('PUT /products/:id/related caps the list at 6 (400)', async () => {
      const tooMany = productIds.slice(1, 8).map((id) => ({ relatedProductId: id }));
      expect(tooMany.length).toBe(7);
      await request(server)
        .put(`/api/v1/products/${productIds[0]}/related`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: tooMany })
        .expect(400);
    });

    it('PUT /products/:id/related replaces the list in order', async () => {
      const items = [
        { relatedProductId: productIds[3]! },
        { relatedProductId: productIds[1]! },
        { relatedProductId: productIds[5]! },
      ];
      const res = await request(server)
        .put(`/api/v1/products/${productIds[0]}/related`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items })
        .expect(200);
      const list = res.body.data as Array<{ relatedProductId: string; sortOrder: number }>;
      expect(list.map((l) => l.relatedProductId)).toEqual([
        productIds[3],
        productIds[1],
        productIds[5],
      ]);
      expect(list.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
    });

    it('PUT /products/:id/related rejects unknown productId (400)', async () => {
      await request(server)
        .put(`/api/v1/products/${productIds[0]}/related`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ relatedProductId: '00000000-0000-0000-0000-000000000000' }],
        })
        .expect(400);
    });

    it('PUT /products/:id/related rejects duplicates in the list (400)', async () => {
      await request(server)
        .put(`/api/v1/products/${productIds[0]}/related`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { relatedProductId: productIds[1]! },
            { relatedProductId: productIds[1]! },
          ],
        })
        .expect(400);
    });

    it('deleting a product cascades its cross-sell links', async () => {
      // productIds[3] is referenced from productIds[0]'s list above.
      await prisma.product.delete({ where: { id: productIds[3]! } });
      const remaining = await prisma.relatedProduct.findMany({
        where: { relatedProductId: productIds[3]! },
      });
      expect(remaining).toEqual([]);
      // Recreate the product so afterAll teardown doesn't complain.
      const recreated = await prisma.product.create({
        data: {
          name: { fr: `${SUITE_TAG} P3`, en: 'P3' },
          slug: `${SUITE_TAG}-p3-recreated`,
          displayPrice: 4000,
          floorPrice: 3200,
          productionType: 'INTERNAL',
          categoryId,
        },
      });
      productIds[3] = recreated.id;
    });
  });
});
