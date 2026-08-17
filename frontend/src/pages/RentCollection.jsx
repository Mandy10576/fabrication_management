import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Wallet, Search, AlertCircle, User, MapPin, Edit2, Trash2, Receipt, X, Zap } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'UNPAID', label: 'Unpaid' },
];

const PAYMENT_MODE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().split('T')[0];
const cycleLabel = (c) => `${formatDate(c.cycleStart)} – ${formatDate(c.cycleEnd)}`;

const emptyPaymentForm = (rentPending, electricityPending = 0) => ({
  amount: rentPending > 0.01 ? rentPending : '',
  electricityAmount: electricityPending > 0.01 ? electricityPending : '',
  paymentDate: today(),
  paymentMode: 'CASH',
  referenceNo: '',
  notes: ''
});

export const RentCollection = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyId, setPropertyId] = useState('');

  // Record Payment — full ledger for a contract's current cycle (add/edit/
  // delete individual payments), same pattern as the Electricity module.
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm(0));
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search, status });
      if (propertyId) params.set('propertyId', propertyId);
      const res = await api.get(`/rent/collection?${params.toString()}`);
      setRows(res);
      return res;
    } catch (err) {
      toast.error(err.message || 'Failed to load rent collection');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, propertyId]);

  useEffect(() => {
    api.get('/rent/properties/all').then(setProperties).catch(() => {});
  }, []);

  const handleOpenPayment = (row) => {
    setActiveRow(row);
    setEditingPaymentId(null);
    setPaymentForm(emptyPaymentForm(row.currentCycle?.pending || 0, row.electricityPending || 0));
    setError('');
    setShowPaymentModal(true);
  };

  // Row-level "Edit" — jumps straight into correcting the most recent
  // payment for this cycle, instead of landing on the blank add-payment
  // form the Wallet action opens.
  const handleOpenEditLatest = (row) => {
    setActiveRow(row);
    setError('');
    const latest = row.currentCyclePayments && row.currentCyclePayments[0];
    if (latest) {
      setEditingPaymentId(latest.id);
      setPaymentForm({
        amount: latest.amount,
        electricityAmount: '',
        paymentDate: latest.paymentDate ? latest.paymentDate.split('T')[0] : today(),
        paymentMode: latest.paymentMode,
        referenceNo: latest.referenceNo || '',
        notes: latest.notes || ''
      });
    } else {
      setEditingPaymentId(null);
      setPaymentForm(emptyPaymentForm(row.currentCycle?.pending || 0, row.electricityPending || 0));
    }
    setShowPaymentModal(true);
  };

  const handleEditPaymentRow = (p) => {
    setEditingPaymentId(p.id);
    setPaymentForm({
      amount: p.amount,
      electricityAmount: '',
      paymentDate: p.paymentDate ? p.paymentDate.split('T')[0] : today(),
      paymentMode: p.paymentMode,
      referenceNo: p.referenceNo || '',
      notes: p.notes || ''
    });
    setError('');
  };

  const handleCancelEditPaymentRow = () => {
    setEditingPaymentId(null);
    setPaymentForm(emptyPaymentForm(activeRow?.currentCycle?.pending || 0, activeRow?.electricityPending || 0));
    setError('');
  };

  const refreshActiveRow = async (contractId) => {
    const fresh = await fetchRows();
    const updated = fresh.find((r) => r.contractId === contractId) || null;
    setActiveRow(updated);
    return updated;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingPaymentId) {
        await api.put(`/rent/bills/${activeRow.currentCycle.billId}/payments/${editingPaymentId}`, paymentForm);
        toast.success('Payment updated');
      } else {
        const rentAmt = parseFloat(paymentForm.amount) || 0;
        const elecAmt = parseFloat(paymentForm.electricityAmount) || 0;
        if (rentAmt <= 0 && elecAmt <= 0) {
          setError('Enter an amount for rent, electricity, or both.');
          setSaving(false);
          return;
        }
        await api.post(`/rent/contracts/${activeRow.contractId}/combined-payments`, {
          rentAmount: paymentForm.amount || 0,
          rentBillId: activeRow.currentCycle?.billId || null,
          electricityAmount: paymentForm.electricityAmount || 0,
          paymentDate: paymentForm.paymentDate,
          paymentMode: paymentForm.paymentMode,
          referenceNo: paymentForm.referenceNo,
          notes: paymentForm.notes
        });
        toast.success('Payment recorded');
      }
      const updated = await refreshActiveRow(activeRow.contractId);
      setEditingPaymentId(null);
      setPaymentForm(emptyPaymentForm(updated?.currentCycle?.pending || 0, updated?.electricityPending || 0));
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaymentRow = async (p) => {
    const ok = await confirm({ title: 'Delete this payment?', message: 'This removes the payment record and recalculates pending rent.', confirmText: 'Delete payment' });
    if (!ok) return;
    try {
      await api.delete(`/rent/bills/${activeRow.currentCycle.billId}/payments/${p.id}`);
      toast.success('Payment deleted');
      const updated = await refreshActiveRow(activeRow.contractId);
      if (editingPaymentId === p.id) {
        setEditingPaymentId(null);
        setPaymentForm(emptyPaymentForm(updated?.currentCycle?.pending || 0, updated?.electricityPending || 0));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const propertyOptions = [{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.id, label: p.name }))];
  const canSubmitPayment = activeRow && (
    round2(activeRow.currentCycle?.pending || 0) > 0.01 ||
    round2(activeRow.electricityPending || 0) > 0.01 ||
    editingPaymentId
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-500 shrink-0" />
          <span>Rent Collection</span>
        </h2>
        <p className="page-subtitle">Current-cycle payment status for every occupied room</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-field flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input type="search" aria-label="Search tenant" placeholder="Search tenant name or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sm:w-48">
          <SearchableSelect mode="button" value={propertyId} options={propertyOptions} onSelect={(opt) => setPropertyId(opt.value)} ariaLabel="Filter by property" />
        </div>
        <div className="sm:w-44">
          <SearchableSelect mode="button" value={status} options={STATUS_FILTER_OPTIONS} onSelect={(opt) => setStatus(opt.value)} ariaLabel="Filter by payment status" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No active contracts found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {search || status !== 'ALL' || propertyId ? 'No contracts match your filters.' : 'Occupy a room to start tracking rent collection.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <li key={row.contractId} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/rent/rooms/${row.room.id}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                        {row.tenant.name}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {row.room.property.name} · Room {row.room.roomNumber}
                      </div>
                    </div>
                    {row.currentCycle && <span className={`badge shrink-0 ${getStatusBadgeClass(row.currentCycle.status)}`}>{row.currentCycle.status}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.currentCycle ? cycleLabel(row.currentCycle) : '—'}
                    </div>
                    {row.grandTotalPending > 0 ? (
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(row.grandTotalPending)} due</span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Settled</span>
                    )}
                  </div>
                  {row.electricityBilling && row.electricityCharge > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Electricity {formatCurrency(row.electricityCharge)}{row.electricityPending > 0.01 ? ` · ${formatCurrency(row.electricityPending)} due` : ' · Paid'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenPayment(row)} className="btn btn-sm btn-emerald flex-1">
                      <Wallet className="w-4 h-4" />
                      <span>{row.totalPending > 0.01 ? 'Record Payment' : 'Payments'}</span>
                    </button>
                    {row.currentCyclePayments?.length > 0 && (
                      <button onClick={() => handleOpenEditLatest(row)} className="btn-icon btn-icon-soft" aria-label="Edit payment" title="Edit payment">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Tenant</th>
                    <th scope="col">Room</th>
                    <th scope="col">Current Cycle</th>
                    <th scope="col" className="text-right">Rent</th>
                    <th scope="col" className="text-right">Paid</th>
                    <th scope="col" className="text-right">Electricity</th>
                    <th scope="col" className="text-right">Total Pending</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.contractId}>
                      <td>
                        <Link to={`/rent/rooms/${row.room.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-500 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {row.tenant.name}
                        </Link>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{row.tenant.mobile}</div>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.room.property.name} · {row.room.roomNumber}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.currentCycle ? cycleLabel(row.currentCycle) : '—'}</td>
                      <td className="text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(row.monthlyRent)}</td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(row.currentCycle?.paid || 0)}</td>
                      <td className="text-right whitespace-nowrap">
                        {row.electricityBilling && row.electricityCharge > 0 ? (
                          <span className={`font-semibold ${row.electricityPending > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                            {formatCurrency(row.electricityCharge)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                      <td className={`text-right font-bold whitespace-nowrap ${row.grandTotalPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(row.grandTotalPending)}
                      </td>
                      <td className="text-center">{row.currentCycle && <span className={`badge ${getStatusBadgeClass(row.currentCycle.status)}`}>{row.currentCycle.status}</span>}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.currentCyclePayments?.length > 0 && (
                            <button onClick={() => handleOpenEditLatest(row)} className="btn-icon btn-icon-soft hover:text-brand-500" aria-label={`Edit payment for ${row.tenant.name}`} title="Edit payment">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleOpenPayment(row)} className="btn-icon btn-icon-soft hover:text-emerald-500" aria-label={`Record payment for ${row.tenant.name}`} title="Record payment">
                            <Wallet className="w-4 h-4" />
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

      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Payment — ${activeRow?.tenant?.name || ''}`}
        icon={Wallet}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Close</button>
            {canSubmitPayment && (
              <button type="submit" form="collection-payment-form" disabled={saving} className="btn btn-emerald sm:min-w-[9rem]">
                {saving ? 'Saving…' : editingPaymentId ? 'Update Payment' : 'Record Payment'}
              </button>
            )}
          </div>
        }
      >
        {activeRow && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                {activeRow.room.property.name} · Room {activeRow.room.roomNumber}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{activeRow.currentCycle ? cycleLabel(activeRow.currentCycle) : '—'}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Rent (Cycle)</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(activeRow.currentCycle?.expected || activeRow.monthlyRent)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Paid</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(activeRow.currentCycle?.paid || 0)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Pending</div>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(activeRow.currentCycle?.pending || 0)}</div>
              </div>
            </div>

            {activeRow.electricityBilling && activeRow.electricityCharge > 0 && (
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                <div>
                  <div className="text-[10px] font-bold uppercase text-amber-600/70 dark:text-amber-400/70 flex items-center gap-1"><Zap className="w-3 h-3" /> Electricity</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(activeRow.electricityCharge)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-amber-600/70 dark:text-amber-400/70">Paid</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(activeRow.electricityPaid)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-amber-600/70 dark:text-amber-400/70">Pending</div>
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(activeRow.electricityPending)}</div>
                </div>
              </div>
            )}

            {activeRow.currentCyclePayments && activeRow.currentCyclePayments.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                  <Receipt className="w-3.5 h-3.5" />
                  Payments Recorded This Cycle
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  {activeRow.currentCyclePayments.map((p) => (
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

            {error && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}

            {!canSubmitPayment ? (
              <p className="text-sm text-slate-400 text-center py-2">Rent{activeRow.electricityBilling ? ' and electricity are' : ' is'} fully paid for this cycle. Edit or delete a payment above to make changes.</p>
            ) : (
              <form id="collection-payment-form" onSubmit={handleSubmitPayment} className="space-y-4">
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

                <div className={`grid grid-cols-1 ${!editingPaymentId && activeRow.electricityBilling ? 'sm:grid-cols-2' : ''} gap-4`}>
                  <div>
                    <label htmlFor="cp-amount" className="label">{editingPaymentId || !activeRow.electricityBilling ? 'Amount (₹)' : 'Rent Amount (₹)'}</label>
                    <input id="cp-amount" type="number" min="0" step="any" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} className="input font-semibold" />
                  </div>
                  {!editingPaymentId && activeRow.electricityBilling && (
                    <div>
                      <label htmlFor="cp-electricity-amount" className="label">Electricity Amount (₹)</label>
                      <input id="cp-electricity-amount" type="number" min="0" step="any" value={paymentForm.electricityAmount} onChange={(e) => setPaymentForm((p) => ({ ...p, electricityAmount: e.target.value }))} className="input font-semibold" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cp-date" className="label">Payment Date</label>
                    <input id="cp-date" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label htmlFor="cp-mode" className="label">Payment Mode</label>
                    <SearchableSelect id="cp-mode" mode="button" value={paymentForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setPaymentForm((p) => ({ ...p, paymentMode: opt.value }))} />
                  </div>
                </div>
                <div>
                  <label htmlFor="cp-ref" className="label">Reference No.</label>
                  <input id="cp-ref" type="text" placeholder="Optional" value={paymentForm.referenceNo} onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))} className="input" />
                </div>
                <div>
                  <label htmlFor="cp-notes" className="label">Notes</label>
                  <textarea id="cp-notes" rows={2} placeholder="Optional" value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
