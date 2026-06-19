import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateMediaAccountDto, UpdateMediaAccountDto, ListMediaAccountQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/media-accounts',
  createDto: CreateMediaAccountDto, updateDto: UpdateMediaAccountDto, listQuery: ListMediaAccountQuery,
  writePermission: 'resources.write',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/media-accounts')
export class MediaController extends Base {}
