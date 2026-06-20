import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './components/Dashboard';
import { FeatureView } from './components/FeatureView';
import { MediaAccountsView } from './components/MediaAccountsView';
import { AssetsView } from './components/AssetsView';
import { TeamView } from './components/TeamView';
import { TasksView } from './components/TasksView';
import { ProjectsView } from './components/ProjectsView';
import { DataAnalyticsView } from './components/DataAnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AdminView } from './components/AdminView';
import { ECommerceView } from './components/ECommerceView';
import { AvatarView } from './components/AvatarView';
import { ImageCreationView } from './components/ImageCreationView';
import { VideoCreationView } from './components/VideoCreationView';
import { RemixView } from './components/RemixView';
import { ChatView } from './components/ChatView';
import { SpeechView } from './components/SpeechView';
import { ImageEditorView } from './components/ImageEditorView';
import { BillingView } from './components/BillingView';
import { ApiKeysView } from './components/ApiKeysView';
import { CopywritingView } from './components/CopywritingView';
import { MarketingView } from './components/MarketingView';
import { DIYEditorView } from './components/DIYEditorView';
import { AgentWorkflowView } from './components/AgentWorkflowView';
import { SubAccountsView } from './components/SubAccountsView';
import { EmployeeAccountsView } from './components/EmployeeAccountsView';
import { TaskCenter } from './components/TaskCenter';
import { InternalMessages } from './components/InternalMessages';
import { AICopilot } from './components/AICopilot';
import { DesignWorkflowView } from './components/DesignWorkflowView';
import { DirectorDeskView } from './components/DirectorDeskView';
import { AICanvasView } from './components/AICanvasView';
import { CrmView } from './components/CrmView';
import { CustomerServiceView } from './components/CustomerServiceView';
import { StoreListView, StoreDesignView, StoreStaffView, StoreMarketingView, StoreDistributionView, StoreEventsView, StoreMiniappView, StoreDashboardView, StoreOrdersView, StoreInventoryView } from './components/StoreView';
import { ActivityLogsView, useActivityLogger } from './components/ActivityLogsView';
import { GlobalSearchOverlay } from './components/GlobalSearchOverlay';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { AgentQuickSwitchOverlay } from './components/AgentQuickSwitchOverlay';
import { GlobalAgentDispatcherModal } from './components/GlobalAgentDispatcherModal';
import { OnboardingTour } from './components/OnboardingTour';
import { LayoutPresets } from './components/LayoutPresets';
import { FloatingQuickActions } from './components/FloatingQuickActions';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { OfflineQueueModal } from './components/OfflineQueueModal';
import { AutoResumeModal } from './components/AutoResumeModal';
import { useAgentLatencyMonitor } from './hooks/useAgentLatencyMonitor';
import { AgentStatusDashboardView } from './components/AgentStatusDashboardView';
import { TaxView } from './components/TaxView';
import { FinanceView } from './components/FinanceView';
import { QuickNotesPanel } from './components/QuickNotesPanel';
import { ToastContainer, toast } from './components/Toast';
import { QuickPromptFAB } from './components/QuickPromptFAB';
import { TopProgressBar } from './components/TopProgressBar';
import { allModuleIds, ModuleId } from './types';
import {
  canViewProductModule,
  getFirstAccessibleProductModule,
  getProductBreadcrumb,
  getProductModuleTitle,
} from './product/registry';
import { keepModuleIdListIfEqual } from './product/moduleListState';
import { getSetting, saveSetting } from './lib/data/settingsRepository';
import { loadModuleUsage } from './lib/data/usageRepository';
import { useSaasSession } from './saas/SaasAuthContext';
import { hydrateGenerationJobs } from './lib/data/generationJobRepository';
import { hydrateAuditLogs } from './lib/data/auditLogRepository';

