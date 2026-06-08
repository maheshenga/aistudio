import React, { useState, useEffect } from 'react';
import { X, Play, Image as ImageIcon, Video, Clock, CheckCircle2, ChevronRight, Loader2, AlertCircle, ArrowUpDown, MoreHorizontal, Copy, Trash2, Rocket, Share2, LayoutDashboard, ListTodo, Tag, UserPlus, Check } from 'lucide-react';
import { toast } from './Toast';

interface TaskCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialScheduledTasks = [
  { id: 1, title: '双11活动主图批量生成', time: '将于 2 小时后触发 (21:30)', dueDate: new Date(Date.now() + 2 * 3600 * 1000), priority: 'high', type: '电商图像' },
  { id: 2, title: '小红书矩阵防封群发任务', time: '明天 02:00 (自动重复)', dueDate: new Date(Date.now() + 8 * 3600 * 1000), priority: 'medium', type: '社群营销' },
  { id: 3, title: '无效素材自动清理回收', time: '本周日 23:59', dueDate: new Date(Date.now() + 48 * 3600 * 1000), priority: 'low', type: '系统运维' },
];

const initialKanbanTasks = [
  { id: 'k1', title: '双11主图生成', column: 'todo', priority: 'high', type: '电商图像' },
  { id: 'k2', title: '失效素材清理', column: 'todo', priority: 'low', type: '系统运维' },
  { id: 'k3', title: '品牌宣传片合成 (4K)', column: 'in_progress', priority: 'high', type: '视频渲染' },
  { id: 'k4', title: '小红书群发任务', column: 'in_progress', priority: 'medium', type: '社群营销' },
  { id: 'k5', title: '100个短视频切片', column: 'done', priority: 'medium', type: '视频处理' },
];

