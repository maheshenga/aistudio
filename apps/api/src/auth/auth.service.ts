import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from './dto';
import { conflict, unauthenticated, permissionDenied } from '../common/errors';

type UserShape = { id: string; email: string; name: string; avatarLabel: string | null };

/**
 * AUTH-03: gate self-registration for the closed cohort.
 * REGISTRATION_OPEN=true  → anyone may register (dev/local default behavior).
 * Otherwise REGISTRATION_ALLOWLIST is a comma-separated list of allowed emails
 * (e.g. "a@x.com") and/or domains (e.g. "@acme.com"); only matching emails register.
 * An empty allowlist with REGISTRATION_OPEN!=true means registration is closed.
 */
export function isRegistrationAllowed(email: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.REGISTRATION_OPEN ?? '').toLowerCase() === 'true') return true;
  const normalized = email.trim().toLowerCase();
  const entries = (env.REGISTRATION_ALLOWLIST ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return false;
  return entries.some((entry) =>
    entry.startsWith('@') ? normalized.endsWith(entry) : normalized === entry,
  );
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private passwords: PasswordService, private tokens: TokenService) {}

  async register(dto: RegisterDto) {
    if (!isRegistrationAllowed(dto.email)) {
      throw permissionDenied('Registration is invite-only. Contact your administrator for access.');
    }
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
    if (!user) throw unauthenticated('Invalid email or password');

    // AUTH-06: per-account lockout after repeated failures.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw unauthenticated('Account temporarily locked due to repeated failed logins. Try again later.');
    }

    const valid = await this.passwords.verify(dto.password, user.passwordHash);
    if (!valid) {
      const threshold = Number(process.env.AUTH_LOCKOUT_THRESHOLD ?? 5);
      const lockMs = Number(process.env.AUTH_LOCKOUT_MS ?? 15 * 60 * 1000);
      const nextCount = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextCount,
          lockedUntil: nextCount >= threshold ? new Date(Date.now() + lockMs) : null,
        },
      });
      throw unauthenticated('Invalid email or password');
    }

    if (user.failedLoginCount !== 0 || user.lockedUntil) {
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
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
