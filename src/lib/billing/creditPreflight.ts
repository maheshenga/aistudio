import { hydrateCreditBalance, getCreditBalanceSnapshot } from '../data/creditRepository';

export type CreditPreflightResult =
  | { ok: true; balance: number }
  | { ok: false; balance: number | null; reason: 'insufficient' | 'unavailable' };

export async function preflightCredits(params: {
  workspaceId: string;
  requiredCredits: number;
}): Promise<CreditPreflightResult> {
  const { workspaceId, requiredCredits } = params;
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
