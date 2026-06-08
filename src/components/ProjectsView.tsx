import React, { useState } from 'react';
import { Package, MoreVertical, Plus, Star, Link as LinkIcon, Share2, Search, Filter, Calendar } from 'lucide-react';

const initialProjects = [
  { id: 1, name: '2026 春季大促视觉', type: '混合作品', status: '活跃', updated: '2 小时前', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80', isFav: true },
  { id: 2, name: 'AI 教育行业解决方案', type: '文档与演示', status: '已归档', updated: '3 天前', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80', isFav: false },
  { id: 3, name: '数字人代言人矩阵', type: '视频合集', status: '活跃', updated: '上周', image: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80', isFav: true },
  { id: 4, name: '海外社媒运营 Q2', type: '多模式方案', status: '草稿', updated: '5 分钟前', image: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&w=400&q=80', isFav: false },
];

export function ProjectsView() {
  const [projects, setProjects] = useState(initialProjects);
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDraggedOverId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverId(null);
  };

  const handleDrop = (e: React.DragEvent, projectId: number) => {
    e.preventDefault();
    setDraggedOverId(null);
    const assetId = e.dataTransfer.getData('text/plain');
    if (assetId) {
      alert(`已将资产 ${assetId} 关联到项目 (ID: ${projectId})`);
    }
  };

  return (
    <div className="p-[var(--spacing-lg)] max-w-[1600px] mx-auto space-y-8 bg-[var(--bg-panel)] min-h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            我的数字资产保险库
            <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm border border-blue-200 uppercase tracking-widest flex items-center">
              个人AI Knowledge
            </span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">统一沉淀一人公司的全模态创意资产，作为 Agent 集群执行的私有化数据基座与灵感源。</p>
        </div>
        <div className="flex flex-wrap items-center space-x-4 mt-4 sm:mt-0">
          <div className="relative group">
            <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--text-main)] transition-colors" />
            <input 
              type="text" 
              placeholder="在我的资产中搜索..." 
              className="pl-9 pr-4 py-2 bg-[#F1F3F4] border-transparent focus:bg-[var(--bg-panel)] border rounded-full text-sm font-medium focus:outline-none focus:border-gray-900 w-64 transition-all shadow-sm"
            />
          </div>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] p-2 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center">
             <Filter className="icon-sm" />
          </button>
          <button className="flex items-center space-x-1.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg">
            <Plus className="icon-sm" />
            <span>新建内容资产包</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-color)]">
        <button className="border-b-[3px] border-gray-900 text-[var(--text-main)] font-bold px-4 py-3 text-[14px]">精选推荐与最近活跃</button>
        <button className="border-b-[3px] border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold px-4 py-3 text-[14px] transition-colors">我星标的 (2)</button>
        <button className="border-b-[3px] border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold px-4 py-3 text-[14px] transition-colors">Agent 专用引擎库</button>
        <button className="border-b-[3px] border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold px-4 py-3 text-[14px] transition-colors">已归档历史项目</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[var(--spacing-md)] pt-2">
        {projects.map(proj => (
          <div 
             key={proj.id} 
             onDragOver={(e) => handleDragOver(e, proj.id)}
             onDragLeave={handleDragLeave}
             onDrop={(e) => handleDrop(e, proj.id)}
             className={`bg-[var(--bg-panel)] rounded-[24px] border ${draggedOverId === proj.id ? 'border-blue-500 ring-4 ring-blue-500/20 scale-[1.02]' : 'border-[var(--border-color)]'} shadow-sm overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
          >
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
               <img src={proj.image} alt={proj.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#1F2937]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                 <div className="flex gap-2">
                   <button className="bg-[var(--bg-panel)]/20 backdrop-blur-md p-2 rounded-[var(--radius-lg)] hover:bg-[var(--bg-panel)]/40 transition-colors text-white tooltip" title="共享此资产"><Share2 className="icon-sm" /></button>
                   <button className="bg-[var(--bg-panel)]/20 backdrop-blur-md p-2 rounded-[var(--radius-lg)] hover:bg-[var(--bg-panel)]/40 transition-colors text-white tooltip" title="获取公开链接"><LinkIcon className="icon-sm" /></button>
                 </div>
               </div>
               <button className="absolute top-3 right-3 text-white drop-shadow-md transition-transform hover:scale-110">
                 <Star className={`icon-md ${proj.isFav ? 'fill-yellow-400 text-yellow-400' : 'opacity-80 hover:opacity-100'}`} />
               </button>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-[var(--text-main)] leading-tight pr-2 text-[15px] group-hover:text-black transition-colors">{proj.name}</h3>
                <button className="text-gray-400 hover:text-gray-600  p-1 rounded-full"><MoreVertical className="icon-sm" /></button>
              </div>
              <div className="flex items-center text-[12px] text-[var(--text-muted)] mb-5 space-x-2 font-medium">
                <span className="flex items-center"><Package className="w-3.5 h-3.5 mr-1 text-gray-400" /> {proj.type}</span>
                <span className="text-gray-300">•</span>
                <span>更新于 {proj.updated}</span>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex -space-x-2">
                   <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[var(--text-main)] font-bold text-[10px] z-20 shadow-sm">JW</div>
                   <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-green-700 font-bold text-[10px] z-10 shadow-sm">AT</div>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-md tracking-wider ${
                  proj.status === '活跃' ? 'bg-[#E6F4EA] text-[#1E8E3E]' :
                  proj.status === '已归档' ? 'bg-[#F1F3F4] text-gray-600' : 'bg-[#FEF7E0] text-[#B06000]'
                }`}>
                  {proj.status}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-[var(--bg-app)] border-2 border-dashed border-gray-300 rounded-[24px] flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-gray-900 transition-all cursor-pointer min-h-[280px] group hover:bg-gray-100/50">
          <div className="p-4 bg-[var(--bg-panel)] rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
            <Plus className="icon-lg" />
          </div>
          <p className="font-bold text-[15px]">创建新内容包</p>
        </div>
      </div>
      
      {/* Graphical Timeline Visualization */}
      <div className="mt-12 pt-10 border-t border-[var(--border-color)] pb-10">
        <h3 className="text-lg font-black text-[var(--text-main)] mb-[var(--spacing-xl)] flex items-center">
          <Calendar className="icon-md mr-2 text-[var(--color-primary)]" />
          项目进度里程碑
        </h3>
        <div className="relative max-w-4xl mx-auto px-10">
          <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-100 -translate-y-1/2 rounded-full"></div>
          <div className="absolute top-1/2 left-0 w-1/2 h-1.5 bg-[var(--color-primary)] -translate-y-1/2 rounded-l-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
          <div className="flex justify-between items-center relative z-10">
            {projects.map((proj, idx) => (
              <div key={proj.id} className="flex flex-col items-center group relative cursor-pointer">
                <div className={`icon-md rounded-full border-[5px] border-white shadow-md mb-4 transition-transform group-hover:scale-125 duration-300 ${proj.status === '活跃' ? 'bg-[var(--color-primary)]' : proj.status === '已归档' ? 'bg-gray-400' : 'bg-yellow-500'}`}></div>
                <div className="bg-[var(--bg-panel)] p-3 rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] w-36 flex flex-col items-center text-center absolute top-10 opacity-70 group-hover:opacity-100 group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                  <span className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">{proj.type}</span>
                  <span className="text-xs font-black text-[var(--text-main)] line-clamp-2 leading-tight">{proj.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
