import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';
import { toast } from './Toast';

export function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      setSessionCount(c => c + 1);
      toast('Focus session completed! Time for a short break.', 'success');
      setTimeLeft(5 * 60); // 5 min break
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)] flex items-center justify-between animate-in fade-in duration-500">
      <div className="flex items-center gap-[var(--spacing-md)]">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
           {isRunning ? <Zap className="icon-md text-blue-500 animate-pulse" /> : <Coffee className="icon-md text-blue-500" />}
        </div>
        <div>
          <h3 className="text-[16px] font-black tracking-tight text-[var(--text-main)] flex items-center">
            Focus Session
          </h3>
          <p className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">
            {sessionCount > 0 ? `${sessionCount} sessions completed today` : 'Start your first 25m focus block'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-[var(--spacing-md)] text-[var(--text-main)] font-mono text-[var(--text-main)]xl font-black tracking-tighter">
        <span>{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</span>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={toggleTimer} 
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isRunning ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
           >
             {isRunning ? <Pause className="icon-sm fill-current" /> : <Play className="icon-sm fill-current" />}
           </button>
           <button 
             onClick={resetTimer} 
             className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-[var(--border-color)] text-gray-600 transition-colors"
           >
             <RotateCcw className="icon-sm" />
           </button>
        </div>
      </div>
    </div>
  );
}
