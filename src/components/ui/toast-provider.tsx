'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-buy text-black',
  error: 'bg-sell text-white',
  info: 'bg-accent text-black',
  warning: 'bg-[#f59e0b] text-black',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const ctx: ToastCtx = {
    toast: addToast,
    success: useCallback((m: string) => addToast(m, 'success'), [addToast]),
    error: useCallback((m: string) => addToast(m, 'error'), [addToast]),
    info: useCallback((m: string) => addToast(m, 'info'), [addToast]),
    warning: useCallback((m: string) => addToast(m, 'warning'), [addToast]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container - fixed top right */}
      <div className="fixed top-14 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium animate-fade-in ${COLORS[t.type]}`}
            style={{
              minWidth: '200px', maxWidth: '360px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn var(--motion-base) var(--motion-ease-out)',
            }}
          >
            <span className="text-[14px] shrink-0">{ICONS[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 opacity-60 hover:opacity-100 text-[14px] cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
