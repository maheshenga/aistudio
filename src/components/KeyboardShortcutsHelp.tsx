import React, { useEffect } from 'react';
import { Command, X, Search, Zap, CheckSquare, Sparkles } from 'lucide-react';
import { BaseModal } from './ui/BaseModal';

interface KeyboardShortcutsHelpProps {
  activeModule?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose, activeModule }: KeyboardShortcutsHelpProps) {
  
  const defaultShortcuts = [
    { label: '唤醒全局命令面板 (Command Palette)', keys: ['⌘', 'P'], icon: <Command className="icon-sm text-blue-500" /> },
    { label: '唤醒数字助理 (AI Copilot)', keys: ['⌘', 'K'], icon: <Sparkles className="icon-sm text-indigo-500" /> },
    { label: '全局搜索 & 导航', keys: ['⌘', '/'], icon: <Search className="icon-sm text-[var(--text-muted)]" /> },
    { label: '打开全局任务中心', keys: ['⌘', 'T'], icon: <CheckSquare className="icon-sm text-green-500" /> },
    { label: 'Toggle/Focus Split Right', keys: ['⌘', '→'], icon: <Zap className="icon-sm text-yellow-500" /> },
    { label: 'Focus Split Left', keys: ['⌘', '←'], icon: <Zap className="icon-sm text-yellow-500" /> },
    { label: 'Toggle Split Screen', keys: ['⌘', '\\'], icon: <Zap className="icon-sm text-yellow-500" /> },
    { label: 'Toggle Deep Work Focus Mode', keys: ['⌘', '⇧', 'F'], icon: <Zap className="icon-sm text-red-500" /> },
  ];

  const moduleShortcuts: Record<string, {label: string, keys: string[], icon: React.ReactNode}[]> = {
    canvas: [
      { label: 'Pan Tool (Select)', keys: ['V'], icon: <Zap className="icon-sm text-blue-500" /> },
      { label: 'Draw Tool', keys: ['P'], icon: <Zap className="icon-sm text-blue-500" /> },
      { label: 'Zoom In', keys: ['⌘', '+'], icon: <Zap className="icon-sm text-blue-500" /> }
    ],
    design_workflow: [
      { label: 'Generate Layout', keys: ['⌘', 'Enter'], icon: <Sparkles className="icon-sm text-purple-500" /> },
      { label: 'Clear Prompt', keys: ['Esc'], icon: <X className="icon-sm text-[var(--text-muted)]" /> }
    ],
    ecommerce_mini: [
      { label: 'Publish Miniapp', keys: ['⌘', '⇧', 'P'], icon: <CheckSquare className="icon-sm text-green-500" /> },
      { label: 'Toggle View Mode', keys: ['⌘', 'M'], icon: <Zap className="icon-sm text-yellow-500" /> }
    ],
    store_dashboard: [
      { label: 'Export Report', keys: ['⌘', 'E'], icon: <CheckSquare className="icon-sm text-blue-500" /> },
      { label: 'Refresh Data', keys: ['⌘', 'R'], icon: <Zap className="icon-sm text-blue-500" /> }
    ]
  };

  const shortcuts = activeModule && moduleShortcuts[activeModule] 
    ? [...defaultShortcuts, ...moduleShortcuts[activeModule]] 
    : defaultShortcuts;

  const titleText = `键盘快捷键 ${activeModule ? '- ' + activeModule.replace('_', ' ') : ''}`;

  return (
    <BaseModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={titleText} 
        maxWidth="max-w-md" 
        zIndex={120}
    >
        <div className="space-y-2">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors">
              <div className="flex items-center">
                 <div className="icon-xl rounded-lg bg-[var(--bg-hover)] flex items-center justify-center mr-3 shadow-inner">
                    {sc.icon}
                 </div>
                 <span className="text-[13px] font-bold text-[var(--text-main)]">{sc.label}</span>
              </div>
              <div className="flex space-x-1 shrink-0">
                {sc.keys.map((k, j) => (
                   <kbd key={j} className="min-w-[24px] h-6 flex items-center justify-center px-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm font-sans text-xs font-bold text-[var(--text-muted)]">
                     {k}
                   </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-[var(--bg-hover)] rounded-[var(--radius-md)] border border-[var(--border-color)] text-center">
           <p className="text-xs text-[var(--text-muted)] font-medium tracking-wide">💡 提示: Windows/Linux 用户请使用 Ctrl 替代 ⌘</p>
        </div>
    </BaseModal>
  );
}

