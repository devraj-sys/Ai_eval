import React, { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _addToast: ((message: string, type: ToastType) => void) | null = null;

export const toast = {
  success: (msg: string) => _addToast?.(msg, 'success'),
  error:   (msg: string) => _addToast?.(msg, 'error'),
  info:    (msg: string) => _addToast?.(msg, 'info'),
};

const ICONS = { success: '✓', error: '✕', info: 'i' };

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
};
