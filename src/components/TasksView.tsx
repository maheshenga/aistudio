import React, { useState, useMemo } from 'react';
import { AlignLeft, LayoutGrid, Clock, MoreHorizontal, CheckCircle2, Circle, Plus, X, PieChart, BarChart2, Bot, Play, Zap } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const columns = [
  { id: 'todo', title: '待处理', color: 'bg-gray-100' },
  { id: 'in_progress', title: '进行中', color: 'bg-blue-50' },
  { id: 'auto_exec', title: '自动执行中', color: 'bg-purple-50' },
  { id: 'review', title: '审核中', color: 'bg-amber-50' },
  { id: 'done', title: '已完成', color: 'bg-green-50' }
];

const initialTasks = [
  { id: 1, title: '双11营销主图批量生成', col: 'auto_exec', priority: 'High', type: '自动化', date: '执行中 (68%)', isAuto: true },
  { id: 2, title: '生成小红书 Q3 营销文案', col: 'todo', priority: 'Medium', type: '文案', date: '明天', isAuto: false },
  { id: 3, title: '渲染极简风家装 3D 效果图', col: 'auto_exec', priority: 'High', type: '家装设计', date: '渲染中 (32%)', isAuto: true },
  { id: 4, title: '提取会议纪要并撰写大纲', col: 'in_progress', priority: 'Low', type: '文案', date: '今天', isAuto: false },
  { id: 5, title: '审核赛博朋克风包装设计稿', col: 'review', priority: 'High', type: '包装设计', date: '即将过期', isAuto: false },
  { id: 6, title: '秋冬打版虚拟模特上身模拟', col: 'todo', priority: 'Medium', type: '服装设计', date: '明天', isAuto: true }
];

