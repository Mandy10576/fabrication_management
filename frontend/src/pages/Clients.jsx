import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { StateSelect } from '../components/StateSelect';
import { ClientDuplicateDialog } from '../components/ClientDuplicateDialog';
import { INDIAN_STATES } from '../utils/indianStates';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Phone,
  AlertCircle,
  X
} from 'lucide-react';

const EMPTY_FORM = {
  companyName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  gstin: '',
  pan: '',
  address: '',
  state: 'Gujarat',
  notes: ''
};

export const Clients = () => {
  const { selectedFY } = useFY();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState(null);

  const fetchClients = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const res = await api.get(`/clients?financialYearId=${selectedFY}&search=${encodeURIComponent(search)}&limit=20${cursorParam}`);

      const newItems = Array.isArray(res) ? res : (res.items || []);
      const newNextCursor = res.nextCursor || null;
      const newHasMore = Boolean(res.hasMore);

      if (isLoadMore) {
        setClients(prev => [...prev, ...newItems]);
      } else {
        setClients(newItems);
      }
      setTotalCount(typeof res.totalCount === 'number' ? res.totalCount : newItems.length);
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);
    } catch (err) {
      console.error('Failed to load clients:', err);
      toast.error(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [selectedFY, search]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData(EMPTY_FORM);
    setError('');
    setDuplicates(null);
    setShowModal(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      mobile: client.mobile || '',
      email: client.email || '',
      gstin: client.gstin || '',
      pan: client.pan || '',
      address: client.address || '',
      state: client.state || '',
      notes: client.notes || ''
    });
    setError('');
    setDuplicates(null);
    setShowModal(true);
  };

  /** Persists the form. `confirmDuplicate` bypasses the server's duplicate guard. */
  const saveClient = async (confirmDuplicate = false) => {
    setError('');
    try {
      setSaving(true);
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, {
          ...formData,
          financialYearId: editingClient.financialYearId || selectedFY,
          confirmDuplicate
        });
        toast.success(`${formData.companyName} updated`);
      } else {
        await api.post('/clients', {
          ...formData,
          financialYearId: selectedFY === 'ALL' ? 'current' : selectedFY,
          confirmDuplicate
        });
        toast.success(`${formData.companyName} added`);
      }
      setDuplicates(null);
      setShowModal(false);
      fetchClients();
    } catch (err) {
      // The server refuses a mobile collision unless it's confirmed; surface
      // the existing record rather than a bare error message.
      if (err.status === 409 && err.data?.existingClients?.length) {
        setDuplicates({ exactMatches: err.data.existingClients, mobileMatches: [] });
        return;
      }
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const params = new URLSearchParams({
        mobile: formData.mobile || '',
        companyName: formData.companyName || '',
        address: formData.address || ''
      });
      if (editingClient) params.set('excludeId', editingClient.id);

      const found = await api.get(`/clients/check-duplicate?${params.toString()}`, true);
      // A shared name alone is not a collision, so it never interrupts.
      if (found.hasExactMatch || found.hasMobileMatch) {
        setDuplicates({ exactMatches: found.exactMatches, mobileMatches: found.mobileMatches });
        return;
      }
    } catch (err) {
      // A failed pre-check shouldn't block saving — the server still guards
      // mobile collisions on write, so fall through to the save attempt.
      console.error('Duplicate check failed:', err);
    }

    saveClient(false);
  };

  const handleUseExisting = (client) => {
    setDuplicates(null);
    setShowModal(false);
    navigate(`/clients/${client.id}`);
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: 'This permanently removes the client record. Invoices and quotations linked to this client may be affected.',
      confirmText: 'Delete client'
    });
    if (!ok) return;

    try {
      await api.delete(`/clients/${id}`);
      toast.success(`${name} deleted`);
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Failed to delete client');
    }
  };

  const setField = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  const setUpperField = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Clients</span>
          </h2>
          <p className="page-subtitle">
            Manage company clients, contact info, GSTIN, and transaction history
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search */}
      <div className="space-y-2.5">
        <div className="search-field">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search clients"
            placeholder="Search company, contact, mobile, or GSTIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="search-clear"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {search && !loading && (
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            {totalCount === 0
              ? <>No clients match <span className="font-semibold text-slate-700 dark:text-slate-300">"{search}"</span></>
              : <><span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> {totalCount === 1 ? 'client' : 'clients'} matching <span className="font-semibold text-slate-700 dark:text-slate-300">"{search}"</span></>}
          </p>
        )}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-24 shrink-0" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No clients found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'No clients match your search.' : 'Add your first client to start creating invoices.'}
            </p>
            <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          </div>
        ) : (
          <>
            {/* Card view up to lg */}
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {clients.map((c) => (
                <li key={c.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/clients/${c.id}`}
                        className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline break-words"
                      >
                        {c.companyName}
                      </Link>
                      {c.contactPerson && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          {c.contactPerson}
                        </div>
                      )}
                      {c.mobile && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {c.mobile}
                        </div>
                      )}
                    </div>

                    {c.gstin ? (
                      <span className="badge badge-neutral font-mono normal-case shrink-0">{c.gstin}</span>
                    ) : (
                      <span className="badge badge-neutral shrink-0">Non-GST</span>
                    )}
                  </div>

                  {c.address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{c.address}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/60">
                        {c._count?.invoices || 0} Invoices
                      </span>
                      <span className="badge bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60">
                        {c._count?.quotations || 0} Quotes
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {c.mobile && (
                        <a
                          href={`tel:${c.mobile}`}
                          className="btn-icon bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          aria-label={`Call ${c.companyName}`}
                          title="Call Client"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        to={`/clients/${c.id}`}
                        className="btn-icon btn-icon-soft"
                        aria-label={`View ${c.companyName}`}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="btn-icon btn-icon-soft"
                        aria-label={`Edit ${c.companyName}`}
                        title="Edit Client"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.companyName)}
                        className="btn-icon btn-danger-soft"
                        aria-label={`Delete ${c.companyName}`}
                        title="Delete Client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Company Name</th>
                    <th scope="col">Contact Person</th>
                    <th scope="col">Phone / Mobile</th>
                    <th scope="col">GSTIN</th>
                    <th scope="col">Invoices / Quotes</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td className="max-w-[20rem]">
                        <Link
                          to={`/clients/${c.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-brand-500 transition-colors"
                        >
                          {c.companyName}
                        </Link>
                        {c.address && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal line-clamp-1 mt-0.5">
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="text-slate-800 dark:text-slate-200">{c.contactPerson || '—'}</td>
                      <td className="text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                        {c.mobile || '—'}
                      </td>
                      <td>
                        {c.gstin ? (
                          <span className="badge badge-neutral font-mono normal-case">{c.gstin}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Non-GST</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/60">
                            {c._count?.invoices || 0} Inv
                          </span>
                          <span className="badge bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60">
                            {c._count?.quotations || 0} Quo
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/clients/${c.id}`}
                            className="btn-icon btn-icon-soft hover:text-brand-500"
                            aria-label={`View ${c.companyName}`}
                            title="View Client Details & History"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="btn-icon btn-icon-soft hover:text-amber-500"
                            aria-label={`Edit ${c.companyName}`}
                            title="Edit Client"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.companyName)}
                            className="btn-icon btn-danger-soft"
                            aria-label={`Delete ${c.companyName}`}
                            title="Delete Client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hasMore && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button onClick={() => fetchClients(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Clients</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit client */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="2xl"
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        icon={Building2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="client-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingClient ? 'Save Changes' : 'Create Client'}
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

        <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cl-company" className="label">Company / Business Name *</label>
            <input
              id="cl-company"
              type="text"
              required
              data-autofocus
              placeholder="e.g. Mahindra Engineering Pvt Ltd"
              value={formData.companyName}
              onChange={setField('companyName')}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cl-contact" className="label">Contact Person</label>
              <input
                id="cl-contact"
                type="text"
                placeholder="e.g. Suresh Patil"
                value={formData.contactPerson}
                onChange={setField('contactPerson')}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="cl-mobile" className="label">Mobile Number *</label>
              <input
                id="cl-mobile"
                type="tel"
                inputMode="tel"
                required
                placeholder="e.g. 9822011223"
                value={formData.mobile}
                onChange={setField('mobile')}
                className="input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cl-email" className="label">Email Address</label>
              <input
                id="cl-email"
                type="email"
                inputMode="email"
                placeholder="client@company.com"
                value={formData.email}
                onChange={setField('email')}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="cl-gstin" className="label">GST Number (GSTIN)</label>
              <input
                id="cl-gstin"
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={setUpperField('gstin')}
                className="input font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cl-pan" className="label">PAN Number</label>
            <input
              id="cl-pan"
              type="text"
              placeholder="ABCDE1234F"
              value={formData.pan}
              onChange={setUpperField('pan')}
              className="input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cl-address" className="label">Billing Address *</label>
            <textarea
              id="cl-address"
              rows={3}
              required
              placeholder="Full office or factory address…"
              value={formData.address}
              onChange={setField('address')}
              className="textarea"
            />
          </div>

          <div>
            <label htmlFor="cl-state" className="label">State</label>
            <StateSelect
              id="cl-state"
              options={INDIAN_STATES}
              value={formData.state}
              onChange={(val) => setFormData((prev) => ({ ...prev, state: val }))}
              placeholder="Select or type a state"
            />
          </div>

          <div>
            <label htmlFor="cl-notes" className="label">Internal Notes</label>
            <input
              id="cl-notes"
              type="text"
              placeholder="Key corporate client, advance terms, etc."
              value={formData.notes}
              onChange={setField('notes')}
              className="input"
            />
          </div>
        </form>
      </Modal>

      <ClientDuplicateDialog
        open={Boolean(duplicates)}
        exactMatches={duplicates?.exactMatches || []}
        mobileMatches={duplicates?.mobileMatches || []}
        busy={saving}
        useExistingLabel="Open Client"
        onUseExisting={handleUseExisting}
        onCreateAnyway={() => saveClient(true)}
        onCancel={() => setDuplicates(null)}
      />
    </div>
  );
};
