import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Phone, X, Check } from 'lucide-react';

/**
 * Multi-select variant of EmployeeAutocomplete: selected employees render as
 * removable chips, the dropdown stays open across picks (toggle, not
 * select-and-close), and typing filters without touching the selection.
 */
export const EmployeeMultiSelect = ({
  id,
  employees = [],
  value = [],
  onChange,
  placeholder = 'Type to search employees...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const selectedEmployees = value
    .map((empId) => employees.find((e) => e.id === empId))
    .filter(Boolean);

  const toggleEmployee = (empId) => {
    if (value.includes(empId)) {
      onChange(value.filter((id_) => id_ !== empId));
    } else {
      onChange([...value, empId]);
    }
  };

  const removeEmployee = (empId) => {
    onChange(value.filter((id_) => id_ !== empId));
  };

  const q = query.toLowerCase().trim();
  const filteredList = employees.filter((e) => {
    if (!q) return true;
    return (e.name && e.name.toLowerCase().includes(q)) || (e.mobile && e.mobile.includes(q));
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="w-full min-h-[2.75rem] flex flex-wrap items-center gap-1.5 pl-2 pr-9 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-500 relative">
        {selectedEmployees.map((emp) => (
          <span
            key={emp.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-bold"
          >
            {emp.name}
            <button
              type="button"
              onClick={() => removeEmployee(emp.id)}
              className="p-0.5 rounded hover:bg-brand-100 dark:hover:bg-brand-900/60"
              aria-label={`Remove ${emp.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          id={id}
          type="text"
          required={required && value.length === 0}
          placeholder={selectedEmployees.length === 0 ? placeholder : ''}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[6rem] bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white py-1"
        />

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          title="Browse employees"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-400" />
              <span>Matching Employees ({filteredList.length})</span>
            </span>
          </div>

          <div className="py-1">
            {filteredList.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
                No matching employee{q ? ` for "${query}"` : ''}.
              </div>
            ) : (
              filteredList.map((e) => {
                const checked = value.includes(e.id);
                return (
                  <div
                    key={e.id}
                    onClick={() => toggleEmployee(e.id)}
                    className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group flex items-center gap-2.5"
                  >
                    <span
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
