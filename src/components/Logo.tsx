import React from 'react';

export function GoogleLogo({ className = "icon-xl" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="16" width="12" height="12" rx="6" fill="#EA4335" />
      <rect x="17" y="16" width="12" height="12" rx="4" fill="#FBBC04" />
      <rect x="3" y="2" width="12" height="12" rx="4" fill="#34A853" />
      <rect x="17" y="2" width="12" height="12" rx="6" fill="#4285F4" />
      {/* Add a central overlay linking them optionally */}
      <circle cx="16" cy="16" r="3" fill="white" />
    </svg>
  );
}
