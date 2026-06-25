import type { ModuleId, NavGroupType, NavItemType } from '../types';
import { hasWorkspacePermission } from '../saas/permissions';
import type { WorkspaceRole } from '../saas/types';

export type ProductPhase = 'p0' | 'p1' | 'p2' | 'later';
export type ProductReadiness = 'implemented' | 'mock' | 'placeholder' | 'hidden';
export type ProductRouteStatus = 'rendered' | 'internal' | 'hidden';

export interface ProductFeatureRecord {
  id: ModuleId;
  label: string;
  domain: string;
  domainOrder: number;
  icon: string;
  phase: ProductPhase;
  readiness: ProductReadiness;
  componentKey: string;
  permission: string;
  dataDependencies: string[];
  description: string;
  visible: boolean;
  routeStatus: ProductRouteStatus;
}

type FeatureInput = {
  id: ModuleId;
  label: string;
  icon: string;
  phase?: ProductPhase;
  readiness?: ProductReadiness;
  componentKey?: string;
  permission?: string;
  dataDependencies?: string[];
  description?: string;
  visible?: boolean;
  routeStatus?: ProductRouteStatus;
};

export const commercialMvpP0Batch1ModuleIds = [
  'dashboard',
  'workflow',
  'tasks',
  'agent_status',
  'data',
  'assets',
  'projects',
  'billing',
  'saas_api_keys',
  'settings',
  'admin',
  'activity_logs',
] as const satisfies readonly ModuleId[];

const p0FeatureIds = new Set<ModuleId>([
  ...commercialMvpP0Batch1ModuleIds,
  'e_main_image',
  'e_detail_page',
  'e_poster',
  'ai_image_edit',
  'e_clone',
  'image',
  'chat',
  'copywriting_create',
  'copywriting_tools',
  'copywriting_keywords',
]);

const p1FeatureIds = new Set<ModuleId>([
  'video',
  'speech',
  'e_video',
  'remix_home',
  'remix_smart',
  'remix_materials',
  'remix_titles',
  'remix_templates',
  'remix_viral',
  'avatar_home',
  'avatar_create',
  'avatar_voice',
  'avatar_space',
  'crm',
  'customer_service',
  'marketing_viral',
  'marketing_nfc',
  'marketing_website',
  'team',
  'sub_accounts',
  'team_write',
  'team_tasks',
  'team_assets',
  'team_more',
  'store_dashboard',
  'store_list',
  'store_orders',
  'store_inventory',
  'store_marketing',
]);

const p2FeatureIds = new Set<ModuleId>([
  'media',
  'employee_accounts',
  'finance',
  'tax',
  'store_design',
  'store_staff',
  'store_distribution',
  'store_events',
  'store_miniapp',
]);

function phaseFor(id: ModuleId): ProductPhase {
  if (p0FeatureIds.has(id)) return 'p0';
  if (p1FeatureIds.has(id)) return 'p1';
  if (p2FeatureIds.has(id)) return 'p2';
  return 'later';
}

function defaultDataDependencies(id: ModuleId): string[] {
  if (id.includes('store')) return ['workspace', 'store', 'audit'];
  if (id.includes('copywriting')) return ['workspace', 'generationJob', 'asset', 'audit'];
  if (id.startsWith('e_') || id === 'ai_image_edit' || id === 'image') return ['workspace', 'generationJob', 'asset', 'usage', 'audit'];
  if (id.startsWith('team') || id === 'sub_accounts' || id === 'employee_accounts') return ['workspace', 'member', 'task', 'audit'];
  if (id.startsWith('remix') || id === 'video') return ['workspace', 'videoProject', 'asset', 'generationJob', 'audit'];
  if (id.startsWith('avatar')) return ['workspace', 'avatarAsset', 'voiceAsset', 'consent', 'audit'];
  if (id === 'tasks') return ['workspace', 'task', 'audit'];
  if (id === 'billing') return ['workspace', 'usage', 'plan', 'invoice', 'audit'];
  if (id === 'saas_api_keys') return ['workspace', 'providerConfig', 'audit'];
  if (id === 'activity_logs') return ['workspace', 'audit'];
  return ['workspace', 'audit'];
}

function domain(domainOrder: number, title: string, items: FeatureInput[]): ProductFeatureRecord[] {
  return items.map((item) => {
    const phase = item.phase ?? phaseFor(item.id);
    const visible = item.visible ?? true;
    return {
      id: item.id,
      label: item.label,
      domain: title,
      domainOrder,
      icon: item.icon,
      phase,
      readiness: item.readiness ?? (visible ? 'mock' : 'hidden'),
      componentKey: item.componentKey ?? item.id,
      permission: item.permission ?? `module.${item.id}.view`,
      dataDependencies: item.dataDependencies ?? defaultDataDependencies(item.id),
      description: item.description ?? `${title} / ${item.label}`,
      visible,
      routeStatus: item.routeStatus ?? (visible ? 'rendered' : 'hidden'),
    };
  });
}

