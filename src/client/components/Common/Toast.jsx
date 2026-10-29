import React from 'react';
import { Info } from 'lucide-react';

export function Toast({ toasts = [] }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <Info size={14} />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
