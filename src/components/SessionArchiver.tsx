import React, { useState, useEffect, useMemo } from 'react';
import { Save, Folder, Plus, CheckCircle2, RotateCcw, X, Layers, Clock } from 'lucide-react';
import { toast } from './Toast';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

interface Preset {
  id: string;
  name: string;
  timestamp: number;
  layout: any;
  pinned: any;
}

export function SessionArchiver() {
  const session = useSaasSession();
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [presets, setPresets] = useState<Preset[]>(() =>
    getSetting<Preset[]>('workspace_presets', [], settingsContext),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    const refreshPresets = () => setPresets(getSetting<Preset[]>('workspace_presets', [], settingsContext));
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

  const saveCurrentPreset = () => {
    if (!newPresetName.trim()) {
       toast('请输入预设名称', 'error');
       return;
    }
    
    try {
      const layoutData = getSetting('workspace_autosave', {}, settingsContext);
      const pinnedModules = getSetting('pinned_modules', [], settingsContext);
      
      const newPreset: Preset = {
        id: Date.now().toString(),
        name: newPresetName.trim(),
        timestamp: Date.now(),
        layout: layoutData,
        pinned: pinnedModules
      };
      
      const updated = [newPreset, ...presets];
      setPresets(updated);
      saveSetting('workspace_presets', updated, settingsContext);
      setNewPresetName('');
      setIsSaving(false);
      toast('工作区预设已保存', 'success');
    } catch (e) {
      toast('保存失败', 'error');
    }
  };

  const restorePreset = (preset: Preset) => {
    try {
      if (preset.layout) {
        saveSetting('workspace_autosave', preset.layout, settingsContext);
      }
      if (preset.pinned) {
        saveSetting('pinned_modules', preset.pinned, settingsContext);
      }
      
      // Dispatch an event so App.tsx can reload the state
      const event = new CustomEvent('app:restore-preset', { detail: preset });
      window.dispatchEvent(event);
      toast(`已恢复预设: ${preset.name}`, 'success');
    } catch (e) {
      toast('恢复失败', 'error');
    }
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveSetting('workspace_presets', updated, settingsContext);
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
         <h2 className="text-[16px] font-black text-[var(--text-main)] flex items-center border-l-4 border-indigo-500 pl-3">
           <Layers className="icon-sm mr-2 text-indigo-500" />
           Session Archiver (上下文归档)
         </h2>
         <button 
           onClick={() => setIsSaving(!isSaving)}
           className="text-[12px] font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-1.5 rounded-[var(--radius-md)] flex items-center transition-colors shadow-sm"
         >
           <Save className="icon-sm mr-1" /> 存此布局
         </button>
      </div>
      
      {isSaving && (
        <div className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-color)] flex flex-col gap-2">
           <input 
             type="text" 
             autoFocus
             value={newPresetName}
             onChange={(e) => setNewPresetName(e.target.value)}
             placeholder="输入工作流名称 (如: 电商双十一海报)"
             className="w-full px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] text-sm font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
             onKeyDown={(e) => e.key === 'Enter' && saveCurrentPreset()}
           />
           <div className="flex justify-end gap-2 mt-1">
             <button onClick={() => setIsSaving(false)} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-md)]">取消</button>
             <button onClick={saveCurrentPreset} className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-[var(--radius-md)] shadow-sm">保存并归档</button>
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--spacing-md)] min-h-[140px]">
        {presets.length === 0 && !isSaving ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-6">
             <Folder className="icon-xl mb-3 opacity-20" />
             <p className="text-[13px] font-bold text-center">空空如也，极速保存当前工作流防打断。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {presets.map((preset) => (
              <div key={preset.id} className="group border border-[var(--border-color)] bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-lg)] p-3 flex items-center justify-between transition-colors">
                 <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[14px] font-bold text-[var(--text-main)] truncate">{preset.name}</p>
                    <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {new Date(preset.timestamp).toLocaleString()}
                    </p>
                 </div>
                 <div className="flex items-center shrink-0 space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => restorePreset(preset)}
                      className="p-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] rounded-[var(--radius-md)] transition-colors shadow-sm"
                      title="一键切区"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deletePreset(preset.id)}
                      className="p-1.5 hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500 rounded-[var(--radius-md)] transition-colors"
                      title="删除预设"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
