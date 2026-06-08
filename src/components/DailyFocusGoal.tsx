import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

export function DailyFocusGoal() {
  const [goal, setGoal] = useState('');
  const [isSetting, setIsSetting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const savedGoal = localStorage.getItem('daily_focus_goal');
    if (savedGoal) {
      setGoal(savedGoal);
    } else {
      setIsSetting(true);
    }
  }, []);

  // Sync tasks to progress
  useEffect(() => {
    const checkTasks = () => {
      const stored = localStorage.getItem('tasks');
      if (stored) {
        try {
          const tasks = JSON.parse(stored);
          const total = tasks.length;
          const completed = tasks.filter((t: any) => t.status === 'done').length;
          setProgress(total === 0 ? 0 : Math.round((completed / total) * 100));
        } catch(e) {}
      }
    };
    checkTasks();
    window.addEventListener('tasks_updated', checkTasks);
    // Also set an interval to catch out-of-band updates
    const interval = setInterval(checkTasks, 2000);
    return () => {
      window.removeEventListener('tasks_updated', checkTasks);
      clearInterval(interval);
    };
  }, []);

  const saveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    localStorage.setItem('daily_focus_goal', goal);
    setIsSetting(false);
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)] flex flex-col justify-center animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-black tracking-tight text-[var(--text-main)] flex items-center">
          <Target className="icon-md mr-2 text-red-500" />
          Daily Focus Goal
        </h3>
        {!isSetting && goal && (
          <button 
            onClick={() => setIsSetting(true)} 
            className="text-[11px] font-bold text-gray-400 hover:text-[var(--color-primary)] transition-colors"
          >
            Edit Goal
          </button>
        )}
      </div>

      {isSetting ? (
        <form onSubmit={saveGoal} className="flex gap-3">
          <input 
            type="text" 
            autoFocus
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What is your ONE primary objective today?"
            className="flex-1 bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm font-bold text-[var(--text-main)] placeholder:text-gray-400 placeholder:font-medium focus:bg-[var(--bg-panel)] transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white rounded-[var(--radius-lg)] text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm">
            Set Goal
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-md)]">
           <div className="bg-red-50 border border-red-100 rounded-[var(--radius-lg)] px-5 py-4 text-[15px] font-bold text-red-800 flex items-start gap-3">
             <CheckCircle2 className={`icon-md flex-shrink-0 ${progress === 100 ? 'text-green-500' : 'text-red-400 opacity-50'}`} />
             <span className={progress === 100 ? 'line-through opacity-50' : ''}>{goal}</span>
           </div>
           
           <div>
             <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)]">Related Task Progress</span>
                <span className="text-[11px] font-bold text-[var(--text-main)]">{progress}%</span>
             </div>
             <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-1000 ease-out rounded-full"
                 style={{ width: `${progress}%` }}
               />
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
