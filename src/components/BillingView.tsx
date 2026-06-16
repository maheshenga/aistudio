import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Zap, History, CheckCircle2, ChevronRight, Download, ArrowUpRight, Plus, Rocket, X, AlertCircle } from 'lucide-react';
import {
  calculateBillingUsage,
  ensureDefaultWorkspaceBillingPlans,
  estimateGenerationJobCredits,
  getPlanMonthlyAllowance,
  loadWorkspaceBillingPlans,
  type WorkspaceBillingPlan,
} from '../lib/data/billingRepository';
import { listGenerationJobs, type GenerationJob } from '../lib/data/generationJobRepository';
import {
  listWorkspaceUsageEvents,
  type WorkspaceUsageEvent,
} from '../lib/data/usageRepository';
import {
  buildWorkspaceInvoices,
  createWorkspaceFinancialRecord,
  hasWorkspaceCouponRedemption,
  loadWorkspaceFinancialRecords,
  sumWorkspacePromotionalCredits,
  sumWorkspaceRechargeCredits,
  type WorkspaceFinancialRecord,
  type WorkspaceInvoiceRow,
} from '../lib/data/financialRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { hydrateCreditBalance, getCreditBalanceSnapshot, grantCredits } from '../lib/data/creditRepository';
import {
  getDefaultWorkspacePaymentMethod,
  updateWorkspacePaymentMethod,
  type WorkspacePaymentMethod,
} from '../lib/data/paymentRepository';
import { useWorkspaceUsage } from '../hooks/useWorkspaceUsage';
import { useSaasAuth, useSaasSession } from '../saas/SaasAuthContext';
import { buildPermissionDeniedMetadata, canManageBilling } from '../saas/permissions';
import { toast } from './Toast';

const BILLING_COUPONS = [
  { code: 'LAUNCH-1000', points: 1_000, label: '上线赠送算力包', status: 'active' },
  { code: 'CREATOR-3000', points: 3_000, label: '创作者体验算力包', status: 'active' },
] as const;

function normalizeCouponInput(value: string): string {
  return value.trim().toUpperCase();
}

