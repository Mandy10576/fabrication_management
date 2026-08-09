import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Percent } from 'lucide-react';

const GST_MODE_OPTIONS = [
  { value: 'CGST_SGST', label: 'CGST + SGST', description: 'Intra-State (same state as company)' },
  { value: 'IGST', label: 'IGST', description: 'Inter-State (different state)' },
  { value: 'NON_GST', label: 'Non-GST', description: 'Retail / Bill of Supply' },
];

/**
 * Custom-styled, non-typeable 3-option GST Tax Mode picker — replaces the
 * plain native <select> with the same rounded-panel/arrow-chevron look as
 * StateSelect/UnitSelect. There's no text to protect here (fixed options,
 * nothing to type), so the whole trigger opens the dropdown, not just the
 * arrow.
 */
export const GstModeSelect = ({ id, value = 'CGST_SGST', onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = GST_MODE_OPTIONS.find((o) => o.value === value) || GST_MODE_OPTIONS[0];

  const handleSelect = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 pl-3 pr-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Percent className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="min-w-0">
            <span className="block font-semibold text-sm text-slate-900 dark:text-white truncate">{selected.label}</span>
            <span className="block text-[11px] text-slate-400 truncate">{selected.description}</span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
          {GST_MODE_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt)}
              className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
            >
              <span>
                <span className={`block font-bold text-sm ${opt.value === value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {opt.label}
                </span>
                <span className="block text-[11px] text-slate-400">{opt.description}</span>
              </span>
              {opt.value === value && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
