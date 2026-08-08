import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, AlertOctagon } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-200 dark:border-emerald-800/70',
    iconClass: 'text-emerald-500',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    ring: 'border-rose-200 dark:border-rose-800/70',
    iconClass: 'text-rose-500',
    bar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-200 dark:border-amber-800/70',
    iconClass: 'text-amber-500',
    bar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    ring: 'border-brand-200 dark:border-brand-800/70',
    iconClass: 'text-brand-500',
    bar: 'bg-brand-500',
  },
};

/**
 * Replaces the native `alert()` / `confirm()` calls that used to block the
 * whole tab. Toasts stack top-right on desktop and top-centre on phones;
 * `confirm()` resolves a promise so existing `if (!ok) return;` guards keep
 * reading the same way.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, options = {}) => {
      const id = ++idRef.current;
      const duration = options.duration ?? (type === 'error' ? 6000 : 4000);

      setToasts((prev) => [...prev, { id, type, message, title: options.title }]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      warning: (message, options) => push('warning', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [push, dismiss]
  );

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        tone: options.tone || 'danger',
      });
    });
  }, []);

  const settle = useCallback((result) => {
    setDialog(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {createPortal(
        <div
          className="fixed z-[10050] top-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm
                     sm:left-auto sm:translate-x-0 sm:right-4 sm:top-4 sm:w-auto
                     flex flex-col gap-2 pointer-events-none"
          role="region"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((t) => {
            const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
            const Icon = style.icon;
            return (
              <div
                key={t.id}
                className={`pointer-events-auto relative overflow-hidden flex items-start gap-3
                            w-full sm:w-96 p-3.5 pr-10 rounded-xl shadow-pop animate-toast-in
                            bg-white dark:bg-slate-900 border ${style.ring}`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} aria-hidden="true" />
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClass}`} />
                <div className="min-w-0 flex-1">
                  {t.title && (
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</div>
                  )}
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 break-words">
                    {t.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {dialog && (
        <Modal
          open
          size="md"
          onClose={() => settle(false)}
          title={dialog.title}
          icon={dialog.tone === 'danger' ? AlertOctagon : AlertTriangle}
          iconClass={dialog.tone === 'danger' ? 'text-rose-500' : 'text-amber-500'}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => settle(false)} className="btn btn-secondary sm:min-w-[7rem]">
                {dialog.cancelText}
              </button>
              <button
                type="button"
                data-autofocus
                onClick={() => settle(true)}
                className={`btn sm:min-w-[7rem] ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {dialog.message}
          </p>
        </Modal>
      )}
    </ToastContext.Provider>
  );
};

const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast/useConfirm must be used within a ToastProvider');
  return ctx;
};

export const useToast = () => useToastContext().toast;
export const useConfirm = () => useToastContext().confirm;
