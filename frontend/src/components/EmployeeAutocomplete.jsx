import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';

export const EmployeeAutocomplete = ({
  id,
  employees = [],
  value = '',
  onSelect,
  placeholder = 'Type employee name or click drop arrow...',
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selectedEmployee = employees.find(e => e.id === value);

  useEffect(() => {
    setQuery(selectedEmployee ? selectedEmployee.name : '');
  }, [value, selectedEmployee?.name]);

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
    setQuery(e.target.value);
    if (value) onSelect(null);
  };

  const handleSelect = (employee) => {
    onSelect(employee);
    setIsOpen(false);
  };

  const q = query.toLowerCase().trim();
  const filteredList = employees.filter(e => {
    if (!q) return true;
    return (e.name && e.name.toLowerCase().includes(q)) || (e.mobile && e.mobile.includes(q));
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          required={required}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
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
              filteredList.map((e) => (
                <div
                  key={e.id}
                  onClick={() => handleSelect(e)}
                  className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                >
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
