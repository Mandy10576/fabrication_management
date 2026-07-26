import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  Tag,
  IndianRupee,
  X,
  Wrench
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

export const RateMaster = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  // Persistent custom units list saved in browser storage
  const [customUnits, setCustomUnits] = useState(() => {
    try {
      const saved = localStorage.getItem('khodiyar_custom_units');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveCustomUnit = (unitName) => {
    if (!unitName) return;
    const trimmed = unitName.trim();
    if (!trimmed) return;
    if (!customUnits.includes(trimmed)) {
      const updated = [...customUnits, trimmed];
      setCustomUnits(updated);
      try {
        localStorage.setItem('khodiyar_custom_units', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom units:', e);
      }
    }
  };

  const [formData, setFormData] = useState({
    serviceName: '',
    hsnSac: '9988',
    unit: 'sq ft',
    rate: '',
    gstRate: 18,
    description: ''
  });

  const [error, setError] = useState('');

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rates?search=${encodeURIComponent(search)}`);
      setRates(res);
    } catch (err) {
      console.error('Failed to load rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [search]);

  // Combine default units, persistent custom units, and any units from rate catalog
  const dynamicUnits = Array.from(
    new Set([...DEFAULT_UNITS, ...customUnits, ...rates.map(r => r.unit).filter(Boolean)])
  );

  const handleOpenAdd = () => {
    setEditingRate(null);
    setFormData({
      serviceName: '',
      hsnSac: '9988',
      unit: 'sq ft',
      rate: '',
      gstRate: 18,
      description: ''
    });
    setIsCustomUnit(false);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingRate(item);
    const currentUnit = item.unit || 'sq ft';
    setFormData({
      serviceName: item.serviceName || '',
      hsnSac: item.hsnSac || '9988',
      unit: currentUnit,
      rate: item.rate || '',
      gstRate: item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 18,
      description: item.description || ''
    });
    setIsCustomUnit(!dynamicUnits.includes(currentUnit));
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const finalUnit = formData.unit?.trim();
    if (!finalUnit) {
      setError('Please provide a valid unit of measurement');
      return;
    }

    // Save custom unit to persistent options list
    saveCustomUnit(finalUnit);

    const payload = {
      ...formData,
      unit: finalUnit
    };

    try {
      if (editingRate) {
        await api.put(`/rates/${editingRate.id}`, payload);
      } else {
        await api.post('/rates', payload);
      }
      setShowModal(false);
      fetchRates();
    } catch (err) {
      setError(err.message || 'Failed to save rate item');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete service "${name}"?`)) return;
    try {
      await api.delete(`/rates/${id}`);
      fetchRates();
    } catch (err) {
      alert(err.message || 'Failed to delete service');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-500" />
            <span>Rate Master (Fabrication Services Catalog)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure standard fabrication services, HSN/SAC codes, and editable rates per unit
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Fabrication Service</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by service name, HSN code, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400"
        />
      </div>

      {/* Grid of Rate Items */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading catalog...</div>
      ) : rates.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Wrench className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No Fabrication Services Configured</div>
          <p className="text-xs mt-1">Add items like Laser Cutting, Welding, MS Pipe, SS Railing to auto-select while creating invoices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.serviceName}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 text-[10px] font-bold border border-brand-200 dark:border-brand-800">
                      GST: {item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 18}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-semibold border border-slate-200 dark:border-slate-700">
                      HSN: {item.hsnSac || '9988'}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Standard Rate</div>
                  <div className="text-base font-extrabold text-brand-600 dark:text-brand-400 flex items-baseline gap-1">
                    <span>{formatCurrency(item.rate)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                      / {item.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                    title="Edit Rate"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.serviceName)}
                    className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Rate Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingRate ? 'Edit Fabrication Service' : 'Add Fabrication Service'}
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC Fiber Laser Cutting"
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9988"
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400">
                      Unit *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomUnit;
                        setIsCustomUnit(nextState);
                        if (nextState) {
                          setFormData(prev => ({ ...prev, unit: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, unit: dynamicUnits[0] || 'sq ft' }));
                        }
                      }}
                      className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      {isCustomUnit ? '← Presets' : '+ Custom'}
                    </button>
                  </div>

                  {isCustomUnit ? (
                    <div className="space-y-1">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          placeholder="e.g. bundle, cft, pair..."
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold text-xs"
                        />
                        {formData.unit?.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              saveCustomUnit(formData.unit);
                              setIsCustomUnit(false);
                            }}
                            className="px-2.5 py-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 text-brand-700 dark:text-brand-300 font-bold text-[10px] shrink-0 border border-brand-200 dark:border-brand-800 transition-all"
                            title="Save this unit into the options dropdown"
                          >
                            + Save Option
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={formData.unit}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_CUSTOM__') {
                          setIsCustomUnit(true);
                          setFormData({ ...formData, unit: '' });
                        } else {
                          setFormData({ ...formData, unit: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
                    >
                      {dynamicUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      <option value="__ADD_CUSTOM__">+ Add Custom Unit...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Rate per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 45.00"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    GST Rate (%) *
                  </label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                  >
                    <option value={18}>18% (Standard Rate)</option>
                    <option value={12}>12% (Reduced Rate)</option>
                    <option value={5}>5% (Essential Rate)</option>
                    <option value={28}>28% (Heavy/Luxury Rate)</option>
                    <option value={0}>0% (Exempted / Non-GST)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Service Description / Spec
                </label>
                <textarea
                  rows={3}
                  placeholder="Technical specification or thickness range..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
                >
                  {editingRate ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
