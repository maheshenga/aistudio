import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Workspace (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('POST /workspaces creates a workspace (public)', async () => {
    const res = await request(app.getHttpServer()).post('/workspaces').send({ name: 'Acme' }).expect(201);
    expect(res.body.value.id).toBeDefined();
    expect(res.body.value.name).toBe('Acme');
    expect(res.body.value.plan).toBe('free');
  });

  it('GET /workspaces/:id returns it; unknown id → 404 not_found', async () => {
    const ws = await prisma.workspace.create({ data: { name: 'Acme' } });
    const ok = await request(app.getHttpServer()).get(`/workspaces/${ws.id}`).expect(200);
    expect(ok.body.value.id).toBe(ws.id);
    const miss = await request(app.getHttpServer()).get('/workspaces/nope').expect(404);
    expect(miss.body.error.code).toBe('not_found');
  });

  it('rejects unknown fields (forbidNonWhitelisted) → 400 validation_error', async () => {
    const res = await request(app.getHttpServer()).post('/workspaces').send({ name: 'A', hacker: 1 }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
