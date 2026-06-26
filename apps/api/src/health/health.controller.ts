import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/tenant/public.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}