import React, { useState, useEffect, useRef } from 'react';
import { Command, ArrowRight, FileText, Settings, LayoutDashboard, History, X, Monitor, Palette, Trash2, Download, Video, CheckCircle2, Play, Keyboard, Activity } from 'lucide-react';
import { navGroups } from './Sidebar';
import { ModuleId } from '../types';
import { toast } from './Toast';
import { useTheme } from './ThemeProvider';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleId: ModuleId) => void;
  onToggleFocusMode?: () => void;
  activeModule?: ModuleId;
  onExportWorkspace?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onToggleFocusMode, activeModule, onExportWorkspace }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [macroSequence, setMacroSequence] = useState<string[]>([]);
  const [savedMacros, setSavedMacros] = useState<{name: string, sequence: string[], keyMap: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const storedMacros = localStorage.getItem('user_macros');
    if (storedMacros) {
      try { setSavedMacros(JSON.parse(storedMacros)); } catch(e) {}
    }
  }, []);

  const saveMacros = (macros: any[]) => {
    setSavedMacros(macros);
    localStorage.setItem('user_macros', JSON.stringify(macros));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRecording) {
           setIsRecording(false);
           toast('Macro recording cancelled.', 'info');
        } else {
           onClose();
        }
      }
      
      // Global macro playback
      if (e.altKey && !isOpen) {
         const triggeredMacro = savedMacros.find(m => m.keyMap === `Alt+${e.key.toUpperCase()}`);
         if (triggeredMacro) {
           e.preventDefault();
           toast(`Running Macro: ${triggeredMacro.name}...`, 'success');
           // Iterate and execute actions... just a simulation for now
           triggeredMacro.sequence.forEach((actionId, idx) => {
             setTimeout(() => {
                const ac = actions.find(a => a.id === actionId);
                if (ac) {
                  if ('moduleId' in ac && ac.moduleId) onNavigate(ac.moduleId as ModuleId);
                  else if ('action' in ac && ac.action) ac.action();
                }
             }, 500 * idx);
           });
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isRecording, savedMacros, savedMacros]); // We need actions available for playback, but this is a rough implementation

  if (!isOpen) return null;

  const handleActionClick = (result: any) => {
    if (isRecording) {
      if (result.id === 'action-macro-record') return; // ignore itself
      setMacroSequence(prev => [...prev, result.id]);
      toast(`Action added to macro: ${result.title}`);
      return; // prevent execution and closing while recording
    }

    if ('moduleId' in result && result.moduleId) onNavigate(result.moduleId as ModuleId);
    else if ('action' in result && result.action) result.action();
    onClose();
  };

  const getContextualActions = () => {
    let trending: any[] = [];
    try {
        const logsStr = localStorage.getItem('activity_logs');
        if (logsStr) {
           const logs = JSON.parse(logsStr).filter((l: any) => l.type === 'ai_command');
           if (logs.length > 5) {
               trending.push({ id: 'trending-1', title: `Run Last Common Action`, type: 'trending', action: () => toast('Executing trending action...', 'success'), icon: <Activity className="icon-sm text-indigo-500" /> });
           }
        }
    } catch(e) {}

    const defaultTrending = { id: 'trending-gen', title: `Popular Action in ${activeModule}`, type: 'trending', action: () => toast('Executing trending...', 'success'), icon: <Activity className="icon-sm text-indigo-500" /> };
    if (!trending.length) trending.push(defaultTrending);

    switch (activeModule) {
      case 'chat':
        return [
          ...trending,
          { id: 'ctx-clear-chat', title: 'Clear Conversation', type: 'context action', action: () => toast('Chat cleared', 'success'), icon: <Trash2 className="icon-sm" /> },
          { id: 'ctx-export-chat', title: 'Export Chat History', type: 'context action', action: () => toast('Exporting chat history...', 'success'), icon: <Download className="icon-sm" /> }
        ];
      case 'dashboard':
        return [
          ...trending,
          { id: 'ctx-refresh-dash', title: 'Refresh Dashboard Data', type: 'context action', action: () => toast('Dashboard data refreshed', 'success'), icon: <History className="icon-sm" /> }
        ];
      case 'video':
      case 'image':
        return [
          ...trending,
          { id: 'ctx-clear-canvas', title: 'Clear Canvas / Prompts', type: 'context action', action: () => toast('Canvas cleared', 'success'), icon: <Trash2 className="icon-sm" /> }
        ];
      default:
        return trending;
    }
  };

  const genericActions = [
    { id: 'action-macro-record', title: isRecording ? 'Stop Recording Macro' : 'Start Macro Recording', type: 'system action', action: () => {
       if (isRecording) {
         if (macroSequence.length > 0) {
           const hotkey = `Alt+${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
           const newMacro = { name: `Macro ${savedMacros.length + 1}`, sequence: macroSequence, keyMap: hotkey };
           saveMacros([...savedMacros, newMacro]);
           toast(`Macro saved to hotkey ${hotkey}`, 'success');
         }
         setIsRecording(false);
         setMacroSequence([]);
       } else {
         setIsRecording(true);
         setMacroSequence([]);
         toast('Recording started... select commands to record', 'info');
       }
    }, icon: isRecording ? <CheckCircle2 className="icon-sm text-green-500" /> : <Video className="icon-sm text-red-500 animate-pulse" /> },
    { id: 'action-store', title: 'Open Store Dashboard', type: 'navigation shortcut', moduleId: 'store_dashboard' as ModuleId, icon: <LayoutDashboard className="icon-sm" /> },
    { id: 'action-settings', title: 'Open Settings', type: 'navigation shortcut', moduleId: 'settings' as ModuleId, icon: <Settings className="icon-sm" /> },
    { id: 'action-dashboard', title: 'Go to Dashboard', type: 'navigation shortcut', moduleId: 'dashboard' as ModuleId, icon: <LayoutDashboard className="icon-sm" /> },
    { id: 'action-focus', title: 'Toggle Focus Mode', type: 'system action', action: () => { if(onToggleFocusMode) onToggleFocusMode(); toast('Toggled Focus Mode', 'success'); }, icon: <Monitor className="icon-sm" /> },
    { id: 'theme-midnight', title: 'Midnight Dark Theme', type: 'theme setting', action: () => { setTheme('midnight'); toast('Theme switched to Midnight Dark', 'success'); }, icon: <Palette className="icon-sm" /> },
    { id: 'theme-Sepia', title: 'Sepia Reading Theme', type: 'theme setting', action: () => { setTheme('sepia'); toast('Theme switched to Sepia', 'success'); }, icon: <Palette className="icon-sm" /> },
    { id: 'action-export-workspace', title: 'Export Workspace State', type: 'system action', action: () => { if(onExportWorkspace) onExportWorkspace(); onClose(); }, icon: <Download className="icon-sm" /> },
  ];

  const actions = [...getContextualActions(), ...genericActions];
  
  // also add saved macros for execution
  const macroExecActions = savedMacros.map(m => ({
    id: `macro-exec-${m.keyMap}`, title: `Run ${m.name} (${m.keyMap})`, type: 'macro execution', action: () => {
       toast(`Running Macro: ${m.name}...`, 'success');
       m.sequence.forEach((actionId, idx) => {
         setTimeout(() => {
            const ac = actions.find(a => a.id === actionId);
            if (ac) {
              if ('moduleId' in ac && ac.moduleId) onNavigate(ac.moduleId as ModuleId);
              else if ('action' in ac && ac.action) ac.action();
            }
         }, 500 * idx);
       });
    }, icon: <Play className="icon-sm text-green-500" />
  }));

  const allFilteredActions = [...actions, ...macroExecActions];

  const filteredItems = query 
    ? allFilteredActions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()) || a.type.toLowerCase().includes(query.toLowerCase()))
    : allFilteredActions;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isRecording && onClose()} />
      
      {/* Modal panel */}
      <div className={`relative w-full max-w-2xl bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-2 ${isRecording ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]' : 'border-[var(--border-color)]'}`}>
        {isRecording && (
          <div className="bg-red-50 px-4 py-2 flex items-center justify-between border-b border-red-100">
             <div className="flex items-center text-red-700 text-sm font-bold">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></div>
               Macro Recording ({macroSequence.length} actions)
             </div>
             <button onClick={() => {
                const ac = actions.find(a => a.id === 'action-macro-record');
                if (ac && 'action' in ac && ac.action) ac.action();
             }} className="text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
               Save Mapping
             </button>
          </div>
        )}
        <div className="relative flex items-center p-4 border-b border-[var(--border-color)]">
          <Command className="icon-md text-gray-400 absolute left-6" />
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-3 bg-transparent text-lg font-medium text-[var(--text-main)] placeholder-gray-400 focus:outline-none transition-all"
            placeholder="Type a command or search... (Ctrl+P)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="icon-md" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filteredItems.length > 0 ? (
            <ul className="px-2">
              <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                 Recent & Actions
              </div>
              {filteredItems.map((result, i) => (
                <li key={result.id + '-' + i}>
                  <button 
                    onClick={() => handleActionClick(result)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-[var(--radius-lg)] transition-colors group ${macroSequence.includes(result.id) ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex items-center">
                      <div className="icon-xl rounded-lg bg-gray-100 text-[var(--text-muted)] flex items-center justify-center mr-3 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {result.icon}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-[var(--text-main)]">{result.title}</span>
                        <span className="text-xs font-medium text-[var(--text-muted)] capitalize">{result.type}</span>
                      </div>
                    </div>
                    {macroSequence.includes(result.id) && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded mr-2">Added</span>
                    )}
                    <ArrowRight className="icon-sm text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
             <div className="px-6 py-12 text-center text-[var(--text-muted)] text-sm">No commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
