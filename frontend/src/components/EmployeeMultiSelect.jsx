import React from 'react';
import { Phone } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

/**
 * Multi-select employee picker built on the shared SearchableSelect's
 * `multiple` mode: selected employees render as removable chips, the
 * dropdown stays open across picks, and typing filters by name or mobile
 * without touching the current selection.
 */
export const EmployeeMultiSelect = ({
  id,
  employees = [],
  value = [],
  onChange,
  placeholder = 'Type to search employees...',
}) => (
  <SearchableSelect
    id={id}
    multiple
    searchable
    value={value}
    options={employees}
    getOptionValue={(e) => e.id}
    getOptionLabel={(e) => e.name}
    filterOption={(e, q) => (e.name && e.name.toLowerCase().includes(q)) || (e.mobile && e.mobile.includes(q))}
    onSelect={onChange}
    placeholder={placeholder}
    searchPlaceholder="Search employees…"
    resultsLabel="Matching Employees"
    renderOption={(e) => (
      <div className="min-w-0">
        <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
          {e.name}
        </div>
        {e.mobile && (
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" />
            {e.mobile}
          </div>
        )}
      </div>
    )}
  />
);
