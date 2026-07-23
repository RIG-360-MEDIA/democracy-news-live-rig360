'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Minimal toast provider + useToast() hook — no external dependency. Used for
// quiet confirmations like "Live — #6 in Politics". Bottom-centre, hairline
// ivory cards; the dark-red accent marks errors only.

export type ToastTone = 'info' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ToastApi {
  /** Show a toast. Returns nothing; auto-dismisses after `ttlMs`. */
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_TTL_MS = 4500;

export interface ToastProviderProps {
  children: ReactNode;
  /** Milliseconds before a toast auto-dismisses. */
  ttlMs?: number;
}

export function ToastProvider({ children, ttlMs = DEFAULT_TTL_MS }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = `t${seq.current++}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), ttlMs);
    },
    [dismiss, ttlMs],
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'pointer-events-auto max-w-[90vw] border px-4 py-2 font-sans text-ui-md shadow-sm',
              t.tone === 'error'
                ? 'border-studio-accent bg-studio-accent text-studio-paper'
                : 'border-studio-rule bg-studio-paper text-studio-ink',
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast API. Must be called under a <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}
