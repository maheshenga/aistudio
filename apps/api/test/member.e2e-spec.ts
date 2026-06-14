import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Member (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('adds member; duplicate (workspaceId,userId) → 409 conflict', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'm1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    // Member.userId is FK to User; create a real target user to add
    const target = await prisma.user.create({
      data: { email: 'm1-target@test.dev', passwordHash: await bcrypt.hash('password123', 10), name: 'Target' },
    });
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/members`).send({ userId: target.id, role: 'owner' })).expect(201);
    const dup = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/members`).send({ userId: target.id, role: 'admin' })).expect(409);
    expect(dup.body.error.code).toBe('conflict');
  });
});
