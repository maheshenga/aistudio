import React, { useEffect, useState } from 'react';

export function TopProgressBar({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress(p => Math.min(p + (Math.random() * 10), 90));
      }, 150);
    } else if (progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 400); 
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[99999] h-[3px] pointer-events-none">
      <div 
        className="h-full bg-[var(--color-primary)] transition-all duration-200 ease-out shadow-[0_0_10px_#2563eb]"
        style={{ 
          width: `${progress}%`, 
          opacity: progress === 100 ? 0 : 1, 
          transition: progress === 100 ? 'width 0.2s ease-out, opacity 0.4s ease-out' : 'width 0.2s ease-out' 
        }}
      />
    </div>
  );
}
