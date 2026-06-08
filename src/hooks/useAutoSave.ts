import { useState, useEffect } from 'react';
import { toast } from '../components/Toast';

export function useAutoSave<T>(key: string, initialValue: T, delay: number = 1000) {
  // Try to load from localStorage first
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setIsSaving(true);
    
    const handler = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        setLastSaved(new Date());
        
        // Don't show toast on initial mount load where value equals initialValue
        if (value !== initialValue) {
           // We do not spam toast every second for auto-saves
           // toast('Draft auto-saved successfully', 'success');
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
        toast('Failed to save draft. Added to Offline Queue.', 'error');
        try {
          const offlineQueueStr = localStorage.getItem('offline_queue');
          const offlineQueue = offlineQueueStr ? JSON.parse(offlineQueueStr) : [];
          offlineQueue.push({ id: Date.now().toString(), key, value, timestamp: new Date().toISOString() });
          localStorage.setItem('offline_queue', JSON.stringify(offlineQueue));
          window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
        } catch (e) {}
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, key, delay]);

  return { value, setValue, isSaving, lastSaved };
}

