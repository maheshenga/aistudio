import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  zIndex?: number;
  hideHeader?: boolean;
}

export function BaseModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '', 
  maxWidth = 'max-w-2xl',
  zIndex = 50,
  hideHeader = false
}: BaseModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 sm:p-[var(--spacing-xl)] animate-in fade-in duration-200 z-[${zIndex}]`}
    >
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <Card 
        className={`relative w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden bg-[var(--bg-panel)] shadow-2xl animate-in zoom-in-95 duration-200 ${className}`}
        noPadding
      >
        {!hideHeader && title && (
          <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border-color)]">
            <h3 className="text-h4">{title}</h3>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
            >
              <X className="icon-md" />
            </button>
          </div>
        )}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${hideHeader ? '' : 'p-[var(--spacing-md)]'}`}>
          {children}
        </div>
      </Card>
    </div>
  );
}
