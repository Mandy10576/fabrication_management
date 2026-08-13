import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { MapPin, Search, Plus, Edit2, Trash2, Building2, DoorOpen, AlertCircle } from 'lucide-react';

const EMPTY_FORM = { name: '', notes: '' };

export const RentAreas = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rent/areas?search=${encodeURIComponent(search)}`);
      setAreas(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenAdd = () => {
    setEditingArea(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (area) => {
    setEditingArea(area);
    setFormData({ name: area.name || '', notes: area.notes || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingArea) {
        await api.put(`/rent/areas/${editingArea.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post('/rent/areas', formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchAreas();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (area) => {
    const ok = await confirm({
      title: `Delete "${area.name}"?`,
      message: 'Areas with any buildings cannot be deleted — remove its buildings first.',
      confirmText: 'Delete area',
    });
    if (!ok) return;

    try {
      await api.delete(`/rent/areas/${area.id}`);
      toast.success(`${area.name} deleted`);
      fetchAreas();
    } catch (err) {
      toast.error(err.message || 'Failed to delete area');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Areas</span>
          </h2>
          <p className="page-subtitle">Group your buildings by locality — Sachin, Adajan, etc.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Area</span>
        </button>
      </div>

      <div className="search-field">
        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search areas"
          placeholder="Search areas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <MapPin className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No areas yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add your first locality (e.g. Sachin, Adajan) to start organizing buildings under it.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Area</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <div key={area.id} className="card card-interactive card-pad flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/rent/areas/${area.id}`} className="min-w-0 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-600/25">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {area.name}
                      </div>
                      {area.notes && <div className="text-xs text-slate-400 truncate">{area.notes}</div>}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleOpenEdit(area)} className="btn-icon btn-icon-soft" aria-label={`Edit ${area.name}`}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(area)} className="btn-icon btn-danger-soft" aria-label={`Delete ${area.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link to={`/rent/areas/${area.id}`} className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Building2 className="w-3.5 h-3.5" />
                  {area._count?.buildings ?? 0} building{area._count?.buildings === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <DoorOpen className="w-3.5 h-3.5" />
                  {area.occupiedRooms}/{area.totalRooms} occupied
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingArea ? 'Edit Area' : 'Add New Area'}
        icon={MapPin}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="area-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingArea ? 'Save Changes' : 'Create Area'}
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

        <form id="area-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="area-name" className="label">Area Name *</label>
            <input
              id="area-name"
              type="text"
              required
              placeholder="e.g. Sachin"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="area-notes" className="label">Notes</label>
            <textarea
              id="area-notes"
              rows={2}
              placeholder="Optional notes about this locality"
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
