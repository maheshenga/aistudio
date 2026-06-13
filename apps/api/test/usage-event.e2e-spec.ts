import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('UsageEvent (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends events and summary sums credits', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 3 }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 7 }).expect(201);
    const sum = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/usage-events/summary`).expect(200);
    expect(sum.body.value.totalCredits).toBe(10);
  });

  it('does not expose PATCH/DELETE', async () => {
    const ws = await seedWorkspace(prisma);
    const made = await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 1 }).expect(201);
    await request(app.getHttpServer()).delete(`/workspaces/${ws.id}/usage-events/${made.body.value.id}`).expect(404);
  });
});
