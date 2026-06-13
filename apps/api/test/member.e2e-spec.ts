import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Member (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('adds member; duplicate (workspaceId,userId) → 409 conflict', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/members`).send({ userId: 'u1', role: 'owner' }).expect(201);
    const dup = await request(app.getHttpServer()).post(`/workspaces/${ws.id}/members`).send({ userId: 'u1', role: 'admin' }).expect(409);
    expect(dup.body.error.code).toBe('conflict');
  });
});
