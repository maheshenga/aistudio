import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { permissionDenied } from '../common/errors';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditService } from './credit.service';
import { GrantCreditDto, LedgerRangeQuery } from './dto';

const GRANT_ROLES = new Set(['owner', 'admin']);

@Controller('workspaces/:workspaceId/credits')
export class BillingController {
  constructor(private credit: CreditService, private prisma: PrismaService) {}

  @Get('balance')
  async balance(@WorkspaceId() ws: string) {
    return { value: await this.credit.getBalance(ws) };
  }

  @Get('ledger')
  async ledger(@WorkspaceId() ws: string, @Query() q: LedgerRangeQuery) {
    return { value: await this.credit.listLedger(ws, q) };
  }

  @Post('grant')
  async grant(@WorkspaceId() ws: string, @Body() dto: GrantCreditDto, @CurrentUser() user: { userId: string; role?: string }) {
    if (!user.role || !GRANT_ROLES.has(user.role)) throw permissionDenied('Only owner/admin can grant credits');
    await this.prisma.$transaction((tx) =>
      this.credit.grant(tx, ws, dto.amount, dto.reason, dto.idempotencyKey, dto.refType, dto.refId),
    );
    return { value: await this.credit.getBalance(ws) };
  }
}
