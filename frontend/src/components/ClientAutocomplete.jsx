import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, Phone, MapPin } from 'lucide-react';

export const ClientAutocomplete = ({
  id,
  clients = [],
  value = '',
  onSelect,
  onAddNew,
  placeholder = 'Type client name or click drop arrow...',
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selectedClient = clients.find(c => c.id === value);

  // Keep the visible text in sync with whichever client is actually selected
  useEffect(() => {
    setQuery(selectedClient ? selectedClient.companyName : '');
  }, [value, selectedClient?.companyName]);

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
    setQuery(e.target.value);
    if (value) onSelect(null);
  };

  const handleSelect = (client) => {
    onSelect(client);
    setIsOpen(false);
  };

  const handleAddNewClick = () => {
    if (onAddNew) onAddNew(query.trim());
    setIsOpen(false);
  };

  const q = query.toLowerCase().trim();
  const filteredList = clients.filter(c => {
    if (!q) return true;
    return (c.companyName && c.companyName.toLowerCase().includes(q))
      || (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
      || (c.mobile && c.mobile.includes(q));
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

        {/* Toggle Arrow - only this opens the dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          title="Browse clients"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-400" />
              <span>Matching Clients ({filteredList.length})</span>
            </span>
          </div>

          <div className="py-1">
            {filteredList.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
                No matching client{q ? ` for "${query}"` : ''}.
              </div>
            ) : (
              filteredList.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                >
                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                    {c.companyName}{c.contactPerson ? ` (${c.contactPerson})` : ''}
                  </div>
                  {(c.mobile || c.address) && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2.5">
                      {c.mobile && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone className="w-2.5 h-2.5" />
                          {c.mobile}
                        </span>
                      )}
                      {c.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      )}
                    </div>
                  )}
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
              <span>{query.trim() ? `Add "${query.trim()}" as New Client…` : 'Add New Client…'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
