import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Folder, Image as ImageIcon, Video, Music, FileText, MoreVertical, Grid, List, Download, Check, X, Maximize2, FileOutput, Trash2, AlertTriangle, Tag, UserPlus } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from './Toast';

const initialAssets = [
  { id: 1, name: 'Brand_Logo_V2.png', type: 'image', size: '2.4 MB', date: '2026-05-28' },
  { id: 2, name: 'Product_Intro_Draft.mp4', type: 'video', size: '145.8 MB', date: '2026-05-27' },
  { id: 3, name: 'Background_Music_01.mp3', type: 'audio', size: '4.2 MB', date: '2026-05-25' },
  { id: 4, name: 'Q3_Marketing_Copy.docx', type: 'document', size: '1.1 MB', date: '2026-05-24' },
  { id: 5, name: 'Hero_Banner_Concept.jpg', type: 'image', size: '3.8 MB', date: '2026-05-22' },
  { id: 6, name: 'UI_Mockups_Final.png', type: 'image', size: '5.6 MB', date: '2026-05-20' },
  { id: 7, name: 'Voiceover_Take2.wav', type: 'audio', size: '12.4 MB', date: '2026-05-18' },
  { id: 8, name: 'CEO_Greeting.mp4', type: 'video', size: '89.5 MB', date: '2026-05-15' },
];