import { useModuleTimeTracker } from './hooks/useModuleTimeTracker';
import { usePreloadPinnedModules } from './hooks/usePreloadPinnedModules';
import { ChevronRight, Pin, X, Network } from 'lucide-react';
import { PerformanceMonitor } from './components/PerformanceMonitor';

import { useDeveloperMode } from './hooks/useDeveloperMode';
import { useLayoutAuditor } from './hooks/useLayoutAuditor';

// Map generic features to their configuration
const featureConfig: Record<string, { title: string, type: any, models: string[] }> = {
  video: { title: '视频创作', type: 'video', models: ['Sora v1', 'Runway Gen-3', 'Pika Labs'] },
  image: { title: '图片创作', type: 'image', models: ['Imagen 3', 'Midjourney v6', 'DALL-E 3'] },
  chat: { title: 'AI 聊天', type: 'text', models: ['Gemini 3.1 Pro', 'Gemini 3.1 Flash', 'GPT-4o'] },
  speech: { title: '语音合成', type: 'audio', models: ['ElevenLabs', 'Google Cloud TTS', 'Azure Voice'] },
};

const DEFAULT_PINNED_MODULES: ModuleId[] = ['dashboard'];
const validModuleIds = new Set<ModuleId>(allModuleIds);

interface WorkspaceLayoutSetting {
  activeModule?: ModuleId;
  isSplitScreen?: boolean;
  secondaryModule?: ModuleId | null;
  activePane?: 'primary' | 'secondary';
  splitRatio?: number;
  pinnedModules?: unknown;
}

function normalizePinnedModules(value: unknown): ModuleId[] {
  if (!Array.isArray(value)) return DEFAULT_PINNED_MODULES;

  const modules = value.filter((id): id is ModuleId => (
    typeof id === 'string' && validModuleIds.has(id as ModuleId)
  ));
  const uniqueModules = Array.from(new Set(modules));
  return uniqueModules.length > 0 ? uniqueModules : DEFAULT_PINNED_MODULES;
}

