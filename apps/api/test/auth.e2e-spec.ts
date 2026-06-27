import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const http = () => app.getHttpServer();

  it('register issues tokens and creates owner workspace', async () => {
    const r = await request(http()).post('/auth/register').send({ email: 'a@test.dev', password: 'password123', name: 'Alice' }).expect(201);
    expect(r.body.value.accessToken).toBeTruthy();
    expect(r.body.value.refreshToken).toBeTruthy();
    const members = await prisma.member.findMany({ where: { userId: r.body.value.user.id } });
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe('owner');
  });

  it('duplicate email returns 409', async () => {
    await request(http()).post('/auth/register').send({ email: 'd@test.dev', password: 'password123', name: 'D' }).expect(201);
    await request(http()).post('/auth/register').send({ email: 'd@test.dev', password: 'password123', name: 'D2' }).expect(409);
  });

  it('login wrong password / unknown user both 401', async () => {
    await request(http()).post('/auth/register').send({ email: 'b@test.dev', password: 'password123', name: 'B' }).expect(201);
    await request(http()).post('/auth/login').send({ email: 'b@test.dev', password: 'wrongpass' }).expect(401);
    await request(http()).post('/auth/login').send({ email: 'nope@test.dev', password: 'password123' }).expect(401);
  });

  it('refresh rotates and old token becomes invalid', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'c@test.dev', password: 'password123', name: 'C' }).expect(201);
    const oldRefresh = reg.body.value.refreshToken;
    const refreshed = await request(http()).post('/auth/refresh').send({ refreshToken: oldRefresh }).expect(201);
    expect(refreshed.body.value.accessToken).toBeTruthy();
    await request(http()).post('/auth/refresh').send({ refreshToken: oldRefresh }).expect(401);
  });

  it('logout revokes refresh token', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'e@test.dev', password: 'password123', name: 'E' }).expect(201);
    const { accessToken, refreshToken } = reg.body.value;
    await request(http()).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken }).expect(204);
    await request(http()).post('/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('me returns memberships', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'f@test.dev', password: 'password123', name: 'F' }).expect(201);
    const me = await request(http()).get('/auth/me').set('Authorization', `Bearer ${reg.body.value.accessToken}`).expect(200);
    expect(me.body.value.user.email).toBe('f@test.dev');
    expect(me.body.value.memberships).toHaveLength(1);
    expect(me.body.value.memberships[0].role).toBe('owner');
  });

  it('me without token returns 401', async () => {
    await request(http()).get('/auth/me').expect(401);
  });

  it('AUTH-03: registration is blocked (403) when closed and email not allowlisted', async () => {
    const prevOpen = process.env.REGISTRATION_OPEN;
    const prevList = process.env.REGISTRATION_ALLOWLIST;
    process.env.REGISTRATION_OPEN = 'false';
    process.env.REGISTRATION_ALLOWLIST = '@allowed.dev';
    try {
      // not on the allowlist → 403
      await request(http()).post('/auth/register')
        .send({ email: 'outsider@evil.com', password: 'password123', name: 'Out' }).expect(403);
      // on the allowlisted domain → 201
      await request(http()).post('/auth/register')
        .send({ email: 'insider@allowed.dev', password: 'password123', name: 'In' }).expect(201);
    } finally {
      process.env.REGISTRATION_OPEN = prevOpen;
      process.env.REGISTRATION_ALLOWLIST = prevList;
    }
  });
});
