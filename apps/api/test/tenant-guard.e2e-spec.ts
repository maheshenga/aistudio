import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Guard chain (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const http = () => app.getHttpServer();

  it('no token → 401', async () => {
    const { workspaceId } = await registerUser(app, 'g1@test.dev');
    await request(http()).get(`/workspaces/${workspaceId}/projects`).expect(401);
  });

  it('valid token but non-member of target workspace → 403', async () => {
    const a = await registerUser(app, 'g2@test.dev');
    const b = await registerUser(app, 'g3@test.dev');
    await request(http()).get(`/workspaces/${b.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(403);
  });

  it('member → 200', async () => {
    const a = await registerUser(app, 'g4@test.dev');
    await request(http()).get(`/workspaces/${a.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(200);
  });
});
