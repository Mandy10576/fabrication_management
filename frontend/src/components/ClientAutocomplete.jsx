import React, { useState, useEffect } from 'react';
import { Phone, MapPin } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

/**
 * Client picker built on the shared SearchableSelect: the input mirrors the
 * selected client's name, typing clears the selection (matching the old
 * behavior) rather than editing it in place, and the dropdown filters on a
 * dedicated search box against company name, contact person, and mobile.
 */
export const ClientAutocomplete = ({
  id,
  clients = [],
  value = '',
  onSelect,
  onAddNew,
  placeholder = 'Type client name or click drop arrow...',
  required = true
}) => {
  const [query, setQuery] = useState('');
  const selectedClient = clients.find((c) => c.id === value);

  useEffect(() => {
    setQuery(selectedClient ? selectedClient.companyName : '');
  }, [value, selectedClient?.companyName]);

  const handleValueChange = (text) => {
    setQuery(text);
    if (value) onSelect(null);
  };

  return (
    <SearchableSelect
      id={id}
      mode="typeahead"
      searchable
      value={query}
      onValueChange={handleValueChange}
      options={clients}
      getOptionValue={(c) => c.id}
      getOptionLabel={(c) => c.companyName}
      filterOption={(c, q) =>
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q))
      }
      onSelect={(client) => onSelect(client)}
      onAddNew={onAddNew ? (q) => onAddNew(q) : undefined}
      addNewLabel={(q) => (q ? `Add "${q}" as New Client…` : 'Add New Client…')}
      placeholder={placeholder}
      searchPlaceholder="Search clients…"
      resultsLabel="Matching Clients"
      required={required}
      renderOption={(c, { selected }) => (
        <div>
          <div className={`font-bold truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>
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
      )}
    />
  );
};
