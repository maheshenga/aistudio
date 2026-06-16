import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export interface CreditBalanceSnapshot {
  balance: number;
  plan: string;
  monthlyAllowance: number;
  periodKey: string;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface CreditRepositoryContext {
  workspaceId: string;
}

let creditApiClient: ApiClient = defaultApiClient;
export function __setCreditApiClientForTest(client: ApiClient): void { creditApiClient = client; }

const balanceCache = new Map<string, CreditBalanceSnapshot>();

export async function hydrateCreditBalance(context: CreditRepositoryContext): Promise<void> {
  if (!creditApiClient.configured) return;
  const res = await creditApiClient.get<CreditBalanceSnapshot>(context.workspaceId, 'credits/balance');
  if (res.ok && res.value) balanceCache.set(context.workspaceId, res.value);
}

export function getCreditBalanceSnapshot(context: CreditRepositoryContext): CreditBalanceSnapshot | null {
  if (!creditApiClient.configured) return null;
  return balanceCache.get(context.workspaceId) ?? null;
}

export async function listCreditLedger(context: CreditRepositoryContext): Promise<CreditLedgerEntry[]> {
  if (!creditApiClient.configured) return [];
  const res = await creditApiClient.get<CreditLedgerEntry[]>(context.workspaceId, 'credits/ledger');
  return res.ok && Array.isArray(res.value) ? res.value : [];
}

export async function grantCredits(
  context: CreditRepositoryContext,
  body: { amount: number; reason: string; idempotencyKey?: string; refType?: string; refId?: string },
): Promise<CreditBalanceSnapshot | null> {
  if (!creditApiClient.configured) return null;
  const res = await creditApiClient.post<CreditBalanceSnapshot>(context.workspaceId, 'credits/grant', body);
  if (res.ok && res.value) { balanceCache.set(context.workspaceId, res.value); return res.value; }
  return null;
}
