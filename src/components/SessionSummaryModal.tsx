import React, { useState, useEffect } from 'react';
import { Clock, LayoutDashboard, CheckSquare, X, Trophy, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SessionSummaryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [sessionData, setSessionData] = useState({
    durationMins: 0,
    modulesUsed: 0,
    tasksCompleted: 0
  });

  useEffect(() => {
    if (isOpen) {
       // compute stats
       const start = sessionStorage.getItem('session_start_time');
       const elapsedMs = start ? (Date.now() - parseInt(start, 10)) : 0;
       const durationMins = Math.floor(elapsedMs / 60000);
       
       const modulesUsedStr = sessionStorage.getItem('session_modules_used');
       const modulesUsed = modulesUsedStr ? JSON.parse(modulesUsedStr).length : 1;
       
       const tasksStr = sessionStorage.getItem('session_tasks_completed');
       const tasksCompleted = tasksStr ? parseInt(tasksStr, 10) : 0;

       setSessionData({ durationMins, modulesUsed, tasksCompleted });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl border border-[var(--border-color)] w-full max-w-sm overflow-hidden"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-center relative overflow-hidden">
           <div className="absolute top-4 right-4 flex gap-2">
             <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                <X className="w-5 h-5" />
             </button>
           </div>
           <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 transform rotate-3 backdrop-blur-md border border-white/30">
              <Trophy className="w-8 h-8 text-white" />
           </div>
           <h2 className="text-2xl font-black text-white tracking-tight">Session Summary</h2>
           <p className="text-indigo-100 text-sm mt-1 font-medium">Here relates your workspace performance.</p>
        </div>
        
        <div className="p-6">
           <div className="grid gap-3">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-[16px] border border-[var(--border-color)] group hover:border-blue-300 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                       <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Session Time</p>
                      <p className="text-[16px] font-black text-[var(--text-main)] leading-none mt-1">{sessionData.durationMins} <span className="text-[12px] font-semibold text-gray-400">mins</span></p>
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-[16px] border border-[var(--border-color)] group hover:border-purple-300 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                       <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Modules Used</p>
                      <p className="text-[16px] font-black text-[var(--text-main)] leading-none mt-1">{sessionData.modulesUsed} <span className="text-[12px] font-semibold text-gray-400">modules</span></p>
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-[16px] border border-[var(--border-color)] group hover:border-emerald-300 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                       <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Tasks Done</p>
                      <p className="text-[16px] font-black text-[var(--text-main)] leading-none mt-1">{sessionData.tasksCompleted} <span className="text-[12px] font-semibold text-gray-400">tasks</span></p>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-[var(--bg-hover)] text-[var(--text-main)] text-sm font-bold rounded-[var(--radius-lg)] hover:bg-gray-200 transition-colors">
                Close
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
