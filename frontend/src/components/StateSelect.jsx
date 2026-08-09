import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Plus } from 'lucide-react';

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
 * Searchable + typeable State picker (structural clone of UnitSelect): a
 * typeable input filtered against the Indian states/UTs list plus any
 * admin-added custom states, dropdown opens only via the arrow button.
 * Typing a value not in the list shows an "Add as new state" option that
 * saves it (in localStorage, same convention as the Unit list) so it's
 * available to pick from next time — not just accepted as one-off free text.
 */
export const StateSelect = ({
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type a state',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStates, setCustomStates] = useState(() => getCustomStates());
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

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleSelect = (state) => {
    onChange(state);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    saveCustomState(trimmed);
    setCustomStates(getCustomStates());
    onChange(trimmed);
    setIsOpen(false);
  };

  const allOptions = Array.from(new Set([...options, ...customStates]));
  const query = (value || '').toLowerCase().trim();
  const filteredOptions = allOptions.filter((s) => !query || s.toLowerCase().includes(query));
  const isNewValue = query && !allOptions.some((s) => s.toLowerCase() === query);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-500"
        />

        {/* Toggle Arrow - only this opens the dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          title="Browse states"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
                No matching state{query ? ` for "${value}"` : ''}.
              </div>
            ) : (
              filteredOptions.map((s) => (
                <div
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer font-semibold transition-colors ${
                    s === value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {s}
                </div>
              ))
            )}
          </div>

          {isNewValue && (
            <div
              onClick={handleAddNew}
              className="p-2.5 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100/60 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              <Plus className="w-4 h-4" />
              <span>Add "{value.trim()}" as a new state…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
