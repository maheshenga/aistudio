import { Module } from '@nestjs/common';
import { UsageEventController } from './usage-event.controller';
import { UsageEventService } from './usage-event.service';
@Module({ controllers: [UsageEventController], providers: [UsageEventService] })
export class UsageEventModule {}
