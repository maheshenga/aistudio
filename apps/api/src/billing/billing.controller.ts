import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditService } from './credit.service';
import { GrantCreditDto, LedgerRangeQuery } from './dto';

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

  @Post('grant') @RequirePermission('billing.manage')
  async grant(@WorkspaceId() ws: string, @Body() dto: GrantCreditDto) {
    await this.prisma.$transaction((tx) =>
      this.credit.grant(tx, ws, dto.amount, dto.reason, dto.idempotencyKey, dto.refType, dto.refId),
    );
    return { value: await this.credit.getBalance(ws) };
  }
}