export function TasksView() {
  const [tasks, setTasks] = useState(initialTasks);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'analytics'>('board');

  const analyticsData = useMemo(() => {
    const statusData = [
      { name: '待处理', value: tasks.filter(t => t.col === 'todo').length },
      { name: '进行中', value: tasks.filter(t => t.col === 'in_progress').length },
      { name: '自动执行', value: tasks.filter(t => t.col === 'auto_exec').length },
      { name: '审核中', value: tasks.filter(t => t.col === 'review').length },
      { name: '已完成', value: tasks.filter(t => t.col === 'done').length }
    ].filter(d => d.value > 0);
    
    const userData = [
      { name: '张三', value: 2 },
      { name: '自动化引擎 (AI)', value: 1 },
      { name: '无分配', value: tasks.length > 3 ? tasks.length - 3 : 0 }
    ].filter(d => d.value > 0);

    return { statusData, userData };
  }, [tasks]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      col: 'todo',
      priority: 'Medium',
      type: '常规',
      date: '待定',
      isAuto: false
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const moveTask = (taskId: number, newCol: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, col: newCol } : t));
  };

  const toggleTaskSelection = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const clearSelection = () => setSelectedTaskIds([]);

  const bulkMoveTasks = (newCol: string) => {
    setTasks(tasks.map(t => selectedTaskIds.includes(t.id) ? { ...t, col: newCol } : t));
    clearSelection();
  };

  const bulkDeleteTasks = () => {
    setTasks(tasks.filter(t => !selectedTaskIds.includes(t.id)));
    clearSelection();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-stretch overflow-hidden bg-[var(--bg-app)] p-[var(--spacing-lg)] lg:px-8 animate-in fade-in duration-300 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-[var(--spacing-md)] flex-shrink-0 gap-[var(--spacing-md)] border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            全局任务调度中心 <span className="ml-3 bg-gray-100/50 text-[var(--text-main)] text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-[var(--border-color)]/50">Swarm Dispatcher</span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">统一指挥人工协作流与 Agent 智能体自动化队列，掌控全局执行状态。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="text-[13px] font-bold text-gray-600 hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] px-4 py-2 rounded-[var(--radius-lg)] shadow-sm hover:shadow transition-all hidden md:flex items-center">
            <Bot className="icon-sm mr-1.5 text-[var(--text-main)]" />
            集群自动化规则
          </button>
          <div className="flex items-center bg-[var(--bg-panel)] p-1 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
            <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors ${viewMode === 'board' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50'}`}>
              <LayoutGrid className="icon-sm mr-1.5" /> 看板矩阵
            </button>
            <button onClick={() => setViewMode('analytics')} className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors ${viewMode === 'analytics' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50'}`}>
              <PieChart className="icon-sm mr-1.5" /> 数据透视
            </button>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-[var(--radius-lg)] flex items-center transition-colors shadow-sm text-[13px]">
            <Plus className="icon-sm mr-1" /> 下发新指令
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {viewMode === 'board' && (
          <div className="flex gap-[var(--spacing-md)] h-full pb-4" >
            {columns.map(col => {
              const colTasks = tasks.filter(t => t.col === col.id);
              const isAutoCol = col.id === 'auto_exec';
              
              return (
                <div key={col.id} className={`flex-1 min-w-[280px] w-[320px] max-w-[350px] flex flex-col rounded-[var(--radius-xl)] border ${isAutoCol ? 'bg-[#E8F0FE]/50 border-blue-200' : 'bg-[#F1F3F4] border-transparent'} relative`}>
                <div className="p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-black text-[14px] flex items-center ${isAutoCol ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'}`}>
                      {isAutoCol && <Zap className="w-[14px] h-[14px] mr-1.5 text-[var(--text-main)]" fill="currentColor" />}
                      {col.title}
                    </h3>
                    <span className="bg-gray-200/80 text-gray-600 text-[11px] font-black icon-lg flex items-center justify-center rounded-full ml-1">{colTasks.length}</span>
                  </div>
                  <button className="text-gray-400 hover:bg-[var(--bg-panel)] p-1.5 rounded-full transition-colors"><MoreHorizontal className="w-[18px] h-[18px]" /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar relative">
                  {isAdding && col.id === 'todo' && (
                    <form onSubmit={handleAddTask} className="bg-[var(--bg-panel)] p-4 rounded-[var(--radius-lg)] shadow-md border border-gray-900 animate-in fade-in zoom-in duration-200">
                      <input 
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="输入任务标题..." 
                        className="w-full text-[13px] font-bold outline-none mb-3 text-[var(--text-main)] placeholder:font-medium placeholder:text-gray-400 focus:ring-0"
                      />
                      <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-700 font-bold text-xs px-2 py-1">取消</button>
                        <button type="submit" className="bg-[var(--color-primary)] text-white px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-sm">保存</button>
                      </div>
                    </form>
                  )}

                  {colTasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={(e) => toggleTaskSelection(task.id, e)}
                      className={`bg-[var(--bg-panel)] p-4 shadow-sm rounded-[var(--radius-lg)] transition-all group flex flex-col hover:-translate-y-0.5 hover:shadow-md border cursor-pointer ${
                        selectedTaskIds.includes(task.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 
                        task.isAuto ? 'border-blue-200 ring-1 ring-blue-100/50 hover:border-blue-400' : 'border-[var(--border-color)] hover:border-gray-300'
                      } relative overflow-hidden`}
                    >
                      {task.isAuto && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gray-700 to-gray-900"></div>
                      )}
                      
                      <div className="flex justify-between items-start mb-2.5 mt-0.5">
                        <div className="flex items-center space-x-2">
                           <input 
                              type="checkbox" 
                              checked={selectedTaskIds.includes(task.id)}
                              onChange={() => {}}
                              className="icon-sm rounded border-gray-300 text-[var(--color-primary)] focus:ring-blue-500 cursor-pointer"
                           />
                           <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                             task.priority === 'High' ? 'bg-[#FCE8E6] text-[#D93025] border-[#FAD2CF]' :
                             task.priority === 'Medium' ? 'bg-[#FEF7E0] text-[#B06000] border-[#FDE293]' : 'bg-gray-100 text-gray-600 border-[var(--border-color)]'
                           }`}>
                             {task.priority}
                           </span>
                        </div>
                        
                        <div className="dropdown relative">
                           <button className="text-gray-300 hover:text-gray-600 transition-colors p-1">
                             {col.id === 'done' ? <CheckCircle2 className="w-[15px] h-[15px] text-[#1E8E3E]" /> : <MoreHorizontal className="w-[15px] h-[15px]" />}
                           </button>
                           <div className="absolute right-0 top-full mt-1 bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-xl rounded-[var(--radius-lg)] py-1.5 w-36 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                             {columns.map(c => (
                               <button 
                                 key={c.id} 
                                 onClick={(e) => { e.stopPropagation(); moveTask(task.id, c.id); }}
                                 className={`w-full text-left px-4 py-2 text-[13px] font-bold transition-colors ${task.col === c.id ? 'text-[var(--text-main)] bg-gray-100/50' : 'text-gray-700 hover:bg-gray-50 hover:text-[var(--text-main)]'}`}
                               >
                                 &rarr; {c.title}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-[var(--text-main)] text-[14px] leading-snug mb-4">{task.title}</h4>
                      
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-auto pt-3 border-t border-[var(--border-color)]">
                        <span className={`px-2 py-1 rounded-md font-bold border ${task.isAuto ? 'bg-gray-100 border-gray-300 text-[var(--text-main)] flex items-center shadow-sm' : 'bg-gray-50 border-[var(--border-color)] text-gray-600'}`}>
                           {task.isAuto && <Bot className="w-3 h-3 mr-1" />}
                           {task.type}
                        </span>
                        <span className={`flex items-center font-bold ${task.isAuto ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                           {task.isAuto ? <Play className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" /> : <Clock className="w-3.5 h-3.5 mr-1" />} 
                           {task.date}
                        </span>
                      </div>
                    </div>
                  ))}

                  {col.id === 'todo' && !isAdding && (
                    <button onClick={() => setIsAdding(true)} className="w-full mt-2 py-2.5 border border-dashed border-gray-300 rounded-[12px] text-[var(--text-muted)] text-[13px] font-bold hover:border-gray-900 hover:text-[var(--text-main)] bg-transparent hover:bg-gray-100/30 transition-all flex justify-center items-center">
                      <Plus className="icon-sm mr-1" /> 添加任务
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
        
        {viewMode === 'analytics' && (
          <div className="h-full overflow-y-auto px-2 pb-10">
             <div className="grid grid-cols-2 gap-[var(--spacing-xl)] max-w-5xl">
                <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] shadow-sm border border-[var(--border-color)] flex flex-col">
                   <h3 className="text-[16px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center tracking-tight"><BarChart2 className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]"/> 任务状态分布</h3>
                   <div className="h-64 relative flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                         <RechartsPieChart>
                           <Pie
                             data={analyticsData.statusData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                             label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                           >
                              {analyticsData.statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                           <Legend />
                         </RechartsPieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                
                <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] shadow-sm border border-[var(--border-color)] flex flex-col">
                   <h3 className="text-[16px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center tracking-tight"><BarChart2 className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]"/> 人机协同分配情况</h3>
                   <div className="h-64 relative flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                         <RechartsPieChart>
                           <Pie
                             data={analyticsData.userData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                             label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                           >
                              {analyticsData.userData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                           <Legend />
                         </RechartsPieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
           <div className="flex items-center">
              <span className="bg-[var(--color-primary)] text-white icon-lg rounded-full flex justify-center items-center text-xs font-bold mr-2">{selectedTaskIds.length}</span>
              <span className="text-[13px] font-bold">已选择</span>
           </div>
           
           <div className="h-4 w-px bg-gray-700"></div>
           
           <div className="flex items-center space-x-2">
             <span className="text-gray-400 text-xs font-medium mr-2">批量移动至：</span>
             {columns.map(c => (
               <button 
                 key={c.id} 
                 onClick={() => bulkMoveTasks(c.id)}
                 className="text-[12px] font-bold bg-transparent hover:bg-[var(--bg-panel)]/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-600"
               >
                 {c.title}
               </button>
             ))}
           </div>

           <div className="h-4 w-px bg-gray-700"></div>

           <button 
             onClick={bulkDeleteTasks}
             className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors text-[12px] font-bold flex items-center"
           >
             <X className="w-3.5 h-3.5 mr-1" /> 删除任务
           </button>

           <div className="h-4 w-px bg-gray-700"></div>

           <button 
             onClick={clearSelection}
             className="text-gray-400 hover:text-white transition-colors"
             title="取消选择"
           >
             <X className="icon-md" />
           </button>
        </div>
      )}
    </div>
  );
}
