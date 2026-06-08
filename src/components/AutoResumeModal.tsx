import React, { useState, useEffect } from 'react';
import { PowerSquare, RotateCcw, X, LayoutDashboard, AlertTriangle } from 'lucide-react';

interface AutoResumeModalProps {
  onLoadLayout: (layout: any) => void;
}

export function AutoResumeModal({ onLoadLayout }: AutoResumeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<any>(null);

  useEffect(() => {
    // Check if we have an un-dismissed dirty session
    const lastSession = localStorage.getItem('session_last_state');
    const wasClean = localStorage.getItem('clean_exit');
    
    // For demo purposes, we can trigger it if there is a session state and we haven't seen it in this session.
    // If wasClean !== 'true', it means we didn't exit nicely.
    if (lastSession && wasClean === 'false' && !sessionStorage.getItem('auto_resume_checked')) {
        try {
            setLayout(JSON.parse(lastSession));
            setIsOpen(true);
        } catch (e) {}
    }
    sessionStorage.setItem('auto_resume_checked', 'true');
  }, []);

  const handleRestore = () => {
     if (layout) onLoadLayout(layout);
     localStorage.setItem('clean_exit', 'true');
     setIsOpen(false);
  };
   
  const handleDismiss = () => {
     localStorage.setItem('clean_exit', 'true');
     setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
      <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl border border-[var(--border-color)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
           <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center mb-4 transform -rotate-3 border border-blue-100">
              <PowerSquare className="w-8 h-8 text-blue-600" />
           </div>
           <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Unexpected Disconnect</h2>
           <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">It looks like your previous session was terminated unexpectedly. Would you like to restore your workspace layout?</p>
        </div>
        
        <div className="p-6 pt-0">
           <div className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border-color)] mb-6 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center mb-2">
                 <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Snapshot Found
              </h4>
              <p className="text-sm font-semibold text-[var(--text-main)]">Active Module: <span className="text-indigo-600">{layout?.activeModule}</span></p>
              {layout?.isSplitScreen && (
                 <p className="text-sm font-semibold text-[var(--text-main)] mt-1">Split View: <span className="text-purple-600">{layout?.secondaryModule}</span> ({layout?.splitRatio}%)</p>
              )}
           </div>

           <div className="flex gap-3">
              <button 
                onClick={handleDismiss} 
                className="flex-1 py-3 bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold rounded-[var(--radius-lg)] transition-colors"
              >
                Start Fresh
              </button>
              <button 
                onClick={handleRestore} 
                className="flex-[2] flex items-center justify-center py-3 bg-[var(--color-primary)] hover:bg-blue-700 text-white text-sm font-bold rounded-[var(--radius-lg)] transition-colors shadow-md shadow-blue-500/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore Layout
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
