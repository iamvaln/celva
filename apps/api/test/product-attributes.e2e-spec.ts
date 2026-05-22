import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-attr-${Date.now()}`;

describe('ProductAttributes + Values (e2e)', () => {
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

    const product = await prisma.product.create({
      data: {
        name: { fr: `${SUITE_TAG} Robe`, en: 'Dress' },
        slug: `${SUITE_TAG}-robe`,
        displayPrice: 25000,
        floorPrice: 20000,
        productionType: 'INTERNAL',
        categoryId,
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
    await prisma.product.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  describe('Attributes CRUD', () => {
    let attrId = '';

    it('POST /attributes requires auth (401)', async () => {
      await request(server)
        .post('/api/v1/attributes')
        .send({ name: { fr: 'Taille', en: 'Size' }, productId })
        .expect(401);
    });

    it('POST /attributes creates and auto-assigns sortOrder 0', async () => {
      const res = await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Taille', en: 'Size' }, productId })
        .expect(201);
      expect(res.body.data.sortOrder).toBe(0);
      attrId = res.body.data.id;
    });

    it('POST /attributes auto-increments sortOrder for subsequent attributes', async () => {
      const second = await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Couleur', en: 'Colour' }, productId })
        .expect(201);
      expect(second.body.data.sortOrder).toBe(1);
    });

    it('POST /attributes rejects duplicate sortOrder on same product (409)', async () => {
      await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Hauteur', en: 'Height' }, productId, sortOrder: 0 })
        .expect(409);
    });

    it('POST /attributes rejects unknown productId (400)', async () => {
      await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { fr: 'X', en: 'X' },
          productId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });

    it('GET /attributes?productId= is public and lists them in sortOrder', async () => {
      const res = await request(server)
        .get(`/api/v1/attributes?productId=${productId}`)
        .expect(200);
      const orders = (res.body.data.data as Array<{ sortOrder: number }>).map((a) => a.sortOrder);
      expect(orders).toEqual([0, 1]);
    });

    it('PATCH /attributes/:id updates the bilingual name', async () => {
      const res = await request(server)
        .patch(`/api/v1/attributes/${attrId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Taille (FR)', en: 'Size (EN)' } })
        .expect(200);
      expect(res.body.data.name).toEqual({ fr: 'Taille (FR)', en: 'Size (EN)' });
    });

    it('DELETE /attributes/:id succeeds when no variants reference it', async () => {
      const tmp = await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Tissu', en: 'Fabric' }, productId })
        .expect(201);
      await request(server)
        .delete(`/api/v1/attributes/${tmp.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Attribute values CRUD', () => {
    let attrId = '';
    let valueId = '';

    beforeAll(async () => {
      const res = await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'Matière', en: 'Material' }, productId })
        .expect(201);
      attrId = res.body.data.id;
    });

    it('POST /attribute-values creates with auto sortOrder 0', async () => {
      const res = await request(server)
        .post('/api/v1/attribute-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: { fr: 'Soie', en: 'Silk' }, attributeId: attrId })
        .expect(201);
      expect(res.body.data.sortOrder).toBe(0);
      valueId = res.body.data.id;
    });

    it('POST /attribute-values increments sortOrder', async () => {
      const res = await request(server)
        .post('/api/v1/attribute-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: { fr: 'Coton', en: 'Cotton' }, attributeId: attrId })
        .expect(201);
      expect(res.body.data.sortOrder).toBe(1);
    });

    it('POST /attribute-values rejects unknown attributeId (400)', async () => {
      await request(server)
        .post('/api/v1/attribute-values')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: { fr: 'Lin', en: 'Linen' },
          attributeId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });

    it('GET /attribute-values?attributeId= is public', async () => {
      const res = await request(server)
        .get(`/api/v1/attribute-values?attributeId=${attrId}`)
        .expect(200);
      expect(res.body.data.data.length).toBe(2);
    });

    it('PATCH /attribute-values/:id updates the value', async () => {
      const res = await request(server)
        .patch(`/api/v1/attribute-values/${valueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: { fr: 'Soie sauvage', en: 'Wild silk' } })
        .expect(200);
      expect(res.body.data.value).toEqual({ fr: 'Soie sauvage', en: 'Wild silk' });
    });

    it('DELETE /attribute-values/:id succeeds when no variants reference it', async () => {
      await request(server)
        .delete(`/api/v1/attribute-values/${valueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Cascade behaviour', () => {
    it('deleting a product cascades to its attributes (FK onDelete:Cascade)', async () => {
      const cat = await prisma.category.create({
        data: {
          name: { fr: `${SUITE_TAG} cascade cat`, en: 'cascade' },
          slug: `${SUITE_TAG}-cascade-cat`,
        },
      });
      const tmp = await prisma.product.create({
        data: {
          name: { fr: `${SUITE_TAG} cascade`, en: 'cascade' },
          slug: `${SUITE_TAG}-cascade`,
          displayPrice: 1000,
          floorPrice: 800,
          productionType: 'INTERNAL',
          categoryId: cat.id,
        },
      });

      await request(server)
        .post('/api/v1/attributes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: { fr: 'X', en: 'X' }, productId: tmp.id })
        .expect(201);

      await prisma.product.delete({ where: { id: tmp.id } });

      const orphan = await prisma.productAttribute.findFirst({ where: { productId: tmp.id } });
      expect(orphan).toBeNull();

      await prisma.category.delete({ where: { id: cat.id } });
    });
  });
});
