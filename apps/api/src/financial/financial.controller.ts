import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateFinancialRecordDto, UpdateFinancialRecordDto, ListFinancialRecordQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/financial-records',
  createDto: CreateFinancialRecordDto, updateDto: UpdateFinancialRecordDto, listQuery: ListFinancialRecordQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/financial-records')
export class FinancialController extends Base {}
