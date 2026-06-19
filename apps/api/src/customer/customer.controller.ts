import { Body, Controller, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { CreateCustomerDto, UpdateCustomerDto, ListCustomerQuery } from './dto';
import { CustomerService } from './customer.service';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/customers',
  createDto: CreateCustomerDto,
  updateDto: UpdateCustomerDto,
  listQuery: ListCustomerQuery,
  writePermission: 'resources.write',
}) as new (...args: any[]) => { svc: CustomerService };

@Controller('workspaces/:workspaceId/customers')
export class CustomerController extends Base {
  @Post('lead') @RequirePermission('resources.write')
  async lead(@WorkspaceId() ws: string, @Body() dto: CreateCustomerDto) {
    return { value: await this.svc.createOrUpdateLead(ws, dto) };
  }
}