export const productFeatureRegistry: ProductFeatureRecord[] = [
  ...domain(1, '我的 Agent 看板', [
    { id: 'dashboard', label: '全域指挥概览', icon: 'LayoutDashboard', readiness: 'implemented', componentKey: 'DashboardView' },
    { id: 'workflow', label: 'Agent 集群状态', icon: 'Network', readiness: 'implemented', componentKey: 'AgentWorkflowView' },
    { id: 'tasks', label: '全局任务调度', icon: 'ListTodo', readiness: 'implemented', componentKey: 'TasksView' },
    { id: 'agent_status', label: 'Agent 状态监测', icon: 'HeartPulse', readiness: 'implemented', componentKey: 'AgentStatusDashboardView' },
  ]),
  ...domain(2, '主理人：电商操盘', [
    { id: 'e_main_image', label: '主图设计', icon: 'LayoutTemplate', readiness: 'implemented', componentKey: 'ECommerceView:e_main_image' },
    { id: 'e_video', label: '商品视频', icon: 'MonitorPlay', readiness: 'implemented', componentKey: 'ECommerceView:e_video' },
    { id: 'e_detail_page', label: '详情页设计助理', icon: 'PanelTop', readiness: 'implemented', componentKey: 'ECommerceView:e_detail_page' },
    { id: 'e_poster', label: '创意海报', icon: 'Palette', readiness: 'implemented', componentKey: 'ECommerceView:e_poster' },
    { id: 'ai_image_edit', label: 'AI图像编辑', icon: 'Sparkles', readiness: 'implemented', componentKey: 'ImageEditorView' },
    { id: 'e_clone', label: '克隆设计', icon: 'Copy', readiness: 'implemented', componentKey: 'ECommerceView:e_clone' },
  ]),
  ...domain(3, '主理人：无界创作', [
    { id: 'video', label: '视频创作引擎', icon: 'Film', readiness: 'implemented', componentKey: 'VideoCreationView' },
    { id: 'image', label: '商用级图像生成', icon: 'ImageIcon', readiness: 'implemented', componentKey: 'ImageCreationView' },
    { id: 'ai_canvas', label: '无限模态 AI 画布', icon: 'Palette', componentKey: 'AICanvasView' },
    { id: 'chat', label: '全能顾问对话', icon: 'MessageSquare', readiness: 'implemented', componentKey: 'ChatView' },
    { id: 'speech', label: '多语种语音引擎', icon: 'Mic', readiness: 'implemented', componentKey: 'SpeechView' },
  ]),
  ...domain(4, '主理人：文案营销', [
    { id: 'copywriting_create', label: '文案创作', icon: 'PenTool', readiness: 'implemented', componentKey: 'CopywritingView:create' },
    { id: 'copywriting_tools', label: '创作工具', icon: 'Wrench', readiness: 'implemented', componentKey: 'CopywritingView:tools' },
    { id: 'copywriting_keywords', label: '关键词库', icon: 'BookType', readiness: 'implemented', componentKey: 'CopywritingView:keywords' },
  ]),
  ...domain(5, '主理人：视频工业', [
    { id: 'remix_home', label: '混剪首页', icon: 'Home', readiness: 'implemented', componentKey: 'RemixView:home' },
    { id: 'remix_smart', label: '智能混剪', icon: 'Wand2', readiness: 'implemented', componentKey: 'RemixView:smart' },
    { id: 'remix_viral', label: '爆款视频复刻', icon: 'Sparkles', readiness: 'implemented', componentKey: 'RemixView:viral' },
    { id: 'remix_materials', label: '混剪素材', icon: 'Layers', readiness: 'implemented', componentKey: 'RemixView:materials' },
    { id: 'remix_titles', label: '标题模板', icon: 'Type', readiness: 'implemented', componentKey: 'RemixView:titles' },
    { id: 'remix_templates', label: '视频模板', icon: 'LayoutTemplate', readiness: 'implemented', componentKey: 'RemixView:templates' },
  ]),
  ...domain(6, '主理人：分身直播', [
    { id: 'avatar_home', label: '分身管理', icon: 'LayoutDashboard', componentKey: 'AvatarView:home' },
    { id: 'avatar_create', label: '克隆声音与形象', icon: 'Video', componentKey: 'AvatarView:create' },
    { id: 'avatar_voice', label: '声音资产', icon: 'Mic', componentKey: 'AvatarView:voice' },
    { id: 'avatar_space', label: '数字人空间', icon: 'UserCircle2', componentKey: 'AvatarView:space' },
  ]),
  ...domain(7, '主理人：私域与客户', [
    { id: 'crm', label: '智能客户管家 (CRM)', icon: 'UsersRound', readiness: 'implemented', componentKey: 'CrmView' },
    { id: 'customer_service', label: '全天候 AI 客服', icon: 'Headphones', readiness: 'implemented', componentKey: 'CustomerServiceView' },
  ]),
  ...domain(8, '大航海：全域裂变', [
    { id: 'marketing_viral', label: '爆店码', icon: 'ScanLine', readiness: 'implemented', componentKey: 'MarketingView:viral' },
    { id: 'marketing_nfc', label: '碰一碰', icon: 'SmartphoneNfc', readiness: 'implemented', componentKey: 'MarketingView:nfc' },
    { id: 'marketing_website', label: '智能官网', icon: 'Globe', readiness: 'implemented', componentKey: 'MarketingView:website' },
  ]),
  ...domain(9, '导演台与分镜流', [
    { id: 'director_desk', label: '全局导演台', icon: 'Video', readiness: 'implemented', componentKey: 'DirectorDeskView' },
  ]),
  ...domain(10, '主理人：包揽设计', [
    { id: 'design_logo', label: '智能 LOGO', icon: 'Palette', readiness: 'implemented', componentKey: 'DesignWorkflowView:logo' },
    { id: 'design_packaging', label: 'AI 包装设计', icon: 'Package', readiness: 'implemented', componentKey: 'DesignWorkflowView:packaging' },
    { id: 'design_ads', label: '广告创意', icon: 'Megaphone', readiness: 'implemented', componentKey: 'DesignWorkflowView:ads' },
    { id: 'design_interior', label: 'AI 家装设计', icon: 'Home', readiness: 'implemented', componentKey: 'DesignWorkflowView:interior' },
    { id: 'design_fashion', label: 'AI 服装设计', icon: 'Shirt', readiness: 'implemented', componentKey: 'DesignWorkflowView:fashion' },
  ]),
  ...domain(11, '我的数字资产库', [
    { id: 'data', label: '业务数据罗盘', icon: 'BarChart2', readiness: 'implemented', componentKey: 'DataAnalyticsView' },
    { id: 'assets', label: '数字资产保险库', icon: 'Folder', readiness: 'implemented', componentKey: 'AssetsView' },
    { id: 'projects', label: '品牌知识库', icon: 'Briefcase', readiness: 'implemented', componentKey: 'ProjectsView' },
  ]),
  ...domain(12, '虚拟数字员工', [
    { id: 'team', label: '数字员工概览', icon: 'Building2', readiness: 'implemented', componentKey: 'TeamView:overview' },
    { id: 'sub_accounts', label: '分发矩阵账号', icon: 'Users', readiness: 'implemented', componentKey: 'SubAccountsView' },
    { id: 'team_write', label: '人机推演协作', icon: 'PenTool', readiness: 'implemented', componentKey: 'TeamView:write' },
    { id: 'team_tasks', label: '异步协同任务', icon: 'ListTodo', readiness: 'implemented', componentKey: 'TeamView:tasks' },
    { id: 'team_assets', label: '共享给Agent的库', icon: 'Folder', readiness: 'implemented', componentKey: 'TeamView:assets' },
    { id: 'team_more', label: '主理人审批流', icon: 'Layers', readiness: 'implemented', componentKey: 'TeamView:more' },
  ]),
  ...domain(13, '云连锁与小店群', [
    { id: 'store_dashboard', label: '多店全盘看板', icon: 'LayoutDashboard', readiness: 'implemented', componentKey: 'StoreDashboardView' },
    { id: 'store_list', label: '门店官网与分店', icon: 'Store', readiness: 'implemented', componentKey: 'StoreListView' },
    { id: 'store_orders', label: '统一订单管理', icon: 'ShoppingBag', readiness: 'implemented', componentKey: 'StoreOrdersView' },
    { id: 'store_inventory', label: '智能调拨与库存', icon: 'Package', readiness: 'implemented', componentKey: 'StoreInventoryView' },
    { id: 'store_design', label: '门店网页设计', icon: 'LayoutTemplate', readiness: 'implemented', componentKey: 'StoreDesignView' },
    { id: 'store_staff', label: '虚拟导购与巡店', icon: 'UsersRound', readiness: 'implemented', componentKey: 'StoreStaffView' },
    { id: 'store_marketing', label: '自动营销策略', icon: 'Megaphone', readiness: 'implemented', componentKey: 'StoreMarketingView' },
    { id: 'store_distribution', label: '分销代理网络', icon: 'Split', readiness: 'implemented', componentKey: 'StoreDistributionView' },
    { id: 'store_events', label: '活动与引流', icon: 'Gift', readiness: 'implemented', componentKey: 'StoreEventsView' },
    { id: 'store_miniapp', label: '小程序端管理', icon: 'Smartphone', readiness: 'implemented', componentKey: 'StoreMiniappView' },
  ]),
  ...domain(14, '系统引擎与权限', [
    { id: 'media', label: '社媒矩阵挂载', icon: 'Share2', readiness: 'implemented', componentKey: 'MediaAccountsView' },
    { id: 'employee_accounts', label: '兼职员工账号池', icon: 'UserCircle2', readiness: 'implemented', componentKey: 'EmployeeAccountsView' },
    { id: 'billing', label: '算力与 Token 监控', icon: 'CreditCard', readiness: 'implemented', componentKey: 'BillingView' },
    { id: 'saas_api_keys', label: 'API 密钥与开发者', icon: 'Key', readiness: 'implemented', componentKey: 'ApiKeysView' },
    { id: 'settings', label: '全局偏好配置', icon: 'Settings', readiness: 'implemented', componentKey: 'SettingsView' },
    { id: 'admin', label: '系统管理', icon: 'Shield', readiness: 'implemented', componentKey: 'AdminView' },
    { id: 'finance', label: '财务与票据管理', icon: 'Wallet', readiness: 'implemented', componentKey: 'FinanceView' },
    { id: 'tax', label: '税务筹划与计算', icon: 'Calculator', readiness: 'implemented', componentKey: 'TaxView' },
    { id: 'activity_logs', label: '全站操作审计日志', icon: 'Activity', readiness: 'implemented', componentKey: 'ActivityLogsView' },
  ]),
  ...domain(15, '隐藏与内部路由', [
    {
      id: 'e_white_bg',
      label: '白底图生成',
      icon: 'ImageMinus',
      visible: false,
      readiness: 'hidden',
      routeStatus: 'hidden',
      componentKey: 'hidden:e_white_bg',
      dataDependencies: ['workspace', 'generationJob', 'asset', 'audit'],
      description: 'Legacy e-commerce module id retained for compatibility; hidden until route and UI are implemented.',
    },
    {
      id: 'marketing_diy',
      label: 'DIY 营销编辑器',
      icon: 'LayoutTemplate',
      visible: false,
      readiness: 'hidden',
      routeStatus: 'internal',
      componentKey: 'DIYEditorView',
      dataDependencies: ['workspace', 'campaign', 'asset', 'audit'],
      description: 'Internal render target used by marketing flows; not a visible sidebar feature.',
    },
  ]),
];

