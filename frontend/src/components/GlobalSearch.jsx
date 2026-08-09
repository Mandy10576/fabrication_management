import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Search,
  X,
  Loader2,
  Building2,
  FileText,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  Users,
  Wallet,
  HandCoins,
} from 'lucide-react';

const GROUP_ICONS = {
  clients: Building2,
  invoices: FileText,
  quotations: FileSpreadsheet,
  payments: IndianRupee,
  projects: Layers,
  employees: Users,
  salaryPayments: Wallet,
  advances: HandCoins,
};

/**
 * Where each result type opens. Attendance/salary/advance rows have no
 * detail page of their own, so they resolve to the owning employee; the
 * same applies to payments, which are managed from the invoice view.
 */
const routeForItem = (item) => {
  switch (item.type) {
    case 'client': return `/clients/${item.id}`;
    case 'invoice': return `/invoices/${item.id}`;
    case 'quotation': return `/quotations/${item.id}/edit`;
    case 'payment': return item.invoiceId ? `/invoices/${item.invoiceId}` : '/invoices';
    case 'project': return `/projects/${item.id}`;
    case 'employee': return `/employees/${item.id}`;
    case 'salaryPayment': return item.employeeId ? `/employees/${item.employeeId}` : '/salary';
    case 'advance': return item.employeeId ? `/employees/${item.employeeId}` : '/advances';
    default: return '/';
  }
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Flattens the grouped payload into keyboard-navigable order. */
const flattenGroups = (groups) => groups.flatMap((g) => g.items);

export const GlobalSearch = ({ variant = 'inline', onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(variant === 'overlay');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  const isOverlay = variant === 'overlay';

  useEffect(() => {
    if (isOverlay) inputRef.current?.focus();
  }, [isOverlay]);

  // Debounced fetch. requestIdRef guards against a slow earlier request
  // resolving after a newer one and overwriting fresher results.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const currentId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(trimmed)}`, true);
        if (currentId !== requestIdRef.current) return;
        setGroups(res.groups || []);
        setActiveIndex(0);
      } catch (err) {
        if (currentId === requestIdRef.current) setGroups([]);
      } finally {
        if (currentId === requestIdRef.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  const handleSelect = useCallback((item) => {
    navigate(routeForItem(item));
    setQuery('');
    setGroups([]);
    close();
  }, [navigate, close]);

  // Outside click / Escape, matching the FY selector's behaviour.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (e) => {
      if (isOverlay) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isOverlay) close();
        else setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, isOverlay, close]);

  const flatItems = flattenGroups(groups);

  const handleKeyDown = (e) => {
    if (!flatItems.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) handleSelect(item);
    }
  };

  const trimmed = query.trim();
  const showPanel = isOpen && trimmed.length >= 2;
  const hasResults = flatItems.length > 0;

  let runningIndex = -1;

  const resultsBody = (
    <>
      {loading && !hasResults && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Searching…</span>
        </div>
      )}

      {!loading && !hasResults && (
        <div className="py-10 px-4 text-center">
          <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No results found</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nothing matches “{trimmed}”.
          </p>
        </div>
      )}

      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key] || Search;
        return (
          <div key={group.key} className="py-1">
            <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              <Icon className="w-3 h-3" />
              <span>{group.label}</span>
              <span className="text-slate-400 dark:text-slate-500">({group.items.length})</span>
            </div>

            {group.items.map((item) => {
              runningIndex += 1;
              const isActive = runningIndex === activeIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(flatItems.indexOf(item))}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-3 transition-colors ${
                    isActive ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    )}

                    {item.type === 'client' && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>{item.related.invoices} inv</span>
                        <span>{item.related.quotations} quo</span>
                        <span>{item.related.projects} proj</span>
                        {item.outstanding > 0 && (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(item.outstanding)} due
                          </span>
                        )}
                      </div>
                    )}

                    {item.type === 'employee' && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>{item.related.attendanceRecords} att</span>
                        <span>{item.related.advances} adv</span>
                        {item.related.advancesTotal > 0 && (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency(item.related.advancesTotal)} adv
                          </span>
                        )}
                        {item.related.salaryPaidTotal > 0 && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.related.salaryPaidTotal)} paid
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {typeof item.amount === 'number' && (
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </div>
                    )}
                    {item.date && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</div>
                    )}
                    {item.status && (
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.status}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );

  const searchInput = (
    <div className="search-field w-full">
      <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={isOverlay ? 'Search clients, invoices, projects, employees…' : 'Search everything…'}
        aria-label="Global search"
      />
      {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
      {query && !loading && (
        <button type="button" onClick={() => setQuery('')} className="search-clear" aria-label="Clear search">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 safe-area-pl safe-area-pr">
          <div className="flex items-center gap-2">
            {searchInput}
            <button type="button" onClick={close} className="btn btn-secondary btn-sm shrink-0" aria-label="Close search">
              Cancel
            </button>
          </div>
        </div>

        {trimmed.length >= 2 && (
          <div className="bg-white dark:bg-slate-900 max-h-[calc(100vh-5rem)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-2xl">
            {resultsBody}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {searchInput}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {resultsBody}
        </div>
      )}
    </div>
  );
};
