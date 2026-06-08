import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Briefcase, 
  Film, 
  Folder, 
  Image as ImageIcon, 
  LayoutDashboard, 
  ListTodo, 
  MessageSquare, 
  Mic, 
  PenTool, 
  Scissors, 
  Settings, 
  Share2, 
  Shield, 
  UserCircle2, 
  Users,
  ShoppingCart,
  LayoutTemplate,
  MonitorPlay,
  PanelTop,
  Palette,
  ImageMinus,
  Copy,
  ChevronDown,
  ChevronRight,
  Video,
  Wand2,
  Layers,
  Type,
  LogOut,
  Sparkles,
  CreditCard,
  BookType,
  Wrench,
  ScanLine,
  SmartphoneNfc,
  Globe,
  Building2,
  Home,
  Network,
  Package,
  Megaphone,
  Shirt,
  Key,
  Store,
  UsersRound,
  Gift,
  Split,
  Smartphone,
  ShoppingBag,
  Headphones,
  Activity,
  HeartPulse,
  Calculator,
  Zap,
  Wallet
} from 'lucide-react';
import { ModuleId, NavGroupType } from '../types';
import { GoogleLogo } from './Logo';

export const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Film,
  ImageIcon,
  UserCircle2,
  PenTool,
  MessageSquare,
  Mic,
  Scissors,
  BarChart2,
  Folder,
  Briefcase,
  ListTodo,
  Users,
  Share2,
  Settings,
  Shield,
  LayoutTemplate,
  MonitorPlay,
  PanelTop,
  Palette,
  ImageMinus,
  Copy,
  Video,
  Wand2,
  Layers,
  Type,
  Sparkles,
  CreditCard,
  BookType,
  Wrench,
  ScanLine,
  SmartphoneNfc,
  Globe,
  Building2,
  Home,
  Network,
  Package,
  Megaphone,
  Shirt,
  Key,
  Store,
  UsersRound,
  Gift,
  Split,
  Smartphone,
  ShoppingBag,
  Headphones,
  Activity,
  HeartPulse,
  Zap,
  Calculator,
  Wallet
};

