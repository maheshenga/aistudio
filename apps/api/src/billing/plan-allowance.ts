// plan → 月度积分额度(后端权威,对齐前端 billingRepository DEFAULT_BILLING_PLANS)。
const PLAN_MONTHLY_ALLOWANCE: Record<string, number> = {
  free: 100,
  pro: 5_000,
  business: 20_000,
  enterprise: 100_000,
};

export function planMonthlyAllowance(plan: string): number {
  return PLAN_MONTHLY_ALLOWANCE[plan] ?? PLAN_MONTHLY_ALLOWANCE.free;
}