export const visibleProductFeatures = productFeatureRegistry.filter((feature) => feature.visible);

export const productNavGroups: NavGroupType[] = Array.from(
  new Map(
    visibleProductFeatures
      .sort((a, b) => a.domainOrder - b.domainOrder)
      .map((feature) => [feature.domainOrder, feature.domain]),
  ).entries(),
).map(([, title]) => ({
  title,
  items: visibleProductFeatures
    .filter((feature) => feature.domain === title)
    .map(({ id, label, icon }) => ({ id, label, icon })),
}));

export const visibleProductNavItems: NavItemType[] = productNavGroups.flatMap((group) => group.items);

export const productFeatureById = new Map(productFeatureRegistry.map((feature) => [feature.id, feature]));

export function getProductFeature(id: ModuleId): ProductFeatureRecord | undefined {
  return productFeatureById.get(id);
}

export function canViewProductModule(id: ModuleId, role: WorkspaceRole | string): boolean {
  const feature = getProductFeature(id);
  return Boolean(feature?.visible && hasWorkspacePermission(role, feature.permission));
}

export function getProductNavGroupsForRole(role: WorkspaceRole | string): NavGroupType[] {
  return productNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewProductModule(item.id, role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getFirstAccessibleProductModule(role: WorkspaceRole | string): ModuleId {
  return getProductNavGroupsForRole(role)[0]?.items[0]?.id ?? 'dashboard';
}

export function getProductModuleTitle(id: ModuleId): string {
  return getProductFeature(id)?.label ?? '工作台';
}

export function getProductBreadcrumb(id: ModuleId) {
  const feature = getProductFeature(id);
  if (!feature) {
    return { groupTitle: '系统', itemLabel: '工作台', firstItemId: 'dashboard' as ModuleId };
  }

  const group = productNavGroups.find((candidate) => candidate.title === feature.domain);
  return {
    groupTitle: feature.domain,
    itemLabel: feature.label,
    firstItemId: group?.items[0]?.id ?? 'dashboard',
  };
}

export function isVisibleProductModule(id: ModuleId): boolean {
  return Boolean(getProductFeature(id)?.visible);
}
