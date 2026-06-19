import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { conflict, notFound, permissionDenied, validationError } from '../common/errors';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string) { return this.prisma.member.findMany({ where: { workspaceId } }); }
  async create(workspaceId: string, dto: CreateMemberDto) {
    try { return await this.prisma.member.create({ data: { ...dto, workspaceId } }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw conflict('Member already exists in workspace');
      throw e;
    }
  }
  /**
   * owner 保护：
   * - 目标成员为 owner 时，不允许降级为其他角色（owner 语义不可被非 owner 操作降级）。
   * - 由 owner/admin 操作时允许（RolesGuard 已保证只有 members.manage 权限者能到这），
   *   但即便授权通过，也不允许把最后一个 owner 降级。
   */
  async update(workspaceId: string, id: string, dto: UpdateMemberDto) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    if (row.role === 'owner' && dto.role !== undefined && dto.role !== 'owner') {
      const ownerCount = await this.prisma.member.count({ where: { workspaceId, role: 'owner' } });
      if (ownerCount <= 1) {
        throw permissionDenied('Cannot demote the last owner of a workspace');
      }
      throw validationError('Cannot demote an owner; remove and re-add with a different role instead');
    }
    return this.prisma.member.update({ where: { id }, data: dto });
  }
  async remove(workspaceId: string, id: string) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    if (row.role === 'owner') {
      const ownerCount = await this.prisma.member.count({ where: { workspaceId, role: 'owner' } });
      if (ownerCount <= 1) {
        throw permissionDenied('Cannot remove the last owner of a workspace');
      }
    }
    await this.prisma.member.delete({ where: { id } });
    return { id };
  }
}
