import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { MailService, type MailMessage } from '../src/modules/mail/mail.service';

/**
 * Contact form (public storefront → emails the team).
 *
 * The endpoint is @Public, returns 204 No Content on success, and delegates to
 * MailService.send. We override MailService with a recorder (same pattern as
 * order-emails.e2e-spec) so the journey is deterministic and never makes a real
 * Mailgun call — and so we can assert the right message is dispatched.
 *
 * (Without the override, the DI ConfigModule loads apps/api/.env, which on a
 *  dev box carries real-looking Mailgun creds; ContactService.submit would then
 *  attempt a live send and surface its 401 as a 500. The override removes that
 *  environment coupling.)
 */
describe('Contact (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const sends: MailMessage[] = [];

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    const mailMock: Partial<MailService> = {
      send: async (m: MailMessage) => {
        sends.push(m);
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
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    sends.length = 0;
  });

  const validBody = {
    name: 'Awa Mbeki',
    email: 'awa@example.test',
    message: 'Bonjour, je cherche une robe pour une cérémonie le mois prochain.',
  };

  it('POST /contact (public, no auth) → 204 and dispatches one email', async () => {
    const res = await request(server).post('/api/v1/contact').send(validBody).expect(204);
    expect(res.body).toEqual({});

    expect(sends).toHaveLength(1);
    const mail = sends[0]!;
    expect(mail.tag).toBe('contact');
    expect(mail.subject).toContain(validBody.name);
    expect(mail.text).toContain(validBody.message);
    expect(mail.html).toContain(validBody.email);
  });

  it('HTML-escapes the message body (no raw <script>) → 204', async () => {
    await request(server)
      .post('/api/v1/contact')
      .send({
        name: '<b>Hacker</b>',
        email: 'x@example.test',
        message: 'Line one\nLine two <script>alert(1)</script>',
      })
      .expect(204);

    expect(sends).toHaveLength(1);
    const mail = sends[0]!;
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('<br>'); // newlines become <br>
  });

  it('rejects a malformed email (400) and sends nothing', async () => {
    await request(server)
      .post('/api/v1/contact')
      .send({ ...validBody, email: 'not-an-email' })
      .expect(400);
    expect(sends).toHaveLength(0);
  });

  it('rejects an empty message (400)', async () => {
    await request(server)
      .post('/api/v1/contact')
      .send({ ...validBody, message: '' })
      .expect(400);
  });

  it('rejects a missing name (400)', async () => {
    await request(server)
      .post('/api/v1/contact')
      .send({ email: validBody.email, message: validBody.message })
      .expect(400);
  });

  it('rejects an over-long message (>5000 chars) (400)', async () => {
    await request(server)
      .post('/api/v1/contact')
      .send({ ...validBody, message: 'a'.repeat(5001) })
      .expect(400);
  });
});
