import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://celva:celva_dev_password@localhost:5432/celva?schema=public';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns 200 with envelope { data: { status } }', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toHaveProperty('data.status');
    expect(['ok', 'error']).toContain(res.body.data.status);
    expect(res.body.data).toHaveProperty('info');
  });

  it('GET /health echoes X-Request-Id header', async () => {
    const reqId = '11111111-1111-1111-1111-111111111111';
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', reqId);
    expect(res.headers['x-request-id']).toBe(reqId);
  });

  it('GET /health generates a request id when none is provided', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('GET /api/v1/not-a-route returns bilingual error (en)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/not-a-route')
      .set('Accept-Language', 'en')
      .expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      error: expect.any(String),
      message: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
