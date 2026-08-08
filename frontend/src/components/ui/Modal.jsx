import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Tracks how many modals are open so stacked dialogs (e.g. Share opened over
 * the payment log) don't unlock body scrolling when only the top one closes.
 */
let openModalCount = 0;

const lockBodyScroll = () => {
  openModalCount += 1;
  if (openModalCount === 1) {
    // Compensate for the disappearing scrollbar so the page doesn't jump.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add('overflow-locked');
  }
};

const unlockBodyScroll = () => {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.classList.remove('overflow-locked');
    document.body.style.paddingRight = '';
  }
};

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: closes on Escape and backdrop click, locks background
 * scrolling, keeps Tab focus inside, and restores focus to whatever opened it.
 *
 * On phones it renders as a bottom sheet (reachable with one thumb, and the
 * on-screen keyboard doesn't push a centred card off screen); from `sm` up it
 * becomes a centred card.
 */
export const Modal = ({
  open = true,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconClass = 'text-brand-500',
  size = 'lg',
  children,
  footer,
  closeOnBackdrop = true,
  bodyClassName = '',
}) => {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    lockBodyScroll();

    // Focus the first meaningful control, falling back to the panel itself.
    const raf = requestAnimationFrame(() => {
      const target =
        panelRef.current?.querySelector('[data-autofocus]') ||
        panelRef.current?.querySelector(FOCUSABLE) ||
        panelRef.current;
      target?.focus?.({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      unlockBodyScroll();
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${SIZES[size] || SIZES.lg}
                    flex flex-col max-h-[92dvh] sm:max-h-[88vh]
                    bg-white dark:bg-slate-900
                    border border-slate-200 dark:border-slate-800
                    rounded-t-3xl sm:rounded-2xl shadow-pop outline-none
                    animate-sheet-up sm:animate-scale-in`}
      >
        {/* Drag affordance — signals the sheet is dismissible on touch. */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-3 sm:pt-5 pb-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {Icon && <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />}
                  <span className="truncate">{title}</span>
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="btn-icon btn-icon-soft shrink-0 -mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto scroll-touch px-4 sm:px-6 py-4 ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 rounded-b-none sm:rounded-b-2xl safe-area-pb sm:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
