import { Injectable } from '@nestjs/common';
import { FinancialRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import { ListFinancialRecordQuery } from './dto';

@Injectable()
export class FinancialService extends WorkspaceResourceService<{ id: string }> {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhookDeliveryService,
  ) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.financialRecord as unknown as PrismaResourceDelegate; }
  protected entityName = 'FinancialRecord';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListFinancialRecordQuery;
    return {
      workspaceId,
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.financialRecord.create({
        data: { ...data, workspaceId } as Prisma.FinancialRecordUncheckedCreateInput,
      }) as FinancialRecord;
      if (this.isInvoiceIssued(row)) {
        await this.webhooks.enqueueForInvoiceIssued(tx, row);
      }
      return row;
    });
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    await this.get(workspaceId, id);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.financialRecord.findFirst({ where: { id, workspaceId } }) as FinancialRecord | null;
      const row = await tx.financialRecord.update({ where: { id }, data }) as FinancialRecord;
      if (this.isInvoiceIssued(row) && !this.isInvoiceIssued(before ?? { kind: '', status: '' })) {
        await this.webhooks.enqueueForInvoiceIssued(tx, row);
      }
      return row;
    });
  }

  private isInvoiceIssued(row: { kind: string; status: string }): boolean {
    return row.kind === 'invoice' && row.status === 'issued';
  }
}