function readUsageMetadataText(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readUsageMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function BillingView() {
  const session = useSaasSession();
  const { updateWorkspacePlan } = useSaasAuth();
  const moduleUsage = useWorkspaceUsage();
  const billingPlanContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [billingPlans, setBillingPlans] = useState<WorkspaceBillingPlan[]>(() =>
    ensureDefaultWorkspaceBillingPlans(billingPlanContext),
  );
  const monthlyAllowance = getPlanMonthlyAllowance(session.workspace.plan, billingPlans);
  const canManageCurrentBilling = canManageBilling(session.membership.role);
  const [activeTab, setActiveTab] = useState('overview'); // overview, history
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(48);
  const [couponCode, setCouponCode] = useState('');
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>(() =>
    listGenerationJobs({ workspaceId: session.workspace.id, userId: session.user.id }),
  );
  const [usageEvents, setUsageEvents] = useState<WorkspaceUsageEvent[]>(() =>
    listWorkspaceUsageEvents({ workspaceId: session.workspace.id, userId: session.user.id }),
  );
  const [financialRecords, setFinancialRecords] = useState<WorkspaceFinancialRecord[]>(() =>
    loadWorkspaceFinancialRecords({ workspaceId: session.workspace.id }),
  );
  const [paymentMethod, setPaymentMethod] = useState<WorkspacePaymentMethod | null>(() =>
    getDefaultWorkspacePaymentMethod({ workspaceId: session.workspace.id }),
  );

  useEffect(() => {
    const refreshJobs = () => setGenerationJobs(listGenerationJobs({ workspaceId: session.workspace.id, userId: session.user.id }));
    const handleJobsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshJobs();
    };

    refreshJobs();
    window.addEventListener('generation_jobs_updated', handleJobsUpdated);
    return () => window.removeEventListener('generation_jobs_updated', handleJobsUpdated);
  }, [session.user.id, session.workspace.id]);

  useEffect(() => {
    const refreshUsageEvents = () =>
      setUsageEvents(listWorkspaceUsageEvents({ workspaceId: session.workspace.id, userId: session.user.id }));
    const handleUsageEventsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      if (detail?.userId && detail.userId !== session.user.id) return;
      refreshUsageEvents();
    };

    refreshUsageEvents();
    window.addEventListener('usage_events_updated', handleUsageEventsUpdated);
    return () => window.removeEventListener('usage_events_updated', handleUsageEventsUpdated);
  }, [session.user.id, session.workspace.id]);

  useEffect(() => {
    ensureDefaultWorkspaceBillingPlans(billingPlanContext);
    const refreshPlans = () => setBillingPlans(loadWorkspaceBillingPlans(billingPlanContext));
    const handlePlansUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshPlans();
    };

    refreshPlans();
    window.addEventListener('billing_plans_updated', handlePlansUpdated);
    return () => window.removeEventListener('billing_plans_updated', handlePlansUpdated);
  }, [billingPlanContext, session.workspace.id]);

  useEffect(() => {
    const refreshFinancialRecords = () =>
      setFinancialRecords(loadWorkspaceFinancialRecords({ workspaceId: session.workspace.id }));
    const handleFinancialRecordsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshFinancialRecords();
    };

    refreshFinancialRecords();
    window.addEventListener('financial_records_updated', handleFinancialRecordsUpdated);
    return () => window.removeEventListener('financial_records_updated', handleFinancialRecordsUpdated);
  }, [session.workspace.id]);

  useEffect(() => {
    const refreshPaymentMethod = () => setPaymentMethod(getDefaultWorkspacePaymentMethod({ workspaceId: session.workspace.id }));
    const handlePaymentMethodsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshPaymentMethod();
    };

    refreshPaymentMethod();
    window.addEventListener('workspace_payment_methods_updated', handlePaymentMethodsUpdated);
    return () => window.removeEventListener('workspace_payment_methods_updated', handlePaymentMethodsUpdated);
  }, [session.workspace.id]);

  useEffect(() => {
    void hydrateCreditBalance({ workspaceId: session.workspace.id });
  }, [session.workspace.id]);

  const rechargeCredits = useMemo(() => sumWorkspaceRechargeCredits(financialRecords), [financialRecords]);
  const promotionalCredits = useMemo(() => sumWorkspacePromotionalCredits(financialRecords), [financialRecords]);
  const addonCredits = rechargeCredits + promotionalCredits;
  const invoices = useMemo(() => buildWorkspaceInvoices(financialRecords), [financialRecords]);
  const billingUsage = useMemo(
    () => calculateBillingUsage({
      monthlyAllowance,
      rechargeCredits: addonCredits,
      generationJobs,
      moduleUsage,
      usageEvents,
    }),
    [addonCredits, generationJobs, moduleUsage, monthlyAllowance, usageEvents],
  );

  const backendSnapshot = getCreditBalanceSnapshot({ workspaceId: session.workspace.id });
  const remainingCredits = backendSnapshot?.balance ?? billingUsage.remainingCredits;

  const plans = billingPlans
    .filter((plan) => plan.status === 'active' || plan.id === session.workspace.plan)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceCents: plan.priceCents,
      price: plan.priceCents === 0 ? '免费' : `￥${Math.round(plan.priceCents / 100).toLocaleString()}`,
      period: plan.billingInterval === 'month' ? '/月' : '/年',
      points: `${plan.monthlyAllowance.toLocaleString()} / 月`,
      monthlyAllowance: plan.monthlyAllowance,
      status: plan.status,
      features: plan.features,
      isCurrent: plan.id === session.workspace.plan,
      buttonText: plan.id === session.workspace.plan
        ? canManageCurrentBilling ? '管理订阅' : '当前版本'
        : canManageCurrentBilling ? '联系升级' : '无权限升级',
    }));

  const packages = [
    { points: 500, price: 10,  tag: '' },
    { points: 3000, price: 48,  tag: '热门' },
    { points: 10000, price: 98, tag: '超值' },
  ];

  const usageHistory = generationJobs
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((job) => ({
      id: job.id,
      date: new Date(job.createdAt).toLocaleString(),
      type: job.title,
      model: `${job.providerKind} / ${job.runtimeMode}`,
      cost: estimateGenerationJobCredits(job),
      status: job.status === 'failed' || job.status === 'cancelled'
        ? '失败退还'
        : job.status === 'pending' || job.status === 'running'
          ? '处理中'
          : '成功',
    }))
    .concat(
      usageEvents
        .filter((event) => event.credits > 0 || event.kind === 'quota_block')
        .map((event) => {
          const pricingKey = readUsageMetadataText(event.metadata, 'pricingKey');
          const billingStatus = readUsageMetadataText(event.metadata, 'billingStatus');
          const unitCount = readUsageMetadataNumber(event.metadata, 'unitCount');
          const unitCredits = readUsageMetadataNumber(event.metadata, 'unitCredits');
          const unitLabel = readUsageMetadataText(event.metadata, 'unitLabel');
          const pricingDescription = readUsageMetadataText(event.metadata, 'pricingDescription');
          const creditEstimate = readUsageMetadataNumber(event.metadata, 'creditEstimate') ?? event.credits;

          return {
            id: event.id,
            date: new Date(event.createdAt).toLocaleString(),
            type: pricingKey ?? `${event.kind} / ${event.targetType}`,
            model: [
              `${event.providerKind ?? 'workspace'} / ${event.runtimeMode ?? event.moduleId}`,
              pricingDescription,
              unitCount && unitCredits ? `${unitCount} x ${unitCredits} ${unitLabel ?? 'unit'}` : null,
              billingStatus ? `billing:${billingStatus}` : null,
            ].filter(Boolean).join(' | '),
            cost: creditEstimate,
            status: event.kind === 'quota_block' ? '失败退还' : '成功',
          };
        }),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const formatCurrencyCents = (amountCents: number, currency = 'CNY') => {
    const symbol = currency === 'CNY' ? '¥' : currency;
    return `${symbol} ${Math.round(amountCents / 100).toLocaleString()}`;
  };
  const invoiceStatusLabels: Record<string, string> = {
    paid: '已支付',
    issued: '已开票',
    pending: '待开票',
    refunded: '已退款',
    cancelled: '已取消',
    approved: '已审批',
  };
  const paymentDescription = paymentMethod
    ? `${paymentMethod.brand} (${paymentMethod.label}，末尾 ${paymentMethod.last4})`
    : '暂无默认支付方式';

  const auditBilling = (
    action:
      | 'payment_method_update'
      | 'invoice_export'
      | 'billing_recharge_create'
      | 'billing_subscription_change'
      | 'billing_coupon_redeem',
    targetType: 'payment_method' | 'invoice' | 'workspace' | 'billing_plan',
    targetId: string,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'billing',
        targetType,
        targetId,
        metadata,
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const auditBillingPermissionDenied = (
    operation: string,
    targetType: 'payment_method' | 'invoice' | 'workspace' | 'billing_plan' = 'workspace',
    targetId = session.workspace.id,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent(
      {
        action: 'permission_denied',
        moduleId: 'billing',
        targetType,
        targetId,
        metadata: {
          ...buildPermissionDeniedMetadata({
            role: session.membership.role,
            permission: 'billing.manage',
            operation,
            moduleId: 'billing',
          }),
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleUpdatePaymentMethod = () => {
    if (!canManageCurrentBilling) {
      auditBillingPermissionDenied('payment_method_update', 'workspace', session.workspace.id, {
        paymentMethodConfigured: Boolean(paymentMethod),
      });
      return;
    }
    if (!paymentMethod) return;
    const updatedMethod = updateWorkspacePaymentMethod(
      paymentMethod.id,
      {
        status: 'active',
        accountNumber: `${paymentMethod.provider}-${Date.now()}`,
      },
      { workspaceId: session.workspace.id },
    );
    if (!updatedMethod) return;
    setPaymentMethod(updatedMethod);
    auditBilling('payment_method_update', 'payment_method', updatedMethod.id, {
      brand: updatedMethod.brand,
      last4: updatedMethod.last4,
      operation: 'rotate_payment_method',
    });
  };

  const handleExportInvoices = () => {
    auditBilling('invoice_export', 'workspace', session.workspace.id, {
      invoiceCount: invoices.length,
      totalAmountCents: invoices.reduce((total, invoice) => total + invoice.amountCents, 0),
    });
  };

  const handleDownloadInvoice = (invoice: WorkspaceInvoiceRow) => {
    auditBilling('invoice_export', 'invoice', invoice.id, {
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      sourceRecordId: invoice.sourceRecordId,
      operation: 'download_pdf',
    });
  };

  const handleChangePlan = (plan: typeof plans[number]) => {
    if (plan.isCurrent) return;
    if (!canManageCurrentBilling) {
      auditBillingPermissionDenied('billing_subscription_change', 'billing_plan', plan.id, {
        planId: plan.id,
        priceCents: plan.priceCents,
      });
      toast('当前角色没有账单管理权限', 'warning');
      return;
    }
    if (plan.status !== 'active') {
      toast('该套餐暂未上架', 'warning');
      return;
    }
    if (plan.priceCents > 0 && !paymentMethod) {
      toast('请先配置默认支付方式', 'warning');
      return;
    }

    const previousPlan = session.workspace.plan;
    const changedAt = Date.now();
    updateWorkspacePlan(plan.id);
    const subscriptionRecord = createWorkspaceFinancialRecord(
      {
        kind: 'subscription',
        status: plan.priceCents > 0 ? 'paid' : 'approved',
        amountCents: plan.priceCents,
        currency: 'CNY',
        planId: plan.id,
        counterparty: session.workspace.name,
        occurredAt: changedAt,
        metadata: {
          operation: 'workspace_plan_change',
          previousPlan,
          nextPlan: plan.id,
          monthlyAllowance: plan.monthlyAllowance,
          paymentMethodId: paymentMethod?.id,
          paymentLast4: paymentMethod?.last4,
        },
      },
      { workspaceId: session.workspace.id, now: changedAt },
    );
    const invoiceRecord = createWorkspaceFinancialRecord(
      {
        kind: 'invoice',
        status: 'pending',
        amountCents: plan.priceCents,
        currency: 'CNY',
        planId: plan.id,
        counterparty: session.workspace.name,
        occurredAt: changedAt,
        metadata: {
          operation: 'workspace_plan_change_invoice',
          invoiceNumber: `INV-${session.workspace.slug}-${plan.id}-${changedAt}`,
          sourceSubscriptionRecordId: subscriptionRecord.id,
          previousPlan,
          nextPlan: plan.id,
        },
      },
      { workspaceId: session.workspace.id, now: changedAt + 1 },
    );

    setFinancialRecords(loadWorkspaceFinancialRecords({ workspaceId: session.workspace.id }));
    auditBilling('billing_subscription_change', 'billing_plan', plan.id, {
      previousPlan,
      nextPlan: plan.id,
      amountCents: plan.priceCents,
      subscriptionRecordId: subscriptionRecord.id,
      invoiceRecordId: invoiceRecord.id,
    });
    toast(`已切换到 ${plan.name}`, 'success');
  };

  const handleConfirmRecharge = async () => {
    if (!canManageCurrentBilling) {
      auditBillingPermissionDenied('billing_recharge_create', 'workspace', session.workspace.id, { rechargeAmount });
      return;
    }
    if (!paymentMethod) {
      toast('请先配置默认支付方式', 'warning');
      return;
    }

    const selectedPackage = packages.find((pkg) => pkg.price === rechargeAmount) ?? packages[0];
    const amountCents = rechargeAmount * 100;
    const createdAt = Date.now();
    const paymentRecord = createWorkspaceFinancialRecord(
      {
        kind: 'payment',
        status: 'paid',
        amountCents,
        currency: 'CNY',
        counterparty: session.workspace.name,
        occurredAt: createdAt,
        metadata: {
          operation: 'compute_points_recharge',
          points: selectedPackage.points,
          paymentMethodId: paymentMethod.id,
          paymentMethodBrand: paymentMethod.brand,
          paymentLast4: paymentMethod.last4,
        },
      },
      { workspaceId: session.workspace.id, now: createdAt },
    );
    const invoiceRecord = createWorkspaceFinancialRecord(
      {
        kind: 'invoice',
        status: 'pending',
        amountCents,
        currency: 'CNY',
        counterparty: session.workspace.name,
        occurredAt: createdAt,
        metadata: {
          operation: 'compute_points_recharge_invoice',
          invoiceNumber: `INV-${session.workspace.slug}-${createdAt}`,
          sourcePaymentRecordId: paymentRecord.id,
          points: selectedPackage.points,
        },
      },
      { workspaceId: session.workspace.id, now: createdAt + 1 },
    );

    setFinancialRecords(loadWorkspaceFinancialRecords({ workspaceId: session.workspace.id }));
    auditBilling('billing_recharge_create', 'workspace', session.workspace.id, {
      paymentRecordId: paymentRecord.id,
      invoiceRecordId: invoiceRecord.id,
      invoiceNumber: invoiceRecord.metadata.invoiceNumber,
      amountCents,
      points: selectedPackage.points,
      paymentMethodId: paymentMethod.id,
      paymentLast4: paymentMethod.last4,
    });
    setShowRechargeModal(false);
    toast(`已充值 ${selectedPackage.points.toLocaleString()} PTS`, 'success');
    await grantCredits(
      { workspaceId: session.workspace.id },
      { amount: selectedPackage.points, reason: 'recharge', idempotencyKey: `pay:${paymentRecord.id}` },
    );
    await hydrateCreditBalance({ workspaceId: session.workspace.id });
  };

  const handleOpenCouponModal = () => {
    if (!canManageCurrentBilling) {
      auditBillingPermissionDenied('billing_coupon_modal_open');
      toast('当前角色没有账单管理权限', 'warning');
      return;
    }
    setCouponCode('');
    setShowCouponModal(true);
  };

  const handleRedeemCoupon = async () => {
    if (!canManageCurrentBilling) {
      auditBillingPermissionDenied('billing_coupon_redeem', 'workspace', session.workspace.id, {
        couponCodeConfigured: Boolean(couponCode.trim()),
      });
      toast('当前角色没有账单管理权限', 'warning');
      return;
    }

    const normalizedCode = normalizeCouponInput(couponCode);
    const coupon = BILLING_COUPONS.find((item) => item.status === 'active' && item.code === normalizedCode);
    if (!coupon) {
      toast('优惠码无效或已过期', 'warning');
      return;
    }
    if (hasWorkspaceCouponRedemption(financialRecords, normalizedCode)) {
      toast('该优惠码已兑换过', 'warning');
      return;
    }

    const redeemedAt = Date.now();
    const creditRecord = createWorkspaceFinancialRecord(
      {
        kind: 'credit',
        status: 'approved',
        amountCents: 0,
        currency: 'CNY',
        counterparty: coupon.label,
        occurredAt: redeemedAt,
        metadata: {
          operation: 'compute_points_coupon_redemption',
          couponCode: coupon.code,
          couponLabel: coupon.label,
          points: coupon.points,
        },
      },
      { workspaceId: session.workspace.id, now: redeemedAt },
    );

    setFinancialRecords(loadWorkspaceFinancialRecords({ workspaceId: session.workspace.id }));
    auditBilling('billing_coupon_redeem', 'workspace', session.workspace.id, {
      creditRecordId: creditRecord.id,
      couponCode: coupon.code,
      points: coupon.points,
      operation: 'compute_points_coupon_redemption',
    });
    setShowCouponModal(false);
    setCouponCode('');
    toast(`已兑换 ${coupon.points.toLocaleString()} PTS`, 'success');
    await grantCredits(
      { workspaceId: session.workspace.id },
      { amount: coupon.points, reason: 'coupon', idempotencyKey: `coupon:${coupon.code}` },
    );
    await hydrateCreditBalance({ workspaceId: session.workspace.id });
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-[var(--spacing-xl)]">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">财务与算力中心</h2>
          <p className="text-[var(--text-muted)] text-sm">管理您的订阅套餐，充值算力点数并查看消耗流水。</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-[var(--spacing-xl)]">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          账单与订阅总览
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          算力消耗记录
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          结算与发票
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 rounded-3xl p-[var(--spacing-xl)] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <Zap className="w-64 h-64 transform rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
              <div>
                 <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mb-2">当前可用算力 (Compute Points)</p>
                 <div className="flex items-baseline space-x-2">
                    <h3 className="text-5xl font-black tracking-tight">{remainingCredits.toLocaleString()}</h3>
                    <span className="text-blue-200 font-medium">PTS</span>
                 </div>
                 <p className="text-blue-300 font-medium text-sm mt-3 flex items-center">
                    <CheckCircle2 className="icon-sm mr-1.5" /> 本月套餐 {billingUsage.monthlyAllowance.toLocaleString()} PTS + 充值 {rechargeCredits.toLocaleString()} PTS + 赠送 {promotionalCredits.toLocaleString()} PTS，剩余 {billingUsage.remainingPercent}%
                 </p>
              </div>
              <div className="mt-6 md:mt-0 flex flex-col space-y-3">
                 <button
                   onClick={() => canManageCurrentBilling && setShowRechargeModal(true)}
                   disabled={!canManageCurrentBilling}
                   title={canManageCurrentBilling ? undefined : '当前角色没有账单管理权限'}
                   className={`bg-[var(--bg-panel)] text-blue-900 px-8 py-3.5 rounded-[var(--radius-lg)] font-bold hover:bg-gray-50 transition-colors shadow-lg flex items-center justify-center ${canManageCurrentBilling ? '' : 'opacity-60 cursor-not-allowed'}`}
                 >
                    <Zap className="icon-md mr-2 text-[var(--color-primary)]" />
                    立即充值算力
                 </button>
                 <button
                   onClick={handleOpenCouponModal}
                   disabled={!canManageCurrentBilling}
                   title={canManageCurrentBilling ? undefined : '当前角色没有账单管理权限'}
                   className={`bg-blue-800/50 hover:bg-blue-700/50 border border-blue-500/30 text-white px-8 py-3.5 rounded-[var(--radius-lg)] font-bold transition-colors flex items-center justify-center backdrop-blur-sm ${canManageCurrentBilling ? '' : 'opacity-60 cursor-not-allowed'}`}
                 >
                    兑换优惠码
                 </button>
              </div>
            </div>
          </div>

          <div>
             <h3 className="text-lg font-bold text-[var(--text-main)] mb-5">订阅套餐管理</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
                 {plans.map((plan) => (
                   <div key={plan.id} className={`bg-[var(--bg-panel)] rounded-3xl p-[var(--spacing-xl)] border-2 transition-all relative ${plan.isCurrent ? 'border-blue-600 shadow-xl shadow-blue-100 scale-105 z-10' : 'border-[var(--border-color)] hover:border-[var(--border-color)] hover:shadow-md'}`}>
                      {plan.isCurrent && (
                        <div className="absolute -top-4 inset-x-0 flex justify-center">
                           <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                              当前正在使用
                           </span>
                        </div>
                      )}
                      
                      <div className="mb-[var(--spacing-md)]">
                         <h4 className={`text-xl font-black mb-2 ${plan.isCurrent ? 'text-blue-900' : 'text-[var(--text-main)]'}`}>{plan.name}</h4>
                         <div className="flex items-baseline mb-2">
                            <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">{plan.price}</span>
                            {plan.period && <span className="text-[var(--text-muted)] font-medium ml-1">{plan.period}</span>}
                         </div>
                         <div className="bg-gray-50 inline-block px-3 py-1 rounded-lg">
                            <span className="text-sm font-bold text-gray-600 flex items-center">
                               <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                               {plan.points}
                            </span>
                         </div>
                      </div>

                      <div className="space-y-[var(--spacing-md)] mb-[var(--spacing-xl)]">
                          {plan.features.map((f) => (
                            <p key={f} className="text-sm text-gray-600 flex items-start font-medium">
                              <CheckCircle2 className="icon-md mr-3 text-green-500 flex-shrink-0" />
                              {f}
                           </p>
                         ))}
                      </div>

                      <button
                        onClick={() => handleChangePlan(plan)}
                        disabled={!canManageCurrentBilling || plan.isCurrent || plan.status !== 'active'}
                        className={`w-full py-3.5 rounded-[var(--radius-lg)] font-bold transition-all flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-70 ${
                         plan.isCurrent 
                           ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100' 
                           : plan.name === '基础版' 
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                             : 'bg-[var(--color-primary)] text-white hover:bg-gray-800 shadow-md'
                      }`}
                      >
                         {plan.buttonText}
                      </button>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
           <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-[var(--text-main)]">算力消耗明细 (<span className="text-[var(--color-primary)]">本月</span>)</h3>
              <button className="text-[var(--text-muted)] hover:text-[var(--color-primary)] text-sm font-medium flex items-center transition-colors">
                 <Download className="icon-sm mr-1.5" />
                 导出账单
              </button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-gray-50/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">流水号 / 时间</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">服务类型</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">调用模型</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">状态</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)] text-right">算力变化</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {usageHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sm font-bold text-[var(--text-muted)]">
                          暂无生成任务消耗记录
                        </td>
                      </tr>
                    ) : usageHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="p-4">
                            <p className="text-[11px] font-mono text-gray-400">{item.id}</p>
                            <p className="text-sm text-[var(--text-main)] font-medium">{item.date}</p>
                         </td>
                         <td className="p-4 text-sm font-bold text-[var(--text-main)]">{item.type}</td>
                         <td className="p-4 text-sm text-gray-600">
                            <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium border border-[var(--border-color)]">
                              {item.model}
                            </span>
                         </td>
                          <td className="p-4 text-sm">
                             <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${
                                item.status === '成功'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : item.status === '处理中'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                             }`}>
                                {item.status}
                             </span>
                         </td>
                          <td className="p-4 text-right">
                            <p className={`font-black text-lg ${item.status === '成功' || item.status === '处理中' ? 'text-[var(--text-main)]' : 'text-gray-400 line-through'}`}>
                               -{item.cost}
                            </p>
                          </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-sm text-[var(--text-muted)] bg-gray-50/50">
              <span>共 {usageHistory.length} 条记录</span>
              <div className="flex space-x-2">
                 <button className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-gray-100 transition-colors font-medium">上一页</button>
                 <button className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-gray-100 transition-colors font-medium">下一页</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
               <div className="bg-gray-100 p-3 rounded-[var(--radius-lg)] text-gray-700">
                 <CreditCard className="icon-lg" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-[var(--text-main)]">支付信息</h3>
                 <p className="text-sm text-[var(--text-muted)]">主支付方式: {paymentDescription}</p>
               </div>
            </div>
            <button
              onClick={handleUpdatePaymentMethod}
              disabled={!canManageCurrentBilling || !paymentMethod}
              className="px-5 py-2.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              管理卡片与支付
            </button>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
            <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] text-lg">发票台账</h3>
              <button
                onClick={handleExportInvoices}
                className="text-[var(--color-primary)] font-bold hover:text-blue-800 transition-colors text-sm flex items-center"
              >
                全量导出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-gray-50/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">发票编号</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">账单日期</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">金额</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">发票状态</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)] text-right">操作</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {invoices.map((inv) => (
                     <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                           <p className="text-sm font-bold text-[var(--text-main)]">{inv.id}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600 font-medium">{inv.date}</td>
                        <td className="p-4 text-sm font-black text-[var(--text-main)]">{formatCurrencyCents(inv.amountCents, inv.currency)}</td>
                        <td className="p-4">
                           <span className="bg-green-50 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded border border-green-200">
                             {invoiceStatusLabels[inv.status] ?? inv.status}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                           <button
                             onClick={() => handleDownloadInvoice(inv)}
                             className="text-[var(--color-primary)] hover:text-blue-800 text-sm font-bold flex items-center justify-end w-full"
                           >
                             <Download className="icon-sm mr-1.5" /> 下载 PDF
                           </button>
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="icon-md text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">充值算力</h3>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">即刻充值，长期有效</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRechargeModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="icon-md" />
              </button>
            </div>
            
            <div className="p-[var(--spacing-xl)]">
               <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">选择充值金额</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
                  {packages.map((pkg, i) => (
                    <div 
                      key={i} 
                      onClick={() => setRechargeAmount(pkg.price)}
                      className={`relative rounded-[var(--radius-xl)] border-2 p-5 cursor-pointer transition-all ${
                        rechargeAmount === pkg.price 
                          ? 'border-blue-600 bg-blue-50/50 shadow-md transform scale-105 z-10' 
                          : 'border-[var(--border-color)] hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                       {pkg.tag && (
                         <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                            {pkg.tag}
                         </span>
                       )}
                       <div className="text-center">
                          <p className="text-sm text-[var(--text-muted)] font-medium mb-1 line-through">￥{pkg.price * 2}</p>
                          <div className="flex items-end justify-center mb-1">
                             <span className="text-sm font-bold text-[var(--text-main)] mb-1">￥</span>
                             <span className={`text-[var(--text-main)]xl font-black ${rechargeAmount === pkg.price ? 'text-[var(--color-primary)]' : 'text-[var(--text-main)]'}`}>{pkg.price}</span>
                          </div>
                          <div className="bg-gray-100 rounded-lg py-1.5 mt-3 flex items-center justify-center">
                             <Zap className="w-3 h-3 text-amber-500 mr-1" />
                             <span className="text-sm font-bold text-[var(--text-main)]">{pkg.points} PTS</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-gray-50 rounded-[var(--radius-lg)] p-5 border border-[var(--border-color)] text-sm text-gray-600 space-y-2 mb-[var(--spacing-xl)]">
                  <p className="flex items-start">
                     <AlertCircle className="icon-sm text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                     <span>充值的算力点数<b>永久有效</b>，不会在月底清空。</span>
                  </p>
                  <p className="flex items-start">
                     <AlertCircle className="icon-sm text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                     <span>优先扣除基础套餐内算力，超出部分扣除充值算力。</span>
                  </p>
               </div>

               <button
                onClick={handleConfirmRecharge}
                disabled={!canManageCurrentBilling}
                className={`w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-4 rounded-[var(--radius-lg)] shadow-lg shadow-blue-200 transition-all flex items-center justify-center text-lg ${canManageCurrentBilling ? '' : 'opacity-60 cursor-not-allowed'}`}
              >
                <Rocket className="icon-md mr-2" />
                立即支付 ￥{rechargeAmount}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Zap className="icon-md text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">兑换优惠码</h3>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">兑换后的算力立即进入可用额度</p>
                </div>
              </div>
              <button
                onClick={() => setShowCouponModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="icon-md" />
              </button>
            </div>

            <div className="p-[var(--spacing-xl)] space-y-5">
              <label className="block">
                <span className="block text-sm font-bold text-gray-700 mb-2">优惠码</span>
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleRedeemCoupon();
                  }}
                  placeholder="输入优惠码"
                  className="w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] px-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="bg-amber-50 border border-amber-100 rounded-[var(--radius-lg)] p-4 text-sm text-amber-800">
                <p className="font-bold">每个工作区同一优惠码只能兑换一次。</p>
                <p className="mt-1 text-amber-700">优惠码赠送的算力不会计入账单收入。</p>
              </div>

              <button
                onClick={handleRedeemCoupon}
                disabled={!couponCode.trim()}
                className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-4 rounded-[var(--radius-lg)] shadow-lg shadow-blue-200 transition-all flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="icon-md mr-2" />
                确认兑换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
