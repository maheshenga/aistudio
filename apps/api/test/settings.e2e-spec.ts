import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Settings singleton (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
  });
  beforeEach(async () => {
    await resetDb(prisma);
  });
  afterAll(async () => {
    await app.close();
  });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('per-user round-trip: put / get / delete', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'set1@test.dev');
    const a = auth(accessToken);
    await a(
      request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)
        .send({ patch: { theme: 'dark', pinned: ['a', 'b'] } }),
    ).expect(200);
    const got = await a(
      request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`),
    ).expect(200);
    expect(got.body.value.theme).toBe('dark');
    expect(got.body.value.pinned).toEqual(['a', 'b']);
    await a(
      request(app.getHttpServer()).delete(
        `/workspaces/${workspaceId}/settings/theme?ownerId=${userId}`,
      ),
    ).expect(200);
    const after = await a(
      request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`),
    ).expect(200);
    expect(after.body.value.theme).toBeUndefined();
    expect(after.body.value.pinned).toEqual(['a', 'b']);
  });

  it('null value stored as null (not deletion)', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'setnull@test.dev');
    const a = auth(accessToken);
    await a(
      request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)
        .send({ patch: { maybe: null } }),
    ).expect(200);
    const got = await a(
      request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`),
    ).expect(200);
    expect(Object.prototype.hasOwnProperty.call(got.body.value, 'maybe')).toBe(true);
    expect(got.body.value.maybe).toBeNull();
  });

  it('ownerId privilege: reading another user settings → 403', async () => {
    const a1 = await registerUser(app, 'setowna@test.dev');
    const a2 = await registerUser(app, 'setownb@test.dev');
    await auth(a1.accessToken)(
      request(app.getHttpServer()).get(
        `/workspaces/${a1.workspaceId}/settings?ownerId=${a2.userId}`,
      ),
    ).expect(403);
  });

  it('workspace-level write requires owner/admin', async () => {
    const ownerUser = await registerUser(app, 'setwsowner@test.dev');
    const memberToken = await (async () => {
      const r = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'setwsmember@test.dev', password: 'password123', name: 'M' })
        .expect(201);
      const uid = r.body.value.user.id;
      await prisma.member.create({
        data: { workspaceId: ownerUser.workspaceId, userId: uid, role: 'member' },
      });
      return r.body.value.accessToken as string;
    })();
    // member 写 workspace 级 → 403
    await auth(memberToken)(
      request(app.getHttpServer())
        .patch(`/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`)
        .send({ patch: { smtp: 'x' } }),
    ).expect(403);
    // owner 写 workspace 级 → 200
    await auth(ownerUser.accessToken)(
      request(app.getHttpServer())
        .patch(`/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`)
        .send({ patch: { smtp: 'x' } }),
    ).expect(200);
    // member 读 workspace 级 → 200
    await auth(memberToken)(
      request(app.getHttpServer()).get(
        `/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`,
      ),
    ).expect(200);
  });

  it('workspace isolation: non-member → 403', async () => {
    const a1 = await registerUser(app, 'setiso1@test.dev');
    const a2 = await registerUser(app, 'setiso2@test.dev');
    await auth(a2.accessToken)(
      request(app.getHttpServer()).get(
        `/workspaces/${a1.workspaceId}/settings?ownerId=workspace`,
      ),
    ).expect(403);
  });

  it('default ownerId = caller userId', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'setdef@test.dev');
    const a = auth(accessToken);
    await a(
      request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/settings`)
        .send({ patch: { foo: 'bar' } }),
    ).expect(200);
    const got = await a(
      request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`),
    ).expect(200);
    expect(got.body.value.foo).toBe('bar');
  });
});
