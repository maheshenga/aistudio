import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateAgencyPartnerDto, UpdateAgencyPartnerDto, ListAgencyPartnerQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/agency-partners',
  createDto: CreateAgencyPartnerDto, updateDto: UpdateAgencyPartnerDto, listQuery: ListAgencyPartnerQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/agency-partners')
export class AgencyController extends Base {}
