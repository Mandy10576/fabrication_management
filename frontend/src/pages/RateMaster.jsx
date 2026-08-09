import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Wrench,
  Settings,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

const EMPTY_FORM = {
  serviceName: '',
  hsnSac: '',
  unit: 'sq ft',
  rate: '',
  description: ''
};

export const RateMaster = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const unitDropdownRef = useRef(null);

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
    return newUnitsList;
  };

  const handleAddUnitOption = (newUnitName) => {
    const trimmed = (newUnitName || '').trim();
    if (!trimmed) return;
    setAvailableUnits((prev) => {
      if (prev.some((u) => u.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem('khodiyar_managed_units', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleRemoveUnitOption = (unitToRemove) => {
    const updated = availableUnits.filter(u => u !== unitToRemove);
    saveAvailableUnits(updated);
    if (formData.unit === unitToRemove) {
      setFormData(prev => ({ ...prev, unit: updated[0] || '' }));
    }
  };

  // Close the unit dropdown when clicking elsewhere.
  useEffect(() => {
    if (!isUnitDropdownOpen) return undefined;
    const onPointerDown = (e) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isUnitDropdownOpen]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rates?search=${encodeURIComponent(search)}`);
      setRates(res);
    } catch (err) {
      console.error('Failed to load rates:', err);
      toast.error(err.message || 'Failed to load rate catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingRate(null);
    setFormData({ ...EMPTY_FORM, unit: availableUnits[0] || 'sq ft' });
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
      hsnSac: item.hsnSac || '',
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

    // Keep any newly typed unit in the persistent dropdown list.
    // (This previously called an undefined `saveCustomUnit`, which threw
    // before the request was ever sent.)
    handleAddUnitOption(finalUnit);

    const payload = { ...formData, unit: finalUnit };

    try {
      setSaving(true);
      if (editingRate) {
        await api.put(`/rates/${editingRate.id}`, payload);
        toast.success(`${payload.serviceName} updated`);
      } else {
        await api.post('/rates', payload);
        toast.success(`${payload.serviceName} added to catalog`);
      }
      setShowModal(false);
      fetchRates();
    } catch (err) {
      setError(err.message || 'Failed to save rate item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: 'This removes the service from your rate catalog. Existing invoices are not affected.',
      confirmText: 'Delete service'
    });
    if (!ok) return;

    try {
      await api.delete(`/rates/${id}`);
      toast.success(`${name} deleted`);
      fetchRates();
    } catch (err) {
      toast.error(err.message || 'Failed to delete service');
    }
  };

  const addUnitFromInput = (alsoSelect = false) => {
    const trimmed = newUnitInput.trim();
    if (!trimmed) return;
    handleAddUnitOption(trimmed);
    if (alsoSelect) setFormData((prev) => ({ ...prev, unit: trimmed }));
    setNewUnitInput('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Rate Master</span>
          </h2>
          <p className="page-subtitle">
            Standard fabrication services, HSN/SAC codes, and rates per unit
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowManageUnitsModal(true)}
            className="btn btn-secondary"
            title="Manage the units dropdown list"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden xs:inline">Units</span>
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary flex-1 sm:flex-none">
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-field">
        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search rate catalog"
          placeholder="Search by service name, HSN code, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Catalog grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No services configured</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {search
              ? 'No services match your search.'
              : 'Add items like Laser Cutting, Welding, MS Pipe or SS Railing so they auto-fill while creating invoices.'}
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {rates.map((item) => (
            <div key={item.id} className="card card-interactive p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white break-words min-w-0">
                    {item.serviceName}
                  </h3>
                  {item.hsnSac && (
                    <span className="badge badge-neutral font-mono normal-case shrink-0">
                      HSN {item.hsnSac}
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Standard Rate
                  </div>
                  <div className="font-extrabold text-brand-600 dark:text-brand-400 flex flex-wrap items-baseline gap-1">
                    <span className="text-base break-words">{formatCurrency(item.rate)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                      / {item.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="btn-icon btn-icon-soft hover:text-amber-500"
                    aria-label={`Edit ${item.serviceName}`}
                    title="Edit Rate"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.serviceName)}
                    className="btn-icon btn-danger-soft"
                    aria-label={`Delete ${item.serviceName}`}
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

      {/* Add / Edit service */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        title={editingRate ? 'Edit Fabrication Service' : 'Add Fabrication Service'}
        icon={Wrench}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="rate-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingRate ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <form id="rate-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rate-name" className="label">Service Name *</label>
            <input
              id="rate-name"
              type="text"
              required
              data-autofocus
              placeholder="e.g. CNC Fiber Laser Cutting"
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate-hsn" className="label">HSN / SAC Code</label>
              <input
                id="rate-hsn"
                type="text"
                placeholder="e.g. 9988"
                value={formData.hsnSac}
                onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                className="input font-mono"
              />
            </div>

            <div ref={unitDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="label mb-0">Unit *</span>
                <button
                  type="button"
                  onClick={() => setShowManageUnitsModal(true)}
                  className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Edit list</span>
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isUnitDropdownOpen}
                  className="input flex items-center justify-between text-left font-semibold"
                >
                  <span className="truncate">{formData.unit || 'Select unit'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUnitDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-pop p-2 space-y-0.5 max-h-56 overflow-y-auto animate-scale-in"
                  >
                    {availableUnits.map((u) => (
                      <div
                        key={u}
                        className={`flex items-center gap-1 rounded-lg transition-colors ${
                          formData.unit === u
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={formData.unit === u}
                          className="flex-1 text-left px-3 py-2 text-sm font-medium min-w-0 truncate"
                          onClick={() => {
                            setFormData({ ...formData, unit: u });
                            setIsUnitDropdownOpen(false);
                          }}
                        >
                          {u}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveUnitOption(u)}
                          className="btn-icon w-8 h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          aria-label={`Remove ${u} from list`}
                          title={`Delete "${u}" from dropdown list`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Add custom unit…"
                        value={newUnitInput}
                        onChange={(e) => setNewUnitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addUnitFromInput(true);
                          }
                        }}
                        className="input py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addUnitFromInput(true)}
                        className="btn btn-sm btn-primary shrink-0"
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
            <label htmlFor="rate-value" className="label">Rate per Unit (₹) *</label>
            <input
              id="rate-value"
              type="number"
              step="0.01"
              inputMode="decimal"
              required
              placeholder="e.g. 45.00"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              className="input font-semibold"
            />
          </div>

          <div>
            <label htmlFor="rate-desc" className="label">Service Description / Spec</label>
            <textarea
              id="rate-desc"
              rows={3}
              placeholder="Technical specification or thickness range…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="textarea"
            />
          </div>
        </form>
      </Modal>

      {/* Manage units */}
      <Modal
        open={showManageUnitsModal}
        onClose={() => setShowManageUnitsModal(false)}
        size="md"
        title="Manage Units"
        icon={Settings}
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => saveAvailableUnits(DEFAULT_UNITS)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
            >
              Reset defaults
            </button>
            <button type="button" onClick={() => setShowManageUnitsModal(false)} className="btn btn-primary min-w-[6rem]">
              Done
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Add custom units, or remove any you don't use. This list is stored in this browser.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            aria-label="New unit name"
            placeholder="e.g. bundle, CFT, pair"
            value={newUnitInput}
            onChange={(e) => setNewUnitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUnitFromInput(false);
              }
            }}
            className="input"
          />
          <button type="button" onClick={() => addUnitFromInput(false)} className="btn btn-primary shrink-0">
            Add
          </button>
        </div>

        <ul className="space-y-1.5">
          {availableUnits.map(u => (
            <li
              key={u}
              className="flex items-center justify-between gap-2 pl-3.5 pr-1.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <span className="truncate">{u}</span>
              <button
                type="button"
                onClick={() => handleRemoveUnitOption(u)}
                className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                aria-label={`Delete ${u}`}
                title={`Delete "${u}" option`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};
