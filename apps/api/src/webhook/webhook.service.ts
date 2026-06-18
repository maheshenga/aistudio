import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery, CursorPage } from '../common/resource/resource-query.dto';
import { ListWebhookQuery } from './dto';

type Row = { id: string; signingSecretCiphertext?: string | null; lastDeliveredAt?: Date | null; [k: string]: unknown };

function deriveLast4(secret: string): string {
  return secret.trim().replace(/\s+/g, '').slice(-4) || '0000';
}
function toMs(value: unknown): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

@Injectable()
export class WebhookService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService, private encryption: EncryptionService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.webhookEndpoint as unknown as PrismaResourceDelegate; }
  protected entityName = 'WebhookEndpoint';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListWebhookQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }

  private sanitize(row: Row): Record<string, unknown> {
    const { signingSecretCiphertext, ...rest } = row;
    void signingSecretCiphertext;
    return { ...rest, lastDeliveredAt: toMs(row.lastDeliveredAt) };
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
    const secret = String(data.signingSecret ?? '');
    const persisted = {
      ...data,
      events: Array.isArray(data.events) ? data.events : [],
      signingSecretLast4: String(data.signingSecretLast4 ?? deriveLast4(secret)),
      signingSecretCiphertext: this.encryption.encrypt(secret),
    };
    delete (persisted as Record<string, unknown>).signingSecret;
    const row = await super.create(workspaceId, persisted);
    return this.sanitize(row as Row) as { id: string };
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const patch: Record<string, unknown> = { ...data };
    if (typeof data.signingSecret === 'string' && data.signingSecret.trim()) {
      const secret = data.signingSecret.trim();
      patch.signingSecretCiphertext = this.encryption.encrypt(secret);
      patch.signingSecretLast4 = deriveLast4(secret);
    }
    delete patch.signingSecret;
    const row = await super.update(workspaceId, id, patch);
    return this.sanitize(row as Row) as { id: string };
  }
}