export function TaskCenter({ isOpen, onClose }: TaskCenterProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [kanbanTasks, setKanbanTasks] = useState(initialKanbanTasks);
  const [scheduledTasks, setScheduledTasks] = useState(initialScheduledTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');

  useEffect(() => {
    const handleSyncTasks = (e: Event) => {
      const customEvent = e as CustomEvent;
      const crmTasks = customEvent.detail;
      if (Array.isArray(crmTasks)) {
        // Add to kanban
        const newKanbanTasks = crmTasks.map((c, i) => ({
          id: `crm-${Date.now()}-${i}`,
          title: `[客户跟进] ${c.name} - ${c.company}`,
          column: 'todo',
          priority: 'high',
          type: '客户维系'
        }));
        setKanbanTasks(prev => [...newKanbanTasks, ...prev]);

        // Add to scheduled list
        const newScheduledTasks = crmTasks.map((c, i) => ({
          id: Date.now() + i,
          title: `[客户跟进] ${c.name} 预约跟进临期`,
          time: '今天内完成',
          dueDate: new Date(Date.now() + 1 * 3600 * 1000),
          priority: 'high',
          type: '客户维系'
        }));
        setScheduledTasks(prev => [...newScheduledTasks, ...prev]);
      }
    };

    window.addEventListener('SYNC_CRM_TASKS', handleSyncTasks);
    return () => {
      window.removeEventListener('SYNC_CRM_TASKS', handleSyncTasks);
    };
  }, []);

  
  const toggleSelection = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(t => t !== taskId) : [...prev, taskId]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
       case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
       case 'medium': return 'text-[var(--color-primary)] bg-blue-50 border-blue-100';
       case 'low': return 'text-teal-600 bg-teal-50 border-teal-100';
       default: return 'text-gray-600 bg-gray-50 border-[var(--border-color)]';
    }
  };

  const priorityWeight = { high: 3, medium: 2, low: 1 };

  const sortedTasks = [...scheduledTasks].sort((a, b) => {
     if (sortBy === 'priority') {
        const diff = priorityWeight[b.priority as keyof typeof priorityWeight] - priorityWeight[a.priority as keyof typeof priorityWeight];
        if (diff !== 0) return diff;
        return a.dueDate.getTime() - b.dueDate.getTime();
     } else {
        const diff = a.dueDate.getTime() - b.dueDate.getTime();
        if (diff !== 0) return diff;
        return priorityWeight[b.priority as keyof typeof priorityWeight] - priorityWeight[a.priority as keyof typeof priorityWeight];
     }
  });

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
       case 'high': return '高优';
       case 'medium': return '中优';
       case 'low': return '低优';
       default: return '普通';
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      setKanbanTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, column } : t));
    }
    setDraggedTaskId(null);
  };

  const renderKanbanColumn = (columnId: string, title: string, color: string) => {
    const ColumnIcon = columnId === 'todo' ? Clock : columnId === 'in_progress' ? Loader2 : CheckCircle2;
    return (
      <div 
        className="flex-1 bg-gray-50/50 rounded-[var(--radius-xl)] flex flex-col h-full border border-[var(--border-color)] overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
      >
        <div className={`p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm flex items-center justify-between`}>
           <h3 className="font-black text-[var(--text-main)] flex items-center tracking-wide text-sm">
              <ColumnIcon className={`icon-sm mr-2 ${color} ${columnId === 'in_progress' ? 'animate-spin' : ''}`} />
              {title}
           </h3>
           <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {kanbanTasks.filter(t => t.column === columnId).length}
           </span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
           {kanbanTasks.filter(t => t.column === columnId).map(task => (
             <div 
               key={task.id}
               draggable
               onDragStart={(e) => handleDragStart(e, task.id)}
               className={`bg-[var(--bg-panel)] border ${draggedTaskId === task.id ? 'border-blue-400 opacity-50 shadow-none scale-95' : 'border-[var(--border-color)] shadow-sm hover:shadow-md'} rounded-[var(--radius-lg)] p-3 cursor-grab active:cursor-grabbing transition-all`}
             >
                <div className="flex justify-between items-start mb-2 relative">
                    <div className="flex items-center">
                       <div 
                         onClick={(e) => toggleSelection(task.id, e)}
                         className={`w-4 h-4 mr-2 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedTasks.includes(task.id) ? 'bg-[var(--color-primary)] border-blue-600 shadow-sm' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                       >
                         {selectedTasks.includes(task.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                       </div>
                       <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded tracking-wider uppercase border border-purple-100">{task.type}</span>
                    </div>
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)} uppercase tracking-wider`}>
                      {getPriorityLabel(task.priority)}
                   </span>
                </div>
                <h4 className="text-[13px] font-bold text-[var(--text-main)] leading-tight mb-2">{task.title}</h4>
                <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                   <span>ID: {task.id}</span>
                </div>
             </div>
           ))}
           {kanbanTasks.filter(t => t.column === columnId).length === 0 && (
             <div className="h-24 flex items-center justify-center text-gray-400 border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-lg)] text-xs font-medium">
               拖拽任务至此
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />}
      <div className={`fixed inset-y-0 right-0 ${viewMode === 'kanban' ? 'w-[1000px]' : 'w-[440px]'} bg-[var(--bg-app)] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 lg:p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm z-10">
          <div className="flex items-center space-x-4">
             <div>
                <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center">
                   任务调度中心 <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide">Beta</span>
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">全局队列与自动化任务管理器</p>
             </div>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode==='list' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>列表</button>
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode==='kanban' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>看板</button>
             </div>
          </div>
          <button onClick={onClose} className="p-2  text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X className="icon-md" /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col p-5 lg:p-[var(--spacing-lg)]">
           {viewMode === 'kanban' ? (
             <div className="flex-1 flex flex-col min-w-0">
               {selectedTasks.length > 0 && (
                 <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center text-sm font-bold text-blue-800">
                     <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                     {selectedTasks.length} 个任务已选择
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedTasks([]); toast(`已为 ${selectedTasks.length} 个任务添加标签`, 'success'); }} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors flex items-center"><Tag className="w-3.5 h-3.5 mr-1" /> Label</button>
                      <button onClick={() => { setSelectedTasks([]); toast(`已指派 ${selectedTasks.length} 个任务`, 'success'); }} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors flex items-center"><UserPlus className="w-3.5 h-3.5 mr-1" /> Assign</button>
                      <button onClick={() => { setSelectedTasks([]); toast(`已删除 ${selectedTasks.length} 个任务`, 'success'); }} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors flex items-center"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</button>
                   </div>
                 </div>
               )}
               <div className="flex-1 flex gap-[var(--spacing-md)] overflow-x-auto min-w-0">
                 {renderKanbanColumn('todo', '待处理 (To Do)', 'text-[var(--text-muted)]')}
                 {renderKanbanColumn('in_progress', '进行中 (In Progress)', 'text-blue-500')}
                 {renderKanbanColumn('done', '已完成 (Done)', 'text-green-500')}
               </div>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar bg-[var(--bg-app)] -m-5 p-5">
             
          <section className="space-y-[var(--spacing-md)]">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center tracking-wide">
                   <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse mr-2 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                   高速渲染中 (2)
                </h3>
                <button className="text-xs text-[var(--color-primary)] hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded transition-colors">全部暂停</button>
             </div>
             
             <div className="space-y-3">
                <div className="bg-[var(--bg-panel)] border-2 border-blue-100 rounded-[var(--radius-xl)] p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                   <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300" style={{ width: '68%' }}></div>
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                         <div className="p-2 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-lg)] mr-3 shadow-inner"><Video className="icon-md" /></div>
                         <div>
                            <p className="text-[14px] font-bold text-[var(--text-main)]">品牌宣传片合成 (4K 超清)</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px] font-medium">Prompt: 写实风格的高级时尚发布会视频...</p>
                         </div>
                      </div>
                      <span className="text-sm font-black text-[var(--color-primary)] tracking-tight">68%</span>
                   </div>
                   <div className="flex items-center justify-between mt-4 text-xs pt-3 border-t border-gray-50">
                      <span className="text-gray-600 font-medium flex items-center bg-gray-50 px-2 py-1 rounded-md"><Loader2 className="w-3 h-3 mr-1.5 animate-spin text-blue-500" /> 预计剩余 12s</span>
                      <div className="flex space-x-2">
                         <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] px-2 py-1 rounded text-[11px] font-bold">挂起</button>
                         <button className="text-[var(--text-muted)] hover:text-red-600 border border-[var(--border-color)] px-2 py-1 rounded text-[11px] font-bold">取消</button>
                      </div>
                   </div>
                </div>

                <div className="bg-[var(--bg-panel)] border hover:border-green-200 rounded-[var(--radius-xl)] p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                   <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300" style={{ width: '15%' }}></div>
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                         <div className="p-2 bg-green-50 text-green-600 rounded-[var(--radius-lg)] mr-3"><ImageIcon className="icon-md" /></div>
                         <div>
                            <p className="text-[14px] font-bold text-[var(--text-main)]">批量电商详情图 AI 扩展</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium bg-gray-50 px-1 inline-block rounded">任务总数: 4/25 张</p>
                         </div>
                      </div>
                      <span className="text-sm font-black text-green-600">15%</span>
                   </div>
                   <div className="flex items-center justify-between mt-4 text-xs pt-3 border-t border-gray-50">
                      <span className="text-gray-600 font-medium flex items-center bg-gray-50 px-2 py-1 rounded-md"><Loader2 className="w-3 h-3 mr-1.5 animate-spin text-green-500" /> 预计剩余 1m 30s</span>
                      <div className="flex space-x-2">
                         <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] px-2 py-1 rounded text-[11px] font-bold">查看详情</button>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <section className="space-y-[var(--spacing-md)]">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center tracking-wide">
                   <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                   自动化策略 ({sortedTasks.length})
                </h3>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
                     className="flex items-center text-[11px] text-gray-600 hover:text-[var(--text-main)] font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm px-2 py-1 rounded-md transition-colors"
                   >
                     <ArrowUpDown className="w-3 h-3 mr-1" />
                     {sortBy === 'dueDate' ? '优先级排序' : '时间排序'}
                   </button>
                </div>
             </div>
             <div className="space-y-3">
                {sortedTasks.map(task => (
                  <div key={task.id} className="bg-[var(--bg-panel)] border-l-4 border-l-purple-400 border-y border-r border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                           <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded tracking-wider uppercase mr-2 border border-purple-100">{task.type}</span>
                           <h4 className="text-[14px] font-bold text-[var(--text-main)] leading-tight">{task.title}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)} uppercase tracking-wider`}>
                           {getPriorityLabel(task.priority)}
                        </span>
                     </div>
                     <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-xs font-medium text-[var(--text-muted)]">
                           <Clock className="w-3.5 h-3.5 mr-1" /> {task.time}
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-1.5 hover:bg-gray-100 rounded text-[var(--text-muted)] hover:text-purple-600"><Play className="w-3.5 h-3.5" /></button>
                           <button className="p-1.5 hover:bg-gray-100 rounded text-[var(--text-muted)] hover:text-[var(--color-primary)]"><Copy className="w-3.5 h-3.5" /></button>
                           <button className="p-1.5 hover:bg-gray-100 rounded text-[var(--text-muted)] hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
             <button className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] text-sm font-bold text-[var(--text-muted)] hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-center">
                <Rocket className="icon-sm mr-2" /> 创建新的自动化流水线
             </button>
          </section>

          <section className="space-y-[var(--spacing-md)] pt-4 border-t border-[var(--border-color)]/60">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center tracking-wide">
                   <CheckCircle2 className="icon-sm text-gray-400 mr-2" />
                   近期归档记录
                </h3>
             </div>
             <div className="space-y-[var(--spacing-md)] relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-gray-200 ml-1 mt-2">
                <div className="relative pl-8">
                   <div className="absolute left-[8px] top-1.5 w-2 h-2 rounded-full bg-green-500 ring-4 ring-[#F8F9FA] outline outline-1 outline-green-200"></div>
                   <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-3 rounded-lg shadow-sm">
                      <p className="text-[13px] font-bold text-[var(--text-main)]">100 个全自动混剪视频已成功导出</p>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[10px] text-[var(--text-muted)] font-medium">15 分钟前 · 耗时 4m 20s</span>
                         <button className="text-[10px] font-bold text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors flex items-center"><Share2 className="w-3 h-3 mr-1" /> 分发外包</button>
                      </div>
                   </div>
                </div>
                <div className="relative pl-8">
                   <div className="absolute left-[8px] top-1.5 w-2 h-2 rounded-full bg-red-400 ring-4 ring-[#F8F9FA] outline outline-1 outline-red-200"></div>
                   <div className="bg-[var(--bg-panel)] border border-red-100 p-3 rounded-lg shadow-sm">
                      <p className="text-[13px] font-bold text-[var(--text-main)] flex items-center">直播流智能切片获取失败 <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-1.5" /></p>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">2 小时前 · Error: 推流地址超时</span>
                         <button className="text-[10px] font-bold text-[var(--color-primary)] hover:bg-blue-50 px-2 py-1 rounded transition-colors">重新重试</button>
                      </div>
                   </div>
                </div>
             </div>
          </section>
             </div>
           )}
        </div>
      </div>
    </>
  );
}
