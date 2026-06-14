import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from './dto';
import { conflict, unauthenticated } from '../common/errors';

type UserShape = { id: string; email: string; name: string; avatarLabel: string | null };

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private passwords: PasswordService, private tokens: TokenService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw conflict('Email already registered');
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash, name: dto.name } });
    const workspace = await this.prisma.workspace.create({ data: { name: `${dto.name} 的工作区` } });
    await this.prisma.member.create({
      data: { workspaceId: workspace.id, userId: user.id, role: 'owner', name: dto.name, email: dto.email },
    });
    return this.issueFor(user.id, 'web', user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await this.passwords.verify(dto.password, user.passwordHash))) {
      throw unauthenticated('Invalid email or password');
    }
    return this.issueFor(user.id, dto.client ?? 'web', user);
  }

  async refresh(refreshToken: string) {
    const rotated = await this.tokens.rotateRefresh(refreshToken);
    if (!rotated) throw unauthenticated('Invalid or expired refresh token');
    return { accessToken: this.tokens.signAccess(rotated.userId), refreshToken: rotated.token };
  }

  async logout(refreshToken: string) {
    await this.tokens.revokeRefresh(refreshToken);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const members = await this.prisma.member.findMany({ where: { userId }, include: { workspace: true } });
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarLabel: user.avatarLabel },
      memberships: members.map((m) => ({ workspaceId: m.workspaceId, role: m.role, workspaceName: m.workspace.name })),
    };
  }

  private async issueFor(userId: string, client: string, user: UserShape) {
    const refresh = await this.tokens.issueRefresh(userId, client);
    return {
      accessToken: this.tokens.signAccess(userId),
      refreshToken: refresh.token,
      user: { id: user.id, email: user.email, name: user.name, avatarLabel: user.avatarLabel },
    };
  }
}
