import { useEffect, useRef } from 'react';

interface ModuleTime {
  [moduleId: string]: number; // seconds
}

export function useModuleTimeTracker(activeModule: string) {
  const currentModule = useRef(activeModule);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Save previous module time
    const saveTime = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime.current) / 1000);
      
      if (elapsedSeconds > 0) {
        try {
          const stored = localStorage.getItem('module_time_tracker');
          const data: ModuleTime = stored ? JSON.parse(stored) : {};
          
          data[currentModule.current] = (data[currentModule.current] || 0) + elapsedSeconds;
          localStorage.setItem('module_time_tracker', JSON.stringify(data));
        } catch (e) {
          console.error("Failed to save module time", e);
        }
      }
    };

    saveTime();
    
    // Switch to new module
    currentModule.current = activeModule;
    startTime.current = Date.now();

    // Also save periodically or on unmount
    const interval = setInterval(saveTime, 60000); // save every minute
    
    return () => {
      clearInterval(interval);
      saveTime();
    };
  }, [activeModule]);
}
