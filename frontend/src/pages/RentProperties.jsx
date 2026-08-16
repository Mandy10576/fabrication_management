import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { Building2, Search, Plus, Edit2, Trash2, DoorOpen, AlertCircle, MapPin, Zap } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

const EMPTY_FORM = {
  name: '', addressLine1: '', addressLine2: '', city: '', state: '', pinCode: '', type: 'RESIDENTIAL',
  totalFloors: '', yearBuilt: '', description: '', totalRooms: '', electricityBilling: false, electricityRate: '10', notes: ''
};

export const RentProperties = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rent/properties?search=${encodeURIComponent(search)}`);
      setProperties(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenAdd = () => {
    setEditingProperty(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name || '',
      addressLine1: property.addressLine1 || '',
      addressLine2: property.addressLine2 || '',
      city: property.city || '',
      state: property.state || '',
      pinCode: property.pinCode || '',
      type: property.type || 'RESIDENTIAL',
      totalFloors: property.totalFloors ?? '',
      yearBuilt: property.yearBuilt ?? '',
      description: property.description || '',
      totalRooms: property.totalRooms || '',
      electricityBilling: Boolean(property.electricityBilling),
      electricityRate: property.electricityRate ?? '10',
      notes: property.notes || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingProperty) {
        await api.put(`/rent/properties/${editingProperty.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post('/rent/properties', formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchProperties();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (property) => {
    const ok = await confirm({
      title: `Delete "${property.name}"?`,
      message: 'Properties with any rooms cannot be deleted — remove its rooms first.',
      confirmText: 'Delete property',
    });
    if (!ok) return;

    try {
      await api.delete(`/rent/properties/${property.id}`);
      toast.success(`${property.name} deleted`);
      fetchProperties();
    } catch (err) {
      toast.error(err.message || 'Failed to delete property');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Properties</span>
          </h2>
          <p className="page-subtitle">Every building or property you manage, in one flat list.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      <div className="search-field">
        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search properties"
          placeholder="Search properties by name, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : properties.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No properties yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add your first property to start adding rooms and tenants.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <div key={property.id} className="card card-interactive card-pad flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/rent/properties/${property.id}`} className="min-w-0 group flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-600/25">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {property.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {property.city}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleOpenEdit(property)} className="btn-icon btn-icon-soft" aria-label={`Edit ${property.name}`}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(property)} className="btn-icon btn-danger-soft" aria-label={`Delete ${property.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link to={`/rent/properties/${property.id}`} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <DoorOpen className="w-3.5 h-3.5" />
                  {property.roomCount} room{property.roomCount === 1 ? '' : 's'}
                </span>
                <span className="badge badge-neutral">{property.occupiedCount} occupied</span>
                <span className="badge badge-neutral">{property.vacantCount} vacant</span>
                {property.electricityBilling && (
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
        title={editingProperty ? 'Edit Property' : 'Add New Property'}
        icon={Building2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="property-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingProperty ? 'Save Changes' : 'Create Property'}
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

        <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prop-name" className="label">Property / Building Name *</label>
            <input id="prop-name" type="text" required placeholder="e.g. Shree Complex" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="input" />
          </div>

          <div>
            <label htmlFor="prop-address1" className="label">Address Line 1 *</label>
            <input id="prop-address1" type="text" required placeholder="Street, area" value={formData.addressLine1} onChange={(e) => setFormData((p) => ({ ...p, addressLine1: e.target.value }))} className="input" />
          </div>
          <div>
            <label htmlFor="prop-address2" className="label">Address Line 2</label>
            <input id="prop-address2" type="text" placeholder="Optional" value={formData.addressLine2} onChange={(e) => setFormData((p) => ({ ...p, addressLine2: e.target.value }))} className="input" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prop-city" className="label">City *</label>
              <input id="prop-city" type="text" required placeholder="e.g. Adajan" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} className="input" />
            </div>
            <div>
              <label htmlFor="prop-state" className="label">State</label>
              <input id="prop-state" type="text" placeholder="e.g. Gujarat" value={formData.state} onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prop-pin" className="label">PIN Code</label>
              <input id="prop-pin" type="text" placeholder="e.g. 395009" value={formData.pinCode} onChange={(e) => setFormData((p) => ({ ...p, pinCode: e.target.value }))} className="input" />
            </div>
            <div>
              <span className="label">Type</span>
              <SearchableSelect mode="button" value={formData.type} options={TYPE_OPTIONS} onSelect={(opt) => setFormData((p) => ({ ...p, type: opt.value }))} ariaLabel="Property type" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prop-floors" className="label">Total Floors</label>
              <input id="prop-floors" type="number" min="0" placeholder="e.g. 4" value={formData.totalFloors} onChange={(e) => setFormData((p) => ({ ...p, totalFloors: e.target.value }))} className="input" />
            </div>
            <div>
              <label htmlFor="prop-year" className="label">Year Built</label>
              <input id="prop-year" type="number" min="1900" placeholder="e.g. 2018" value={formData.yearBuilt} onChange={(e) => setFormData((p) => ({ ...p, yearBuilt: e.target.value }))} className="input" />
            </div>
          </div>

          <div>
            <label htmlFor="prop-rooms" className="label">Total Rooms</label>
            <input id="prop-rooms" type="number" min="0" placeholder="Declared capacity" value={formData.totalRooms} onChange={(e) => setFormData((p) => ({ ...p, totalRooms: e.target.value }))} className="input" />
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
            <p className="text-[11px] text-slate-400 mt-1">When off, electricity fields are hidden for this property's rooms.</p>
          </div>

          {formData.electricityBilling && (
            <div>
              <label htmlFor="prop-rate" className="label">Electricity Rate (₹ per unit)</label>
              <input id="prop-rate" type="number" min="0" step="any" required placeholder="e.g. 10" value={formData.electricityRate} onChange={(e) => setFormData((p) => ({ ...p, electricityRate: e.target.value }))} className="input font-semibold" />
              <p className="text-[11px] text-slate-400 mt-1">Used to auto-calculate every room's bill from its meter reading. Changing this only affects future bills.</p>
            </div>
          )}

          <div>
            <label htmlFor="prop-description" className="label">Description</label>
            <textarea id="prop-description" rows={2} placeholder="Optional" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="textarea" />
          </div>
          <div>
            <label htmlFor="prop-notes" className="label">Notes</label>
            <textarea id="prop-notes" rows={2} placeholder="Optional internal notes" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
          </div>
        </form>
      </Modal>
    </div>
  );
};
