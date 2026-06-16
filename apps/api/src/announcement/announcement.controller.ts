import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateAnnouncementDto, UpdateAnnouncementDto, ListAnnouncementQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/announcements',
  createDto: CreateAnnouncementDto, updateDto: UpdateAnnouncementDto, listQuery: ListAnnouncementQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/announcements')
export class AnnouncementController extends Base {}