function isWorkspaceLayoutSetting(value: unknown): value is WorkspaceLayoutSetting {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ModuleSkeleton() {
  return (
    <div className="layout-section layout-container animate-pulse space-y-[var(--spacing-xl)]">
      <div className="flex items-center space-x-[var(--spacing-md)] mb-[var(--spacing-xl)]">
        <div className="w-16 h-16 bg-[var(--border-color)] rounded-[var(--radius-xl)]"></div>
        <div className="space-y-3">
          <div className="w-56 h-6 bg-[var(--border-color)] rounded-[var(--radius-md)]"></div>
          <div className="w-96 h-4 bg-[var(--border-color)] rounded-[var(--radius-md)]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="col-span-2 space-y-[var(--spacing-lg)]">
          <div className="h-48 bg-[var(--border-color)] rounded-[var(--radius-xl)] w-full"></div>
          <div className="h-64 bg-[var(--border-color)] rounded-[var(--radius-xl)] w-full"></div>
        </div>
        <div className="space-y-[var(--spacing-lg)]">
          <div className="h-40 bg-[var(--border-color)] rounded-[var(--radius-xl)] w-full"></div>
          <div className="h-40 bg-[var(--border-color)] rounded-[var(--radius-xl)] w-full"></div>
          <div className="h-32 bg-[var(--border-color)] rounded-[var(--radius-xl)] w-full"></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const session = useSaasSession();
  const workspaceRole = session.membership.role;
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false);
  const [isOfflineQueueOpen, setIsOfflineQueueOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>(() => getFirstAccessibleProductModule(workspaceRole));
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const { isDevMode } = useDeveloperMode();
  useLayoutAuditor(isDevMode);
  const firstAccessibleModule = useMemo(
    () => getFirstAccessibleProductModule(workspaceRole),
    [workspaceRole],
  );
  const canAccessModule = useCallback(
    (moduleId: ModuleId) => canViewProductModule(moduleId, workspaceRole),
    [workspaceRole],
  );

  useEffect(() => {
    if (!sessionStorage.getItem('session_start_time')) {
      sessionStorage.setItem('session_start_time', Date.now().toString());
    }
  }, []);

  // Workspace-scoped API hydration for domains without a dedicated central hook.
  // Each hydrate dispatches the repo's existing update event so listeners refresh.
  useEffect(() => {
    const hydrateContext = { workspaceId: session.workspace.id, userId: session.user.id };
    void hydrateGenerationJobs(hydrateContext);
    void hydrateAuditLogs({ workspaceId: session.workspace.id });
  }, [session.workspace.id, session.user.id]);

  useEffect(() => {
    const modulesStr = sessionStorage.getItem('session_modules_used');
    const modules = modulesStr ? JSON.parse(modulesStr) : [];
    if (!modules.includes(activeModule)) {
      modules.push(activeModule);
      sessionStorage.setItem('session_modules_used', JSON.stringify(modules));
    }
  }, [activeModule]);

  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [secondaryModule, setSecondaryModule] = useState<ModuleId | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const isDraggingRef = useRef<boolean>(false);
  const [activePane, setActivePane] = useState<'primary' | 'secondary'>('primary');

  useEffect(() => {
    if (!canAccessModule(activeModule)) {
      setActiveModule(firstAccessibleModule);
    }
    if (secondaryModule && !canAccessModule(secondaryModule)) {
      setSecondaryModule(null);
      setActivePane('primary');
    }
  }, [activeModule, canAccessModule, firstAccessibleModule, secondaryModule]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSetting('clean_exit', true, settingsContext);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settingsContext]);

  const [pinnedModules, setPinnedModules] = useState<ModuleId[]>(DEFAULT_PINNED_MODULES);
  const normalizeAccessiblePinnedModules = useCallback((value: unknown): ModuleId[] => {
    const accessiblePins = normalizePinnedModules(value).filter(canAccessModule);
    return accessiblePins.length > 0 ? accessiblePins : [firstAccessibleModule];
  }, [canAccessModule, firstAccessibleModule]);
  const loadPinnedModules = useCallback(
    () => normalizeAccessiblePinnedModules(getSetting('pinned_modules', DEFAULT_PINNED_MODULES, settingsContext)),
    [normalizeAccessiblePinnedModules, settingsContext],
  );
  const persistPinnedModules = useCallback((nextPins: ModuleId[]) => {
    const normalized = normalizeAccessiblePinnedModules(nextPins);
    saveSetting('pinned_modules', normalized, settingsContext);
    return normalized;
  }, [normalizeAccessiblePinnedModules, settingsContext]);
  const applyWorkspaceLayout = useCallback((layout: WorkspaceLayoutSetting) => {
    if (layout.activeModule && canAccessModule(layout.activeModule)) setActiveModule(layout.activeModule);
    if (layout.isSplitScreen !== undefined) setIsSplitScreen(layout.isSplitScreen);
    if (layout.secondaryModule !== undefined) {
      setSecondaryModule(layout.secondaryModule && canAccessModule(layout.secondaryModule) ? layout.secondaryModule : null);
    }
    if (layout.activePane) setActivePane(layout.activePane);
    if (layout.splitRatio) setSplitRatio(layout.splitRatio);
    if (layout.pinnedModules) setPinnedModules(persistPinnedModules(normalizeAccessiblePinnedModules(layout.pinnedModules)));
  }, [canAccessModule, normalizeAccessiblePinnedModules, persistPinnedModules]);

  useEffect(() => {
    setPinnedModules(prev => keepModuleIdListIfEqual(prev, loadPinnedModules()));

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== settingsContext.workspaceId) return;
      if (detail?.userId && detail.userId !== settingsContext.userId) return;
      setPinnedModules(prev => keepModuleIdListIfEqual(prev, loadPinnedModules()));
    };

    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [loadPinnedModules, settingsContext]);

  useEffect(() => {
    saveSetting('session_last_state', {
      activeModule, isSplitScreen, secondaryModule, splitRatio, pinnedModules
    }, settingsContext);
    // Any change marks it dirty unless clean_exit is explicitly set on exit
    saveSetting('clean_exit', false, settingsContext);
  }, [activeModule, isSplitScreen, secondaryModule, splitRatio, pinnedModules, settingsContext]);

  useModuleTimeTracker(activeModule);
  usePreloadPinnedModules(pinnedModules);
  useAgentLatencyMonitor();

  useEffect(() => {
    const handleRestorePreset = (e: CustomEvent) => {
       const preset = e.detail;
       if (!preset) {
          setPinnedModules(loadPinnedModules());
          return;
       }
       if (preset.layout) {
          applyWorkspaceLayout(preset.layout);
       }
       if (preset.pinned) {
          setPinnedModules(persistPinnedModules(preset.pinned));
       }
    };
    window.addEventListener('app:restore-preset', handleRestorePreset as EventListener);
    return () => window.removeEventListener('app:restore-preset', handleRestorePreset as EventListener);
  }, [applyWorkspaceLayout, loadPinnedModules, persistPinnedModules]);

  const { logActivity } = useActivityLogger();
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);

  // Load from auto-save on mount
  useEffect(() => {
    try {
      const autoSave = getSetting('workspace_autosave', null, settingsContext);
      if (isWorkspaceLayoutSetting(autoSave)) {
        applyWorkspaceLayout(autoSave);
      }
    } catch {}
  }, [applyWorkspaceLayout, settingsContext]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const handleThemeLog = (e: any) => {
      logActivity('theme_change', `切换主题为 ${e.detail}`);
      window.dispatchEvent(new Event('activity_logged'));
    };
    window.addEventListener('activity_log_theme', handleThemeLog);

    const interval = setInterval(() => {
      const workspaceState = {
        activeModule,
        isSplitScreen,
        secondaryModule,
        activePane,
        pinnedModules
      };
      try {
        saveSetting('workspace_autosave', workspaceState, settingsContext);
      } catch (e) {
        toast('云端同步失败 / Cloud Sync Error', 'error', true, [
           { label: '保留本地 (Keep Local)', onClick: () => {
              saveSetting('workspace_autosave', workspaceState, settingsContext);
              toast('已在本地保留您的工作区状态。', 'success');
           }},
           { label: '恢复云端 (Restore Cloud)', onClick: () => {
              const autoSave = getSetting('workspace_autosave', null, settingsContext);
              if (isWorkspaceLayoutSetting(autoSave)) {
                 applyWorkspaceLayout(autoSave);
                 toast('已从最近一期云端恢复。', 'success');
              }
           }}
        ]);
      }
    }, 30000);
    return () => {
       clearInterval(interval);
       window.removeEventListener('activity_log_theme', handleThemeLog);
    };
  }, [activeModule, applyWorkspaceLayout, isSplitScreen, secondaryModule, activePane, pinnedModules, settingsContext]);

  // Sort pinned modules by workspace usage frequency.
  useEffect(() => {
    const sortPinnedModules = () => {
      try {
        const tracker = loadModuleUsage(settingsContext);
        setPinnedModules(prev => {
          const sorted = [...prev].sort((a, b) => {
            const timeA = tracker[a] || 0;
            const timeB = tracker[b] || 0;
            return timeB - timeA;
          });
          if (JSON.stringify(prev) !== JSON.stringify(sorted)) {
            return persistPinnedModules(sorted);
          }
          return prev;
        });
      } catch (e) {}
    };

    const intervalId = setInterval(sortPinnedModules, 30000);
    sortPinnedModules();
    return () => clearInterval(intervalId);
  }, [persistPinnedModules, settingsContext]);

  const handleExportWorkspace = () => {
    const workspaceState = {
      activeModule,
      isSplitScreen,
      secondaryModule,
      activePane,
      pinnedModules
    };
    logActivity('export_workspace', 'Exported workspace state', 'Downloaded workspace_state.json', {
      targetType: 'workspace',
      targetId: 'workspace_state',
      metadata: { activeModule, isSplitScreen, secondaryModule, pinnedModules },
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspaceState, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "workspace_state.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Open Copilot
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCopilotOpen(prev => !prev);
      }
      // Cmd+T or Ctrl+T -> Quick Task
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsTaskCenterOpen(prev => !prev);
      }
      // Cmd+/ or Ctrl+/ -> Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
      // Cmd+P or Ctrl+P -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+Right -> Split Right / Focus Right
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isSplitScreen) {
          setIsSplitScreen(true);
          if (!secondaryModule) setSecondaryModule('dashboard');
        }
        setActivePane('secondary');
      }
      // Ctrl+Left -> Focus Left
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        setActivePane('primary');
      }
      // Ctrl+\ -> Toggle Split Screen
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSplitScreen(prev => {
          if (!prev && !secondaryModule) setSecondaryModule('dashboard');
          return !prev;
        });
      }
      // Ctrl+Shift+F -> Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
      // ? -> Keyboard Shortcuts Help
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModuleNavigate = (moduleId: ModuleId) => {
    if (!canAccessModule(moduleId)) {
      toast('当前角色没有访问该模块的权限，请联系工作区管理员。', 'error');
      return;
    }

    if (activePane === 'primary') {
      if (moduleId === activeModule) return;
      setIsLoadingModule(true);
      setTimeout(() => {
        logActivity('module_switch', `切换到 ${moduleId}`, '主编辑区导航', {
          moduleId,
          targetType: 'module',
          targetId: moduleId,
        });
        window.dispatchEvent(new Event('activity_logged'));
        setActiveModule(moduleId);
        setIsLoadingModule(false);
      }, 400);
    } else {
      if (moduleId === secondaryModule) return;
      logActivity('module_switch', `切换到 ${moduleId}`, '分屏辅助区导航', {
        moduleId,
        targetType: 'module',
        targetId: moduleId,
      });
      window.dispatchEvent(new Event('activity_logged'));
      setSecondaryModule(moduleId);
    }
  };

  const getBreadcrumbs = () => {
    const targetModule = activePane === 'primary' ? activeModule : (secondaryModule || activeModule);
    return getProductBreadcrumb(targetModule);
  };

  const getModuleTitle = () => {
    const targetModule = activePane === 'primary' ? activeModule : (secondaryModule || activeModule);
    return getProductModuleTitle(targetModule);
  };

  const renderContent = (moduleId: ModuleId) => {
    if (!canAccessModule(moduleId)) {
      return <DashboardView onNavigate={handleModuleNavigate} />;
    }

    switch (moduleId) {
      case 'dashboard':
        return <DashboardView onNavigate={handleModuleNavigate} />;
      case 'media':
        return <MediaAccountsView />;
      case 'assets':
        return <AssetsView />;
      case 'team':
      case 'team_write':
      case 'team_tasks':
      case 'team_assets':
      case 'team_more':
        return <TeamView moduleId={moduleId} />;
      case 'tasks':
        return <TasksView />;
      case 'workflow':
        return <AgentWorkflowView />;
      case 'sub_accounts':
        return <SubAccountsView />;
      case 'employee_accounts':
        return <EmployeeAccountsView />;
      case 'projects':
        return <ProjectsView />;
      case 'data':
        return <DataAnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'video':
        return <VideoCreationView />;
      case 'image':
        return <ImageCreationView />;
      case 'chat':
        return <ChatView />;
      case 'speech':
        return <SpeechView />;
      case 'admin':
        return <AdminView onNavigate={setActiveModule} />;
      case 'e_main_image':
      case 'e_video':
      case 'e_detail_page':
      case 'e_poster':
      case 'e_clone':
        return <ECommerceView title={getModuleTitle()} moduleId={moduleId} />;
      case 'ai_image_edit':
        return <ImageEditorView />;
      case 'avatar_home':
      case 'avatar_create':
      case 'avatar_voice':
      case 'avatar_space':
        return <AvatarView moduleId={moduleId} />;
      case 'remix_home':
      case 'remix_smart':
      case 'remix_materials':
      case 'remix_titles':
      case 'remix_templates':
      case 'remix_viral':
        return <RemixView moduleId={moduleId} />;
      case 'copywriting_create':
      case 'copywriting_tools':
      case 'copywriting_keywords':
        return <CopywritingView moduleId={moduleId} />;
      case 'marketing_viral':
      case 'marketing_nfc':
      case 'marketing_website':
        return <MarketingView moduleId={moduleId} onNavigate={setActiveModule} />;
      case 'marketing_diy':
        return <DIYEditorView />;
      case 'director_desk':
        return <DirectorDeskView />;
      case 'design_logo':
        return <DesignWorkflowView moduleType="logo" />;
      case 'design_packaging':
        return <DesignWorkflowView moduleType="packaging" />;
      case 'design_ads':
        return <DesignWorkflowView moduleType="ads" />;
      case 'design_interior':
        return <DesignWorkflowView moduleType="interior" />;
      case 'design_fashion':
        return <DesignWorkflowView moduleType="fashion" />;
      case 'ai_canvas':
        return <AICanvasView />;
      case 'crm':
        return <CrmView />;
      case 'customer_service':
        return <CustomerServiceView />;
      case 'billing':
        return <BillingView />;
      case 'finance':
        return <FinanceView />;
      case 'tax':
        return <TaxView />;
      case 'saas_api_keys':
        return <ApiKeysView />;
      case 'store_dashboard':
        return <StoreDashboardView onNavigate={(m) => handleModuleNavigate(m as any)} />;
      case 'store_list':
        return <StoreListView />;
      case 'store_orders':
        return <StoreOrdersView />;
      case 'store_inventory':
        return <StoreInventoryView />;
      case 'store_design':
        return <StoreDesignView />;
      case 'store_staff':
        return <StoreStaffView />;
      case 'store_marketing':
        return <StoreMarketingView />;
      case 'store_distribution':
        return <StoreDistributionView />;
      case 'store_events':
        return <StoreEventsView />;
      case 'store_miniapp':
        return <StoreMiniappView />;
      case 'activity_logs':
        return <ActivityLogsView />;
      case 'agent_status':
        return <AgentStatusDashboardView />;
      default:
        return (
          <div className="p-[var(--spacing-xl)] flex items-center justify-center h-[calc(100vh-4rem)] bg-[var(--bg-app)] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm rounded-[var(--radius-xl)] p-12 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{getModuleTitle()}</h2>
              <p className="text-[var(--text-muted)]">该管理模块正在开发中，具体的数据视图和操作功能即将上线。</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans selection:bg-[var(--color-primary)] selection:text-white print:h-auto print:overflow-visible">
      {!isFocusMode && (
        <div className="print:hidden h-full flex-shrink-0">
          <Sidebar
            activeModule={activeModule}
            onSelect={handleModuleNavigate}
            isCollapsed={isSidebarCollapsed}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <Topbar
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={getModuleTitle()}
            onOpenTaskCenter={() => setIsTaskCenterOpen(true)}
            onOpenMessages={() => setIsMessagesOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
            onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
            onOpenQuickNotes={() => setIsQuickNotesOpen(true)}
            onOpenSessionSummary={() => setIsSessionSummaryOpen(true)}
            onOpenOfflineQueue={() => setIsOfflineQueueOpen(true)}
          />
        </div>

        {/* Dynamic Breadcrumbs & Pinned Modules */}
        <div className="bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-6 py-2 flex items-center shadow-sm z-0 print:hidden">
          <div className="flex items-center text-[12px] font-medium text-gray-400">
            <span className="hover:text-gray-700 cursor-pointer transition-colors" onClick={() => handleModuleNavigate('dashboard')}>Home</span>
            <ChevronRight className="w-3.5 h-3.5 mx-1" />
            <span className="hover:text-gray-700 cursor-pointer transition-colors" onClick={() => {
                const bc = getBreadcrumbs();
                if (bc.firstItemId) {
                    handleModuleNavigate(bc.firstItemId as ModuleId);
                }
            }}>{getBreadcrumbs().groupTitle}</span>
            <ChevronRight className="w-3.5 h-3.5 mx-1" />
            <span className="text-[var(--text-main)] font-bold">{getBreadcrumbs().itemLabel}</span>
            <button
              onClick={() => setIsDispatcherOpen(true)}
              className="ml-4 flex items-center px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-colors shadow-sm"
              title="Global Agent Dispatcher"
            >
              <Network className="w-3.5 h-3.5 mr-1" />
              Agent Dispatcher
            </button>
            <LayoutPresets
              currentLayout={{ activeModule, isSplitScreen, secondaryModule, splitRatio, pinnedModules }}
              onLoadLayout={applyWorkspaceLayout}
            />
            <button
              onClick={() => {
                const target = activePane === 'primary' ? activeModule : (secondaryModule || activeModule);
                const isPinned = pinnedModules.includes(target);
                logActivity(isPinned ? 'unpin_module' : 'pin_module', `${isPinned ? '取消' : ''}固定模块 ${target}`, undefined, {
                  moduleId: target,
                  targetType: 'module',
                  targetId: target,
                });
                window.dispatchEvent(new Event('activity_logged'));
                setPinnedModules(prev => {
                  const newPins = isPinned ? prev.filter(p => p !== target) : [...prev, target];
                  return persistPinnedModules(newPins);
                });
                toast(isPinned ? 'Module Unpinned' : 'Module Pinned', 'success');
              }}
              className={`ml-2 p-1 rounded-md transition-colors ${pinnedModules.includes(activePane === 'primary' ? activeModule : (secondaryModule || activeModule)) ? 'text-[var(--color-primary)] bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Pin/Unpin this module"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="ml-6 flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar border-l border-[var(--border-color)] pl-4">
             {pinnedModules.map((mId, index) => {
                const mLabel = getProductModuleTitle(mId);
                return (
                  <div
                    key={mId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString());
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      const toIndex = index;
                      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
                        setPinnedModules(prev => {
                          const newPins = [...prev];
                          const [removed] = newPins.splice(fromIndex, 1);
                          newPins.splice(toIndex, 0, removed);
                          return persistPinnedModules(newPins);
                        });
                      }
                    }}
                    className={`group flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${mId === activeModule ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-[var(--border-color)] hover:border-gray-300 cursor-pointer'}`}>
                    <span onClick={() => handleModuleNavigate(mId)}>{mLabel}</span>
                    {mId !== 'dashboard' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedModules(prev => {
                            const newPins = prev.filter(p => p !== mId);
                            return persistPinnedModules(newPins);
                          });
                        }}
                        className="ml-2  text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
             })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
               onClick={() => {
                 logActivity('split_screen', `${isSplitScreen ? '关闭' : '开启'}分屏模式`, undefined, {
                   targetType: 'workspace',
                   targetId: 'layout',
                   metadata: { fromSplitScreen: isSplitScreen },
                 });
                 window.dispatchEvent(new Event('activity_logged'));
                 setIsSplitScreen(prev => {
                   if (!prev && !secondaryModule) setSecondaryModule('dashboard');
                   return !prev;
                 });
               }}
               className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${isSplitScreen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-400 border-[var(--border-color)] hover:text-gray-600'}`}
               title="Toggle Split Screen (Ctrl+\)"
            >
               {isSplitScreen ? 'Split View Active' : 'Toggle Split View'}
            </button>
          </div>
        </div>

        <main className={`flex-1 overflow-hidden relative z-0 flex ${isSplitScreen ? 'bg-gray-100 p-2 gap-2 flex-row' : ''}`} onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            const container = e.currentTarget;
            const rect = container.getBoundingClientRect();
            const maxRatio = 80; const minRatio = 20;
            let newRatio = ((e.clientX - rect.left) / rect.width) * 100;
            newRatio = Math.max(minRatio, Math.min(newRatio, maxRatio));
            setSplitRatio(newRatio);
          }} onMouseUp={() => isDraggingRef.current = false} onMouseLeave={() => isDraggingRef.current = false} >
          {/* Primary Pane */}
          <motion.div
            layout
            className={`flex flex-col min-w-0 overflow-hidden relative ${isSplitScreen ? 'bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-none ' + (activePane === 'primary' ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100') : 'flex-1'}`}
            style={isSplitScreen ? { width: `${splitRatio}%`, flex: 'none' } : undefined}
            onClickCapture={() => isSplitScreen && setActivePane('primary')}
          >
            <AnimatePresence mode="wait">
              {isLoadingModule ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto"
                >
                  <ModuleSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key={activeModule}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: { opacity: 0, scale: 0.96 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      transition: {
                        duration: 0.35,
                        ease: [0.22, 1, 0.36, 1],
                        when: "beforeChildren",
                        staggerChildren: 0.05
                      }
                    },
                    exit: {
                      opacity: 0,
                      scale: 1.02,
                      transition: { duration: 0.25 }
                    }
                  }}
                  className="h-full overflow-y-auto"
                >
                  {renderContent(activeModule)}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {isSplitScreen && secondaryModule && (
            <div
              className="cursor-col-resize hover:bg-blue-200 transition-colors rounded-full shrink-0 flex items-center justify-center flex-col gap-1 w-2 my-10"
              onMouseDown={() => isDraggingRef.current = true}
            >
              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
            </div>
          )}

          {/* Secondary Pane */}
          <AnimatePresence>
            {isSplitScreen && secondaryModule && (
              <motion.div
                layout // handles flexible sizing automatically
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`overflow-hidden relative bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-none flex flex-col min-w-0 ${activePane === 'secondary' ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
                style={{ width: `calc(${100 - splitRatio}% - 1rem)`, flex: 'none' }}
                onClickCapture={() => setActivePane('secondary')}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={secondaryModule}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="h-full overflow-y-auto"
                  >
                    {renderContent(secondaryModule)}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <TaskCenter isOpen={isTaskCenterOpen} onClose={() => setIsTaskCenterOpen(false)} />
      <InternalMessages isOpen={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} />
      <AICopilot isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />

      <GlobalSearchOverlay
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigate={handleModuleNavigate}
      />

      <PerformanceMonitor />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleModuleNavigate}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        activeModule={activeModule}
        onExportWorkspace={handleExportWorkspace}
      />

      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
        activeModule={activeModule}
      />

      <ToastContainer />
      <QuickPromptFAB />
      <QuickNotesPanel isOpen={isQuickNotesOpen} onClose={() => setIsQuickNotesOpen(false)} />
      <AgentQuickSwitchOverlay />
      <GlobalAgentDispatcherModal isOpen={isDispatcherOpen} onClose={() => setIsDispatcherOpen(false)} />
      <OnboardingTour />
      <SessionSummaryModal isOpen={isSessionSummaryOpen} onClose={() => setIsSessionSummaryOpen(false)} />
      <OfflineQueueModal isOpen={isOfflineQueueOpen} onClose={() => setIsOfflineQueueOpen(false)} />
      <AutoResumeModal onLoadLayout={applyWorkspaceLayout} />
      <FloatingQuickActions activeModule={activeModule} />
    </div>
  );
}
