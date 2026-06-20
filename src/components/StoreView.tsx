import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceStores, createWorkspaceStore, updateWorkspaceStore, deleteWorkspaceStore, loadWorkspaceStoreOrders, loadWorkspaceStoreInventory, adjustWorkspaceStoreInventory, loadWorkspaceStoreStaff, createWorkspaceStoreStaff, type StoreRepositoryContext, type WorkspaceStore, type WorkspaceStoreOrder, type WorkspaceStoreInventory, type WorkspaceStoreStaff } from '../lib/data/storeRepository';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { listWorkspaceCampaigns, createWorkspaceCampaign, updateWorkspaceCampaign, type CampaignRepositoryContext, type WorkspaceCampaign, type WorkspaceCampaignStatus } from '../lib/data/campaignRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';
import { 
  Store, 
  MapPin, 
  UsersRound, 
  ShoppingBag, 
  Settings, 
  Plus, 
  Smartphone, 
  LayoutTemplate, 
  Megaphone,
  Gift,
  Split,
  ChevronRight,
  MonitorSmartphone,
  QrCode,
  LineChart,
  Edit,
  History,
  X
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const REVENUE_ORDER_STATUSES: WorkspaceStoreOrder['status'][] = ['paid', 'shipped', 'completed'];

export function StoreDashboardView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const session = useSaasSession();
  const repoContext = useMemo<StoreRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [stores, setStores] = useState<WorkspaceStore[]>([]);
  const [orders, setOrders] = useState<WorkspaceStoreOrder[]>([]);
  const [inventory, setInventory] = useState<WorkspaceStoreInventory[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  useEffect(() => {
    setStores(loadWorkspaceStores(repoContext));
    setOrders(loadWorkspaceStoreOrders(repoContext));
    setInventory(loadWorkspaceStoreInventory(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => {
      setStores(loadWorkspaceStores(repoContext));
      setOrders(loadWorkspaceStoreOrders(repoContext));
      setInventory(loadWorkspaceStoreInventory(repoContext));
    };
    if (typeof window !== 'undefined') window.addEventListener('workspace_stores_updated', handler);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_stores_updated', handler);
    };
  }, [repoContext]);

  useEffect(() => {
    if (stores.length > 0 && !stores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  const storeOrders = useMemo(
    () => (selectedStoreId ? orders.filter((o) => o.storeId === selectedStoreId) : orders),
    [orders, selectedStoreId],
  );
  const storeInventory = useMemo(
    () => (selectedStoreId ? inventory.filter((i) => i.storeId === selectedStoreId) : inventory),
    [inventory, selectedStoreId],
  );

  const metrics = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const todayOrders = storeOrders.filter((o) => o.placedAt >= todayMs);
    const todayRevenueOrders = todayOrders.filter((o) => REVENUE_ORDER_STATUSES.includes(o.status));
    const todayRevenueCents = todayRevenueOrders.reduce((sum, o) => sum + o.amountCents, 0);
    const weekRevenueCents = storeOrders
      .filter((o) => o.placedAt >= todayMs - 6 * 24 * 60 * 60 * 1000 && REVENUE_ORDER_STATUSES.includes(o.status))
      .reduce((sum, o) => sum + o.amountCents, 0);
    const atrCents = todayRevenueOrders.length > 0 ? Math.round(todayRevenueCents / todayRevenueOrders.length) : 0;
    const refundCount = storeOrders.filter((o) => o.status === 'refunded' || o.status === 'cancelled').length;
    const refundRate = storeOrders.length > 0 ? (refundCount / storeOrders.length) * 100 : 0;
    return {
      todayRevenue: formatAmount(todayRevenueCents, 'CNY'),
      weekRevenue: formatAmount(weekRevenueCents, 'CNY'),
      todayOrderCount: todayOrders.length,
      todayRevenueOrderCount: todayRevenueOrders.length,
      atr: formatAmount(atrCents, 'CNY'),
      refundRate: `${refundRate.toFixed(1)}%`,
      refundCount,
    };
  }, [storeOrders]);

  const trendData = useMemo(() => {
    const days: { time: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const revCents = storeOrders
        .filter((o) => o.placedAt >= start && o.placedAt < end && REVENUE_ORDER_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + o.amountCents, 0);
      days.push({ time: `${d.getMonth() + 1}/${d.getDate()}`, revenue: Math.round(revCents / 100) });
    }
    return days;
  }, [storeOrders]);

  const recentOrders = useMemo(() => storeOrders.slice(0, 3), [storeOrders]);
  const lowStock = useMemo(() => storeInventory.filter((i) => i.stock < i.threshold).slice(0, 5), [storeInventory]);
  const pendingOrders = useMemo(() => storeOrders.filter((o) => o.status === 'pending' || o.status === 'paid'), [storeOrders]);

  const statCards = [
    { label: '今日销售额', value: metrics.todayRevenue, sub: `近 7 日合计 ${metrics.weekRevenue}`, color: 'text-[var(--color-primary)]' },
    { label: '今日订单数', value: String(metrics.todayOrderCount), sub: `待处理 ${pendingOrders.length} 笔`, color: 'text-orange-500' },
    { label: '客单价 (ATR)', value: metrics.atr, sub: `今日成交 ${metrics.todayRevenueOrderCount} 笔`, color: 'text-green-600' },
    { label: '退货率', value: metrics.refundRate, sub: `退款/取消 ${metrics.refundCount} 笔`, color: 'text-purple-600' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">单店专属后台 - 驾驶舱</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">查看单个门店的实时营业数据与运转指标</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            disabled={stores.length === 0}
            className="border-[1.5px] border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm text-sm font-bold text-gray-700 px-4 py-3 rounded-[var(--radius-xl)] hover:border-gray-300 transition-colors outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {stores.length === 0 ? (
              <option value="">暂无门店</option>
            ) : (
              stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
            )}
          </select>
          <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border-[1.5px] border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-sm">
            <LineChart className="icon-sm" />
            <span>导出经营月报</span>
          </button>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-color)] rounded-[28px] p-12 text-center">
          <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
            <Store className="icon-lg text-[var(--color-primary)]" />
          </div>
          <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">还没有门店数据</h3>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">先在「门店官网」创建门店并录入订单/库存，驾驶舱将自动汇总实时指标</p>
          <button
            onClick={() => onNavigate && onNavigate('store_list')}
            className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all">
            <Plus className="icon-sm" />
            <span>前往创建门店</span>
          </button>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        {statCards.map((s, i) => (
          <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
             <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
             <p className={`text-[32px] font-black tracking-tight ${s.color} mb-2 leading-none`}>{s.value}</p>
             <p className="text-[12px] font-bold text-[var(--text-muted)] bg-gray-50 self-start inline-block px-2.5 py-1 rounded-md">{s.sub}</p>
          </div>
        ))}
      </div>


      {/* 快捷操作区 */}
      <div className="bg-[var(--bg-panel)] rounded-[28px] border border-[var(--border-color)] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         <div className="flex-1">
           <h3 className="text-[17px] font-black text-[var(--text-main)] tracking-tight mb-2">快捷操作</h3>
           <p className="text-sm text-[var(--text-muted)] font-medium">快速直达日常店务管理</p>
         </div>
         <div className="flex flex-wrap gap-3">
           <button onClick={() => onNavigate && onNavigate('store_orders')} className="flex items-center space-x-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all border border-blue-100">
             <LayoutTemplate className="icon-sm" />
             <span>订单管理</span>
           </button>
           <button onClick={() => onNavigate && onNavigate('store_inventory')} className="flex items-center space-x-2 bg-orange-50 text-orange-700 hover:bg-orange-100 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all border border-orange-100">
             <Split className="icon-sm" />
             <span>库存看板</span>
           </button>
           <button onClick={() => onNavigate && onNavigate('store_marketing')} className="flex items-center space-x-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all border border-purple-100">
             <Megaphone className="icon-sm" />
             <span>营销活动</span>
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[28px] border border-[var(--border-color)]/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="flex justify-between items-center mb-[var(--spacing-md)]">
             <h3 className="text-[17px] font-black text-[var(--text-main)] tracking-tight">近 7 日成交营收趋势</h3>
             <span className="text-[11px] font-bold text-[var(--color-primary)] bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wide">Revenue</span>
          </div>
          <div className="w-full h-[260px] ">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
               <AreaChart data={trendData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                 <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-[var(--spacing-md)]">
          <div className="bg-[var(--bg-panel)] rounded-[28px] border border-[var(--border-color)]/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] flex-1">
          <h3 className="text-[17px] font-black text-[var(--text-main)] tracking-tight mb-[var(--spacing-xl)]">最新订单</h3>
          {recentOrders.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)] py-6 text-center">本店暂无订单记录</p>
          ) : (
          <div className="space-y-[var(--spacing-md)]">
            {recentOrders.map((o, i) => (
              <div key={o.id} className="flex justify-between items-center p-4 hover:bg-gray-50/80 rounded-[var(--radius-xl)] transition-colors">
                <div className="flex items-center">
                  <div className="icon-xl rounded-full bg-blue-50 text-[var(--color-primary)] font-bold flex items-center justify-center mr-3 text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[var(--text-main)] font-mono">{o.orderNumber}</span>
                    <p className="text-xs text-[var(--text-muted)]">{ORDER_STATUS_LABEL[o.status]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--text-main)]">{formatAmount(o.amountCents, o.currency)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{new Date(o.placedAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
           <h3 className="font-black text-[var(--text-main)] text-[17px] tracking-tight mb-[var(--spacing-md)]">待处理事项</h3>
           <div className="space-y-3">
             <div className="flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 transition-colors border border-red-100 rounded-[var(--radius-xl)]">
               <div className="flex items-center text-red-600">
                 <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                 <span className="text-sm font-bold">{metrics.refundCount} 笔退款/取消订单</span>
               </div>
               <button onClick={() => onNavigate && onNavigate('store_orders')} className="text-xs font-bold bg-[var(--bg-panel)] text-red-600 px-3 py-1 rounded shadow-sm">查看</button>
             </div>
             <div className="flex items-center justify-between p-4 bg-orange-50/50 hover:bg-orange-50 transition-colors border border-orange-100 rounded-[var(--radius-xl)]">
               <div className="flex items-center text-orange-600">
                 <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                 <span className="text-sm font-bold">{lowStock.length} 款商品库存预警</span>
               </div>
               <button onClick={() => onNavigate && onNavigate('store_inventory')} className="text-xs font-bold bg-[var(--bg-panel)] text-orange-600 px-3 py-1 rounded shadow-sm">申请调拨</button>
             </div>
             <div className="flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors border border-blue-100 rounded-[var(--radius-xl)]">
               <div className="flex items-center text-[var(--color-primary)]">
                 <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                 <span className="text-sm font-bold">{pendingOrders.length} 笔订单待处理</span>
               </div>
               <button onClick={() => onNavigate && onNavigate('store_orders')} className="text-xs font-bold bg-[var(--bg-panel)] text-[var(--color-primary)] px-3 py-1 rounded shadow-sm">去处理</button>
             </div>
           </div>
        </div>
       </div>
      </div>
      </>
      )}
    </div>
  );
}

