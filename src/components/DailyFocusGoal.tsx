import React, { useState, useEffect, useMemo } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { calculateTaskCompletion, loadWorkspaceTasks } from '../lib/data/taskRepository';

export function DailyFocusGoal() {
  const session = useSaasSession();
  const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const settingContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [goal, setGoal] = useState('');
  const [isSetting, setIsSetting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const savedGoal = getSetting('daily_focus_goal', '', settingContext);
    if (savedGoal) {
      setGoal(savedGoal);
    } else {
      setIsSetting(true);
    }
  }, [settingContext]);

  // Sync tasks to progress
  useEffect(() => {
    const checkTasks = () => {
      const tasks = loadWorkspaceTasks(taskContext);
      setProgress(calculateTaskCompletion(tasks).percent);
    };
    const handleTasksUpdated = (event: Event) => {
      const workspaceId = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (workspaceId && workspaceId !== taskContext.workspaceId) return;
      checkTasks();
    };

    checkTasks();
    window.addEventListener('tasks_updated', handleTasksUpdated);
    // Also set an interval to catch out-of-band updates
    const interval = setInterval(checkTasks, 2000);
    return () => {
      window.removeEventListener('tasks_updated', handleTasksUpdated);
      clearInterval(interval);
    };
  }, [taskContext]);

  const saveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const nextGoal = goal.trim();
    if (!nextGoal) return;
    saveSetting('daily_focus_goal', nextGoal, settingContext);
    logAuditEvent({
      action: 'settings_change',
      targetType: 'settings',
      targetId: 'daily_focus_goal',
      metadata: {
        key: 'daily_focus_goal',
        valueLength: nextGoal.length,
      },
    }, { session });
    setGoal(nextGoal);
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
