import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedUserWithMember } from './helpers';
import { TokenService } from '../src/auth/token.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('TokenService', () => {
  let app: INestApplication; let prisma: PrismaService; let tokens: TokenService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); tokens = app.get(TokenService); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('issues access token carrying userId', async () => {
    const { user } = await seedUserWithMember(prisma);
    const access = tokens.signAccess(user.id);
    expect(tokens.verifyAccess(access)).toBe(user.id);
  });

  it('creates and rotates refresh token', async () => {
    const { user } = await seedUserWithMember(prisma);
    const issued = await tokens.issueRefresh(user.id, 'web');
    expect(issued.token).toBeTruthy();
    const rotated = await tokens.rotateRefresh(issued.token);
    expect(rotated).not.toBeNull();
    expect(await tokens.rotateRefresh(issued.token)).toBeNull(); // 旧的已撤销
  });
});
