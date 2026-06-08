import React, { useState, useEffect } from 'react';
import { WifiOff, RotateCw, Trash2, X, AlertTriangle } from 'lucide-react';
import { toast } from './Toast';

export function OfflineQueueModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [queue, setQueue] = useState<any[]>([]);

  const loadQueue = () => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) setQueue(JSON.parse(stored));
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) loadQueue();
    const handleUpdate = () => {
       if (isOpen) loadQueue();
    };
    window.addEventListener('offlineQueueUpdated', handleUpdate);
    return () => window.removeEventListener('offlineQueueUpdated', handleUpdate);
  }, [isOpen]);

  const handleRetry = (id: string, key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      const newQueue = queue.filter(item => item.id !== id);
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
      setQueue(newQueue);
      toast('Resolved offline action successfully', 'success');
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
    } catch (e) {
      toast('Still failing to sync. Storage may be full.', 'error');
    }
  };

  const handleDiscard = (id: string) => {
    const newQueue = queue.filter(item => item.id !== id);
    localStorage.setItem('offline_queue', JSON.stringify(newQueue));
    setQueue(newQueue);
    toast('Discarded pending offline action', 'success');
    window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
      <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl border border-[var(--border-color)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-panel)]">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-amber-500 mr-2" />
            <span className="font-bold text-[16px] text-[var(--text-main)]">Offline Queue</span>
            {queue.length > 0 && <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{queue.length} pending</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
          {queue.length === 0 ? (
             <div className="text-center py-10 flex flex-col items-center">
                <AlertTriangle className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm font-medium">No offline actions pending.</p>
                <p className="text-gray-400 text-xs mt-1">All your data is synced.</p>
             </div>
          ) : (
             <div className="space-y-3">
               {queue.map(item => (
                 <div key={item.id} className="p-3 border border-amber-200 bg-amber-50/30 rounded-xl relative group">
                    <div className="flex items-start justify-between mb-2">
                       <div>
                         <h4 className="text-[13px] font-bold text-[var(--text-main)] truncate max-w-[200px]">Key: {item.key}</h4>
                         <p className="text-[11px] text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                       </div>
                       <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRetry(item.id, item.key, item.value)}
                            className="p-1.5 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-md transition-colors flex items-center tooltip" title="Retry Sync"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDiscard(item.id)}
                            className="p-1.5 bg-white text-red-500 border border-red-200 hover:bg-red-50 rounded-md transition-colors flex items-center tooltip" title="Discard Action"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono overflow-hidden whitespace-nowrap overflow-ellipsis">
                       Current Payload: {JSON.stringify(item.value).substring(0, 100)}...
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
