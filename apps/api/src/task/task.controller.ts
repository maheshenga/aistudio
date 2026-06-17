import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTaskDto, UpdateTaskDto, ListTaskQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tasks',
  createDto: CreateTaskDto, updateDto: UpdateTaskDto, listQuery: ListTaskQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tasks')
export class TaskController extends Base {}
