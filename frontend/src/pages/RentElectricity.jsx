import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Zap, Trash2, MapPin, Edit2, AlertCircle, Wallet, Receipt, CalendarDays, Gauge, ShieldCheck, X } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
];

const PAYMENT_MODE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const EMPTY_EDIT_FORM = {
  billDate: '',
  previousReading: '',
  currentReading: '',
  ratePerUnit: '',
  notes: '',
  status: 'PENDING',
  paymentMode: 'CASH',
  paymentDate: new Date().toISOString().split('T')[0]
};

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_PAYMENT_FORM = { amount: '', paymentDate: today(), paymentMode: 'CASH', referenceNo: '', notes: '' };

export const RentElectricity = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [bills, setBills] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('ALL');
  const [propertyId, setPropertyId] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Record Payment — full ledger for a bill (add/edit/delete individual
  // payments), reusing the same endpoints the Room Detail page already
  // drives, now surfaced directly from this cross-property list.
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status });
      if (propertyId) params.set('propertyId', propertyId);
      const res = await api.get(`/rent/electricity?${params.toString()}`);
      setBills(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load electricity bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, propertyId]);

  useEffect(() => {
    api.get('/rent/properties/all').then(setProperties).catch(() => {});
  }, []);

  const handleOpenPayment = (bill) => {
    const pending = round2(bill.amount - bill.amountPaid);
    setPaymentBill(bill);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: pending > 0 ? pending : '' });
    setEditingPaymentId(null);
    setPayError('');
    setShowPaymentModal(true);
  };

  const handleEditPaymentRow = (p) => {
    setEditingPaymentId(p.id);
    setPaymentForm({
      amount: p.amount,
      paymentDate: p.paymentDate ? p.paymentDate.split('T')[0] : today(),
      paymentMode: p.paymentMode,
      referenceNo: p.referenceNo || '',
      notes: p.notes || ''
    });
    setPayError('');
  };

  const handleCancelEditPaymentRow = () => {
    const pending = round2(paymentBill.amount - paymentBill.amountPaid);
    setEditingPaymentId(null);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: pending > 0 ? pending : '' });
    setPayError('');
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setPayError('');
    try {
      setPaySaving(true);
      const updated = editingPaymentId
        ? await api.put(`/rent/electricity/${paymentBill.id}/payments/${editingPaymentId}`, paymentForm)
        : await api.post(`/rent/electricity/${paymentBill.id}/payments`, paymentForm);
      toast.success(editingPaymentId ? 'Payment updated' : 'Payment recorded');
      setPaymentBill(updated);
      const pending = round2(updated.amount - updated.amountPaid);
      setEditingPaymentId(null);
      setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: pending > 0 ? pending : '' });
      fetchBills();
    } catch (err) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  const handleDeletePaymentRow = async (p) => {
    const ok = await confirm({ title: 'Delete this payment?', message: 'This removes the payment record and recalculates the bill balance.', confirmText: 'Delete payment' });
    if (!ok) return;
    try {
      const updated = await api.delete(`/rent/electricity/${paymentBill.id}/payments/${p.id}`);
      setPaymentBill(updated);
      if (editingPaymentId === p.id) {
        const pending = round2(updated.amount - updated.amountPaid);
        setEditingPaymentId(null);
        setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: pending > 0 ? pending : '' });
        setPayError('');
      }
      toast.success('Payment deleted');
      fetchBills();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  // The very first bill for a room is the only one whose "previous reading"
  // is a typed value rather than derived from an earlier bill's current
  // reading — every other bill's previous reading is locked to that chain.
  const isAnchorBill = (bill) => {
    if (!bill) return true;
    const sameRoom = bills.filter((x) => x.room.id === bill.room.id);
    if (sameRoom.length === 0) return true;
    const earliest = sameRoom.reduce((min, x) => (new Date(x.billDate) < new Date(min.billDate) ? x : min), sameRoom[0]);
    return earliest.id === bill.id;
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setEditForm({
      billDate: bill.billDate ? bill.billDate.split('T')[0] : '',
      previousReading: bill.previousReading ?? '',
      currentReading: bill.currentReading ?? '',
      ratePerUnit: bill.ratePerUnit ?? '',
      notes: bill.notes || '',
      status: bill.status === 'PAID' ? 'PAID' : 'PENDING',
      paymentMode: bill.paymentMode || 'CASH',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setError('');
    setShowEditModal(true);
  };

  const editAnchor = isAnchorBill(editingBill);
  const editPrevious = editAnchor
    ? (editForm.previousReading !== '' ? parseFloat(editForm.previousReading) || 0 : 0)
    : (editingBill ? editingBill.previousReading : 0);
  const editRate = editForm.ratePerUnit !== '' ? (parseFloat(editForm.ratePerUnit) || 0) : 0;
  const editUnits = editingBill && editForm.currentReading !== ''
    ? Math.max(0, (parseFloat(editForm.currentReading) || 0) - editPrevious)
    : 0;
  const editAmount = round2(editUnits * editRate);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      const payload = {
        billDate: editForm.billDate,
        previousReading: editForm.previousReading,
        currentReading: editForm.currentReading,
        ratePerUnit: editForm.ratePerUnit,
        notes: editForm.notes
      };
      const originalStatus = editingBill.status === 'PAID' ? 'PAID' : 'PENDING';
      if (editForm.status !== originalStatus) {
        payload.status = editForm.status;
        payload.paymentMode = editForm.paymentMode;
        payload.paymentDate = editForm.paymentDate;
      }
      await api.patch(`/rent/electricity/${editingBill.id}`, payload);
      toast.success('Electricity bill updated');
      setShowEditModal(false);
      fetchBills();
    } catch (err) {
      setError(err.message || 'Failed to update bill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bill) => {
    const ok = await confirm({ title: 'Delete this bill?', message: 'This permanently removes the electricity bill record.', confirmText: 'Delete bill' });
    if (!ok) return;
    try {
      await api.delete(`/rent/electricity/${bill.id}`);
      toast.success('Electricity bill deleted');
      fetchBills();
    } catch (err) {
      toast.error(err.message || 'Failed to delete bill');
    }
  };

  const propertyOptions = [{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.id, label: p.name }))];
  const totalPending = bills.filter((b) => b.status !== 'PAID').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500 shrink-0" />
          <span>Electricity</span>
        </h2>
        <p className="page-subtitle">
          Bills across every electricity-enabled property
          {totalPending > 0 && <span className="text-rose-600 dark:text-rose-400 font-semibold"> · {formatCurrency(totalPending)} pending</span>}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-48">
          <SearchableSelect mode="button" value={propertyId} options={propertyOptions} onSelect={(opt) => setPropertyId(opt.value)} ariaLabel="Filter by property" />
        </div>
        <div className="sm:w-44">
          <SearchableSelect mode="button" value={status} options={STATUS_FILTER_OPTIONS} onSelect={(opt) => setStatus(opt.value)} ariaLabel="Filter by status" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : bills.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Zap className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No electricity bills found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add bills from a room's detail page once electricity billing is enabled for its property.
            </p>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {bills.map((b) => (
                <li key={b.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/rent/rooms/${b.room.id}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                        {b.room.property.name} · Room {b.room.roomNumber}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.room.property.city}
                        {b.contract?.tenant && <span> · {b.contract.tenant.name}</span>}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(b.status)}`}>{b.status}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(b.billDate)}{b.unitsConsumed !== null && ` · ${b.unitsConsumed} units`}
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(b.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenPayment(b)} className="btn btn-sm btn-emerald flex-1">
                      <Wallet className="w-4 h-4" />
                      <span>{b.status === 'PAID' ? 'Payments' : 'Record Payment'}</span>
                    </button>
                    <button onClick={() => handleOpenEdit(b)} className="btn-icon btn-icon-soft" aria-label="Edit bill" title="Edit bill">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(b)} className="btn-icon btn-danger-soft" aria-label="Delete bill">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Property / Room</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Bill Date</th>
                    <th scope="col">Units</th>
                    <th scope="col" className="text-right">Amount</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/rent/rooms/${b.room.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-500">
                          {b.room.property.name} · {b.room.roomNumber}
                        </Link>
                        <div className="text-xs text-slate-400 mt-0.5">{b.room.property.city}</div>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">{b.contract?.tenant?.name || '—'}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(b.billDate)}</td>
                      <td className="text-slate-500 dark:text-slate-400">{b.unitsConsumed ?? '—'}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(b.amount)}</td>
                      <td className="text-center"><span className={`badge ${getStatusBadgeClass(b.status)}`}>{b.status}</span></td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenPayment(b)} className="btn-icon btn-icon-soft hover:text-emerald-500" aria-label="Record payment" title={b.status === 'PAID' ? 'View payments' : 'Record payment'}>
                            <Wallet className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEdit(b)} className="btn-icon btn-icon-soft hover:text-brand-500" aria-label="Edit bill" title="Edit bill">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(b)} className="btn-icon btn-danger-soft" aria-label="Delete bill">
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
      </div>

      {/* Edit Bill modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Electricity Bill"
        icon={Edit2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="edit-bill-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Save Changes'}
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
        {editingBill && (
          <form id="edit-bill-form" onSubmit={handleSaveEdit} className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              {editingBill.room.property.name} · Room {editingBill.room.roomNumber}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <CalendarDays className="w-3.5 h-3.5" />
                Bill Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eb-date" className="label">Bill Date</label>
                  <input
                    id="eb-date"
                    type="date"
                    value={editForm.billDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, billDate: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="eb-rate" className="label">Rate / Unit (₹)</label>
                  <input
                    id="eb-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.ratePerUnit}
                    onChange={(e) => setEditForm((p) => ({ ...p, ratePerUnit: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <Gauge className="w-3.5 h-3.5" />
                Meter Reading
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eb-previous" className="label">Previous Reading{!editAnchor && <span className="text-slate-400 font-normal"> (auto-carried)</span>}</label>
                  {editAnchor ? (
                    <input
                      id="eb-previous"
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.previousReading}
                      onChange={(e) => setEditForm((p) => ({ ...p, previousReading: e.target.value }))}
                      className="input"
                    />
                  ) : (
                    <div className="input flex items-center bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                      {editingBill.previousReading}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="eb-current" className="label">Current Reading *</label>
                  <input
                    id="eb-current"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editForm.currentReading}
                    onChange={(e) => setEditForm((p) => ({ ...p, currentReading: e.target.value }))}
                    className="input font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Units</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{editUnits}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Rate</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(editRate)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Amount</div>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(editAmount)}</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Payment Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, status: 'PENDING' }))}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    editForm.status === 'PENDING'
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, status: 'PAID' }))}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    editForm.status === 'PAID'
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Paid
                </button>
              </div>
              {editForm.status !== (editingBill.status === 'PAID' ? 'PAID' : 'PENDING') && (
                <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                  editForm.status === 'PAID'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {editForm.status === 'PAID'
                      ? 'This will record a payment for the full bill amount.'
                      : 'This will remove the payment(s) recorded against this bill.'}
                  </span>
                </div>
              )}

              {editForm.status === 'PAID' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="eb-pmode" className="label">Payment Mode</label>
                    <SearchableSelect id="eb-pmode" mode="button" value={editForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setEditForm((p) => ({ ...p, paymentMode: opt.value }))} />
                  </div>
                  <div>
                    <label htmlFor="eb-pdate" className="label">Payment Date</label>
                    <input
                      id="eb-pdate"
                      type="date"
                      value={editForm.paymentDate}
                      onChange={(e) => setEditForm((p) => ({ ...p, paymentDate: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="eb-notes" className="label">Notes</label>
              <textarea id="eb-notes" rows={2} placeholder="Optional" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
            </div>
          </form>
        )}
      </Modal>

      {/* Record Payment modal — full ledger for a bill: existing payments
          (correctable/deletable) plus an add/edit form, so a bill can be
          paid in full, in installments, and every payment fixed later. */}
      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        icon={Wallet}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Close</button>
            {(!paymentBill || round2(paymentBill.amount - paymentBill.amountPaid) > 0.01 || editingPaymentId) && (
              <button type="submit" form="record-payment-form" disabled={paySaving} className="btn btn-primary sm:min-w-[9rem]">
                {paySaving ? 'Saving…' : editingPaymentId ? 'Update Payment' : 'Record Payment'}
              </button>
            )}
          </div>
        }
      >
        {paymentBill && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                {paymentBill.room.property.name} · Room {paymentBill.room.roomNumber}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{formatDate(paymentBill.billDate)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Bill Amount</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(paymentBill.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Paid</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(paymentBill.amountPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Pending</div>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(round2(paymentBill.amount - paymentBill.amountPaid))}</div>
              </div>
            </div>

            {paymentBill.payments && paymentBill.payments.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                  <Receipt className="w-3.5 h-3.5" />
                  Payments Recorded
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  {paymentBill.payments.map((p) => (
                    <li key={p.id} className={`p-3 flex items-center justify-between gap-3 ${editingPaymentId === p.id ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                      <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(p.amount)}</div>
                        {formatDate(p.paymentDate)} · {p.paymentMode.replace('_', ' ')}
                        {p.referenceNo && <span> · Ref: {p.referenceNo}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleEditPaymentRow(p)} className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500" aria-label="Edit payment" title="Correct payment">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeletePaymentRow(p)} className="btn-icon w-7 h-7 text-slate-400 hover:text-rose-500" aria-label="Delete payment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {payError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{payError}</span>
              </div>
            )}

            {round2(paymentBill.amount - paymentBill.amountPaid) <= 0.01 && !editingPaymentId ? (
              <p className="text-sm text-slate-400 text-center py-2">This bill is fully paid. Edit or delete a payment above to make changes.</p>
            ) : (
              <form id="record-payment-form" onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                    <Wallet className="w-3.5 h-3.5" />
                    {editingPaymentId ? 'Edit Payment' : 'New Payment'}
                  </div>
                  {editingPaymentId && (
                    <button type="button" onClick={handleCancelEditPaymentRow} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Cancel edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rp-amount" className="label">Amount *</label>
                    <input
                      id="rp-amount"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                      className="input font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="rp-date" className="label">Payment Date</label>
                    <input
                      id="rp-date"
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rp-mode" className="label">Payment Mode</label>
                    <SearchableSelect id="rp-mode" mode="button" value={paymentForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setPaymentForm((p) => ({ ...p, paymentMode: opt.value }))} />
                  </div>
                  <div>
                    <label htmlFor="rp-ref" className="label">Reference No.</label>
                    <input id="rp-ref" type="text" placeholder="Optional" value={paymentForm.referenceNo} onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))} className="input" />
                  </div>
                </div>

                <div>
                  <label htmlFor="rp-notes" className="label">Notes</label>
                  <textarea id="rp-notes" rows={2} placeholder="Optional" value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
