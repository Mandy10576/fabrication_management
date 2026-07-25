import React, { useState } from 'react';
import { useFY } from '../context/FYContext';
import { Calendar, Plus, Check } from 'lucide-react';
import { api } from '../services/api';

export const FinancialYearSelector = () => {
  const { financialYears, selectedFY, setSelectedFY, fetchFYs } = useFY();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleCreateFY = async (e) => {
    e.preventDefault();
    setError('');
    try {
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
    }
  };

  const selectedYearLabel = selectedFY === 'ALL'
    ? 'All Financial Years'
    : financialYears.find(f => f.id === selectedFY)?.year || 'Select Financial Year';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-brand-500 transition-all shadow-sm"
      >
        <Calendar className="w-4 h-4 text-brand-500" />
        <span>{selectedYearLabel}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold">
          FY
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1.5">
            Switch Financial Year
          </div>
          
          <button
            onClick={() => { setSelectedFY('ALL'); setIsOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedFY === 'ALL'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Financial Years</span>
            {selectedFY === 'ALL' && <Check className="w-4 h-4" />}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {financialYears.map(fy => (
            <button
              key={fy.id}
              onClick={() => { setSelectedFY(fy.id); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedFY === fy.id
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{fy.year}</span>
                {fy.isCurrent && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                    Active
                  </span>
                )}
              </div>
              {selectedFY === fy.id && <Check className="w-4 h-4" />}
            </button>
          ))}

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            onClick={() => { setShowAddModal(true); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Financial Year</span>
          </button>
        </div>
      )}

      {/* Modal for adding new financial year */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Financial Year</h3>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateFY} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Financial Year String (e.g. 2027-28)
                </label>
                <input
                  type="text"
                  required
                  placeholder="2027-28"
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all"
                >
                  Create FY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
