import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  className?: string;
}

export function Input({ className = '', icon, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        className={`w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  );
}
