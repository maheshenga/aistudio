import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTicketDto, UpdateTicketDto, ListTicketQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tickets',
  createDto: CreateTicketDto, updateDto: UpdateTicketDto, listQuery: ListTicketQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tickets')
export class TicketController extends Base {}
