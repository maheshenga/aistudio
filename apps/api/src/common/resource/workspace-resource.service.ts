import { notFound } from '../errors';
import { CursorQuery, CursorPage, DEFAULT_LIMIT } from './resource-query.dto';

export interface PrismaResourceDelegate {
  findMany(args: unknown): Promise<Array<{ id: string }>>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<{ id: string }>;
  delete(args: unknown): Promise<unknown>;
}

export abstract class WorkspaceResourceService<T extends { id: string }> {
  protected abstract get delegate(): PrismaResourceDelegate;
  protected abstract entityName: string;

  protected buildWhere(workspaceId: string, _query: CursorQuery): Record<string, unknown> {
    return { workspaceId };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<T>> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const order = query.order ?? 'desc';
    const rows = (await this.delegate.findMany({
      where: this.buildWhere(workspaceId, query),
      orderBy: [{ createdAt: order }, { id: order }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })) as T[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async get(workspaceId: string, id: string): Promise<T> {
    const row = (await this.delegate.findFirst({ where: { id, workspaceId } })) as T | null;
    if (!row) throw notFound(`${this.entityName} not found`);
    return row;
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<T> {
    return (await this.delegate.create({ data: { ...data, workspaceId } })) as T;
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<T> {
    await this.get(workspaceId, id);
    return (await this.delegate.update({ where: { id }, data })) as T;
  }

  async remove(workspaceId: string, id: string): Promise<{ id: string }> {
    await this.get(workspaceId, id);
    await this.delegate.delete({ where: { id } });
    return { id };
  }
}
