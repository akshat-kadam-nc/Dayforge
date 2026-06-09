import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastCtx {
  /** Queue a toast. Returns the id so callers can dismiss it early if needed. */
  toast: (message: string, kind?: ToastKind) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const ICON: Record<ToastKind, string> = { success: '✓', error: '!', info: 'i' };
const TTL = 3600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++seq.current;
      setToasts((list) => [...list, { id, message, kind }]);
      window.setTimeout(() => dismiss(id), TTL);
      return id;
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-icon">{ICON[t.kind]}</span>
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
