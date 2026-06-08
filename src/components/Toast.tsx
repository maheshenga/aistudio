import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction { label: string; onClick: () => void; }
interface ToastOptions {
  id: string;
  message: string;
  type: ToastType;
  actions?: ToastAction[];
}

class ToastManager {
  private listeners: ((toasts: ToastOptions[]) => void)[] = [];
  private toasts: ToastOptions[] = [];
  private batchedMessages: string[] = [];
  private isFocusMode = false;

  constructor() {
    window.addEventListener('focusSessionChanged', ((e: CustomEvent) => {
      this.isFocusMode = e.detail;
      if (!this.isFocusMode && this.batchedMessages.length > 0) {
        this.add(`深度工作结束：拦截了 ${this.batchedMessages.length} 条通知。`, 'info');
        this.batchedMessages = [];
      }
    }) as EventListener);
  }

  subscribe(listener: (toasts: ToastOptions[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  }

  add(message: string, type: ToastType = 'info', urgent: boolean = false, actions?: ToastAction[]) {
    if (this.isFocusMode && !urgent && type !== 'error') {
      this.batchedMessages.push(message);
      return;
    }
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts = [...this.toasts, { id, message, type, actions }];
    this.notify();
    if (!actions || actions.length === 0) { setTimeout(() => { this.remove(id); }, 3000); }
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }
}

export const toastManager = new ToastManager();
export const toast = (message: string, type: ToastType = 'info', urgent: boolean = false, actions?: ToastAction[]) => toastManager.add(message, type, urgent, actions);

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-[var(--radius-xl)] shadow-xl border ${
              t.type === 'success' ? 'bg-[var(--bg-panel)] border-green-100 text-[var(--text-main)]' :
              t.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
              t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-main)]'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="icon-md text-green-500" />}
            {t.type === 'error' && <AlertCircle className="icon-md text-red-500" />}
            {t.type === 'warning' && <AlertCircle className="icon-md text-amber-500" />}
            {t.type === 'info' && <Info className="icon-md text-blue-500" />}
            <span className="text-sm font-bold tracking-wide">{t.message}</span>
            {t.actions && t.actions.length > 0 && (
              <div className="flex gap-2 ml-4">
                {t.actions.map((action, i) => (
                  <button key={i} onClick={() => { action.onClick(); toastManager.remove(t.id); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => toastManager.remove(t.id)} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="icon-sm" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
