import React, { useState } from 'react';
import { Settings, Image as ImageIcon, Send, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function FloatingQuickActions({ activeModule }: { activeModule: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const getActionsForModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return [
          { label: 'Summarize Status', icon: FileText, act: () => toast('Summarizing key metrics...', 'success') },
          { label: 'Capture Report', icon: ImageIcon, act: () => toast('Captured dashboard screenshot', 'success') }
        ];
      case 'code':
      case 'blueprint':
        return [
          { label: 'Open AI Canvas', icon: Send, act: () => toast('Opening AI interactive canvas', 'success') },
          { label: 'Run Tests', icon: Settings, act: () => toast('Running automated tests...', 'success') }
        ];
      default:
        return [
          { label: 'Summarize Page', icon: FileText, act: () => toast('Summarizing the current view...', 'success') },
          { label: 'Share Link', icon: Send, act: () => toast('Link copied to clipboard', 'success') }
        ];
    }
  };

  const actions = getActionsForModule();

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-3 bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-2xl border border-[var(--border-color)] overflow-hidden min-w-[200px]"
          >
             <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-hover)]">
                <span className="text-[10px] font-black tracking-wider text-[var(--text-muted)] uppercase px-2">Quick Actions</span>
             </div>
             <div className="p-1">
               {actions.map((action, i) => (
                 <button
                   key={i}
                   onClick={() => { action.act(); setIsOpen(false); }}
                   className="w-full text-left flex items-center px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors group"
                 >
                   <action.icon className="w-4 h-4 mr-3 text-blue-500 group-hover:scale-110 transition-transform" />
                   {action.label}
                 </button>
               ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
          isOpen 
            ? 'bg-red-50 text-red-500 hover:bg-red-100 rotate-90 scale-105' 
            : 'bg-[var(--color-primary)] text-white hover:bg-blue-700 hover:shadow-xl hover:-translate-y-1'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
      </button>
    </div>
  );
}
