import React, { useState, useRef, useEffect } from 'react';
import { useFY } from '../context/FYContext';
import { Calendar, Plus, Check, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { Modal } from './ui/Modal';

export const FinancialYearSelector = () => {
  const { financialYears, selectedFY, setSelectedFY, fetchFYs } = useFY();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);

  // The dropdown used to stay open until you clicked it again — even after
  // navigating or tapping elsewhere on the page.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleCreateFY = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await api.post('/financial-years', {
        year: newYear,
        startDate,
        endDate,
        isCurrent: false
      });
      await fetchFYs();
      setShowAddModal(false);
      setNewYear('');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      setError(err.message || 'Failed to create financial year');
    } finally {
      setSaving(false);
    }
  };

  const selectedYearLabel = selectedFY === 'ALL'
    ? 'All FY'
    : financialYears.find(f => f.id === selectedFY)?.year || 'FY';

  const optionClass = (active) =>
    `w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
      active
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold
                   border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                   text-slate-800 dark:text-slate-200 hover:border-brand-500 transition-colors shrink-0"
      >
        <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
        <span className="max-w-[5.5rem] truncate">{selectedYearLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto
                     rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
                     shadow-pop z-50 p-2 animate-scale-in"
        >
          <div className="px-3 py-1.5 section-label">Switch Financial Year</div>

          <button
            role="option"
            aria-selected={selectedFY === 'ALL'}
            onClick={() => { setSelectedFY('ALL'); setIsOpen(false); }}
            className={optionClass(selectedFY === 'ALL')}
          >
            <span>All Financial Years</span>
            {selectedFY === 'ALL' && <Check className="w-4 h-4 shrink-0" />}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {financialYears.map(fy => (
            <button
              key={fy.id}
              role="option"
              aria-selected={selectedFY === fy.id}
              onClick={() => { setSelectedFY(fy.id); setIsOpen(false); }}
              className={optionClass(selectedFY === fy.id)}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">{fy.year}</span>
                {fy.isCurrent && (
                  <span className="badge bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                    Active
                  </span>
                )}
              </span>
              {selectedFY === fy.id && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            onClick={() => { setShowAddModal(true); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Financial Year</span>
          </button>
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Financial Year"
        icon={Calendar}
        size="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="add-fy-form" disabled={saving} className="btn btn-primary sm:min-w-[7rem]">
              {saving ? 'Creating…' : 'Create FY'}
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        <form id="add-fy-form" onSubmit={handleCreateFY} className="space-y-4">
          <div>
            <label htmlFor="fy-year" className="label">Financial Year (e.g. 2027-28)</label>
            <input
              id="fy-year"
              type="text"
              required
              data-autofocus
              placeholder="2027-28"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fy-start" className="label">Start Date</label>
              <input
                id="fy-start"
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="fy-end" className="label">End Date</label>
              <input
                id="fy-end"
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
