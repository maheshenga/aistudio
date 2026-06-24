import { Injectable } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import { ListTaskQuery } from './dto';

@Injectable()
export class TaskService extends WorkspaceResourceService<{ id: string }> {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhookDeliveryService,
  ) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.task as unknown as PrismaResourceDelegate; }
  protected entityName = 'Task';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListTaskQuery;
    return { workspaceId, ...(q.column ? { column: q.column } : {}) };
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: { ...data, workspaceId } as Prisma.TaskUncheckedCreateInput,
      }) as Task;
      await this.webhooks.enqueueForTaskUpdated(tx, task, 'created');
      return task;
    });
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    await this.get(workspaceId, id);
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({ where: { id }, data }) as Task;
      await this.webhooks.enqueueForTaskUpdated(tx, task, 'updated');
      return task;
    });
  }
}
