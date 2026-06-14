import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  private get refreshTtlMs(): number {
    const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    return days * 24 * 60 * 60 * 1000;
  }
  private sha(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  signAccess(userId: string): string {
    return this.jwt.sign({ sub: userId }, { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' });
  }
  verifyAccess(token: string): string {
    return this.jwt.verify<{ sub: string }>(token).sub;
  }

  async issueRefresh(userId: string, client = 'web'): Promise<{ token: string }> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.sha(token), client, expiresAt: new Date(Date.now() + this.refreshTtlMs) },
    });
    return { token };
  }

  async rotateRefresh(token: string): Promise<{ token: string; userId: string } | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.sha(token) } });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null;
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const next = await this.issueRefresh(row.userId, row.client);
    return { token: next.token, userId: row.userId };
  }

  async revokeRefresh(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.sha(token), revokedAt: null }, data: { revokedAt: new Date() },
    });
  }
}
