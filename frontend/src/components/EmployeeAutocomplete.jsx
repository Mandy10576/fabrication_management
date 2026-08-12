import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

/**
 * Single-employee picker built on the shared SearchableSelect (the
 * single-select sibling of EmployeeMultiSelect): the input mirrors the
 * selected employee's name, typing clears the selection, and the dropdown
 * filters on a dedicated search box against name or mobile.
 */
export const EmployeeAutocomplete = ({
  id,
  employees = [],
  value = '',
  onSelect,
  placeholder = 'Type employee name or click drop arrow...',
  required = true
}) => {
  const [query, setQuery] = useState('');
  const selectedEmployee = employees.find((e) => e.id === value);

  useEffect(() => {
    setQuery(selectedEmployee ? selectedEmployee.name : '');
  }, [value, selectedEmployee?.name]);

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
      options={employees}
      getOptionValue={(e) => e.id}
      getOptionLabel={(e) => e.name}
      filterOption={(e, q) => (e.name && e.name.toLowerCase().includes(q)) || (e.mobile && e.mobile.includes(q))}
      onSelect={(employee) => onSelect(employee)}
      placeholder={placeholder}
      searchPlaceholder="Search employees…"
      resultsLabel="Matching Employees"
      required={required}
      renderOption={(e, { selected }) => (
        <div>
          <div className={`font-bold truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>
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
};
