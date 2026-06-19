import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateRiskEventDto, UpdateRiskEventDto, ListRiskEventQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/risk-events',
  createDto: CreateRiskEventDto, updateDto: UpdateRiskEventDto, listQuery: ListRiskEventQuery,
  writePermission: 'resources.write',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/risk-events')
export class RiskController extends Base {}
