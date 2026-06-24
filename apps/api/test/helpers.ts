import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import * as bcrypt from 'bcrypt';

export async function bootstrapTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.THROTTLE_LIMIT ??= '10000';
  process.env.THROTTLE_AUTH_LIMIT ??= '1000';
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDb(prisma: PrismaService) {
  // 子表先删，再删 Workspace（外键顺序）
  await prisma.auditLog.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.agencyPartner.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.mediaAccount.deleteMany();
  await prisma.keywordLibrary.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.taxEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.project.deleteMany();
  await prisma.member.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedWorkspace(prisma: PrismaService, name = 'WS') {
  return prisma.workspace.create({ data: { name } });
}

export async function seedUserWithMember(
  prisma: PrismaService,
  opts: { email?: string; password?: string; role?: string } = {},
) {
  const email = opts.email ?? `user_${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const passwordHash = await bcrypt.hash(opts.password ?? 'password123', 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name: 'Test User' } });
  const workspace = await prisma.workspace.create({ data: { name: 'WS' } });
  const member = await prisma.member.create({
    data: { workspaceId: workspace.id, userId: user.id, role: opts.role ?? 'owner' },
  });
  return { user, workspace, member };
}

export async function registerUser(app: INestApplication, email: string) {
  const r = await request(app.getHttpServer()).post('/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0] }).expect(201);
  const me = await request(app.getHttpServer()).get('/auth/me')
    .set('Authorization', `Bearer ${r.body.value.accessToken}`).expect(200);
  return {
    accessToken: r.body.value.accessToken as string,
    userId: r.body.value.user.id as string,
    workspaceId: me.body.value.memberships[0].workspaceId as string,
  };
}
