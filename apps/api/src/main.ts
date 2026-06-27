import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { assertSecretStrength } from './common/config/secret-validation';

async function bootstrap() {
  // AUTH-01: refuse to boot on missing/placeholder/low-entropy secrets.
  assertSecretStrength();
  const app = await NestFactory.create(AppModule);
  // AUTH-02: trust the reverse proxy so req.ip reflects X-Forwarded-For. Without
  // this, the per-IP auth rate limiter sees only the proxy address and collapses
  // every client into one bucket. TRUST_PROXY hops default to 1 (single proxy).
  const trustProxy = process.env.TRUST_PROXY ?? '1';
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
