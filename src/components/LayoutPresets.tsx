import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LayoutDashboard, Save, FolderOpen, MoreVertical, Check } from 'lucide-react';
import { toast } from './Toast';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

interface LayoutPreset {
  name: string;
  data: any;
}

const defaultLayoutPresets: LayoutPreset[] = [
  {
    name: 'Research Focus',
    data: { activeModule: 'knowledge', isSplitScreen: true, secondaryModule: 'assets', splitRatio: 60, pinnedModules: ['knowledge', 'assets'] }
  },
  {
    name: 'Development Mode',
    data: { activeModule: 'code', isSplitScreen: true, secondaryModule: 'task', splitRatio: 50, pinnedModules: ['code', 'task', 'messages'] }
  }
];

export function LayoutPresets({ 
  currentLayout,
  onLoadLayout
}: { 
  currentLayout: any,
  onLoadLayout: (layout: any) => void
}) {
  const session = useSaasSession();
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<LayoutPreset[]>(() =>
    getSetting<LayoutPreset[]>('layout_presets', defaultLayoutPresets, settingsContext),
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshPresets = () => setPresets(getSetting<LayoutPreset[]>('layout_presets', defaultLayoutPresets, settingsContext));
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== settingsContext.workspaceId) return;
      if (detail?.userId && detail.userId !== settingsContext.userId) return;
      refreshPresets();
    };

    refreshPresets();
    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [settingsContext]);

  const saveToStorage = (newPresets: LayoutPreset[]) => {
    setPresets(newPresets);
    saveSetting('layout_presets', newPresets, settingsContext);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const saveCurrentLayout = () => {
    const name = prompt('Enter a name for this layout preset:');
    if (name && name.trim()) {
      saveToStorage([...presets, { name: name.trim(), data: currentLayout }]);
      toast(`Saved layout "${name.trim()}"`, 'success');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-[var(--border-color)] transition-colors shadow-sm ml-2"
        title="Layout Presets"
      >
        <FolderOpen className="w-3.5 h-3.5 mr-1 text-blue-500" />
        Presets
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-56 right-0 bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-xl border border-[var(--border-color)] z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-hover)]">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Layout Configs</span>
          </div>
          <div className="py-1 max-h-48 overflow-y-auto custom-scrollbar">
            {presets.length === 0 ? (
               <div className="px-3 py-4 text-center text-xs text-gray-400">No saved presets</div>
            ) : (
               presets.map((preset, idx) => (
                 <button 
                   key={idx}
                   onClick={() => { onLoadLayout(preset.data); setIsOpen(false); toast(`Loaded layout: ${preset.name}`, 'success'); }}
                   className="w-full text-left flex items-center px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors group"
                 >
                   <LayoutDashboard className="w-4 h-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                   <span className="truncate">{preset.name}</span>
                 </button>
               ))
            )}
          </div>
          <div className="border-t border-[var(--border-color)] p-1">
             <button 
               onClick={saveCurrentLayout}
               className="w-full flex items-center justify-center px-3 py-1.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-md)] text-xs font-bold transition-colors"
             >
               <Save className="w-3.5 h-3.5 mr-1.5" /> Save Current Layout
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
