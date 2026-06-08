import { useState, useEffect } from 'react';

export function useDeveloperMode() {
  const [isDevMode, setIsDevMode] = useState(() => {
    return localStorage.getItem('developer_mode') === 'true';
  });

  const toggleDevMode = () => {
    setIsDevMode(prev => {
      const next = !prev;
      localStorage.setItem('developer_mode', String(next));
      window.dispatchEvent(new CustomEvent('devModeChanged', { detail: next }));
      return next;
    });
  };

  useEffect(() => {
    const handleDevModeEvent = (e: any) => {
      setIsDevMode(e.detail);
    };
    window.addEventListener('devModeChanged', handleDevModeEvent);
    return () => window.removeEventListener('devModeChanged', handleDevModeEvent);
  }, []);

  return { isDevMode, toggleDevMode };
}
