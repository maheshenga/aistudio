import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTaxEventDto, UpdateTaxEventDto, ListTaxEventQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tax-events',
  createDto: CreateTaxEventDto, updateDto: UpdateTaxEventDto, listQuery: ListTaxEventQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tax-events')
export class TaxEventController extends Base {}
