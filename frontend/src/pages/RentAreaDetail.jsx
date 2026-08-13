import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { MapPin, ArrowLeft, Building2, DoorOpen, Plus, Edit2, Trash2, Zap, AlertCircle } from 'lucide-react';

const EMPTY_FORM = { name: '', address: '', totalRooms: '', electricityBilling: false, electricityRate: '10', notes: '' };

export const RentAreaDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [area, setArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchArea = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/rent/areas/${id}`);
      setArea(res);
    } catch (err) {
      setFailed(true);
      toast.error(err.message || 'Failed to load area');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOpenAdd = () => {
    setEditingBuilding(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name || '',
      address: building.address || '',
      totalRooms: building.totalRooms || '',
      electricityBilling: Boolean(building.electricityBilling),
      electricityRate: building.electricityRate ?? '10',
      notes: building.notes || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingBuilding) {
        await api.put(`/rent/buildings/${editingBuilding.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post(`/rent/areas/${id}/buildings`, formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchArea();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (building) => {
    const ok = await confirm({
      title: `Delete "${building.name}"?`,
      message: 'Buildings with any rooms cannot be deleted — remove its rooms first.',
      confirmText: 'Delete building',
    });
    if (!ok) return;

    try {
      await api.delete(`/rent/buildings/${building.id}`);
      toast.success(`${building.name} deleted`);
      fetchArea();
    } catch (err) {
      toast.error(err.message || 'Failed to delete building');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading area">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (failed || !area) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <MapPin className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Area not found</div>
        <div className="flex justify-center gap-2 mt-5">
          <Link to="/rent/areas" className="btn btn-secondary">Back to Areas</Link>
          <button onClick={fetchArea} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to="/rent/areas" className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Areas</span>
      </Link>

      <div className="card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/25">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h2 className="page-title">{area.name}</h2>
            {area.notes && <p className="page-subtitle">{area.notes}</p>}
          </div>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Building</span>
        </button>
      </div>

      {area.buildings.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No buildings yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add the first building in {area.name} to start adding rooms.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Building</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {area.buildings.map((b) => (
            <div key={b.id} className="card card-interactive card-pad flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/rent/buildings/${b.id}`} className="min-w-0 group flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{b.address}</div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleOpenEdit(b)} className="btn-icon btn-icon-soft" aria-label={`Edit ${b.name}`}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b)} className="btn-icon btn-danger-soft" aria-label={`Delete ${b.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link to={`/rent/buildings/${b.id}`} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <DoorOpen className="w-3.5 h-3.5" />
                  {b.roomCount} room{b.roomCount === 1 ? '' : 's'}
                </span>
                <span className="badge badge-neutral">{b.occupiedCount} occupied</span>
                <span className="badge badge-neutral">{b.vacantCount} vacant</span>
                {b.electricityBilling && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    Electricity
                  </span>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        title={editingBuilding ? 'Edit Building' : 'Add New Building'}
        icon={Building2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="building-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingBuilding ? 'Save Changes' : 'Create Building'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <form id="building-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bld-name" className="label">Building Name *</label>
            <input
              id="bld-name"
              type="text"
              required
              placeholder="e.g. Shree Complex"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="bld-address" className="label">Address *</label>
            <textarea
              id="bld-address"
              rows={2}
              required
              placeholder="Full building address…"
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bld-rooms" className="label">Total Rooms</label>
              <input
                id="bld-rooms"
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={formData.totalRooms}
                onChange={(e) => setFormData((p) => ({ ...p, totalRooms: e.target.value }))}
                className="input"
              />
              <p className="text-[11px] text-slate-400 mt-1">Declared capacity — add individual rooms separately below.</p>
            </div>

            <div>
              <span className="label">Electricity Billing</span>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, electricityBilling: !p.electricityBilling }))}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-colors ${
                  formData.electricityBilling
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Zap className={`w-4 h-4 ${formData.electricityBilling ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {formData.electricityBilling ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`inline-flex items-center w-10 h-5 rounded-full transition-colors shrink-0 ${formData.electricityBilling ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.electricityBilling ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </span>
              </button>
              <p className="text-[11px] text-slate-400 mt-1">When off, electricity fields are hidden for this building's rooms.</p>
            </div>
          </div>

          {formData.electricityBilling && (
            <div>
              <label htmlFor="bld-rate" className="label">Electricity Rate (₹ per unit)</label>
              <input
                id="bld-rate"
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 10"
                value={formData.electricityRate}
                onChange={(e) => setFormData((p) => ({ ...p, electricityRate: e.target.value }))}
                className="input font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used to auto-calculate every room's bill from its meter reading. Changing this only affects future bills.</p>
            </div>
          )}

          <div>
            <label htmlFor="bld-notes" className="label">Notes</label>
            <textarea
              id="bld-notes"
              rows={2}
              placeholder="Optional notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="textarea"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
