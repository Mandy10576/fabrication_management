import React, { useState, useRef, useEffect } from 'react';
import { Zap, ChevronDown, Plus, Search, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const RateMasterAutocomplete = ({
  value = '',
  onChange,
  rateMasterList = [],
  onSelectRateMaster,
  onAddNew,
  placeholder = 'Type custom description or click drop arrow...',
  required = true,
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
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (rItem) => {
    onSelectRateMaster(rItem);
    setIsOpen(false);
  };

  const handleAddNewClick = () => {
    if (onAddNew) onAddNew();
    setIsOpen(false);
  };

  // Filter matching rate items based on search query
  const query = (value || '').toLowerCase().trim();
  const filteredList = rateMasterList.filter(r => {
    if (!query) return true;
    const nameMatch = r.serviceName && r.serviceName.toLowerCase().includes(query);
    const hsnMatch = r.hsnSac && r.hsnSac.toLowerCase().includes(query);
    return nameMatch || hsnMatch;
  });

  const activeFocusRing = themeColor === 'indigo'
    ? 'focus:ring-2 focus:ring-indigo-500'
    : 'focus:ring-2 focus:ring-brand-500';

  const badgeBg = themeColor === 'indigo'
    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
    : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300';

  const iconColor = themeColor === 'indigo'
    ? 'text-indigo-500 fill-indigo-500'
    : 'text-brand-500 fill-brand-500';

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className={`w-full pl-3 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none ${activeFocusRing}`}
        />

        {/* Toggle Arrow & Zap Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-0.5"
          title="Open Rate Master Catalog Options"
        >
          <Zap className={`w-3.5 h-3.5 ${iconColor}`} />
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Searchable Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Header indicator */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-400" />
              <span>Matching Rate Catalog Items ({filteredList.length})</span>
            </span>
            {query && (
              <span className="text-[10px] font-normal text-slate-400 font-mono">
                Filter: "{query}"
              </span>
            )}
          </div>

          {/* List items */}
          <div className="py-1">
            {filteredList.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
                No matching item in Rate Master for "{query}".
              </div>
            ) : (
              filteredList.map((rItem) => (
                <div
                  key={rItem.id}
                  onClick={() => handleSelect(rItem)}
                  className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                      {rItem.serviceName}
                    </div>
                    {rItem.hsnSac && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        <span>HSN/SAC: {rItem.hsnSac}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-2 py-1 rounded-lg text-xs font-extrabold ${badgeBg}`}>
                      {formatCurrency(rItem.rate)} / {rItem.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add New Option at Bottom */}
          {onAddNew && (
            <div
              onClick={handleAddNewClick}
              className="p-2.5 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100/60 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Item to Rate Master Catalog...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
