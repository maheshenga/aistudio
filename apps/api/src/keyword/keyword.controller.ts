import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateKeywordLibraryDto, UpdateKeywordLibraryDto, ListKeywordLibraryQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/keyword-libraries',
  createDto: CreateKeywordLibraryDto, updateDto: UpdateKeywordLibraryDto, listQuery: ListKeywordLibraryQuery,
  writePermission: 'resources.write',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/keyword-libraries')
export class KeywordController extends Base {}