const fileTypes = [
  { id: 'all', label: '全部文件' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
  { id: 'document', label: '文档' }
];

export function AssetsView() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const toggleSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleExportCSV = () => {
    if (selectedAssets.length === 0) return;
    
    const headers = ['ID', 'File Name', 'Type', 'Size', 'Date'];
    const rows = selectedAssets.map(id => {
      const asset = initialAssets.find(a => a.id === id);
      return asset ? `${asset.id},${asset.name},${asset.type},${asset.size},${asset.date}` : '';
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + "\n"
      + rows.join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "assets_metadata.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSelectedAssets([]);
  };

  const handleBulkDownload = async () => {
    if (selectedAssets.length === 0) return;
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      selectedAssets.forEach(id => {
        const asset = initialAssets.find(a => a.id === id);
        if (asset) {
          zip.file(asset.name + '.txt', 'Mock file content for ' + asset.name);
        }
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'assets_download.zip');
    } catch (e) {
      console.error('ZIP creation failed', e);
    } finally {
      setIsDownloading(false);
      setSelectedAssets([]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="icon-xl text-green-500" />;
      case 'video': return <Video className="icon-xl text-blue-500" />;
      case 'audio': return <Music className="icon-xl text-purple-500" />;
      case 'document': return <FileText className="icon-xl text-blue-500" />;
      default: return <FileText className="icon-xl text-[var(--text-muted)]" />;
    }
  };

  const filteredAssets = initialAssets.filter(asset => {
    const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[var(--bg-app)]">
      {/* Sidebar Filters */}
      <div className="w-[280px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] shadow-sm flex flex-col flex-shrink-0 relative z-10 transition-all">
        <div className="p-5 border-b border-[var(--border-color)]">
          <button className="w-full flex items-center justify-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-3 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Upload className="w-[18px] h-[18px]" />
            <span>上传素材或文件夹</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 py-6 space-y-8 custom-scrollbar">
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3">文件类型</h3>
            <ul className="space-y-1">
              {fileTypes.map((item) => (
                <li key={item.id}>
                  <button 
                    onClick={() => setActiveFilter(item.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-lg)] text-[15px] transition-colors ${activeFilter === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3">项目文件夹</h3>
            <ul className="space-y-1">
              {[
                { name: '2026 新品发布', count: 12 },
                { name: '社交媒体素材', count: 45 },
                { name: '官方网站重构', count: 8 },
                { name: '数字人模型库', count: 32 },
              ].map((folder, idx) => (
                <li key={idx}>
                  <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-lg)] text-[15px] text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
                    <span className="flex items-center truncate pr-2">
                      <Folder className="w-[18px] h-[18px] mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-[13px] text-gray-400 font-bold bg-gray-100 rounded-lg px-2">{folder.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Storage Tracker Base */}
        <div className="p-5 bg-gray-50/80 border-t border-[var(--border-color)]">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-gray-700">主理人私有存储空间</span>
            <span className="text-[var(--text-muted)] font-medium">45GB / 100GB</span>
          </div>
          <div className="w-full bg-gray-200/80 rounded-full h-2 mb-4">
            <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="w-full py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">扩容空间</button>
            <button 
              onClick={() => setIsCleanupOpen(true)}
              className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="icon-sm" />
              <span>清理临时文件</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)]">
        <div className="px-8 flex-shrink-0 pt-6 pb-2">
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            数字资产保险库
            <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm border border-blue-200 uppercase tracking-widest flex items-center">
              Global Asset Node
            </span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">统一存储与分发全模态数字资产，为 Agent 集群提供强大的跨流转数据支点。</p>
        </div>
        <div className="px-8 flex-shrink-0 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-transparent z-0 relative">
           <div className="flex items-center space-x-4">
             <div className="relative">
               <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="搜索我的文件..." 
                 className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72 bg-[#F1F3F4] focus:bg-[var(--bg-panel)] transition-all outline-none"
               />
             </div>
             <button className="p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[var(--text-muted)] hover:bg-gray-50 transition-colors shadow-sm bg-[var(--bg-panel)]">
               <Filter className="icon-sm" />
             </button>
           </div>
           
           <div className="flex items-center bg-gray-100 p-1 rounded-[var(--radius-lg)] shadow-inner border border-[var(--border-color)]/60">
             <button className="p-1.5 bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)] rounded-lg"><Grid className="w-[18px] h-[18px]" /></button>
             <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors"><List className="w-[18px] h-[18px]" /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-[var(--spacing-lg)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-main)]">{searchQuery ? '搜索结果' : '素材列表'}</h3>
            {selectedAssets.length > 0 && (
              <div className="flex items-center gap-3">
                {selectedAssets.length >= 2 && (
                  <button 
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                  >
                    <Maximize2 className="icon-sm" />
                    <span>对比预览</span>
                  </button>
                )}
                <button 
                  onClick={() => toast(`Added labels to ${selectedAssets.length} assets`, 'success')}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Tag className="icon-sm" />
                  <span>Label</span>
                </button>
                <button 
                  onClick={() => toast(`Assigned ${selectedAssets.length} assets`, 'success')}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <UserPlus className="icon-sm" />
                  <span>Assign</span>
                </button>
                <button 
                  onClick={() => toast(`Deleted ${selectedAssets.length} assets`, 'success')}
                  className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-red-50 text-red-600 px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Trash2 className="icon-sm" />
                  <span>Delete</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <FileOutput className="icon-sm" />
                  <span>导出元数据 CSV</span>
                </button>
                <button 
                  onClick={handleBulkDownload}
                  disabled={isDownloading}
                  className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                >
                  <Download className="icon-sm" />
                  <span>{isDownloading ? '打包中...' : `下载已选 (${selectedAssets.length})`}</span>
                </button>
              </div>
            )}
          </div>
          {filteredAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[var(--spacing-md)]">
              {filteredAssets.map((asset) => (
                <div key={asset.id} 
                     onClick={(e) => toggleSelection(asset.id, e)}
                     className={`bg-[var(--bg-panel)] rounded-[20px] border ${selectedAssets.includes(asset.id) ? 'border-blue-500 ring-4 ring-blue-50' : 'border-[var(--border-color)]'} overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col cursor-pointer relative animate-in fade-in zoom-in-95 duration-200`}>
                  
                  <div className={`absolute top-3 left-3 icon-md rounded-md border flex items-center justify-center z-20 transition-all ${selectedAssets.includes(asset.id) ? 'bg-[var(--color-primary)] border-blue-600 shadow-sm scale-110' : 'bg-[var(--bg-panel)]/90 border-gray-300 opacity-0 group-hover:opacity-100 drop-shadow-sm'}`}>
                    {selectedAssets.includes(asset.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>

                  <div className="aspect-square bg-gray-50/80 flex items-center justify-center border-b border-[var(--border-color)] relative group-hover:bg-gray-100/80 transition-colors">
                     {getIcon(asset.type)}
                     <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors"></div>
                     <button className="absolute top-2 right-2 p-1.5 bg-[var(--bg-panel)]/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 shadow-sm border border-black/5 text-gray-600 hover:text-[var(--color-primary)] transition-all">
                        <MoreVertical className="icon-sm" />
                     </button>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h4 className="text-[14px] font-bold text-[var(--text-main)] truncate pr-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight mb-2" title={asset.name}>{asset.name}</h4>
                    <div className="mt-auto flex items-center justify-between text-[12px] text-[var(--text-muted)] font-medium">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md">{asset.size}</span>
                      <span>{asset.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] animate-in fade-in duration-300">
              <Folder className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-bold text-[var(--text-main)]">没有找到匹配的文件</p>
              <p className="text-sm mt-1">尝试更改搜索词或过滤器</p>
            </div>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-[var(--spacing-xl)]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#F1F3F4] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
              <h3 className="font-bold text-[var(--text-main)] flex items-center">
                <Maximize2 className="icon-md mr-2 text-[var(--color-primary)]" /> 
                快速对比预览 <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selectedAssets.length} 项选择</span>
              </h3>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-gray-100 rounded-[var(--radius-lg)] transition-colors">
                <X className="icon-md" />
              </button>
            </div>
            <div className="flex-1 p-[var(--spacing-lg)] overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)] h-full overflow-y-auto no-scrollbar pb-6">
                  {selectedAssets.map(id => {
                     const asset = initialAssets.find(a => a.id === id);
                     if (!asset) return null;
                     return (
                       <div key={asset.id} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden flex flex-col shadow-sm group">
                         <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center border-b border-[var(--border-color)] relative">
                            {getIcon(asset.type)}
                            {asset.type === 'image' && <span className="mt-3 text-xs text-gray-400">Image Asset</span>}
                            {asset.type === 'video' && <span className="mt-3 text-xs text-gray-400">Video Asset</span>}
                         </div>
                         <div className="p-4 bg-[var(--bg-panel)]">
                           <h4 className="font-bold text-[var(--text-main)] text-sm truncate" title={asset.name}>{asset.name}</h4>
                           <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                             <div className="bg-gray-50 rounded p-2 text-center border border-[var(--border-color)]">
                               <span className="block text-gray-400 mb-0.5 scale-90">大小</span>
                               <span className="font-bold text-gray-700">{asset.size}</span>
                             </div>
                             <div className="bg-gray-50 rounded p-2 text-center border border-[var(--border-color)]">
                               <span className="block text-gray-400 mb-0.5 scale-90">修改日期</span>
                               <span className="font-bold text-gray-700">{asset.date}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                  })}
               </div>
            </div>
            <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-color)] flex justify-end">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors text-sm"
              >
                结束对比
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {isCleanupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCleaning && setIsCleanupOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-2xl p-[var(--spacing-lg)] animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
               <AlertTriangle className="icon-lg text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">清理临时文件 & 缓存</h3>
            <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)]">我们发现有 <strong>14 个陈旧的临时文件</strong>（例如失败的图片生成草稿、废弃的掩码区域、过期的预览压缩包），总共占用 <strong>824 MB</strong>。系统可自动清理它们释放空间。</p>
            
            <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setIsCleanupOpen(false)} 
                 disabled={isCleaning}
                 className="px-5 py-2 hover:bg-gray-50 text-gray-700 rounded-[var(--radius-lg)] font-bold text-sm transition-colors"
               >
                 取消
               </button>
               <button 
                 onClick={() => {
                   setIsCleaning(true);
                   setTimeout(() => {
                     setIsCleaning(false);
                     setIsCleanupOpen(false);
                     toast('已成功释放 824 MB 临时缓存空间！', 'success');
                   }, 2000);
                 }} 
                 disabled={isCleaning}
                 className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-[var(--radius-lg)] font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
               >
                 {isCleaning ? (
                   <>
                     <div className="icon-sm border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     <span>正在清理...</span>
                   </>
                 ) : (
                   <>
                     <Trash2 className="icon-sm" />
                     <span>确认清理 (824 MB)</span>
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
