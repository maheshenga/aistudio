import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export async function bootstrapTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
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
  await prisma.project.deleteMany();
  await prisma.member.deleteMany();
  await prisma.workspace.deleteMany();
}

export async function seedWorkspace(prisma: PrismaService, name = 'WS') {
  return prisma.workspace.create({ data: { name } });
}
