import 'reflect-metadata';
import { resolve } from 'node:path';

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { requireEnv } from './common/env';

async function bootstrap(): Promise<void> {
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: Number(requireEnv('SENTRY_TRACES_SAMPLE_RATE')),
      profilesSampleRate: 1.0,
      environment: process.env.NODE_ENV,
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  // Local image storage fallback (dev/CI only — see modules/storage). In
  // production R2 is configured and this directory stays empty.
  app.useStaticAssets(resolve(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: '1y',
    immutable: true,
  });

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const apiVersion = config.get('API_VERSION', { infer: true });
  const cookieSecret = config.get('COOKIE_SECRET', { infer: true });

  app.use(cookieParser(cookieSecret));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const rawOrigins = config.get('CORS_ORIGINS', { infer: true }) ?? '';
  const origins = rawOrigins
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-App-Source', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: apiVersion.replace(/^v/, '') });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Celva Store API')
    .setDescription('REST API for the Celva Store platform — bilingue FR/EN')
    .setVersion(apiVersion)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addGlobalParameters({
      name: 'X-App-Source',
      in: 'header',
      required: false,
      schema: { type: 'string', enum: ['WEB_STORE', 'WEB_ADMIN', 'WEB_DELIVERY', 'API'] },
    })
    .addGlobalParameters({
      name: 'Accept-Language',
      in: 'header',
      required: false,
      schema: { type: 'string', enum: ['fr', 'en'], default: 'fr' },
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🌶️  Celva API ready on port ${port} (${apiVersion})`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health:  http://localhost:${port}/health`);
}

void bootstrap();
