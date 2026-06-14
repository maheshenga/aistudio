import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('UsageEvent (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends events and summary sums credits', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'ue1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/usage-events`).send({ category: 'generation', credits: 3 })).expect(201);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/usage-events`).send({ category: 'generation', credits: 7 })).expect(201);
    const sum = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/usage-events/summary`)).expect(200);
    expect(sum.body.value.totalCredits).toBe(10);
  });

  it('does not expose PATCH/DELETE', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'ue2@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const made = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/usage-events`).send({ category: 'generation', credits: 1 })).expect(201);
    await auth(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/usage-events/${made.body.value.id}`)).expect(404);
  });
});
