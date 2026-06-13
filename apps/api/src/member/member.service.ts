import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { conflict, notFound } from '../common/errors';
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
  async update(workspaceId: string, id: string, dto: UpdateMemberDto) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    return this.prisma.member.update({ where: { id }, data: dto });
  }
  async remove(workspaceId: string, id: string) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    await this.prisma.member.delete({ where: { id } });
    return { id };
  }
}
