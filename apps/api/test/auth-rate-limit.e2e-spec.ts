import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { resetAuthRateLimitBucketsForTest } from '../src/auth/auth-rate-limit.guard';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = '3';
    process.env.THROTTLE_AUTH_TTL_MS = '60000';
    ({ app, prisma } = await bootstrapTestApp());
  });
  beforeEach(async () => {
    resetAuthRateLimitBucketsForTest();
    await resetDb(prisma);
  });
  afterAll(async () => { await app.close(); });

  it('returns 429 rate_limited after exceeding auth throttle', async () => {
    const http = app.getHttpServer();
    await request(http).post('/auth/register').send({ email: 'rl@test.dev', password: 'password123', name: 'RL' }).expect(201);
    await request(http).post('/auth/login').send({ email: 'rl@test.dev', password: 'wrong' }).expect(401);
    await request(http).post('/auth/login').send({ email: 'rl@test.dev', password: 'wrong' }).expect(401);

    const limited = await request(http).post('/auth/login').send({ email: 'rl@test.dev', password: 'wrong' }).expect(429);
    expect(limited.body.error.code).toBe('rate_limited');
    expect(limited.headers['retry-after']).toBeTruthy();
  });
});
