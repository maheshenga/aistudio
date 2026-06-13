import { useState, useEffect } from 'react';
import { toast } from '../components/Toast';
import { createOfflineQueueItem } from '../lib/data/offlineQueueRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export function useAutoSave<T>(key: string, initialValue: T, delay: number = 1000) {
  const session = useSaasSession();
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
          createOfflineQueueItem(
            { key, value },
            { workspaceId: session.workspace.id, userId: session.user.id },
          );
        } catch (e) {}
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, key, delay, session.user.id, session.workspace.id]);

  return { value, setValue, isSaving, lastSaved };
}

