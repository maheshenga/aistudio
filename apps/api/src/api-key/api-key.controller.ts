import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateApiKeyDto, UpdateApiKeyDto, ListApiKeyQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/api-keys',
  createDto: CreateApiKeyDto, updateDto: UpdateApiKeyDto, listQuery: ListApiKeyQuery,
  writePermission: 'api_keys.manage',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/api-keys')
export class ApiKeyController extends Base {}
