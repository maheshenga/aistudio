import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AuditLog (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends and filters by action', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/audit-logs`).send({ action: 'asset_create', targetType: 'asset', targetId: 'a1' }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/audit-logs`).send({ action: 'asset_delete' }).expect(201);
    const created = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/audit-logs?action=asset_create`).expect(200);
    expect(created.body.value).toHaveLength(1);
    expect(created.body.value[0].action).toBe('asset_create');
  });
});
