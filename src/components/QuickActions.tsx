import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Download, Link2, Share2, Layers, Settings, Copy } from 'lucide-react';

interface QuickActionsProps {
  moduleTitle: string;
}

export function QuickActions({ moduleTitle }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (action === 'Export Current View') {
        const dummyData = {
           module: moduleTitle,
           exportDate: new Date().toISOString(),
           content: `This is a generated JSON export for the ${moduleTitle} module.`
        };
        const blob = new Blob([JSON.stringify(dummyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${moduleTitle.replace(/\s+/g, '_')}_Export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        import('./Toast').then(({ toast }) => toast(`Exported ${moduleTitle} as JSON`, 'success'));
    } else {
        import('./Toast').then(({ toast }) => toast(`Executed Action: ${action} on ${moduleTitle}`, 'success'));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] transition-colors flex items-center shadow-sm border border-transparent hover:border-[var(--border-color)]"
        title="Quick Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-lg border border-[var(--border-color)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-hover)]">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="py-1">
            <button onClick={() => handleAction('Export Current View')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center group font-medium transition-colors">
              <Download className="w-4 h-4 mr-2 text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" /> Export Current View
            </button>
            <button onClick={() => handleAction('Copy Link')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center group font-medium transition-colors">
              <Link2 className="w-4 h-4 mr-2 text-[var(--text-muted)] group-hover:text-amber-500 transition-colors" /> Copy Link
            </button>
            <button onClick={() => handleAction('Batch Process')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center group font-medium transition-colors">
              <Layers className="w-4 h-4 mr-2 text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" /> Batch Process
            </button>
            <div className="my-1 border-t border-[var(--border-color)]"></div>
            <button onClick={() => handleAction('Module Settings')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center group font-medium transition-colors">
              <Settings className="w-4 h-4 mr-2 text-[var(--text-muted)] group-hover:text-gray-500 transition-colors" /> Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
