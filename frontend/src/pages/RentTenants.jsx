import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { Users, Search, Plus, Phone, MapPin, DoorOpen, Edit2, AlertCircle } from 'lucide-react';

const EMPTY_FORM = {
  name: '', mobile: '', alternatePhone: '', email: '', dob: '', emergencyContactName: '', emergencyContactPhone: '',
  address: '', aadhaarNumber: '', panNumber: '', notes: ''
};

export const RentTenants = () => {
  const toast = useToast();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rent/tenants?search=${encodeURIComponent(search)}`);
      setTenants(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name || '',
      mobile: tenant.mobile || '',
      alternatePhone: tenant.alternatePhone || '',
      email: tenant.email || '',
      dob: tenant.dob ? tenant.dob.split('T')[0] : '',
      emergencyContactName: tenant.emergencyContactName || '',
      emergencyContactPhone: tenant.emergencyContactPhone || '',
      address: tenant.address || '',
      aadhaarNumber: tenant.aadhaarNumber || '',
      panNumber: tenant.panNumber || '',
      notes: tenant.notes || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingTenant) {
        await api.put(`/rent/tenants/${editingTenant.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post('/rent/tenants', formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchTenants();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Tenants</span>
          </h2>
          <p className="page-subtitle">Every tenant you've ever housed, in one directory.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Tenant</span>
        </button>
      </div>

      <div className="search-field">
        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search tenants"
          placeholder="Search tenants by name, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No tenants yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add a tenant here, or one gets created automatically when you start a contract for a room.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Tenant</span>
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {tenants.map((tenant) => {
              const active = tenant.contracts?.[0] || null;
              return (
                <li key={tenant.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold flex items-center justify-center">
                      {tenant.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{tenant.name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <a href={`tel:${tenant.mobile}`} className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 font-mono">
                          <Phone className="w-3 h-3" />
                          {tenant.mobile}
                        </a>
                        {tenant.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {tenant.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {active ? (
                      <Link to={`/rent/rooms/${active.roomId}`} className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        <DoorOpen className="w-3 h-3" />
                        Currently housed
                      </Link>
                    ) : (
                      <span className="badge badge-neutral">Not housed</span>
                    )}
                    <button onClick={() => handleOpenEdit(tenant)} className="btn-icon btn-icon-soft" aria-label={`Edit ${tenant.name}`}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        title={editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
        icon={Users}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="tenant-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingTenant ? 'Save Changes' : 'Create Tenant'}
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

        <form id="tenant-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-name" className="label">Full Name *</label>
              <input id="t-name" type="text" required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label htmlFor="t-mobile" className="label">Phone Number *</label>
              <input id="t-mobile" type="tel" required value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value }))} className="input font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-alt-phone" className="label">Alternate Phone</label>
              <input id="t-alt-phone" type="tel" placeholder="Optional" value={formData.alternatePhone} onChange={(e) => setFormData((p) => ({ ...p, alternatePhone: e.target.value }))} className="input font-mono" />
            </div>
            <div>
              <label htmlFor="t-email" className="label">Email Address</label>
              <input id="t-email" type="email" placeholder="Optional" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="input" />
            </div>
          </div>

          <div>
            <label htmlFor="t-dob" className="label">Date of Birth</label>
            <input id="t-dob" type="date" value={formData.dob} onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))} className="input" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-ec-name" className="label">Emergency Contact Name</label>
              <input id="t-ec-name" type="text" placeholder="Optional" value={formData.emergencyContactName} onChange={(e) => setFormData((p) => ({ ...p, emergencyContactName: e.target.value }))} className="input" />
            </div>
            <div>
              <label htmlFor="t-ec-phone" className="label">Emergency Contact Phone</label>
              <input id="t-ec-phone" type="tel" placeholder="Optional" value={formData.emergencyContactPhone} onChange={(e) => setFormData((p) => ({ ...p, emergencyContactPhone: e.target.value }))} className="input font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-aadhaar" className="label">Aadhaar Number *</label>
              <input id="t-aadhaar" type="text" required placeholder="e.g. 1234 5678 9012" value={formData.aadhaarNumber} onChange={(e) => setFormData((p) => ({ ...p, aadhaarNumber: e.target.value }))} className="input font-mono" />
            </div>
            <div>
              <label htmlFor="t-pan" className="label">PAN Number</label>
              <input id="t-pan" type="text" placeholder="Optional" value={formData.panNumber} onChange={(e) => setFormData((p) => ({ ...p, panNumber: e.target.value }))} className="input font-mono" />
            </div>
          </div>

          <div>
            <label htmlFor="t-address" className="label">Permanent Address</label>
            <textarea id="t-address" rows={2} placeholder="Optional" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} className="textarea" />
          </div>

          <div>
            <label htmlFor="t-notes" className="label">Notes / Remarks</label>
            <textarea id="t-notes" rows={2} placeholder="Optional" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
          </div>
        </form>
      </Modal>
    </div>
  );
};
