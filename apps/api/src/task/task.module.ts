import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  imports: [WebhookModule],
  controllers: [TaskController],
  providers: [TaskService, { provide: RESOURCE_SERVICE, useExisting: TaskService }],
})
export class TaskModule {}
