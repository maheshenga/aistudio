import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type ActionPayload = any;

export interface UndoRedoContextType {
  pushAction: (moduleId: string, action: { undo: () => void, redo: () => void }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<{ undo: () => void, redo: () => void }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const pushAction = useCallback((moduleId: string, action: { undo: () => void, redo: () => void }) => {
    setHistory(prev => {
      const current = prev.slice(0, currentIndex + 1);
      return [...current, action];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex >= 0) {
      history[currentIndex].undo();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      history[currentIndex + 1].redo();
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // Prevent default only if we are not focused on an input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider value={{ pushAction, undo, redo, canUndo: currentIndex >= 0, canRedo: currentIndex < history.length - 1 }}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export const useUndoRedo = () => {
  const context = useContext(UndoRedoContext);
  if (!context) throw new Error("useUndoRedo must be used within an UndoRedoProvider");
  return context;
};
