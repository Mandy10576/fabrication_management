import React from 'react';
import { Check, Percent } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const GST_MODE_OPTIONS = [
  { value: 'CGST_SGST', label: 'CGST + SGST', description: 'Intra-State (same state as company)' },
  { value: 'IGST', label: 'IGST', description: 'Inter-State (different state)' },
  { value: 'NON_GST', label: 'Non-GST', description: 'Retail / Bill of Supply' },
];

/**
 * GST Tax Mode picker built on the shared SearchableSelect in button mode —
 * only 3 fixed options, so no search box, but the same rounded-panel/arrow
 * chevron chrome as every other dropdown in the app.
 */
export const GstModeSelect = ({ id, value = 'CGST_SGST', onChange }) => (
  <SearchableSelect
    id={id}
    mode="button"
    value={value}
    options={GST_MODE_OPTIONS}
    onSelect={(opt) => onChange(opt.value)}
    renderTrigger={(selected) => {
      const opt = selected || GST_MODE_OPTIONS[0];
      return (
        <span className="flex items-center gap-2 min-w-0">
          <Percent className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="min-w-0">
            <span className="block font-semibold text-sm text-slate-900 dark:text-white truncate">{opt.label}</span>
            <span className="block text-[11px] text-slate-400 truncate">{opt.description}</span>
          </span>
        </span>
      );
    }}
    renderOption={(opt, { selected }) => (
      <div className="flex items-center justify-between gap-2">
        <span>
          <span className={`block font-bold text-sm ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {opt.label}
          </span>
          <span className="block text-[11px] text-slate-400">{opt.description}</span>
        </span>
        {selected && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
      </div>
    )}
  />
);
