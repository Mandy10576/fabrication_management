import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings } from 'lucide-react';

export const UnitSelect = ({
  value = '',
  onChange,
  options = [],
  onManageUnits,
  placeholder = 'Select unit',
  themeColor = 'brand' // 'brand' | 'indigo'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
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

  const handleSelect = (unit) => {
    onChange(unit);
    setIsOpen(false);
  };

  const handleManageClick = () => {
    if (onManageUnits) onManageUnits();
    setIsOpen(false);
  };

  const activeFocusRing = themeColor === 'indigo'
    ? 'focus:ring-2 focus:ring-indigo-500'
    : 'focus:ring-2 focus:ring-brand-500';

  const activeTextColor = themeColor === 'indigo'
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-brand-600 dark:text-brand-400';

  const mergedOptions = Array.from(new Set([...options, value].filter(Boolean)));

  // Filter matching units based on what has been typed
  const query = (value || '').toLowerCase().trim();
  const filteredOptions = mergedOptions.filter(u => !query || u.toLowerCase().includes(query));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className={`w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none ${activeFocusRing}`}
        />

        {/* Toggle Arrow - only this opens the dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          title="Open unit list"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto text-xs">
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
                No matching unit{query ? ` for "${query}"` : ''}.
              </div>
            ) : (
              filteredOptions.map((u) => (
                <div
                  key={u}
                  onClick={() => handleSelect(u)}
                  className={`px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer font-semibold transition-colors ${u === value ? activeTextColor : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {u}
                </div>
              ))
            )}
          </div>

          {onManageUnits && (
            <div
              onClick={handleManageClick}
              className="p-2.5 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100/60 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Add / edit units…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
