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
  Wrench,
  Settings,
  ChevronDown
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

export const RateMaster = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  // Persistent managed units list saved in browser storage
  const [availableUnits, setAvailableUnits] = useState(() => {
    try {
      const saved = localStorage.getItem('khodiyar_managed_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_UNITS;
  });

  const saveAvailableUnits = (newUnitsList) => {
    setAvailableUnits(newUnitsList);
    try {
      localStorage.setItem('khodiyar_managed_units', JSON.stringify(newUnitsList));
    } catch (e) {
      console.error('Failed to save units:', e);
    }
  };

  const handleAddUnitOption = (newUnitName) => {
    if (!newUnitName) return;
    const trimmed = newUnitName.trim();
    if (!trimmed) return;
    if (!availableUnits.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...availableUnits, trimmed];
      saveAvailableUnits(updated);
    }
  };

  const handleRemoveUnitOption = (unitToRemove) => {
    const updated = availableUnits.filter(u => u !== unitToRemove);
    saveAvailableUnits(updated);
    if (formData.unit === unitToRemove) {
      setFormData(prev => ({ ...prev, unit: updated[0] || '' }));
    }
  };

  const [formData, setFormData] = useState({
    serviceName: '',
    hsnSac: '9988',
    unit: 'sq ft',
    rate: '',
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

  const handleOpenAdd = () => {
    setEditingRate(null);
    setFormData({
      serviceName: '',
      hsnSac: '9988',
      unit: availableUnits[0] || 'sq ft',
      rate: '',
      description: ''
    });
    setIsUnitDropdownOpen(false);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingRate(item);
    const currentUnit = item.unit || 'sq ft';
    if (currentUnit && !availableUnits.includes(currentUnit)) {
      handleAddUnitOption(currentUnit);
    }
    setFormData({
      serviceName: item.serviceName || '',
      hsnSac: item.hsnSac || '9988',
      unit: currentUnit,
      rate: item.rate || '',
      description: item.description || ''
    });
    setIsUnitDropdownOpen(false);
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
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-semibold border border-slate-200 dark:border-slate-700 shrink-0">
                    HSN: {item.hsnSac || '9988'}
                  </span>
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

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400">
                      Unit *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowManageUnitsModal(true)}
                      className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Edit List</span>
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold flex items-center justify-between outline-none"
                    >
                      <span>{formData.unit || '-- Select Unit --'}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {isUnitDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 max-h-60 overflow-y-auto">
                        {availableUnits.map((u) => (
                          <div
                            key={u}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer font-medium transition-colors ${
                              formData.unit === u
                                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className="flex-1"
                              onClick={() => {
                                setFormData({ ...formData, unit: u });
                                setIsUnitDropdownOpen(false);
                              }}
                            >
                              {u}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveUnitOption(u);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title={`Delete "${u}" from dropdown list`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 p-1">
                          <input
                            type="text"
                            placeholder="+ Add custom unit..."
                            value={newUnitInput}
                            onChange={(e) => setNewUnitInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newUnitInput.trim()) {
                                  handleAddUnitOption(newUnitInput);
                                  setFormData({ ...formData, unit: newUnitInput.trim() });
                                  setNewUnitInput('');
                                }
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newUnitInput.trim()) {
                                handleAddUnitOption(newUnitInput);
                                setFormData({ ...formData, unit: newUnitInput.trim() });
                                setNewUnitInput('');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Rate per Unit (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 45.00"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
                />
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
      {/* Manage Units Catalog Modal */}
      {showManageUnitsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-500" />
                <span>Manage Units Options</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManageUnitsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add custom units or click the trash icon next to any unit option to permanently remove it from your dropdown list.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter unit name (e.g. bundle, CFT, pair)"
                value={newUnitInput}
                onChange={(e) => setNewUnitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newUnitInput.trim()) {
                      handleAddUnitOption(newUnitInput);
                      setNewUnitInput('');
                    }
                  }
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newUnitInput.trim()) {
                    handleAddUnitOption(newUnitInput);
                    setNewUnitInput('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shrink-0"
              >
                + Add Unit
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableUnits.map(u => (
                <div
                  key={u}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>{u}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnitOption(u)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                    title={`Delete "${u}" option`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  saveAvailableUnits(DEFAULT_UNITS);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
              >
                Reset Standard Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowManageUnitsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
