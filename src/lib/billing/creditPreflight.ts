import { isCreditBackendConfigured, hydrateCreditBalance, getCreditBalanceSnapshot } from '../data/creditRepository';

export type CreditPreflightResult =
  | { ok: true; balance: number | null }
  | { ok: false; balance: number | null; reason: 'insufficient' | 'unavailable' };

export async function preflightCredits(params: {
  workspaceId: string;
  requiredCredits: number;
}): Promise<CreditPreflightResult> {
  const { workspaceId, requiredCredits } = params;
  if (!isCreditBackendConfigured()) {
    // 后端未接入(local MVP 稳态):没有计费系统需要守卫,直接放行
    return { ok: true, balance: null };
  }
  try {
    await hydrateCreditBalance({ workspaceId });
  } catch {
    return { ok: false, balance: null, reason: 'unavailable' };
  }
  const snapshot = getCreditBalanceSnapshot({ workspaceId });
  if (!snapshot) {
    return { ok: false, balance: null, reason: 'unavailable' };
  }
  if (snapshot.balance >= requiredCredits) {
    return { ok: true, balance: snapshot.balance };
  }
  return { ok: false, balance: snapshot.balance, reason: 'insufficient' };
}
