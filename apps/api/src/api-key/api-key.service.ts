import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery, CursorPage } from '../common/resource/resource-query.dto';
import { ListApiKeyQuery } from './dto';

type Row = { id: string; secretCiphertext?: string | null; expiresAt?: Date | null; lastUsedAt?: Date | null; [k: string]: unknown };

function deriveLast4(secret: string): string {
  return secret.trim().replace(/\s+/g, '').slice(-4) || '0000';
}
function derivePrefix(secret: string): string {
  return secret.trim().split('-')[0] || 'sk';
}
function toMs(value: unknown): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

@Injectable()
export class ApiKeyService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService, private encryption: EncryptionService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.apiKey as unknown as PrismaResourceDelegate; }
  protected entityName = 'ApiKey';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListApiKeyQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }

  // 剥离 secretCiphertext,expiresAt/lastUsedAt 转毫秒
  private sanitize(row: Row): Record<string, unknown> {
    const { secretCiphertext, ...rest } = row;
    void secretCiphertext;
    return { ...rest, expiresAt: toMs(row.expiresAt), lastUsedAt: toMs(row.lastUsedAt) };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<{ id: string }>> {
    const page = await super.list(workspaceId, query);
    return { items: page.items.map((r) => this.sanitize(r as Row) as { id: string }), nextCursor: page.nextCursor };
  }

  async get(workspaceId: string, id: string): Promise<{ id: string }> {
    const row = await super.get(workspaceId, id);
    return this.sanitize(row as Row) as { id: string };
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const secret = String(data.secret ?? '');
    const last4 = deriveLast4(secret);
    const prefix = String(data.prefix ?? derivePrefix(secret));
    const persisted = {
      ...data,
      prefix,
      last4,
      keyPreview: String(data.keyPreview ?? `${prefix}-...${last4}`),
      secretCiphertext: this.encryption.encrypt(secret),
      expiresAt: data.expiresAt ? new Date(Number(data.expiresAt)) : null,
    };
    delete (persisted as Record<string, unknown>).secret;
    const row = await super.create(workspaceId, persisted);
    return this.sanitize(row as Row) as { id: string };
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const patch: Record<string, unknown> = { ...data };
    if (typeof data.secret === 'string' && data.secret.trim()) {
      const secret = data.secret.trim();
      patch.secretCiphertext = this.encryption.encrypt(secret);
      patch.last4 = deriveLast4(secret);
      patch.prefix = derivePrefix(secret);
      patch.keyPreview = `${patch.prefix}-...${patch.last4}`;
    }
    delete patch.secret;
    if ('expiresAt' in patch) patch.expiresAt = patch.expiresAt ? new Date(Number(patch.expiresAt)) : null;
    const row = await super.update(workspaceId, id, patch);
    return this.sanitize(row as Row) as { id: string };
  }
}