export const navGroups: NavGroupType[] = [
  {
    title: '我的 Agent 看板',
    items: [
      { id: 'dashboard', label: '全域指挥概览', icon: 'LayoutDashboard' },
      { id: 'workflow', label: 'Agent 集群状态', icon: 'Network' },
      { id: 'tasks', label: '全局任务调度', icon: 'ListTodo' },
      { id: 'agent_status', label: 'Agent 状态监测', icon: 'HeartPulse' },
    ]
  },
  {
    title: '主理人：电商操盘',
    items: [
      { id: 'e_main_image', label: '主图设计', icon: 'LayoutTemplate' },
      { id: 'e_video', label: '商品视频', icon: 'MonitorPlay' },
      { id: 'e_detail_page', label: '详情页设计助理', icon: 'PanelTop' },
      { id: 'e_poster', label: '创意海报', icon: 'Palette' },
      { id: 'ai_image_edit', label: 'AI图像编辑', icon: 'Sparkles' },
      { id: 'e_clone', label: '克隆设计', icon: 'Copy' },
    ]
  },
  {
    title: '主理人：无界创作',
    items: [
      { id: 'video', label: '视频创作引擎', icon: 'Film' },
      { id: 'image', label: '商用级图像生成', icon: 'ImageIcon' },
      { id: 'ai_canvas', label: '无限模态 AI 画布', icon: 'Palette' },
      { id: 'chat', label: '全能顾问对话', icon: 'MessageSquare' },
      { id: 'speech', label: '多语种语音引擎', icon: 'Mic' },
    ]
  },
  {
    title: '主理人：文案营销',
    items: [
      { id: 'copywriting_create', label: '文案创作', icon: 'PenTool' },
      { id: 'copywriting_tools', label: '创作工具', icon: 'Wrench' },
      { id: 'copywriting_keywords', label: '关键词库', icon: 'BookType' },
    ]
  },
  {
    title: '主理人：视频工业',
    items: [
      { id: 'remix_home', label: '混剪首页', icon: 'Home' },
      { id: 'remix_smart', label: '智能混剪', icon: 'Wand2' },
      { id: 'remix_viral', label: '爆款视频复刻', icon: 'Sparkles' },
      { id: 'remix_materials', label: '混剪素材', icon: 'Layers' },
      { id: 'remix_titles', label: '标题模板', icon: 'Type' },
      { id: 'remix_templates', label: '视频模板', icon: 'LayoutTemplate' },
    ]
  },
  {
    title: '主理人：分身直播',
    items: [
      { id: 'avatar_home', label: '分身管理', icon: 'LayoutDashboard' },
      { id: 'avatar_create', label: '克隆声音与形象', icon: 'Video' },
      { id: 'avatar_voice', label: '声音资产', icon: 'Mic' },
      { id: 'avatar_space', label: '数字人空间', icon: 'UserCircle2' },
    ]
  },
  {
    title: '主理人：私域与客户',
    items: [
      { id: 'crm', label: '智能客户管家 (CRM)', icon: 'UsersRound' },
      { id: 'customer_service', label: '全天候 AI 客服', icon: 'Headphones' },
    ]
  },
  {
    title: '大航海：全域裂变',
    items: [
      { id: 'marketing_viral', label: '爆店码', icon: 'ScanLine' },
      { id: 'marketing_nfc', label: '碰一碰', icon: 'SmartphoneNfc' },
      { id: 'marketing_website', label: '智能官网', icon: 'Globe' },
    ]
  },
  {
    title: '导演台与分镜流',
    items: [
      { id: 'director_desk', label: '全局导演台', icon: 'Video' },
    ]
  },
  {
    title: '主理人：包揽设计',
    items: [
      { id: 'design_logo', label: '智能 LOGO', icon: 'Palette' },
      { id: 'design_packaging', label: 'AI 包装设计', icon: 'Package' },
      { id: 'design_ads', label: '广告创意', icon: 'Megaphone' },
      { id: 'design_interior', label: 'AI 家装设计', icon: 'Home' },
      { id: 'design_fashion', label: 'AI 服装设计', icon: 'Shirt' },
    ]
  },
  {
    title: '我的数字资产库',
    items: [
      { id: 'data', label: '业务数据罗盘', icon: 'BarChart2' },
      { id: 'assets', label: '数字资产保险库', icon: 'Folder' },
      { id: 'projects', label: '品牌知识库', icon: 'Briefcase' },
    ]
  },
  {
    title: '虚拟数字员工',
    items: [
      { id: 'team', label: '数字员工概览', icon: 'Building2' },
      { id: 'sub_accounts', label: '分发矩阵账号', icon: 'Users' },
      { id: 'team_write', label: '人机推演协作', icon: 'PenTool' },
      { id: 'team_tasks', label: '异步协同任务', icon: 'ListTodo' },
      { id: 'team_assets', label: '共享给Agent的库', icon: 'Folder' },
      { id: 'team_more', label: '主理人审批流', icon: 'Layers' },
    ]
  },
  {
    title: '云连锁与小店群',
    items: [
      { id: 'store_dashboard', label: '多店全盘看板', icon: 'LayoutDashboard' },
      { id: 'store_list', label: '门店官网与分店', icon: 'Store' },
      { id: 'store_orders', label: '统一订单管理', icon: 'ShoppingBag' },
      { id: 'store_inventory', label: '智能调拨与库存', icon: 'Package' },
      { id: 'store_design', label: '门店网页设计', icon: 'LayoutTemplate' },
      { id: 'store_staff', label: '虚拟导购与巡店', icon: 'UsersRound' },
      { id: 'store_marketing', label: '自动营销策略', icon: 'Megaphone' },
      { id: 'store_distribution', label: '分销代理网络', icon: 'Split' },
      { id: 'store_events', label: '活动与引流', icon: 'Gift' },
      { id: 'store_miniapp', label: '小程序端管理', icon: 'Smartphone' },
    ]
  },
  {
    title: '系统引擎与权限',
    items: [
      { id: 'media', label: '社媒矩阵挂载', icon: 'Share2' },
      { id: 'employee_accounts', label: '兼职员工账号池', icon: 'UserCircle2' },
      { id: 'billing', label: '算力与 Token 监控', icon: 'CreditCard' },
      { id: 'saas_api_keys', label: 'API 密钥与开发者', icon: 'Key' },
      { id: 'settings', label: '全局偏好配置', icon: 'Settings' },
      { id: 'admin', label: '系统管理', icon: 'Shield' },
      { id: 'finance', label: '财务与票据管理', icon: 'Wallet' },
      { id: 'tax', label: '税务筹划与计算', icon: 'Calculator' },
      { id: 'activity_logs', label: '全站操作审计日志', icon: 'Activity' },
    ]
  }
];

