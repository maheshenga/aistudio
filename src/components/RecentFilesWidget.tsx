import React, { useMemo } from 'react';
import { FileText, Image as ImageIcon, Video, Clock } from 'lucide-react';
import { useWorkspaceAssets } from '../hooks/useWorkspaceAssets';

export function RecentFilesWidget() {
  const assets = useWorkspaceAssets();
  const recentFiles = useMemo(
    () => [...assets]
      .sort((a, b) => (b.lastAccessedAt ?? b.updatedAt) - (a.lastAccessedAt ?? a.updatedAt))
      .slice(0, 3)
      .map((asset) => ({
        id: asset.id,
        title: asset.name,
        type: asset.type === 'document' ? 'text' : asset.type,
        timestamp: asset.lastAccessedAt ?? asset.updatedAt,
      })),
    [assets],
  );

  const formatTime = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="icon-md text-blue-500" />;
      case 'image': return <ImageIcon className="icon-md text-green-500" />;
      case 'video': return <Video className="icon-md text-purple-500" />;
      default: return <FileText className="icon-md text-[var(--text-muted)]" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-50 border-blue-100';
      case 'image': return 'bg-green-50 border-green-100';
      case 'video': return 'bg-purple-50 border-purple-100';
      default: return 'bg-gray-50 border-[var(--border-color)]';
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden mt-6 flex flex-col">
       <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
         <h2 className="text-lg font-bold text-[var(--text-main)] border-l-4 border-yellow-500 pl-3">近期编辑文件</h2>
         <button className="text-[12px] font-bold text-gray-400 hover:text-[var(--text-main)] transition-colors">查看全部历史</button>
       </div>
       <div className="p-4 flex-1">
          {recentFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
               {recentFiles.map(file => (
                 <div key={file.id} className="flex items-center p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group bg-gray-50 hover:bg-[var(--bg-panel)]">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 border ${getBg(file.type)}`}>
                     {getIcon(file.type)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-[13px] font-bold text-[var(--text-main)] truncate group-hover:text-[var(--color-primary)] transition-colors">{file.title}</p>
                     <p className="text-[11px] font-medium text-[var(--text-muted)] flex items-center mt-1">
                       <Clock className="w-3 h-3 mr-1 opacity-70" /> {formatTime(file.timestamp)}
                     </p>
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm font-medium">暂时没有最近使用的文件</div>
          )}
       </div>
    </div>
  );
}
