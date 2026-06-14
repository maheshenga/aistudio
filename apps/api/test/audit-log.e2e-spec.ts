import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AuditLog (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends and filters by action', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'al1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/audit-logs`).send({ action: 'asset_create', targetType: 'asset', targetId: 'a1' })).expect(201);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/audit-logs`).send({ action: 'asset_delete' })).expect(201);
    const created = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/audit-logs?action=asset_create`)).expect(200);
    expect(created.body.value).toHaveLength(1);
    expect(created.body.value[0].action).toBe('asset_create');
  });
});
