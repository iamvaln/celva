import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-art-${Date.now()}`;
const SLUG_PREFIX = `${SUITE_TAG}-`;

describe('Articles (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';

  const articleBody = (slugSuffix: string) => ({
    title: { fr: `${SUITE_TAG} Titre ${slugSuffix}`, en: `${SUITE_TAG} Title ${slugSuffix}` },
    slug: `${SLUG_PREFIX}${slugSuffix}`,
    content: { fr: 'Contenu en français.', en: 'English content.' },
    excerpt: { fr: 'Court résumé.', en: 'Short summary.' },
    coverImage: 'https://example.com/cover.jpg',
    category: 'STYLE',
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

    await prisma.article.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.article.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
    await app?.close();
  });

  describe('Admin CRUD', () => {
    let createdId = '';

    it('POST /articles requires auth (401)', async () => {
      await request(server)
        .post('/api/v1/articles')
        .send(articleBody('a1'))
        .expect(401);
    });

    it('POST /articles creates a draft (isPublished=false by default)', async () => {
      const res = await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleBody('a1'))
        .expect(201);
      expect(res.body.data.slug).toBe(`${SLUG_PREFIX}a1`);
      expect(res.body.data.isPublished).toBe(false);
      expect(res.body.data.publishedAt).toBeNull();
      expect(res.body.data.category).toBe('STYLE');
      createdId = res.body.data.id;
    });

    it('POST /articles rejects duplicate slug (409)', async () => {
      await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleBody('a1'))
        .expect(409);
    });

    it('POST /articles rejects invalid slug (400)', async () => {
      const body = { ...articleBody('badslug'), slug: 'NOT VALID' };
      await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(400);
    });

    it('POST /articles rejects bad category (400)', async () => {
      const body = { ...articleBody('a2'), category: 'BOGUS' };
      await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(400);
    });

    it('PATCH /articles/:id updates title + content', async () => {
      const res = await request(server)
        .patch(`/api/v1/articles/admin/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { fr: 'Nouveau titre', en: 'New title' },
          content: { fr: 'Mis à jour.', en: 'Updated.' },
        })
        .expect(200);
      expect(res.body.data.title.fr).toBe('Nouveau titre');
    });

    it('POST /articles/:id/publish flips state + sets publishedAt', async () => {
      const res = await request(server)
        .post(`/api/v1/articles/admin/${createdId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.isPublished).toBe(true);
      expect(res.body.data.publishedAt).toBeTruthy();
    });

    it('POST /articles/:id/publish again does NOT reset publishedAt', async () => {
      const first = await prisma.article.findUniqueOrThrow({ where: { id: createdId } });
      await new Promise((r) => setTimeout(r, 20));
      const res = await request(server)
        .post(`/api/v1/articles/admin/${createdId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(new Date(res.body.data.publishedAt).getTime()).toBe(
        first.publishedAt!.getTime(),
      );
    });

    it('POST /articles/:id/unpublish flips state (publishedAt kept)', async () => {
      const res = await request(server)
        .post(`/api/v1/articles/admin/${createdId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.isPublished).toBe(false);
      expect(res.body.data.publishedAt).toBeTruthy();
    });
  });

  describe('Public (storefront)', () => {
    let publishedId = '';
    let draftId = '';

    beforeAll(async () => {
      const draft = await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleBody('public-draft'))
        .expect(201);
      draftId = draft.body.data.id;

      const live = await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...articleBody('public-live'), category: 'EVENTS' })
        .expect(201);
      publishedId = live.body.data.id;
      await request(server)
        .post(`/api/v1/articles/admin/${publishedId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /articles is public and only returns published rows', async () => {
      const res = await request(server)
        .get('/api/v1/articles?pageSize=50')
        .expect(200);
      const ids = (res.body.data.data as Array<{ id: string }>).map((a) => a.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(draftId);
    });

    it('GET /articles?category=EVENTS filters', async () => {
      const res = await request(server)
        .get('/api/v1/articles?category=EVENTS&pageSize=50')
        .expect(200);
      const data = res.body.data.data as Array<{ category: string }>;
      expect(data.every((a) => a.category === 'EVENTS')).toBe(true);
    });

    it('GET /articles/by-slug/:slug returns hydrated article', async () => {
      const res = await request(server)
        .get(`/api/v1/articles/by-slug/${SLUG_PREFIX}public-live`)
        .expect(200);
      expect(res.body.data.title.fr).toContain(SUITE_TAG);
      expect(res.body.data.author).toBeTruthy();
    });

    it('GET /articles/by-slug returns 404 for a draft', async () => {
      await request(server)
        .get(`/api/v1/articles/by-slug/${SLUG_PREFIX}public-draft`)
        .expect(404);
    });
  });

  describe('Admin list (incl. drafts)', () => {
    it('GET /articles/admin requires auth (401)', async () => {
      await request(server).get('/api/v1/articles/admin').expect(401);
    });

    it('GET /articles/admin includes drafts', async () => {
      const res = await request(server)
        .get('/api/v1/articles/admin?pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{
        slug: string;
        isPublished: boolean;
      }>;
      const ours = rows.filter((r) => r.slug.startsWith(SLUG_PREFIX));
      expect(ours.some((r) => !r.isPublished)).toBe(true);
      expect(ours.some((r) => r.isPublished)).toBe(true);
    });

    it('GET /articles/admin?isPublished=false → only drafts', async () => {
      const res = await request(server)
        .get('/api/v1/articles/admin?isPublished=false&pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ isPublished: boolean }>;
      expect(rows.every((r) => !r.isPublished)).toBe(true);
    });
  });

  describe('DELETE /articles/:id', () => {
    it('client cannot delete (403)', async () => {
      // Create a fresh signup, try to delete with that token
      const signup = await request(server)
        .post('/api/v1/auth/signup')
        .send({
          email: `client-${SUITE_TAG}@celva.test`,
          name: 'Client',
          password: 'TestPass123!',
        })
        .expect(201);
      const clientToken = signup.body.data.accessToken;

      const article = await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleBody('delete-403'))
        .expect(201);
      await request(server)
        .delete(`/api/v1/articles/admin/${article.body.data.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);

      // Cleanup
      await prisma.refreshToken.deleteMany({
        where: { user: { email: `client-${SUITE_TAG}@celva.test` } },
      });
      await prisma.auditLog.deleteMany({
        where: { user: { email: `client-${SUITE_TAG}@celva.test` } },
      });
      await prisma.user.deleteMany({
        where: { email: `client-${SUITE_TAG}@celva.test` },
      });
    });

    it('admin can delete', async () => {
      const article = await request(server)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleBody('delete-ok'))
        .expect(201);
      await request(server)
        .delete(`/api/v1/articles/admin/${article.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await request(server)
        .get(`/api/v1/articles/admin/${article.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