interface SidebarProps {
  activeModule: ModuleId;
  onSelect: (id: ModuleId) => void;
  isCollapsed: boolean;
  onOpenCopilot?: () => void;
}

export function Sidebar({ activeModule, onSelect, isCollapsed, onOpenCopilot }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navGroups.forEach(group => {
      initialState[group.title] = true; // Set all groups expanded by default
    });
    return initialState;
  });

  const [sortByUsage, setSortByUsage] = useState(false);
  const [usageData, setUsageData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (sortByUsage) {
      try {
        const stored = localStorage.getItem('module_time_tracker');
        if (stored) setUsageData(JSON.parse(stored));
      } catch {}
    }
  }, [sortByUsage, activeModule]);

  // Ensure active module's group is expanded when it changes
  useEffect(() => {
    let groupTitleToExpand = '';
    for (const group of navGroups) {
      if (group.items.some(item => item.id === activeModule)) {
        groupTitleToExpand = group.title;
        break;
      }
    }
    if (groupTitleToExpand && (!expandedGroups[groupTitleToExpand] || sortByUsage)) {
      setExpandedGroups(prev => ({ ...prev, [groupTitleToExpand]: true }));
    }
  }, [activeModule]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const displayGroups = sortByUsage 
    ? [{
        title: '常用应用智能排序 (Usage)',
        items: navGroups.flatMap(g => g.items).sort((a, b) => (usageData[b.id] || 0) - (usageData[a.id] || 0))
      }]
    : navGroups;

  return (
    <div className={`flex flex-col bg-[var(--bg-panel)] border-r border-[#E5E7EB] shadow-[1px_0_10px_rgba(0,0,0,0.02)] h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[#5.5rem]' : 'w-64'}`}>
      <div className="h-16 flex items-center px-4 border-b border-[#E5E7EB] flex-shrink-0 bg-[var(--bg-panel)]">
        <GoogleLogo className="icon-xl flex-shrink-0" />
        {!isCollapsed && (
           <>
             <div className="ml-3 flex flex-col justify-center">
               <span className="font-extrabold text-[var(--text-main)] text-[16px] tracking-tight hover:text-black transition-colors cursor-pointer leading-none">个人AI助手</span>
               <span className="text-[10px] text-blue-500 font-bold tracking-wider mt-1 flex items-center">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                 多AGENT集群就绪
               </span>
             </div>
             <div className="ml-auto w-10 h-10 relative flex items-center justify-center  tooltip" title="Agent Capacity / Daily Quota: 82%">
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100" />
                 <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray="88" strokeDashoffset="16" className="text-blue-500" strokeLinecap="round" />
               </svg>
               <span className="absolute text-[9px] font-black text-gray-700">82%</span>
             </div>
           </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 hide-scrollbar">
         {!isCollapsed && (
          <div className="px-4 mb-4 space-y-3">
             <div className="bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors group relative shadow-sm">
                <div className="flex items-center space-x-2">
                   <div className="icon-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center rounded-lg font-bold text-[11px] shadow-sm">
                      AI
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[var(--text-main)] leading-tight">多AGENT工作空间</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">超级个体 Pro</span>
                   </div>
                </div>
                <svg className="icon-sm text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
             </div>
             
             <button 
               onClick={onOpenCopilot} 
               className="w-full flex items-center justify-center space-x-2 py-3 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] shadow-[0_1px_3px_rgba(26,115,232,0.3)] transition-all hover:shadow-[0_2px_6px_rgba(26,115,232,0.4)] font-bold text-sm relative group overflow-hidden"
             >
                <Sparkles className="icon-sm fill-white/80 animate-pulse" />
                <span>启动全能分身代理</span>
                <div className="absolute inset-x-0 -bottom-2 h-6 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>
          </div>
        )}
        {isCollapsed && (
           <div className="px-2 mb-4 flex justify-center">
              <button 
                onClick={onOpenCopilot} 
                className="w-12 h-12 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] flex items-center justify-center shadow-[0_1px_3px_rgba(26,115,232,0.3)] transition-all hover:shadow-[0_2px_6px_rgba(26,115,232,0.4)] group relative overflow-hidden"
              >
                  <Sparkles className="icon-md fill-white" />
                  <div className="absolute inset-0 bg-[var(--bg-panel)]/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
              </button>
           </div>
        )}

        {!isCollapsed && (
          <div className="px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)]">
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sort by Usage</span>
             <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={sortByUsage} onChange={() => setSortByUsage(!sortByUsage)} />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
             </label>
          </div>
        )}
        <div className="py-2.5"></div>
        {displayGroups.map((group, index) => {
          const isExpanded = sortByUsage ? true : expandedGroups[group.title];
          const hasActiveItem = group.items.some(item => item.id === activeModule);

          return (
            <div key={index} className="mb-2">
              {!isCollapsed ? (
                <button 
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-colors cursor-pointer group ${
                    isExpanded || hasActiveItem ? 'text-[var(--text-main)]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="flex items-center space-x-2">{group.title}</span>
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : 'rotate-0 text-gray-300 group-hover:text-gray-400'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>
              ) : (
                index > 0 && <div className="mx-4 my-3 border-t border-[var(--border-color)]" />
              )}
              
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                   (isExpanded && !isCollapsed) || isCollapsed ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                }`}
              >
                <ul className="space-y-1 px-3">
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = activeModule === item.id;
                    const isAIFeature = group.title === '主理人：无界创作' || group.title === '主理人：分身直播' || group.title === '主理人：视频工业' || group.title === '虚拟数字员工' || group.title === '我的 Agent 看板';
                    return (
                          <li key={item.id}>
                        <button
                          onClick={() => onSelect(item.id)}
                          className={`w-full flex items-center px-3 py-2.5 rounded-[var(--radius-lg)] transition-all duration-200 group relative overflow-hidden ${
                            isActive
                              ? 'bg-[#e8f0fe] text-[#1a73e8] font-bold'
                              : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-[var(--text-main)]'
                          }`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon 
                            className={`flex-shrink-0 transition-colors ${
                              isCollapsed ? 'icon-lg mx-auto' : 'w-[20px] h-[20px]'
                            } ${isActive ? 'text-[#1a73e8]' : 'text-[var(--text-muted)] group-hover:text-gray-700'}`} 
                            strokeWidth={isActive ? 2 : 1.5} 
                          />
                          {!isCollapsed && (
                             <div className="ml-3 flex-1 flex justify-between items-center pr-1">
                                <span className={`text-[13px] truncate tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                                {isAIFeature && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 group-hover:bg-indigo-400 transition-colors"></div>}
                             </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--border-color)] p-3 bg-[var(--bg-panel)] flex-shrink-0 relative">
        <button 
          className="absolute -top-14 right-4 w-10 h-10 bg-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all group z-50"
          title="Agent Quick-Switch"
          onClick={() => window.dispatchEvent(new CustomEvent('open_quick_switch'))}
        >
          <Zap className="icon-md group-hover:animate-pulse" />
          {!isCollapsed && <span className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md font-bold whitespace-nowrap transition-opacity pointer-events-none">快速切换 Agent (Quick-Switch)</span>}
        </button>
        <button className={`w-full flex items-center p-2 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="icon-xl rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm relative">
            M
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          {!isCollapsed && (
            <div className="ml-3 flex-1 text-left overflow-hidden">
              <p className="text-[13px] font-bold text-[var(--text-main)] truncate">Maheshenga</p>
              <div className="flex items-center text-[11px] text-[var(--color-primary)] font-medium mt-0.5">
                <Sparkles className="w-3 h-3 mr-1" />
                尊享版 Pro
              </div>
            </div>
          )}
          {!isCollapsed && <LogOut className="icon-sm text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-1" />}
        </button>
      </div>
    </div>
  );
}
