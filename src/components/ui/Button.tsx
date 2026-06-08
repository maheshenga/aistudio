import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] border border-transparent focus:ring-[var(--color-primary)]',
    secondary: 'bg-[var(--bg-panel)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-gray-50 focus:ring-gray-200 shadow-sm',
    outline: 'bg-transparent text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-indigo-50 focus:ring-[var(--color-primary)]',
    ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-100 shadow-none border border-transparent',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-transparent focus:ring-red-500 rounded-[var(--radius-lg)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-[var(--radius-lg)]',
    lg: 'px-6 py-3 text-base rounded-[var(--radius-lg)]',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
