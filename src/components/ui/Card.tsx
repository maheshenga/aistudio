import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', noPadding = false, ...props }: CardProps) {
  return (
    <div 
      className={`bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm ${noPadding ? '' : 'p-[var(--spacing-md)]'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
