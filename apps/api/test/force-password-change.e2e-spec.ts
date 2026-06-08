import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const SUITE_TAG = `e2e-fpw-${Date.now()}`;
const EMAIL = `${SUITE_TAG}@celva.test`;
const INITIAL_PASSWORD = 'Bootstrap123!';
const NEW_PASSWORD = 'NewStrong456!';

/**
 * Spec for the forced-password-change flow (Batch BJ):
 *  - login on a user with mustChangePassword=true returns the flag set
 *  - POST /auth/me/password clears the flag
 *  - subsequent login returns the flag cleared
 */
describe('Force password change on first login (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;

  beforeAll(async () => {
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

    await cleanup();
    const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: EMAIL,
        name: 'Force-change Test',
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { email: EMAIL },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  }

  it('login returns mustChangePassword=true for a flagged user', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: INITIAL_PASSWORD })
      .expect(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);
  });

  it('POST /auth/me/password clears mustChangePassword', async () => {
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: INITIAL_PASSWORD })
      .expect(200);
    const token = login.body.data.accessToken as string;

    await request(server)
      .post('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: INITIAL_PASSWORD, newPassword: NEW_PASSWORD })
      .expect(204);

    const row = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(row.mustChangePassword).toBe(false);

    // And a fresh login with the new password reflects the cleared flag.
    const next = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: NEW_PASSWORD })
      .expect(200);
    expect(next.body.data.user.mustChangePassword).toBe(false);
  });
});
