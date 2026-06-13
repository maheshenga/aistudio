import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, StickyNote, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

interface QuickNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickNotesPanel({ isOpen, onClose }: QuickNotesPanelProps) {
  const session = useSaasSession();
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [notes, setNotes] = useState<{id: string, text: string}[]>(() =>
    getSetting<{id: string, text: string}[]>('quick_notes', [], settingsContext),
  );

  useEffect(() => {
    const refreshNotes = () => setNotes(getSetting<{id: string, text: string}[]>('quick_notes', [], settingsContext));
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== settingsContext.workspaceId) return;
      if (detail?.userId && detail.userId !== settingsContext.userId) return;
      refreshNotes();
    };

    refreshNotes();
    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [settingsContext]);

  const saveNotes = (newNotes: {id: string, text: string}[]) => {
    setNotes(newNotes);
    saveSetting('quick_notes', newNotes, settingsContext);
  };

  const addNote = () => {
    saveNotes([{ id: Date.now().toString(), text: '' }, ...notes]);
  };

  const updateNote = (id: string, text: string) => {
    saveNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-0 right-0 h-full w-80 bg-[var(--bg-panel)] border-l border-[var(--border-color)] shadow-2xl z-[150] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[#Fdfdfe]">
         <div className="flex items-center text-[var(--text-main)] font-bold">
            <StickyNote className="icon-sm mr-2 text-yellow-500" />
            Quick Notes
         </div>
         <div className="flex items-center space-x-1">
            <button onClick={addNote} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors tooltip" title="Add Note"><Plus className="icon-sm" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors tooltip" title="Close"><X className="icon-sm" /></button>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-[var(--spacing-md)] bg-gray-50/50 custom-scrollbar">
         <AnimatePresence>
            {notes.map(note => (
               <motion.div 
                  key={note.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-yellow-50 border border-yellow-200 rounded-[var(--radius-lg)] p-0 shadow-sm relative group overflow-hidden"
               >
                  <textarea 
                     value={note.text}
                     onChange={(e) => updateNote(note.id, e.target.value)}
                     className="w-full bg-transparent p-3 text-[13px] text-[var(--text-main)] focus:outline-none resize-none min-h-[100px] placeholder:text-yellow-600/40"
                     placeholder="Jot down a quick note..."
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-[var(--bg-panel)]/50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-md transition-colors shadow-sm border border-transparent hover:border-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
               </motion.div>
            ))}
         </AnimatePresence>
         {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center p-[var(--spacing-xl)] text-center text-gray-400 h-40">
               <StickyNote className="icon-xl mb-3 opacity-20" />
               <p className="text-sm font-medium">No notes yet.</p>
               <p className="text-xs mt-1">Click + to add an ephemeral note.</p>
            </div>
         )}
      </div>
    </motion.div>
  );
}
