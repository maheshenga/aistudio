import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Folder, LayoutDashboard, FileText, Image as LucideImage, Video, Users, X, History } from 'lucide-react';
import { ModuleId } from '../types';
import { getProductNavGroupsForRole } from '../product/registry';
import { saveSearchHistory, subscribeSearchHistory } from '../lib/data/searchHistoryRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import { useWorkspaceAssets } from '../hooks/useWorkspaceAssets';

interface GlobalSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleId: ModuleId) => void;
}

export function GlobalSearchOverlay({ isOpen, onClose, onNavigate }: GlobalSearchOverlayProps) {
  const session = useSaasSession();
  const assets = useWorkspaceAssets();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchHistoryContext = {
    workspaceId: session.workspace.id,
    userId: session.user.id,
  };
  const accessibleModules = useMemo(
    () => getProductNavGroupsForRole(session.membership.role).flatMap((group) => group.items),
    [session.membership.role],
  );

  useEffect(() => {
    return subscribeSearchHistory(searchHistoryContext, setRecentSearches);
  }, [session.workspace.id, session.user.id]);

  const saveToHistory = (item: string) => {
    setRecentSearches(prev => {
      const updated = [item, ...prev.filter(i => i !== item)].slice(0, 5);
      return saveSearchHistory(updated, searchHistoryContext);
    });
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (query.trim()) {
         saveToHistory(query.trim());
      }
      if (searchResults.length > 0) {
         if (searchResults[0].type === 'module') {
            onNavigate(searchResults[0].id as ModuleId);
         }
         onClose();
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const globalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', globalKeyDown);
    }
    return () => window.removeEventListener('keydown', globalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Flatten accessible modules for search
  const allModules = accessibleModules;
  const normalizedQuery = query.trim().toLowerCase();
  const getAssetIcon = (type: string) => {
    if (type === 'image') return <LucideImage className="icon-sm" />;
    if (type === 'video') return <Video className="icon-sm" />;
    return <FileText className="icon-sm" />;
  };
  const assetResults = normalizedQuery
    ? assets.filter((asset) => {
      const searchableText = [
        asset.name,
        asset.type,
        asset.source,
        asset.moduleId ?? '',
        ...asset.tags,
      ].join(' ').toLowerCase();
      return searchableText.includes(normalizedQuery);
    }).map((asset) => ({
      id: asset.id,
      type: 'asset',
      title: asset.name,
      icon: getAssetIcon(asset.type),
      assetId: asset.id,
    }))
    : [];
  
  const searchResults = [
    // Matches in modules
    ...allModules.filter(m => m.label.toLowerCase().includes(normalizedQuery)).map(m => ({
      id: m.id,
      type: 'module',
      title: m.label,
      icon: <LayoutDashboard className="icon-sm" />
    })),
    ...assetResults,
  ].slice(0, 8); // Limit results

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal panel */}
      <div className="relative w-full max-w-2xl bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border-color)]">
        <div className="relative flex items-center p-4 border-b border-[var(--border-color)]">
          <Search className="icon-md text-gray-400 absolute left-6" />
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-3 bg-transparent text-lg font-medium text-[var(--text-main)] placeholder-gray-400 focus:outline-none transition-all"
            placeholder="Search modules, assets, files... (Esc to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={onClose}
            className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="icon-md" />
          </button>
        </div>
        
        {query === '' && recentSearches.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
             <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
               Recent Searches
             </div>
             <ul className="px-2">
               {recentSearches.map((rec, i) => (
                 <li key={i}>
                   <button 
                     onClick={() => setQuery(rec)}
                     className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-[var(--radius-lg)] transition-colors text-left"
                   >
                     <History className="icon-sm text-gray-400 mr-3" />
                     <span className="text-sm font-medium text-gray-700">{rec}</span>
                   </button>
                 </li>
               ))}
             </ul>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
               Results
            </div>
            <ul className="px-2">
              {searchResults.map((result, i) => (
                <li key={result.id + '-' + i}>
                  <button 
                    onClick={() => {
                      saveToHistory(result.title);
                      if (result.type === 'module') {
                        onNavigate(result.id as ModuleId);
                      } else if (result.type === 'asset') {
                        window.dispatchEvent(new CustomEvent('global_search_asset_selected', {
                          detail: {
                            assetId: result.id,
                            workspaceId: session.workspace.id,
                          },
                        }));
                        onNavigate('assets');
                      }
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-[var(--radius-lg)] transition-colors group"
                  >
                    <div className="flex items-center">
                      <div className="icon-xl rounded-lg bg-gray-100 text-[var(--text-muted)] flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:text-[var(--color-primary)] transition-colors">
                        {result.icon}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-[var(--text-main)]">{result.title}</span>
                        <span className="text-xs font-medium text-[var(--text-muted)] capitalize">{result.type}</span>
                      </div>
                    </div>
                    <ArrowRight className="icon-sm text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[var(--text-muted)] font-medium">No results found for "{query}"</p>
            <p className="text-xs text-gray-400 mt-1">Try searching for modules like "Design" or "Store"</p>
          </div>
        )}
        
        <div className="p-3 border-t border-[var(--border-color)] bg-gray-50/50 flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
           <div className="flex items-center">
             <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm font-mono text-[10px] mr-1.5">↑↓</kbd>
             to navigate
           </div>
           <div className="flex items-center">
             <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm font-mono text-[10px] mr-1.5">Enter</kbd>
             to select
           </div>
           <div className="flex items-center">
             <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm font-mono text-[10px] mr-1.5">Esc</kbd>
             to close
           </div>
        </div>
      </div>
    </div>
  );
}
