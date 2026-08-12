import React from 'react';
import { Settings } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

/**
 * Unit picker built on the shared SearchableSelect: a typeable input holds
 * the actual field value (free text is allowed, so a unit not yet in the
 * managed list can still be typed and used), and the dropdown lists the
 * managed units plus a "manage units" footer that opens the existing
 * add/edit modal.
 */
export const UnitSelect = ({
  id,
  value = '',
  onChange,
  options = [],
  onManageUnits,
  placeholder = 'Select unit',
  themeColor = 'brand' // 'brand' | 'indigo'
}) => {
  const mergedOptions = Array.from(new Set([...options, value].filter(Boolean)));

  return (
    <SearchableSelect
      id={id}
      mode="typeahead"
      searchable
      value={value}
      onValueChange={onChange}
      options={mergedOptions}
      onSelect={(unit) => onChange(unit)}
      placeholder={placeholder}
      searchPlaceholder="Search units…"
      themeColor={themeColor}
      footer={onManageUnits ? (close) => (
        <div
          onClick={() => { onManageUnits(); close(); }}
          className="p-2.5 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100/60 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Add / edit units…</span>
        </div>
      ) : undefined}
    />
  );
};
