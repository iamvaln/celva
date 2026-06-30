import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import {
  AI_PROVIDER,
  type AiCompletionRequest,
  type AiCompletionResult,
  type AiProvider,
} from '../src/modules/ai/providers/ai-provider';

/**
 * AI assist endpoints (admin-only): translate, generate-description, usage/metrics.
 *
 * The real Anthropic call is replaced by a deterministic fake provider via
 * `overrideProvider(AI_PROVIDER)`, so the controller → AiService → usage-tracking
 * journey runs end to end with NO network call and NO ANTHROPIC_API_KEY. This
 * mirrors the AI feature convention: every AI feature must track usage + expose
 * back-office metrics + be backed by a pluggable provider (the override here is
 * proof the provider is pluggable).
 *
 * The seeded admin (admin@celva.store / ChangeMe123!) is a SUPER_ADMIN, which is
 * in ASSIST_ROLES; a freshly signed-up client is a CLIENT and must be rejected.
 */

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-ai-${Date.now()}`;
const CLIENT_EMAIL = `client-${SUITE_TAG}@celva.test`;
const PASSWORD = 'TestPass123!';

const FAKE_MODEL = 'fake-model-v1';

class FakeAiProvider implements AiProvider {
  readonly name = 'fake';
  readonly model = FAKE_MODEL;
  isConfigured(): boolean {
    return true;
  }
  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    return {
      text: `FAKE<<${req.content}>>`,
      provider: this.name,
      model: this.model,
      inputTokens: 11,
      outputTokens: 7,
    };
  }
}

describe('AI assist (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let clientToken = '';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AI_PROVIDER)
      .useValue(new FakeAiProvider())
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

    // Clean any usage rows from prior runs of this suite's features so the
    // metrics assertions are about THIS run only would be ideal, but metrics
    // are global aggregates — we assert relative growth instead of absolutes.
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const clientSignup = await request(server)
      .post('/api/v1/auth/signup')
      .send({ email: CLIENT_EMAIL, name: 'Client AI Test', password: PASSWORD })
      .expect(201);
    clientToken = clientSignup.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.aiUsage.deleteMany({ where: { model: FAKE_MODEL } });
    await prisma.user.deleteMany({ where: { email: CLIENT_EMAIL } });
    await app?.close();
  });

  // --- Auth gating --------------------------------------------------------

  it('POST /ai/translate without a token → 401', async () => {
    await request(server)
      .post('/api/v1/ai/translate')
      .send({ text: 'Robe rouge', sourceLocale: 'fr', targetLocale: 'en' })
      .expect(401);
  });

  it('POST /ai/translate as a CLIENT (wrong role) → 403', async () => {
    await request(server)
      .post('/api/v1/ai/translate')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ text: 'Robe rouge', sourceLocale: 'fr', targetLocale: 'en' })
      .expect(403);
  });

  it('GET /ai/usage/metrics as a CLIENT → 403', async () => {
    await request(server)
      .get('/api/v1/ai/usage/metrics')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  // --- Validation ---------------------------------------------------------

  it('POST /ai/translate rejects an invalid locale (400)', async () => {
    await request(server)
      .post('/api/v1/ai/translate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Robe rouge', sourceLocale: 'es', targetLocale: 'en' })
      .expect(400);
  });

  it('POST /ai/generate-description rejects a missing productName (400)', async () => {
    await request(server)
      .post('/api/v1/ai/generate-description')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locale: 'fr' })
      .expect(400);
  });

  // --- Happy path (fake provider) ----------------------------------------

  it('POST /ai/translate as admin → 200 { text } and records usage', async () => {
    const res = await request(server)
      .post('/api/v1/ai/translate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Robe en wax', sourceLocale: 'fr', targetLocale: 'en', kind: 'name' })
      .expect(200);

    expect(res.body.data.text).toBe('FAKE<<Robe en wax>>');

    const usage = await prisma.aiUsage.findFirst({
      where: { feature: 'translate', model: FAKE_MODEL },
      orderBy: { createdAt: 'desc' },
    });
    expect(usage).toBeTruthy();
    expect(usage?.provider).toBe('fake');
    expect(usage?.inputTokens).toBe(11);
    expect(usage?.outputTokens).toBe(7);
    expect(usage?.success).toBe(true);
  });

  it('POST /ai/generate-description as admin → 200 { text } and records usage', async () => {
    const res = await request(server)
      .post('/api/v1/ai/generate-description')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productName: 'Robe Aïssa', locale: 'fr', hints: 'wax bleu, cérémonie' })
      .expect(200);

    expect(res.body.data.text).toContain('FAKE<<');
    expect(res.body.data.text).toContain('Robe Aïssa');

    const usage = await prisma.aiUsage.findFirst({
      where: { feature: 'generate_description', model: FAKE_MODEL },
      orderBy: { createdAt: 'desc' },
    });
    expect(usage).toBeTruthy();
  });

  // --- Back-office metrics ------------------------------------------------

  it('GET /ai/usage/metrics as admin → aggregated metrics envelope', async () => {
    const res = await request(server)
      .get('/api/v1/ai/usage/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const m = res.body.data;
    expect(m.totals).toBeTruthy();
    expect(typeof m.totals.calls).toBe('number');
    expect(m.totals.calls).toBeGreaterThanOrEqual(2); // our 2 successful calls
    expect(typeof m.totals.successRate).toBe('number');
    expect(Array.isArray(m.byFeature)).toBe(true);
    expect(Array.isArray(m.byModel)).toBe(true);
    expect(Array.isArray(m.recent)).toBe(true);

    // Our fake model + features should be visible in the aggregates.
    const features = m.byFeature.map((f: { feature: string }) => f.feature);
    expect(features).toEqual(expect.arrayContaining(['translate', 'generate_description']));
    const models = m.byModel.map((x: { model: string }) => x.model);
    expect(models).toContain(FAKE_MODEL);
  });
});
