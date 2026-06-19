import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { TokenService } from '../src/auth/token.service';
import * as bcrypt from 'bcrypt';

/**
 * RBAC 权限矩阵 e2e（B1）。
 *
 * 验证 RolesGuard 对五角色 × 关键受保护接口的拦截：
 * - owner/admin：全部写通过。
 * - operator：运营资源写通过；members.manage / billing / 财务资源写 / workspace.update → 403。
 * - finance：财务资源写、billing 通过；运营资源写、members、workspace.update → 403。
 * - viewer：所有写 403；读 200。
 * 另含 owner 保护：不可降级/删除最后一个 owner。
 */
describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: TokenService;
  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    tokens = app.get(TokenService);
  });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const http = () => app.getHttpServer();

  /**
   * 在 owner 的 workspace 内植入一个指定角色的成员（关联一个全新注册用户），
   * 返回该用户的 access token。TenantGuard 会按 (workspaceId,userId) 查到角色。
   */
  async function memberWithRole(workspaceId: string, role: string, email: string) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({ data: { email, passwordHash, name: email.split('@')[0] } });
    await prisma.member.create({ data: { workspaceId, userId: user.id, role } });
    return { userId: user.id, accessToken: tokens.signAccess(user.id) };
  }

  async function setupWorkspace() {
    const owner = await registerUser(app, 'rbac-owner@test.dev');
    return { workspaceId: owner.workspaceId, ownerToken: owner.accessToken, ownerUserId: owner.userId };
  }

  describe('权限矩阵', () => {
    let ws: string;
    let ownerToken: string;
    let adminToken: string;
    let operatorToken: string;
    let financeToken: string;
    let viewerToken: string;

    beforeAll(async () => {
      // 注意：beforeAll 在模块级 beforeAll 之后运行；这里复用同一个 app/prisma。
    });

    beforeEach(async () => {
      const setup = await setupWorkspace();
      ws = setup.workspaceId;
      ownerToken = setup.ownerToken;
      adminToken = (await memberWithRole(ws, 'admin', 'rbac-admin@test.dev')).accessToken;
      operatorToken = (await memberWithRole(ws, 'operator', 'rbac-operator@test.dev')).accessToken;
      financeToken = (await memberWithRole(ws, 'finance', 'rbac-finance@test.dev')).accessToken;
      viewerToken = (await memberWithRole(ws, 'viewer', 'rbac-viewer@test.dev')).accessToken;
    });

    const auth = (token: string) => (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
    const expectStatus = (token: string, method: 'post' | 'patch' | 'delete' | 'get', path: string, status: number, body?: object) =>
      auth(token)(request(http())[method](`/workspaces/${ws}${path}`).send(body)).expect(status);

    // ---- 读接口：任意成员可读 ----
    it('viewer 可读 projects（workspace.view 隐含）', async () => {
      await expectStatus(viewerToken, 'get', '/projects', 200);
    });
    it('finance 可读 credits/balance', async () => {
      await auth(financeToken)(request(http()).get(`/workspaces/${ws}/credits/balance`)).expect(200);
    });

    // ---- members.manage：member 写 ----
    it('viewer 改成员 → 403；admin 加成员 → 201', async () => {
      const target = await prisma.user.create({ data: { email: 'mb1@test.dev', passwordHash: await bcrypt.hash('p', 10), name: 'T' } });
      await expectStatus(viewerToken, 'post', '/members', 403, { userId: target.id, role: 'viewer' });
      await expectStatus(adminToken, 'post', '/members', 201, { userId: target.id, role: 'viewer' });
    });
    it('operator 改成员角色 → 403', async () => {
      const target = await prisma.user.create({ data: { email: 'mb2@test.dev', passwordHash: await bcrypt.hash('p', 10), name: 'T' } });
      await prisma.member.create({ data: { workspaceId: ws, userId: target.id, role: 'viewer' } });
      await expectStatus(operatorToken, 'patch', `/members/${target.id}`, 403, { role: 'operator' });
    });

    // ---- workspace.manage：workspace.update ----
    it('operator 改 workspace → 403；admin 改 workspace → 200', async () => {
      await auth(operatorToken)(request(http()).patch(`/workspaces/${ws}`).send({ name: 'X' })).expect(403);
      await auth(adminToken)(request(http()).patch(`/workspaces/${ws}`).send({ name: 'Y' })).expect(200);
    });
    it('viewer 改 workspace → 403', async () => {
      await auth(viewerToken)(request(http()).patch(`/workspaces/${ws}`).send({ name: 'Z' })).expect(403);
    });

    // ---- billing.manage：credits/grant + 财务资源写 ----
    it('operator grant credits → 403；finance grant → 201', async () => {
      await auth(operatorToken)(request(http()).post(`/workspaces/${ws}/credits/grant`)
        .send({ amount: 10, reason: 'test', idempotencyKey: 'k1' })).expect(403);
      await auth(financeToken)(request(http()).post(`/workspaces/${ws}/credits/grant`)
        .send({ amount: 10, reason: 'test', idempotencyKey: 'k2' })).expect(201);
    });
    it('viewer grant credits → 403', async () => {
      await auth(viewerToken)(request(http()).post(`/workspaces/${ws}/credits/grant`)
        .send({ amount: 1, reason: 't', idempotencyKey: 'k3' })).expect(403);
    });

    // ---- 财务资源写（financial/payment/tax-event）= billing.manage ----
    it('operator 写 financial-records → 403；finance 写 → 201', async () => {
      const body = { kind: 'invoice', amountCents: 10000, status: 'pending' };
      await expectStatus(operatorToken, 'post', '/financial-records', 403, body);
      await expectStatus(financeToken, 'post', '/financial-records', 201, body);
    });
    it('operator 写 payment-methods → 403；finance 写 → 201', async () => {
      const body = { label: 'VISA', provider: 'stripe', brand: 'visa' };
      await expectStatus(operatorToken, 'post', '/payment-methods', 403, body);
      await expectStatus(financeToken, 'post', '/payment-methods', 201, body);
    });
    it('operator 写 tax-events → 403；finance 写 → 201', async () => {
      const body = { date: '2026-06-30', title: 'VAT deadline', type: 'tax_deadline' };
      await expectStatus(operatorToken, 'post', '/tax-events', 403, body);
      await expectStatus(financeToken, 'post', '/tax-events', 201, body);
    });

    // ---- 运营资源写（campaign/task/customer 等）= resources.write ----
    it('finance 写 campaigns → 403；operator 写 → 201', async () => {
      await expectStatus(financeToken, 'post', '/campaigns', 403, { name: 'C1' });
      await expectStatus(operatorToken, 'post', '/campaigns', 201, { name: 'C1' });
    });
    it('finance 写 tasks → 403；operator 写 → 201', async () => {
      const body = { title: 'T1', column: 'todo', priority: 'Medium' };
      await expectStatus(financeToken, 'post', '/tasks', 403, body);
      await expectStatus(operatorToken, 'post', '/tasks', 201, body);
    });
    it('viewer 写 customers → 403；operator 写 → 201', async () => {
      await expectStatus(viewerToken, 'post', '/customers', 403, { name: 'Cu1' });
      await expectStatus(operatorToken, 'post', '/customers', 201, { name: 'Cu1' });
    });
    it('viewer 写 projects → 403；admin 写 → 201', async () => {
      await expectStatus(viewerToken, 'post', '/projects', 403, { name: 'P1' });
      await expectStatus(adminToken, 'post', '/projects', 201, { name: 'P1' });
    });

    // ---- settings.manage ----
    it('operator 写 settings → 200（operator 有 settings.manage）；viewer 写 → 403', async () => {
      await auth(operatorToken)(request(http()).patch(`/workspaces/${ws}/settings`).send({ patch: { 'k': 'v' } })).expect(200);
      await auth(viewerToken)(request(http()).patch(`/workspaces/${ws}/settings`).send({ patch: { 'k': 'v2' } })).expect(403);
    });

    // ---- api_keys.manage ----
    it('operator 写 api-keys → 403；admin 写 → 201', async () => {
      const body = { name: 'K1', secret: 'sk_test_xxx' };
      await expectStatus(operatorToken, 'post', '/api-keys', 403, body);
      await expectStatus(adminToken, 'post', '/api-keys', 201, body);
    });
    it('viewer 写 webhooks → 403；admin 写 → 201', async () => {
      const body = { name: 'Hook1', url: 'https://example.com/hook', signingSecret: 'whsec_xxx', events: ['*'] };
      await expectStatus(viewerToken, 'post', '/webhooks', 403, body);
      await expectStatus(adminToken, 'post', '/webhooks', 201, body);
    });

    // ---- assets.manage ----
    it('finance 写 assets → 403；operator 写 → 201', async () => {
      const body = { kind: 'image' };
      await expectStatus(financeToken, 'post', '/assets', 403, body);
      await expectStatus(operatorToken, 'post', '/assets', 201, body);
    });

    // ---- generation.dispatch ----
    it('finance 写 generation-jobs → 403；operator 写 → 201', async () => {
      await expectStatus(financeToken, 'post', '/generation-jobs', 403, { type: 'image', input: {} });
      await expectStatus(operatorToken, 'post', '/generation-jobs', 201, { type: 'image', input: {} });
    });

    // ---- owner/admin 全通过 ----
    it('owner 写 campaigns → 201', async () => {
      await expectStatus(ownerToken, 'post', '/campaigns', 201, { name: 'OwnerC' });
    });
    it('owner grant credits → 201', async () => {
      await auth(ownerToken)(request(http()).post(`/workspaces/${ws}/credits/grant`)
        .send({ amount: 5, reason: 'owner', idempotencyKey: 'ok1' })).expect(201);
    });
  });

  describe('owner 保护', () => {
    let ws: string;
    let ownerToken: string;
    let adminToken: string;
    let ownerMemberId: string;

    beforeEach(async () => {
      const setup = await setupWorkspace();
      ws = setup.workspaceId;
      ownerToken = setup.ownerToken;
      ownerMemberId = (await prisma.member.findFirst({ where: { workspaceId: ws, userId: setup.ownerUserId } }))!.id;
      adminToken = (await memberWithRole(ws, 'admin', 'rbac-own-admin@test.dev')).accessToken;
    });

    it('admin 不能降级 owner（唯一 owner）→ 403', async () => {
      await request(http()).patch(`/workspaces/${ws}/members/${ownerMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('admin 不能删除最后一个 owner → 403', async () => {
      await request(http()).delete(`/workspaces/${ws}/members/${ownerMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('存在两个 owner 时，admin 可删除其中一个 → 200', async () => {
      const secondOwner = await memberWithRole(ws, 'owner', 'rbac-own2@test.dev');
      const secondMemberId = (await prisma.member.findFirst({ where: { workspaceId: ws, userId: secondOwner.userId } }))!.id;
      await request(http()).delete(`/workspaces/${ws}/members/${secondMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
