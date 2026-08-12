import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { getStateCode } from '../utils/indianStates';

const CUSTOM_STATES_KEY = 'khodiyar_custom_states';

const getCustomStates = () => {
  try {
    const saved = localStorage.getItem(CUSTOM_STATES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const saveCustomState = (newState) => {
  try {
    const current = getCustomStates();
    if (!current.some((s) => s.toLowerCase() === newState.toLowerCase())) {
      localStorage.setItem(CUSTOM_STATES_KEY, JSON.stringify([...current, newState]));
    }
  } catch (e) {}
};

/**
 * Searchable + typeable State picker built on the shared SearchableSelect:
 * a typeable input holds the actual field value (onChange still only ever
 * receives the plain state name, so storage on Client/Company/Invoice/
 * Quotation is unchanged), the dropdown lists the Indian states/UTs plus any
 * admin-added custom states with their official GST state code, and typing
 * a value not in the list offers an "Add as new state" option (saved to
 * localStorage, same as before) so it's available next time. Custom states
 * have no official code and simply show none.
 */
export const StateSelect = ({
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type a state',
  required = false,
}) => {
  const [customStates, setCustomStates] = useState(() => getCustomStates());

  const allOptions = Array.from(new Set([...options, ...customStates]));

  const handleAddNew = (query) => {
    if (!query) return;
    saveCustomState(query);
    setCustomStates(getCustomStates());
    onChange(query);
  };

  return (
    <SearchableSelect
      id={id}
      mode="typeahead"
      searchable
      icon={MapPin}
      value={value}
      onValueChange={onChange}
      options={allOptions}
      onSelect={(state) => onChange(state)}
      onAddNew={handleAddNew}
      addNewLabel={(q) => `Add "${q}" as a new state…`}
      shouldShowAddNew={(q) => Boolean(q) && !allOptions.some((s) => s.toLowerCase() === q.toLowerCase())}
      placeholder={placeholder}
      searchPlaceholder="Search states…"
      required={required}
      renderOption={(state, { selected }) => {
        const code = getStateCode(state);
        return (
          <div className="flex items-center justify-between gap-2">
            <span className={`font-semibold truncate ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {state}
            </span>
            {code && <span className="badge badge-neutral font-mono shrink-0">{code}</span>}
          </div>
        );
      }}
      renderAdornment={() => {
        const code = getStateCode(value);
        return code ? <span className="badge badge-neutral font-mono">{code}</span> : null;
      }}
    />
  );
};
