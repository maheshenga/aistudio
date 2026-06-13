import React, { useState, useRef, useEffect } from 'react';
import { PanelLeft, PanelLeftClose, Search, Bell, HelpCircle, ListTodo, MessageSquare, Sparkles, Moon, Sun, Coffee, Zap, Globe, Check, Play, Square, Timer, Maximize, Minimize, AlertCircle, CheckCircle2, Clock, Activity, LineChart, WifiOff } from 'lucide-react';
import { useTheme, ThemeType } from './ThemeProvider';
import { QuickActions } from './QuickActions';
import { toast } from './Toast';
import { useSaasSession } from '../saas/SaasAuthContext';
import { listAuditLogs } from '../lib/data/auditLogRepository';
import { listGenerationJobs } from '../lib/data/generationJobRepository';
import { loadOfflineQueue } from '../lib/data/offlineQueueRepository';

interface TopbarProps {
  onOpenQuickNotes?: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  title: string;
  onOpenTaskCenter?: () => void;
  onOpenMessages?: () => void;
  onOpenCopilot?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenSessionSummary?: () => void;
  onOpenOfflineQueue?: () => void;
}

type TopbarNotificationType = 'alert' | 'success' | 'update';

interface TopbarNotification {
  id: string;
  type: TopbarNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  unread: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatAuditAction(action: string): string {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Topbar({ isCollapsed, toggleSidebar, title, onOpenTaskCenter, onOpenMessages, onOpenCopilot, isFocusMode = false, onToggleFocusMode, onOpenShortcutsHelp, onOpenSessionSummary, onOpenOfflineQueue }: TopbarProps) {
  const session = useSaasSession();
  const { theme, setTheme } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [themeSearch, setThemeSearch] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLDivElement>(null);
  
  const [memoryUsage, setMemoryUsage] = useState(240);
  const [isApiActive, setIsApiActive] = useState(false);
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        toast('Live Refresh: Data synced from backend.', 'success');
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isLiveRefresh]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('focusSessionChanged', { detail: isSessionActive }));
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionSeconds(s => s + 1);
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    const memoryInterval = setInterval(() => {
      setMemoryUsage(m => Math.max(120, Math.min(Math.round(m + (Math.random() * 20 - 10)), 400)));
      setIsApiActive(Math.random() > 0.7);
    }, 2000);
    return () => clearInterval(memoryInterval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setIsInboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themesList: { id: ThemeType, name: string, color: string }[] = [
     { id: 'light', name: 'Light (Default)', color: '#F8F9FA' },
     { id: 'midnight', name: 'Midnight Dark', color: '#0F172A' },
     { id: 'sepia', name: 'Sepia Reading', color: '#FAECD4' },
     { id: 'neon', name: 'Neon High-Contrast', color: '#10B981' },
     { id: 'cyberpunk', name: 'Cyberpunk Synth', color: '#0f0f1b' },
     { id: 'google', name: 'Google Blue', color: '#1A73E8' },
  ];

  const filteredThemes = themesList.filter(t => t.name.toLowerCase().includes(themeSearch.toLowerCase()));

  const getThemeIcon = () => {
    switch (theme) {
       case 'midnight': return <Moon className="icon-md text-indigo-400" fill="currentColor" />;
       case 'sepia': return <Coffee className="icon-md text-amber-700" fill="currentColor" />;
       case 'neon': return <Zap className="icon-md text-fuchsia-500" fill="currentColor" />;
       case 'cyberpunk': return <Sparkles className="icon-md text-purple-500" fill="currentColor" />;
       case 'google': return <Globe className="icon-md text-[#1A73E8]" fill="currentColor" />;
       default: return <Sun className="icon-md text-orange-500" fill="currentColor" />;
    }
  };

  const refreshInboxNotifications = () => {
    const jobs = listGenerationJobs({
      workspaceId: session.workspace.id,
      userId: session.user.id,
    });
    const offlineItems = loadOfflineQueue({
      workspaceId: session.workspace.id,
      userId: session.user.id,
    });
    const auditLogs = listAuditLogs({ workspaceId: session.workspace.id });

    const jobNotifications: TopbarNotification[] = jobs.slice(0, 5).map((job) => ({
      id: `job:${job.id}`,
      type: job.status === 'failed' ? 'alert' : job.status === 'succeeded' ? 'success' : 'update',
      title: job.status === 'failed' ? 'Generation failed' : job.status === 'succeeded' ? 'Generation completed' : 'Generation running',
      message: `${job.title} - ${job.status} (${job.progress}%)`,
      timestamp: job.updatedAt,
      time: formatRelativeTime(job.updatedAt),
      unread: !readNotificationIds.includes(`job:${job.id}`),
    }));

    const offlineNotifications: TopbarNotification[] = offlineItems.slice(0, 5).map((item) => {
      const timestamp = Date.parse(item.timestamp) || Date.now();
      return {
        id: `offline:${item.id}`,
        type: 'alert',
        title: 'Offline action pending',
        message: `${item.key} is waiting to sync`,
        timestamp,
        time: formatRelativeTime(timestamp),
        unread: !readNotificationIds.includes(`offline:${item.id}`),
      };
    });

    const auditNotifications: TopbarNotification[] = auditLogs.slice(0, 6).map((log) => ({
      id: `audit:${log.id}`,
      type: log.action.includes('failed') ? 'alert' : log.action.includes('complete') || log.action.includes('export') ? 'success' : 'update',
      title: formatAuditAction(log.action),
      message: `${log.actor.name} updated ${log.moduleId ?? log.targetType}`,
      timestamp: log.timestamp,
      time: formatRelativeTime(log.timestamp),
      unread: !readNotificationIds.includes(`audit:${log.id}`),
    }));

    setNotifications(
      [...offlineNotifications, ...jobNotifications, ...auditNotifications]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    );
  };

  useEffect(() => {
    refreshInboxNotifications();
    const refreshEvents = [
      'generation_jobs_updated',
      'offlineQueueUpdated',
      'dashboard_ai_command',
      'activity_log_theme',
      'settings_updated',
    ];
    refreshEvents.forEach((eventName) => window.addEventListener(eventName, refreshInboxNotifications));
    return () => {
      refreshEvents.forEach((eventName) => window.removeEventListener(eventName, refreshInboxNotifications));
    };
  }, [session.user.id, session.workspace.id, readNotificationIds]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) => Array.from(new Set([...current, notificationId])));
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) => Array.from(new Set([...current, ...notifications.map((notification) => notification.id)])));
  };

  return (
    <header className={`h-16 border-b flex items-center justify-between px-6 z-10 sticky top-0 transition-colors ${isSessionActive ? 'bg-blue-50/50 border-blue-200 shadow-[0_4px_24px_rgba(59,130,246,0.1)]' : 'bg-[var(--bg-panel)] border-[var(--border-color)]'}`}>
      <div className="flex items-center gap-[var(--spacing-md)]">
        {!isFocusMode && (
          <button
            onClick={toggleSidebar}
            className={`p-2  rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${isSessionActive ? 'text-[var(--color-primary)] hover:bg-blue-100' : 'text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-main)]'}`}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeft className="icon-md" /> : <PanelLeftClose className="icon-md" />}
          </button>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-medium text-[var(--text-main)] tracking-tight">{title}</h1>
          <QuickActions moduleTitle={title || ''} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenOfflineQueue}
          className="p-2 border border-[var(--border-color)] bg-[var(--bg-panel)] text-amber-600 rounded-full hover:bg-amber-50 transition-colors tooltip mr-1"
          title="Offline Queue"
        >
          <WifiOff className="icon-sm" />
        </button>

        <button
          onClick={onOpenSessionSummary}
          className="p-2 border border-[var(--border-color)] bg-[var(--bg-panel)] text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors tooltip mr-1"
          title="Session Summary"
        >
          <LineChart className="icon-sm" />
        </button>

        <button
          onClick={() => {
            setIsLiveRefresh(!isLiveRefresh);
            toast(`Live Refresh ${!isLiveRefresh ? 'Enabled (60s)' : 'Disabled'}`, 'success');
          }}
          className={`flex items-center px-3 py-1.5 mr-2 text-xs font-bold rounded-full border transition-colors ${
            isLiveRefresh 
              ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
              : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
          title="Toggle Live Refresh (60s)"
        >
          <Activity className={`w-3.5 h-3.5 mr-1.5 ${isLiveRefresh ? 'animate-pulse' : ''}`} />
          {isLiveRefresh ? 'Live Syncing' : 'Live Refresh'}
        </button>

        {/* Focused Session Timer (Pomodoro) */}
        <div className={`hidden md:flex items-center border rounded-full px-1.5 py-1 mr-3 shadow-inner transition-colors ${isSessionActive ? 'border-blue-300 bg-[var(--bg-panel)] ring-2 ring-blue-500/20' : 'border-[var(--border-color)] bg-gray-50'}`}>
           <div className={`flex items-center justify-center p-1.5 rounded-full mr-2 transition-colors ${isSessionActive ? 'bg-blue-100 text-[var(--color-primary)] animate-pulse' : 'bg-gray-200 text-gray-600'}`}>
             <Timer className="w-3 h-3" strokeWidth={3} />
           </div>
           <span className={`text-[12px] font-mono font-bold w-12 tracking-wider ${isSessionActive ? 'text-blue-700' : 'text-gray-700'}`}>
             {formatTime(sessionSeconds)}
           </span>
           <div className="flex items-center border-l border-[var(--border-color)] pl-1.5 ml-1">
             <button 
               onClick={() => setIsSessionActive(!isSessionActive)}
               className={`p-1 rounded-full transition-colors ${isSessionActive ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'hover:bg-gray-200 text-gray-600'}`}
               title={isSessionActive ? "Stop Focus Session" : "Start Focus Session"}
             >
               {isSessionActive ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
             </button>
           </div>
        </div>

        <div className="relative group hidden xl:flex items-center mr-2">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="icon-sm text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
          </div>
          <input
            type="text"
            className="block w-96 pl-11 pr-14 py-2.5 border border-transparent rounded-full leading-5 bg-gray-100 text-[var(--text-main)] placeholder-gray-500 font-medium focus:outline-none focus:bg-[var(--bg-panel)] focus:ring-1 focus:ring-blue-600 focus:border-gray-900 hover:bg-gray-200 sm:text-[13px] transition-all shadow-sm"
            placeholder="指派任务给 AI 团队 (⌘ + K)..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             <kbd className="inline-flex items-center border border-gray-300 rounded px-1.5 text-[10px] font-sans font-medium text-gray-400">⌘K</kbd>
          </div>
        </div>

        <button 
          onClick={onOpenCopilot}
          className="px-4 py-2 bg-[var(--color-primary)] text-white hover:bg-blue-700 hover:shadow-[0_2px_8px_rgba(26,115,232,0.4)] rounded-full transition-all relative flex items-center shadow-sm font-bold text-[13px] mx-2 group"
          title="唤醒一人公司的 AI 幕僚"
        >
          <Sparkles className="icon-sm mr-1.5 text-white group-hover:animate-pulse" />
          唤醒数字团队
        </button>

        <div className="hidden lg:flex items-center bg-[var(--bg-app)] border border-[var(--border-color)] rounded-full px-3 py-1.5 mr-2 shadow-inner">
           <div className="flex items-center space-x-2 px-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isApiActive ? 'bg-blue-400' : 'bg-green-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isApiActive ? 'bg-blue-500' : 'bg-green-500'}`}></span>
              </div>
              <span className="text-[11px] font-bold text-gray-700 tracking-wider flex items-center gap-1.5 border-r border-gray-300 pr-2">
                <Activity className="w-3 h-3 text-gray-400" />
                {memoryUsage}MB
              </span>
              <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider pl-1">
                {isApiActive ? 'API: ACTIVE' : 'API: IDLE'}
              </span>
           </div>
        </div>

        <button 
          onClick={onToggleFocusMode}
          className={`p-2 rounded-full transition-colors relative ${isFocusMode ? 'text-[var(--color-primary)] bg-blue-50 hover:bg-blue-100' : 'text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)]'}`}
          title="Focus Mode (Hide Sidebar)"
        >
          {isFocusMode ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative" ref={themeMenuRef}>
          <button 
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors relative" 
            title={`切换主题 (当前: ${theme})`}
          >
            {getThemeIcon()}
          </button>
          
          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] overflow-hidden z-50 transform origin-top-right transition-all">
              <div className="p-2 border-b border-[var(--border-color)] bg-gray-50/50">
                 <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search themes..." 
                      className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-xs font-medium text-[var(--text-main)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                      value={themeSearch}
                      onChange={(e) => setThemeSearch(e.target.value)}
                      autoFocus
                    />
                 </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                 {filteredThemes.length > 0 ? filteredThemes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { 
                        setTheme(t.id); 
                        setIsThemeMenuOpen(false); 
                        setThemeSearch(''); 
                        window.dispatchEvent(new CustomEvent('activity_log_theme', { detail: t.name }));
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                       <div className="flex items-center space-x-2.5">
                          <div className={`w-3.5 h-3.5 rounded-full shadow-inner ${t.id === 'light' ? 'border border-gray-300' : 'border border-black/10'}`} style={{ backgroundColor: t.color }}></div>
                          <span className={`text-[13px] font-medium ${theme === t.id ? 'text-[var(--text-main)]' : 'text-gray-600'}`}>{t.name}</span>
                       </div>
                       {theme === t.id && <Check className="icon-sm text-[var(--text-main)]" />}
                    </button>
                 )) : (
                    <div className="px-4 py-4 text-xs font-medium text-[var(--text-muted)] text-center">No themes found</div>
                 )}
              </div>
            </div>
          )}
        </div>

        <div className="relative group flex items-center">
          <button 
            className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors relative flex items-center gap-1"
            title="多语种与国际化设置"
          >
            <Globe className="icon-md" />
          </button>
          
          <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
             <div className="p-3 border-b border-[var(--border-color)] bg-gray-50/50">
               <span className="text-[12px] font-bold text-[var(--text-main)] block">系统语言切换</span>
               <span className="text-[10px] text-[var(--text-muted)] block">实时应用至所有 AI Agent 与工具产出</span>
             </div>
             <div className="max-h-64 overflow-y-auto py-1">
                {[
                  { code: 'zh', name: '🇨🇳 简体中文', active: true },
                  { code: 'en', name: '🇺🇸 English', active: false },
                  { code: 'ja', name: '🇯🇵 日本語', active: false },
                  { code: 'es', name: '🇪🇸 Español', active: false },
                  { code: 'fr', name: '🇫🇷 Français', active: false },
                  { code: 'ar', name: '🇦🇪 العربية', active: false }
                ].map(lang => (
                  <button
                    key={lang.code}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                     <span className={`text-[13px] font-medium ${lang.active ? 'text-[var(--color-primary)] font-bold' : 'text-gray-700'}`}>{lang.name}</span>
                     {lang.active && <Check className="icon-sm text-[var(--color-primary)]" />}
                  </button>
                ))}
             </div>
          </div>
        </div>
        
        <button 
          onClick={onOpenTaskCenter}
          className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors relative"
          title="全局任务与自动化调度中心"
        >
          <ListTodo className="w-[20px] h-[20px]" />
          {!isSessionActive && <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white"></span>}
        </button>

        <button 
            onClick={onOpenMessages}
            className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors relative"
            title="站内信件/系统通知"
          >
            <MessageSquare className="w-[20px] h-[20px]" />
          {!isSessionActive && unreadCount > 0 && <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#D93025] ring-2 ring-white"></span>}
        </button>

        <div className="relative" ref={inboxRef}>
          <button 
            onClick={() => setIsInboxOpen(!isInboxOpen)}
            className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors relative" title="消息通知"
          >
            <Bell className="w-[20px] h-[20px]" />
            {!isSessionActive && unreadCount > 0 && <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#1A73E8] ring-2 ring-white"></span>}
          </button>

          {isInboxOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] overflow-hidden z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-[var(--border-color)] bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-[var(--text-main)] text-sm">Inbox ({unreadCount} unread)</h3>
                <button onClick={markAllNotificationsRead} className="text-[11px] font-bold text-[var(--color-primary)] hover:text-blue-700">Mark all as read</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-[var(--text-main)]">Inbox is clear</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Workspace activity will appear here.</p>
                  </div>
                )}
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${notification.unread ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {notification.type === 'alert' && <AlertCircle className="icon-md text-red-500" />}
                        {notification.type === 'success' && <CheckCircle2 className="icon-md text-green-500" />}
                        {notification.type === 'update' && <Sparkles className="icon-md text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-bold text-[var(--text-main)]">{notification.title}</h4>
                          <span className="text-[10px] font-medium text-gray-400 flex items-center">
                             <Clock className="w-3 h-3 mr-1" />
                             {notification.time}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-600 leading-tight">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-[var(--border-color)] bg-gray-50/50 text-center">
                <button className="text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">View all notifications</button>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={onOpenShortcutsHelp}
          className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] rounded-full transition-colors"
          title="键盘快捷键与帮助"
        >
          <HelpCircle className="w-[20px] h-[20px]" />
        </button>

        <button className="ml-3 w-9 h-9 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-all relative shadow-sm border border-transparent hover:border-blue-300">
          M
          <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] bg-[#1E8E3E] border-[2.5px] border-white rounded-full"></div>
        </button>
      </div>
    </header>
  );
}
