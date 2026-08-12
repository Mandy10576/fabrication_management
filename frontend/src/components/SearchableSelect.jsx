import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, Check, X } from 'lucide-react';

// Dropdowns with more options than this get a dedicated search box inside
// the panel; smaller fixed lists (GST mode, a couple of financial years,
// Active/Inactive/All filters) just show the plain list — a search box
// there would be visual noise, not a feature.
const SEARCH_THRESHOLD = 6;

const defaultGetOptionValue = (o) => (o && typeof o === 'object' ? (o.value ?? o.id) : o);
const defaultGetOptionLabel = (o) => (o && typeof o === 'object' ? (o.label ?? String(o.value ?? '')) : String(o ?? ''));
const defaultFilterOption = (option, query, getOptionLabel) =>
  getOptionLabel(option).toLowerCase().includes(query);

const useOutsideClick = (ref, onOutside) => {
  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
};

const focusRingClass = (themeColor) =>
  themeColor === 'indigo' ? 'focus:ring-2 focus:ring-indigo-500' : 'focus:ring-2 focus:ring-brand-500';

const activeTextClass = (themeColor) =>
  themeColor === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-brand-600 dark:text-brand-400';

/**
 * One shared searchable-dropdown panel, reused by every picker in the app
 * (clients, rate master, units, states, GST mode, employees, and every
 * plain filter/status/payment-mode select) instead of each rebuilding its
 * own open/close/filter plumbing. Three trigger shapes share the same panel:
 *
 *  - mode="typeahead": the trigger is a text input that IS the field value
 *    (free text allowed) — used where typing a custom value is valid
 *    (units, states) or where the input mirrors a selected record's name
 *    (clients, rate master items).
 *  - mode="button": the trigger is a read-only button showing the current
 *    selection — used for fixed-choice pickers (GST mode, financial year,
 *    payment mode, status filters, GST rate, etc).
 *  - multiple: chip-style multi-select (employees on a work log).
 *
 * The panel itself always has the same shape: an optional dedicated search
 * box (shown once there are enough options to need one), the filtered
 * list, and an optional "Add new…" footer row.
 */
export const SearchableSelect = ({
  id,
  mode = 'button',
  multiple = false,
  value,
  onValueChange,
  options = [],
  getOptionValue = defaultGetOptionValue,
  getOptionLabel = defaultGetOptionLabel,
  filterOption,
  onSelect,
  onAddNew,
  addNewLabel,
  shouldShowAddNew,
  renderOption,
  renderTrigger,
  renderAdornment,
  extraToggleIcon,
  icon: LeadingIcon,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText,
  required = false,
  disabled = false,
  searchable,
  themeColor = 'brand',
  resultsLabel,
  footer,
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useOutsideClick(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const showSearchBox = searchable ?? options.length > SEARCH_THRESHOLD;
  const trimmedQuery = query.trim();
  const searchTerm = trimmedQuery.toLowerCase();
  const doFilter = filterOption || ((o, q) => defaultFilterOption(o, q, getOptionLabel));
  const filteredOptions = searchTerm ? options.filter((o) => doFilter(o, searchTerm)) : options;

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : null;
  const selectedOption = !multiple ? options.find((o) => getOptionValue(o) === value) : null;

  const handleSelect = (option) => {
    if (multiple) {
      const optVal = getOptionValue(option);
      const next = selectedValues.includes(optVal)
        ? selectedValues.filter((v) => v !== optVal)
        : [...selectedValues, optVal];
      onSelect(next);
      return;
    }
    onSelect(option);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    if (onAddNew) onAddNew(trimmedQuery);
    setIsOpen(false);
  };

  const panel = isOpen && (
    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
      {showSearchBox && (
        <div className="relative p-2 border-b border-slate-100 dark:border-slate-800">
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {resultsLabel && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <Search className="w-3 h-3 text-slate-400" />
          <span>{resultsLabel} ({filteredOptions.length})</span>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-1">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
            {emptyText || `No matching option${trimmedQuery ? ` for "${trimmedQuery}"` : ''}.`}
          </div>
        ) : (
          filteredOptions.map((option) => {
            const optVal = getOptionValue(option);
            const isSelected = multiple ? selectedValues.includes(optVal) : optVal === value;
            return (
              <div
                key={optVal}
                onClick={() => handleSelect(option)}
                className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group flex items-center gap-2.5"
              >
                {multiple && (
                  <span
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  {renderOption ? renderOption(option, { selected: isSelected }) : (
                    <span className={`font-semibold ${isSelected ? activeTextClass(themeColor) : 'text-slate-700 dark:text-slate-200'}`}>
                      {getOptionLabel(option)}
                    </span>
                  )}
                </div>

                {!multiple && isSelected && !renderOption && <Check className={`w-4 h-4 shrink-0 ${activeTextClass(themeColor)}`} />}
              </div>
            );
          })
        )}
      </div>

      {onAddNew && (shouldShowAddNew ? shouldShowAddNew(trimmedQuery, filteredOptions) : true) && (
        <div
          onClick={handleAddNew}
          className="p-2.5 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100/60 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
        >
          <Plus className="w-4 h-4" />
          <span>{addNewLabel ? addNewLabel(trimmedQuery) : `Add "${trimmedQuery}"…`}</span>
        </div>
      )}

      {typeof footer === 'function' ? footer(() => setIsOpen(false)) : footer}
    </div>
  );

  if (multiple) {
    const selectedOptions = selectedValues
      .map((v) => options.find((o) => getOptionValue(o) === v))
      .filter(Boolean);

    return (
      <div className="relative w-full" ref={containerRef}>
        <div className="w-full min-h-[2.75rem] flex flex-wrap items-center gap-1.5 pl-2 pr-9 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-500 relative">
          {selectedOptions.map((option) => {
            const optVal = getOptionValue(option);
            return (
              <span
                key={optVal}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-bold"
              >
                {getOptionLabel(option)}
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="p-0.5 rounded hover:bg-brand-100 dark:hover:bg-brand-900/60"
                  aria-label={`Remove ${getOptionLabel(option)}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex-1 min-w-[6rem] bg-transparent text-left outline-none text-sm font-medium text-slate-400 py-1"
          >
            {selectedOptions.length === 0 ? placeholder : ''}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            title="Browse options"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {panel}
      </div>
    );
  }

  if (mode === 'typeahead') {
    return (
      <div className="relative w-full" ref={containerRef}>
        <div className="relative flex items-center">
          {LeadingIcon && <LeadingIcon className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />}
          <input
            id={id}
            type="text"
            required={required}
            disabled={disabled}
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onValueChange?.(e.target.value)}
            className={`w-full ${LeadingIcon ? 'pl-9' : 'pl-3'} ${renderAdornment ? 'pr-20' : 'pr-9'} py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none ${focusRingClass(themeColor)} disabled:opacity-60 disabled:cursor-not-allowed`}
          />

          {renderAdornment && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2">
              {renderAdornment(selectedOption, value)}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-0.5 disabled:opacity-40"
            title="Browse options"
          >
            {extraToggleIcon}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {panel}
      </div>
    );
  }

  // mode === 'button'
  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 pl-3.5 pr-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500 text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="min-w-0 flex-1 truncate">
          {renderTrigger
            ? renderTrigger(selectedOption)
            : (
              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {selectedOption ? getOptionLabel(selectedOption) : <span className="text-slate-400 font-normal">{placeholder}</span>}
              </span>
            )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {panel}
    </div>
  );
};
