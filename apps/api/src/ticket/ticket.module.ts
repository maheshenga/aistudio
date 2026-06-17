import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [TicketController],
  providers: [TicketService, { provide: RESOURCE_SERVICE, useExisting: TicketService }],
})
export class TicketModule {}
