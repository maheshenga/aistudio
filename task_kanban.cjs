const fs = require('fs');

let content = fs.readFileSync('src/components/TaskCenter.tsx', 'utf8');

const newCode = `import React, { useState } from 'react';
import { X, Play, Image as ImageIcon, Video, Clock, CheckCircle2, ChevronRight, Loader2, AlertCircle, ArrowUpDown, MoreHorizontal, Copy, Trash2, Rocket, Share2, LayoutDashboard, ListTodo } from 'lucide-react';

interface TaskCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
       case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
       case 'medium': return 'text-blue-600 bg-blue-50 border-blue-100';
       case 'low': return 'text-teal-600 bg-teal-50 border-teal-100';
       default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

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
        className="flex-1 bg-gray-50/50 rounded-2xl flex flex-col h-full border border-gray-100 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
      >
        <div className={\`p-4 border-b border-gray-100 bg-white shadow-sm flex items-center justify-between\`}>
           <h3 className="font-black text-gray-800 flex items-center tracking-wide text-sm">
              <ColumnIcon className={\`w-4 h-4 mr-2 \${color} \${columnId === 'in_progress' ? 'animate-spin' : ''}\`} />
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
               className={\`bg-white border \${draggedTaskId === task.id ? 'border-blue-400 opacity-50 shadow-none scale-95' : 'border-gray-200 shadow-sm hover:shadow-md'} rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all\`}
             >
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded tracking-wider uppercase border border-purple-100">{task.type}</span>
                   <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded border \${getPriorityColor(task.priority)} uppercase tracking-wider\`}>
                      {getPriorityLabel(task.priority)}
                   </span>
                </div>
                <h4 className="text-[13px] font-bold text-gray-900 leading-tight mb-2">{task.title}</h4>
                <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                   <span>ID: {task.id}</span>
                </div>
             </div>
           ))}
           {kanbanTasks.filter(t => t.column === columnId).length === 0 && (
             <div className="h-24 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium">
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
      <div className={\`fixed inset-y-0 right-0 \${viewMode === 'kanban' ? 'w-[1000px]' : 'w-[440px]'} bg-[#F8F9FA] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col \${isOpen ? 'translate-x-0' : 'translate-x-full'}\`}>
        <div className="flex items-center justify-between p-5 lg:p-6 border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center space-x-4">
             <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                   任务调度中心 <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide">Beta</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">全局队列与自动化任务管理器</p>
             </div>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={\`p-1.5 rounded-md transition-colors \${viewMode==='list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}\`}><ListTodo className="w-4 h-4"/></button>
                <button onClick={() => setViewMode('kanban')} className={\`p-1.5 rounded-md transition-colors \${viewMode==='kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}\`}><LayoutDashboard className="w-4 h-4"/></button>
             </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col p-5 lg:p-6">
           {viewMode === 'kanban' ? (
             <div className="flex-1 flex gap-4 overflow-x-auto min-w-0">
               {renderKanbanColumn('todo', '待处理 (To Do)', 'text-gray-500')}
               {renderKanbanColumn('in_progress', '进行中 (In Progress)', 'text-blue-500')}
               {renderKanbanColumn('done', '已完成 (Done)', 'text-green-500')}
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar bg-[#F8F9FA] -m-5 p-5">
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-800 flex items-center tracking-wide"><div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse mr-2 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>高速渲染中</h3>
                        <button className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">全部暂停</button>
                    </div>
                </section>
                <section className="space-y-4">
                    <button className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:text-purple-600">创建新任务</button>
                </section>
             </div>
           )}
        </div>
      </div>
    </>
  );
}
`;

fs.writeFileSync('src/components/TaskCenter.tsx', newCode);
