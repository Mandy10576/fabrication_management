import React from 'react';
import { Zap, Tag } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { formatCurrency } from '../utils/formatters';

/**
 * Rate Master item picker built on the shared SearchableSelect. The input
 * holds the invoice/quotation line's free-text description (not tied to any
 * one catalog item), while the dropdown's dedicated search box filters the
 * catalog by service name or HSN/SAC and hands the whole matched record back
 * via onSelectRateMaster so the caller can fill in rate/unit/HSN together.
 */
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
  const badgeBg = themeColor === 'indigo'
    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
    : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300';

  const iconColor = themeColor === 'indigo'
    ? 'text-indigo-500 fill-indigo-500'
    : 'text-brand-500 fill-brand-500';

  return (
    <SearchableSelect
      mode="typeahead"
      searchable
      value={value}
      onValueChange={onChange}
      options={rateMasterList}
      getOptionValue={(r) => r.id}
      getOptionLabel={(r) => r.serviceName}
      filterOption={(r, q) =>
        (r.serviceName && r.serviceName.toLowerCase().includes(q)) ||
        (r.hsnSac && r.hsnSac.toLowerCase().includes(q))
      }
      onSelect={(rItem) => onSelectRateMaster(rItem)}
      onAddNew={onAddNew ? () => onAddNew() : undefined}
      addNewLabel={() => '+ Add New Item to Rate Master Catalog...'}
      placeholder={placeholder}
      searchPlaceholder="Search rate catalog…"
      resultsLabel="Matching Rate Catalog Items"
      emptyText={`No matching item in Rate Master.`}
      required={required}
      themeColor={themeColor}
      extraToggleIcon={<Zap className={`w-3.5 h-3.5 ${iconColor}`} />}
      renderOption={(rItem) => (
        <div className="flex items-center justify-between gap-2">
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
      )}
    />
  );
};
