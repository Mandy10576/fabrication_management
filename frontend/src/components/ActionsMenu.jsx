import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

/** A "..." trigger that expands into a small dropdown of row actions —
 * used to collapse a row of individual icon buttons (view/pay/share/
 * duplicate/delete, etc.) into one menu. `items` is an array of
 * `{ icon, label, onClick, danger?, disabled? }`; a falsy entry (e.g. an
 * inline `condition && {...}`) is skipped, so callers can conditionally
 * include an action without pre-filtering the array themselves. */
export const ActionsMenu = ({ items, ariaLabel = 'More actions', align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter(Boolean);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-icon btn-icon-soft"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 min-w-[10rem] py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden`}
        >
          {visibleItems.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                item.danger
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
              }`}
            >
              {item.icon ? <item.icon className="w-4 h-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
