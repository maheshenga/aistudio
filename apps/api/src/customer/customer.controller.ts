import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { CustomerService } from './customer.service';

@Controller('workspaces/:workspaceId/customers')
export class CustomerController {
  constructor(private svc: CustomerService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: CursorQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
