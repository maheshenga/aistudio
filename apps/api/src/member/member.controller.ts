import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { MemberService } from './member.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@Controller('workspaces/:workspaceId/members')
export class MemberController {
  constructor(private svc: MemberService) {}
  @Get() async list(@WorkspaceId() ws: string) { return { value: await this.svc.list(ws) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: CreateMemberDto) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: UpdateMemberDto) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