const ORDER_STATUS_LABEL: Record<WorkspaceStoreOrder['status'], string> = {
  pending: '待处理',
  paid: '待发货',
  shipped: '配送中',
  completed: '已完成',
  refunded: '已退款',
  cancelled: '已取消',
};

function formatAmount(amountCents: number, currency: string): string {
  const symbol = currency === 'CNY' || currency === 'RMB' ? '¥' : '';
  return `${symbol}${(amountCents / 100).toFixed(2)}`;
}

export function StoreOrdersView() {
  const session = useSaasSession();
  const repoContext = useMemo<StoreRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [orders, setOrders] = useState<WorkspaceStoreOrder[]>([]);

  useEffect(() => {
    setOrders(loadWorkspaceStoreOrders(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setOrders(loadWorkspaceStoreOrders(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_stores_updated', handler);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_stores_updated', handler);
    };
  }, [repoContext]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">单店订单流转与履约</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">处理本门店的线上自提、同城配送与线下开单{orders.length > 0 ? `（共 ${orders.length} 笔）` : ''}</p>
        </div>
        <div className="flex space-x-2">
          <button className="bg-[var(--bg-panel)] border-[1.5px] border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-sm">
            扫码核销
          </button>
          <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
            <Plus className="icon-sm inline-block mr-1" />
            快速开单 (POS)
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex space-x-6 text-[14px] font-bold">
          <button className="text-[var(--color-primary)] border-b-2 border-blue-600 pb-2">全部订单</button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] pb-2">待发货/备餐</button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] pb-2">待自提</button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] pb-2">退款/售后</button>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
              <ShoppingBag className="icon-lg text-[var(--color-primary)]" />
            </div>
            <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">暂无订单</h3>
            <p className="text-[13px] text-[var(--text-muted)]">线上下单或 POS 开单后将在此显示</p>
          </div>
        ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50">
              <th className="py-5 px-6">订单号 / 时间</th>
              <th className="py-5 px-6">渠道</th>
              <th className="py-5 px-6">支付金额</th>
              <th className="py-5 px-6">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="py-5 px-6">
                   <p className="font-mono text-[13px] text-[var(--text-main)] font-bold">{o.orderNumber}</p>
                   <p className="text-[12px] text-[var(--text-muted)]">{new Date(o.placedAt).toLocaleString('zh-CN')}</p>
                </td>
                <td className="py-5 px-6">
                   <span className="text-[12px] font-bold text-[var(--color-primary)] bg-blue-50 px-2 py-1 rounded">{o.customerChannel ?? '门店收银'}</span>
                </td>
                <td className="py-5 px-6 font-bold text-[var(--text-main)]">{formatAmount(o.amountCents, o.currency)}</td>
                <td className="py-5 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${o.status === 'completed' ? 'bg-gray-100 text-gray-600' : o.status === 'refunded' || o.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

export function StoreInventoryView() {
  const session = useSaasSession();
  const repoContext = useMemo<StoreRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [inventory, setInventory] = useState<WorkspaceStoreInventory[]>([]);
  const [historyItem, setHistoryItem] = useState<WorkspaceStoreInventory | null>(null);

  useEffect(() => {
    setInventory(loadWorkspaceStoreInventory(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setInventory(loadWorkspaceStoreInventory(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_stores_updated', handler);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_stores_updated', handler);
    };
  }, [repoContext]);

  const handleReplenish = (item: WorkspaceStoreInventory) => {
    const raw = typeof window !== 'undefined' ? window.prompt(`向总仓要货数量（当前可用 ${item.stock} 件）`, '20') : null;
    if (!raw) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const afterCount = item.stock + qty;
    adjustWorkspaceStoreInventory(
      item.id,
      {
        sku: item.sku,
        storeId: item.storeId,
        beforeCount: item.stock,
        afterCount,
        reason: '向总仓要货',
        actorId: session.user.id,
      },
      repoContext,
    );
    // 调整后若仍低于阈值，自动创建补货跟进任务
    let followUpTaskId: string | undefined;
    if (afterCount < item.threshold) {
      const followUpTask = createWorkspaceTask(
        {
          title: `[库存跟进] ${item.name} (${item.sku}) 补货后仍低于预警线`,
          column: 'todo',
          priority: 'High',
          type: '门店库存',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          isAuto: false,
          metadata: { sku: item.sku, storeId: item.storeId, inventoryId: item.id, afterCount, threshold: item.threshold, source: 'store_inventory_replenish' },
        },
        { workspaceId: repoContext.workspaceId },
      );
      followUpTaskId = followUpTask.id;
    }
    logAuditEvent(
      {
        action: 'asset_create',
        moduleId: 'store_inventory',
        targetType: 'inventory',
        targetId: item.id,
        metadata: { sku: item.sku, delta: qty, afterCount, ...(followUpTaskId ? { followUpTaskId } : {}) },
      },
      { session },
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('activity_logged'));
    setInventory(loadWorkspaceStoreInventory(repoContext));
    if (followUpTaskId) {
      toast('库存已补货，但仍低于预警线，已创建跟进任务', 'success');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">门店库存与智能调拨</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">控制本门店现货库存，支持跨店调拨或向总仓要货{inventory.length > 0 ? `（共 ${inventory.length} 个 SKU）` : ''}</p>
        </div>
        <div className="flex space-x-2">
          <button className="bg-[var(--bg-panel)] border-[1.5px] border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-sm">
            库存盘点
          </button>
          <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
            新建调拨单
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
         <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
           <input type="text" placeholder="搜索商品名称或 SKU/条形码..." className="w-80 pl-5 pr-5 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium hover:border-gray-300 transition-colors bg-gray-50 focus:bg-[var(--bg-panel)] focus:ring-2 focus:ring-blue-500 outline-none text-[14px]" />
           <div className="flex items-center space-x-3 text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                 <input type="checkbox" className="rounded text-[var(--color-primary)] focus:ring-blue-500" />
                 <span className="font-bold text-gray-700">仅看缺货预警 (&lt;10件)</span>
              </label>
           </div>
         </div>
         {inventory.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
              <ShoppingBag className="icon-lg text-[var(--color-primary)]" />
            </div>
            <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">暂无库存记录</h3>
            <p className="text-[13px] text-[var(--text-muted)]">导入或新建 SKU 后将在此显示</p>
          </div>
         ) : (
         <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50">
              <th className="py-5 px-6">SKU 编码</th>
              <th className="py-5 px-6">商品信息</th>
              <th className="py-5 px-6">可用库存</th>
              <th className="py-5 px-6">预警阈值</th>
              <th className="py-5 px-6">状态</th>
              <th className="py-5 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventory.map((o) => {
              const stat = o.stock <= 0 ? '严重缺货' : o.stock < o.threshold ? '临界' : '充足';
              return (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="py-5 px-6 font-mono text-[13px] text-[var(--text-muted)]">{o.sku}</td>
                <td className="py-5 px-6 font-bold text-[14px] text-[var(--text-main)]">{o.name}</td>
                <td className="py-5 px-6">
                   <span className={`text-[15px] font-extrabold ${o.stock < o.threshold ? 'text-red-600' : 'text-[var(--text-main)]'}`}>{o.stock}</span>
                </td>
                <td className="py-5 px-6 text-[13px] text-[var(--text-muted)]">{o.threshold}</td>
                <td className="py-5 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                     stat === '严重缺货' ? 'bg-red-50 text-red-600 border-red-100' :
                     stat === '临界' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
                   }`}>{stat}</span>
                </td>
                <td className="py-5 px-6 text-right whitespace-nowrap">
                  <button onClick={() => setHistoryItem(o)} className="inline-flex items-center text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] text-[13px] mr-4">
                    <History className="w-3.5 h-3.5 mr-1" />
                    调整记录{o.adjustments.length > 0 ? ` (${o.adjustments.length})` : ''}
                  </button>
                  <button onClick={() => handleReplenish(o)} className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[13px]">向总仓要货</button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
         )}
      </div>

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryItem(null)}>
          <div className="bg-[var(--bg-panel)] rounded-[28px] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-[18px] font-black text-[var(--text-main)]">库存调整记录</h3>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 font-mono">{historyItem.sku} · {historyItem.name}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {historyItem.adjustments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-3">
                    <History className="icon-lg text-gray-400" />
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)]">暂无调整记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItem.adjustments.map((adj) => {
                    const delta = adj.afterCount - adj.beforeCount;
                    return (
                    <div key={adj.id} className="flex items-center justify-between p-4 bg-gray-50/60 border border-[var(--border-color)] rounded-[var(--radius-xl)]">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">{adj.reason}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{new Date(adj.timestamp).toLocaleString('zh-CN')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-black ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{adj.beforeCount} → {adj.afterCount}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STORE_STATUS_LABEL: Record<WorkspaceStore['status'], string> = {
  active: '营业中',
  paused: '暂停营业',
  closed: '已关店',
};

const STORE_CHANNEL_LABEL: Record<string, string> = {
  direct: '直营店',
  flagship: '直营总店',
  franchise: '加盟店',
  online: '线上店',
};

export function StoreListView() {
  const session = useSaasSession();
  const repoContext = useMemo<StoreRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [stores, setStores] = useState<WorkspaceStore[]>([]);

  useEffect(() => {
    setStores(loadWorkspaceStores(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setStores(loadWorkspaceStores(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_stores_updated', handler);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_stores_updated', handler);
    };
  }, [repoContext]);

  const handleCreateStore = () => {
    const name = typeof window !== 'undefined' ? window.prompt('请输入新门店名称')?.trim() : '';
    if (!name) return;
    const channel = (typeof window !== 'undefined' ? window.prompt('请输入门店类型（direct/flagship/franchise/online）', 'direct')?.trim() : 'direct') || 'direct';
    const store = createWorkspaceStore(
      {
        name,
        channel,
        ownerId: session.user.id,
        status: 'active',
        metadata: {},
      },
      repoContext,
    );
    logAuditEvent(
      {
        action: 'asset_create',
        moduleId: 'store_list',
        targetType: 'store',
        targetId: store.id,
        metadata: { name, channel },
      },
      { session },
    );
    setStores(loadWorkspaceStores(repoContext));
  };

  const handleToggleStatus = (store: WorkspaceStore) => {
    const nextStatus: WorkspaceStore['status'] = store.status === 'active' ? 'paused' : 'active';
    updateWorkspaceStore(store.id, { status: nextStatus }, repoContext);
    logAuditEvent(
      {
        action: 'asset_create',
        moduleId: 'store_list',
        targetType: 'store',
        targetId: store.id,
        metadata: { status: nextStatus },
      },
      { session },
    );
    setStores(loadWorkspaceStores(repoContext));
  };

  const handleDeleteStore = (store: WorkspaceStore) => {
    if (typeof window !== 'undefined' && !window.confirm(`确定要关闭并删除门店「${store.name}」吗？此操作将级联删除其订单/库存/员工数据。`)) return;
    deleteWorkspaceStore(store.id, repoContext);
    logAuditEvent(
      {
        action: 'asset_delete',
        moduleId: 'store_list',
        targetType: 'store',
        targetId: store.id,
        metadata: { name: store.name },
      },
      { session },
    );
    setStores(loadWorkspaceStores(repoContext));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">门店官网与结构展现</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">管理品牌旗舰总店及各个下属分店/加盟店{stores.length > 0 ? `（共 ${stores.length} 家）` : ''}</p>
        </div>
        <button
          onClick={handleCreateStore}
          className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
          <Plus className="icon-sm" />
          <span>创建新门店</span>
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-color)] rounded-[28px] p-12 text-center">
          <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
            <Store className="icon-lg text-[var(--color-primary)]" />
          </div>
          <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">还没有门店</h3>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">点击「创建新门店」开始搭建你的门店网络</p>
          <button
            onClick={handleCreateStore}
            className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all">
            <Plus className="icon-sm" />
            <span>创建新门店</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
          {stores.map((store) => (
            <div key={store.id} className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex flex-col hover:border-blue-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-[var(--radius-xl)]">
                  <Store className="icon-lg text-[var(--color-primary)]" />
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${store.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {STORE_STATUS_LABEL[store.status]}
                </span>
              </div>
              <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-1">{store.name}</h3>
              <div className="flex items-center text-[12px] text-[var(--text-muted)] mb-[var(--spacing-md)]">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                <span>{STORE_CHANNEL_LABEL[store.channel] ?? store.channel}{store.location ? ` · ${store.location}` : ''}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4 mt-auto">
                <button
                  onClick={() => handleToggleStatus(store)}
                  className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800">
                  {store.status === 'active' ? '暂停营业' : '恢复营业'}
                </button>
                <button
                  onClick={() => handleDeleteStore(store)}
                  className="text-sm font-bold text-red-500 hover:text-red-700">
                  删除门店
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StoreDesignView() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">智能门店网页设计</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">拖拽式与 AI 自动生成的响应式门店装潢</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border-[1.5px] border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-sm">
            <LayoutTemplate className="icon-sm" />
            <span>模板市场</span>
          </button>
          <button className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
            <MonitorSmartphone className="icon-sm" />
            <span>进入主题编辑器</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        {[
          { name: '极简服装旗舰馆', category: '服饰箱包', stat: '当前使用', preview: 'bg-gradient-to-br from-gray-100 to-gray-200' },
          { name: '数字潮玩体验店', category: '3C/数码', stat: '已购买', preview: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
          { name: '轻奢美妆集成店', category: '美妆护肤', stat: '未部署', preview: 'bg-gradient-to-br from-rose-100 to-pink-200' },
        ].map((tpl, i) => (
          <div key={i} className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col hover:border-blue-300 transition-all group">
            <div className={`h-40 w-full ${tpl.preview} relative`}>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                 <button className="opacity-0 group-hover:opacity-100 bg-[var(--bg-panel)] text-[var(--text-main)] font-bold px-4 py-2 rounded-lg shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                   预览模板
                 </button>
              </div>
            </div>
            <div className="p-[var(--spacing-lg)]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[var(--text-main)] text-[16px]">{tpl.name}</h3>
                <span className={`px-2 py-1 text-[11px] font-bold rounded-lg ${tpl.stat === '当前使用' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {tpl.stat}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)]">{tpl.category}</p>
              <div className="flex space-x-3 mt-auto">
                 {tpl.stat !== '当前使用' && (
                    <button className="flex-1 bg-gray-900 text-white text-sm font-bold py-2 rounded-[var(--radius-xl)] hover:bg-black transition-colors">
                      应用模板
                    </button>
                 )}
                 {tpl.stat === '当前使用' && (
                    <button className="flex-1 bg-blue-50 text-[var(--color-primary)] text-sm font-bold py-2 rounded-[var(--radius-xl)] transition-colors">
                      配置主题参数
                    </button>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 flex justify-between items-center mt-6">
         <div className="flex items-center space-x-4">
           <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-full flex justify-center items-center">
             <LayoutTemplate className="text-white icon-lg" />
           </div>
           <div>
              <h4 className="font-bold text-[var(--text-main)] text-[16px]">使用 AI 一键生成门店组件</h4>
              <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">输入提示词，AI 极速生成轮播图、商品推荐区等自定义模块。</p>
           </div>
         </div>
         <button className="bg-gray-900 text-white font-bold px-6 py-2.5 rounded-[var(--radius-xl)] hover:bg-black transition-all">
           去生成模块
         </button>
      </div>
    </div>
  );
}

const STAFF_STATUS_LABEL: Record<WorkspaceStoreStaff['status'], string> = {
  active: '在职',
  on_leave: '休假中',
  terminated: '已离职',
};

export function StoreStaffView() {
  const session = useSaasSession();
  const repoContext = useMemo<StoreRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [staff, setStaff] = useState<WorkspaceStoreStaff[]>([]);
  const [stores, setStores] = useState<WorkspaceStore[]>([]);

  useEffect(() => {
    setStaff(loadWorkspaceStoreStaff(repoContext));
    setStores(loadWorkspaceStores(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => {
      setStaff(loadWorkspaceStoreStaff(repoContext));
      setStores(loadWorkspaceStores(repoContext));
    };
    if (typeof window !== 'undefined') window.addEventListener('workspace_stores_updated', handler);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_stores_updated', handler);
    };
  }, [repoContext]);

  const storeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  const handleAddStaff = () => {
    if (stores.length === 0) {
      if (typeof window !== 'undefined') window.alert('请先创建门店，再添加店员');
      return;
    }
    const name = typeof window !== 'undefined' ? window.prompt('请输入店员姓名')?.trim() : '';
    if (!name) return;
    const role = (typeof window !== 'undefined' ? window.prompt('请输入角色（如 店长 / 导购）', '导购')?.trim() : '导购') || '导购';
    const created = createWorkspaceStoreStaff(
      {
        storeId: stores[0].id,
        name,
        role,
        status: 'active',
        ownerId: session.user.id,
      },
      repoContext,
    );
    logAuditEvent(
      {
        action: 'member_create',
        moduleId: 'store_staff',
        targetType: 'store_staff',
        targetId: created.id,
        metadata: { name, role, storeId: stores[0].id },
      },
      { session },
    );
    setStaff(loadWorkspaceStoreStaff(repoContext));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">员工与排班管理</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">控制员工系统权限及业务绩效跟踪{staff.length > 0 ? `（共 ${staff.length} 人）` : ''}</p>
        </div>
        <button onClick={handleAddStaff} className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
          <Plus className="icon-sm" />
          <span>添加店员</span>
        </button>
      </div>
      
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)]/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
              <UsersRound className="icon-lg text-[var(--color-primary)]" />
            </div>
            <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">还没有店员</h3>
            <p className="text-[13px] text-[var(--text-muted)]">点击「添加店员」开始组建你的门店团队</p>
          </div>
        ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50">
              <th className="py-5 px-6">员工姓名</th>
              <th className="py-5 px-6">所属门店</th>
              <th className="py-5 px-6">角色权限</th>
              <th className="py-5 px-6">状态</th>
              <th className="py-5 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="py-5 px-6 text-[14px] font-bold text-[var(--text-main)]">{p.name}</td>
                <td className="py-5 px-6 text-[13px] text-[var(--text-muted)]">{storeNameById[p.storeId] ?? '未分配'}</td>
                <td className="py-5 px-6">
                   <span className="px-2 py-1 text-[11px] font-bold bg-blue-50 text-[var(--color-primary)] rounded">{p.role}</span>
                </td>
                <td className="py-5 px-6">
                   <span className={`px-2 py-1 text-[11px] font-bold rounded ${p.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{STAFF_STATUS_LABEL[p.status]}</span>
                </td>
                <td className="py-5 px-6 text-right">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">管理权限</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

const CAMPAIGN_STATUS_LABEL: Record<WorkspaceCampaignStatus, string> = {
  draft: '草稿',
  active: '进行中',
  paused: '已暂停',
  archived: '已归档',
};

export function StoreMarketingView() {
  const session = useSaasSession();
  const repoContext = useMemo<CampaignRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [campaigns, setCampaigns] = useState<WorkspaceCampaign[]>([]);

  const reload = useCallback(() => {
    setCampaigns(listWorkspaceCampaigns(repoContext).filter((c) => c.channel === 'store_event'));
  }, [repoContext]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.addEventListener('workspace_campaigns_updated', reload);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('workspace_campaigns_updated', reload);
    };
  }, [reload]);

  const stats = useMemo(() => {
    const totals = campaigns.reduce(
      (acc, c) => {
        acc.exposures += c.metrics.exposures;
        acc.scans += c.metrics.scans;
        acc.shares += c.metrics.shares;
        acc.conversions += c.metrics.conversions;
        return acc;
      },
      { exposures: 0, scans: 0, shares: 0, conversions: 0 },
    );
    const activeCount = campaigns.filter((c) => c.status === 'active').length;
    const conversionRate = totals.exposures > 0 ? (totals.conversions / totals.exposures) * 100 : 0;
    return { ...totals, activeCount, conversionRate };
  }, [campaigns]);

  const trendData = campaigns.slice(0, 7).reverse().map((c) => ({ name: c.name.slice(0, 6), revenue: c.metrics.conversions }));

  const handleCreateCampaign = () => {
    const name = typeof window !== 'undefined' ? window.prompt('请输入门店活动名称')?.trim() : '';
    if (!name) return;
    // 为活动生成关联的海报素材占位
    const asset = createWorkspaceAsset(
      {
        name: `${name} - 活动海报`,
        type: 'image',
        source: 'generated',
        moduleId: 'store_marketing',
        tags: ['store', 'campaign', 'store_event'],
        metadata: { campaignName: name, generatedFor: 'store_marketing' },
      },
      { workspaceId: repoContext.workspaceId, userId: repoContext.userId },
    );
    const campaign = createWorkspaceCampaign(
      {
        name,
        channel: 'store_event',
        status: 'active',
        moduleId: 'store_marketing',
        linkedAssetIds: [asset.id],
        metadata: { createdFrom: 'store_marketing' },
      },
      repoContext,
    );
    logAuditEvent(
      {
        action: 'asset_create',
        moduleId: 'store_marketing',
        targetType: 'asset',
        targetId: asset.id,
        metadata: { campaignId: campaign.id, campaignName: name, channel: 'store_event' },
      },
      { session },
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('activity_logged'));
    reload();
    toast('门店活动已创建，关联海报素材已保存至素材库', 'success');
  };

  const handleCycleStatus = (campaign: WorkspaceCampaign) => {
    const next: WorkspaceCampaignStatus =
      campaign.status === 'draft' ? 'active' :
      campaign.status === 'active' ? 'paused' :
      campaign.status === 'paused' ? 'archived' : 'draft';
    updateWorkspaceCampaign(campaign.id, { status: next }, repoContext);
    logAuditEvent(
      {
        action: 'asset_create',
        moduleId: 'store_marketing',
        targetType: 'asset',
        targetId: campaign.id,
        metadata: { campaignId: campaign.id, status: next },
      },
      { session },
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('activity_logged'));
    reload();
  };

  const statCards = [
    { label: '活动总曝光', value: stats.exposures.toLocaleString('zh-CN'), color: 'text-[var(--color-primary)]' },
    { label: '扫码核销', value: stats.scans.toLocaleString('zh-CN'), color: 'text-green-600' },
    { label: '转化数', value: stats.conversions.toLocaleString('zh-CN'), color: 'text-purple-600' },
    { label: '转化率', value: `${stats.conversionRate.toFixed(1)}%`, color: 'text-orange-500' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">门店营销管理</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">发券、促单及客户关系维护{campaigns.length > 0 ? `（共 ${campaigns.length} 个活动 · ${stats.activeCount} 个进行中）` : ''}</p>
        </div>
        <button onClick={handleCreateCampaign} className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
          <Plus className="icon-sm" />
          <span>新建门店活动</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        {statCards.map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-[32px] font-black tracking-tight ${s.color} mb-2 leading-none`}>{s.value}</p>
           </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-color)] rounded-[28px] p-12 text-center">
          <div className="bg-purple-50 p-4 rounded-full w-fit mx-auto mb-4">
            <Megaphone className="icon-lg text-purple-600" />
          </div>
          <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">还没有门店活动</h3>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">点击「新建门店活动」创建活动，系统会自动生成关联的海报素材</p>
          <button onClick={handleCreateCampaign} className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all">
            <Plus className="icon-sm" />
            <span>新建门店活动</span>
          </button>
        </div>
      ) : (
      <>
       <div className="bg-[var(--bg-panel)] rounded-[28px] border border-[var(--border-color)]/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] mb-[var(--spacing-md)]">
          <h3 className="text-[17px] font-black text-[var(--text-main)] tracking-tight mb-[var(--spacing-xl)]">各活动转化对比</h3>
          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
               <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                 <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>

       <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
         <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50">
              <th className="py-5 px-6">活动名称</th>
              <th className="py-5 px-6">关联素材</th>
              <th className="py-5 px-6">曝光 / 转化</th>
              <th className="py-5 px-6">状态</th>
              <th className="py-5 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="py-5 px-6">
                  <p className="font-bold text-[14px] text-[var(--text-main)]">{c.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</p>
                </td>
                <td className="py-5 px-6 text-[13px] text-[var(--text-muted)]">
                  {c.linkedAssetIds.length > 0 ? `${c.linkedAssetIds.length} 个素材` : '—'}
                </td>
                <td className="py-5 px-6 text-[13px] text-[var(--text-main)] font-bold">{c.metrics.exposures.toLocaleString('zh-CN')} / {c.metrics.conversions.toLocaleString('zh-CN')}</td>
                <td className="py-5 px-6">
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                    c.status === 'active' ? 'bg-green-50 text-green-600' :
                    c.status === 'paused' ? 'bg-orange-50 text-orange-600' :
                    c.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'
                  }`}>{CAMPAIGN_STATUS_LABEL[c.status]}</span>
                </td>
                <td className="py-5 px-6 text-right">
                  <button onClick={() => handleCycleStatus(c)} className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[13px]">切换状态</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
      </>
      )}
    </div>
  );
}

export function StoreDistributionView() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">终端分销网络</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">设置分佣比例与代理客等级体系</p>
        </div>
        <div className="flex space-x-2">
           <button className="bg-[var(--bg-panel)] border-[1.5px] border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-sm">
             查看待审核客单
           </button>
           <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
             新增分销等级
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        {[
          { label: '招募特约推客', value: '452 人', sub: '近30天新增 89 人' },
          { label: '本月预计发出佣金', value: '¥24,850.00', sub: '已结算 ¥12,400' },
          { label: '最高产出推客', value: '张*伟', sub: '累计拉新业绩 ¥142k' },
        ].map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{s.value}</p>
              <p className="text-[11px] font-bold text-[var(--text-muted)]">{s.sub}</p>
           </div>
        ))}
      </div>

      <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mt-6">
         <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
           <h3 className="font-bold text-[15px] text-[var(--text-main)]">当前生效的分销体系等级</h3>
           <button className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800">全部展开</button>
         </div>
         <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] bg-gray-50/50">
              <th className="py-5 px-6">等级名称</th>
              <th className="py-5 px-6">升级门槛条件</th>
              <th className="py-5 px-6">自购返佣</th>
              <th className="py-5 px-6">直推返佣</th>
              <th className="py-5 px-6">间推返佣</th>
              <th className="py-5 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { level: 'VIP1 新晋推客', condition: '成功注册并绑定手机', self: '5%', direct: '10%', indirect: '0%' },
              { level: 'VIP2 进阶推客', condition: '累计推荐成功结算订单 > 50单', self: '8%', direct: '15%', indirect: '3%' },
              { level: 'VIP3 合伙人', condition: '累计促单金额 > ¥100,000', self: '12%', direct: '22%', indirect: '8%' },
            ].map((o, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-5 px-6 font-bold text-[14px] text-[var(--text-main)]">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-50 text-[var(--color-primary)] p-1.5 rounded-lg"><Split className="icon-sm"/></span>
                    <span>{o.level}</span>
                  </div>
                </td>
                <td className="py-5 px-6 text-[13px] text-[var(--text-muted)]">{o.condition}</td>
                <td className="py-5 px-6 font-bold text-gray-700">{o.self}</td>
                <td className="py-5 px-6 font-bold text-[var(--color-primary)]">{o.direct}</td>
                <td className="py-5 px-6 font-bold text-gray-700">{o.indirect}</td>
                <td className="py-5 px-6 text-right">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[13px]">配置参数</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StoreEventsView() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">门店活动策划</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">基于时间节点的营销计划库</p>
        </div>
        <button className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[var(--radius-xl)] font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
          <Plus className="icon-sm" />
          <span>新建活动</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
        {[
          { name: '中秋答题集赞赢周边', time: '2026-09-01 至 2026-09-15', stat: '待发布' },
          { name: '会员专属盲盒派对', time: '2026-06-18 至 2026-06-20', stat: '进行中' },
        ].map((p, i) => (
          <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
             <div className="flex justify-between mb-4">
               <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-[var(--radius-xl)] flex items-center justify-center">
                 <Gift className="icon-md" />
               </div>
               <span className={`px-2 py-1 text-[11px] font-bold rounded ${p.stat === '进行中' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.stat}</span>
             </div>
             <h3 className="font-bold text-[var(--text-main)] text-md mb-2">{p.name}</h3>
             <p className="text-[12px] text-[var(--text-muted)] mb-4">{p.time}</p>
             <button className="text-sm font-bold text-[var(--color-primary)] flex items-center">
               查看配置 <ChevronRight className="icon-sm ml-1" />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoreMiniappView() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pt-20 lg:pt-24 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tighter leading-tight">小程序端控制台</h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2 tracking-wide">管理微信、支付宝端小程序发布与版本</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
           <h3 className="font-bold text-[var(--text-main)] text-lg mb-2 flex items-center"><Smartphone className="mr-2 text-[var(--color-primary)]"/>微信小程序配置</h3>
           <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)]">当前版本: v2.4.1 (已于 2 天前审核通过)</p>
           <button className="bg-green-500 hover:bg-green-600 text-white fill-current px-4 py-2 text-sm font-bold rounded-lg shadow flex items-center w-max">
             <QrCode className="icon-sm mr-2" /> 生成体验码
           </button>
        </div>
        <div className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)]/80 rounded-[28px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
           <h3 className="font-bold text-[var(--text-main)] text-lg mb-2 flex items-center"><Smartphone className="mr-2 text-[var(--color-primary)]"/>多端同步构建</h3>
           <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)]">修改系统设置或主题色后，可一键触发行云流水线重新构建所有端小程序代码。</p>
           <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white fill-current px-4 py-2 text-sm font-bold rounded-lg shadow">
             发起全量构建
           </button>
        </div>
      </div>
    </div>
  );
}
