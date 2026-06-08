import React, { useState, useEffect } from 'react';
import { toast } from '../components/Toast';

export function useSessionAutoSave<T>(key: string, initialValue: T, delay: number = 1000) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setIsSaving(true);
    
    const handler = setTimeout(() => {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
        setLastSaved(new Date());
        
        // Don't show toast on initial mount
        if (value !== initialValue) {
           // Silently save in background to avoid toast spam, or use a customized toast
           // We will just use the returned isSaving state for UI indication
        }
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, key, delay, initialValue]);

  return { value, setValue, isSaving, lastSaved };
}
