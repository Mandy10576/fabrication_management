import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Link } from 'react-router-dom';
import { ShareModal } from '../components/ShareModal';
import { Modal } from '../components/ui/Modal';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Copy,
  Trash2,
  Share2,
  IndianRupee,
  Clock,
  Calendar,
  History,
  CheckCircle2
} from 'lucide-react';

export const Invoices = () => {
  const { selectedFY } = useFY();
  const toast = useToast();
  const confirm = useConfirm();

  const [invoices, setInvoices] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gstFilter, setGstFilter] = useState('ALL');

  const [shareInvoice, setShareInvoice] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Outstanding amount on the invoice open in the payment modal. The 0.01
  // threshold treats a fully-settled invoice as paid despite float noise.
  const paymentBalanceDue = paymentModalInvoice
    ? Math.max(0, paymentModalInvoice.grandTotal - (paymentModalInvoice.amountReceived || 0))
    : 0;
  const isFullyPaid = Boolean(paymentModalInvoice) && paymentBalanceDue <= 0.01;

  const fetchInvoices = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const url = `/invoices?financialYearId=${selectedFY}&status=${statusFilter}&gstType=${gstFilter}&search=${encodeURIComponent(search)}&limit=20${cursorParam}`;
      const res = await api.get(url);

      const newItems = Array.isArray(res) ? res : (res.items || []);
      const newNextCursor = res.nextCursor || null;
      const newHasMore = Boolean(res.hasMore);

      if (isLoadMore) {
        setInvoices(prev => [...prev, ...newItems]);
      } else {
        setInvoices(newItems);
      }
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      toast.error(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedFY, statusFilter, gstFilter, search]);

  const handleDuplicate = async (id) => {
    const ok = await confirm({
      title: 'Duplicate invoice?',
      message: 'A new invoice will be created with the same line items and totals. You can edit it afterwards.',
      confirmText: 'Duplicate',
      tone: 'default'
    });
    if (!ok) return;

    try {
      const duplicated = await api.post(`/invoices/${id}/duplicate`);
      toast.success(`Invoice duplicated as #${duplicated.invoiceNumber}`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (id, invoiceNumber) => {
    const ok = await confirm({
      title: `Delete invoice #${invoiceNumber}?`,
      message: 'This permanently removes the invoice and its payment history. This cannot be undone.',
      confirmText: 'Delete invoice'
    });
    if (!ok) return;

    try {
      await api.delete(`/invoices/${id}`);
      toast.success(`Invoice #${invoiceNumber} deleted`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  const resetPaymentForm = () => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPaymentForm({
      amount: '',
      paymentDate: localIso,
      paymentMode: 'CASH',
      referenceNo: '',
      notes: ''
    });
  };

  const handleOpenPaymentModal = async (inv) => {
    try {
      const fullInv = await api.get(`/invoices/${inv.id}`);
      setPaymentModalInvoice(fullInv);
    } catch (e) {
      setPaymentModalInvoice(inv);
    }
    resetPaymentForm();
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast.warning('Please enter a valid payment amount');
      return;
    }

    // Mirrors the server rule so the admin gets immediate feedback instead of
    // a round-trip rejection. Tolerance keeps float noise from blocking an
    // exact final payment.
    if (amt > paymentBalanceDue + 0.01) {
      toast.warning(
        `Payment cannot exceed the balance due of ${formatCurrency(paymentBalanceDue)}.`
      );
      return;
    }

    try {
      setSavingPayment(true);
      const updatedInv = await api.post(`/invoices/${paymentModalInvoice.id}/payments`, {
        amount: amt,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : new Date().toISOString(),
        paymentMode: paymentForm.paymentMode,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes
      });
      setPaymentModalInvoice(updatedInv);
      setInvoices(prev => prev.map(item => item.id === updatedInv.id ? { ...item, ...updatedInv } : item));
      toast.success(`Payment of ${formatCurrency(amt)} recorded`);
      resetPaymentForm();
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const ok = await confirm({
      title: 'Delete this payment entry?',
      message: 'The invoice balance will be recalculated without this payment.',
      confirmText: 'Delete payment'
    });
    if (!ok) return;

    try {
      const updatedInv = await api.delete(`/invoices/${paymentModalInvoice.id}/payments/${paymentId}`);
      setPaymentModalInvoice(updatedInv);
      setInvoices(prev => prev.map(item => item.id === updatedInv.id ? { ...item, ...updatedInv } : item));
      toast.success('Payment entry deleted');
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const hasFilters = search || statusFilter !== 'ALL' || gstFilter !== 'ALL';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Invoices</span>
          </h2>
          <p className="page-subtitle">
            GST and Non-GST invoices, payment tracking, and print exports
          </p>
        </div>

        <Link to="/invoices/new" className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="search-field">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search invoices"
            placeholder="Search invoice number or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5">
          <select
            aria-label="Filter by payment status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          <select
            aria-label="Filter by tax type"
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="select"
          >
            <option value="ALL">All Tax Types</option>
            <option value="CGST_SGST">CGST + SGST</option>
            <option value="IGST">IGST</option>
            <option value="NON_GST">Non-GST</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading && invoices.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4 rounded-xl">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No invoices found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {hasFilters
                ? 'No invoices match your current search and filters.'
                : 'Create your first invoice for this financial year to get started.'}
            </p>
            <Link to="/invoices/new" className="btn btn-primary mt-5">
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Card view — up to xl. The desktop table needs 9 columns, which
                only stops being cramped once the sidebar and the content area
                are both wide enough. */}
            <ul className="xl:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <li key={inv.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 break-words">
                        {inv.client?.companyName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{formatDate(inv.date)}</span>
                        <span aria-hidden="true">•</span>
                        <span>{inv.gstType?.replace('_', ' + ')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className={`badge shrink-0 transition-opacity hover:opacity-80 ${getStatusBadgeClass(inv.status)}`}
                      title="Update payment"
                    >
                      {inv.status}
                    </button>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Total</dt>
                      <dd className="text-sm font-extrabold text-slate-900 dark:text-white break-words">
                        {formatCurrency(inv.grandTotal)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Received</dt>
                      <dd className="text-sm font-bold text-emerald-600 dark:text-emerald-400 break-words">
                        {formatCurrency(inv.amountReceived)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Balance</dt>
                      <dd className="text-sm font-extrabold text-rose-600 dark:text-rose-400 break-words">
                        {formatCurrency(inv.balanceDue)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/invoices/${inv.id}`} className="btn btn-sm btn-secondary">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="btn btn-sm bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Payment</span>
                    </button>
                    <button
                      onClick={() => setShareInvoice(inv)}
                      className="btn btn-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => handleDuplicate(inv.id)}
                        className="btn-icon btn-icon-soft"
                        aria-label={`Duplicate invoice ${inv.invoiceNumber}`}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                        className="btn-icon btn-danger-soft"
                        aria-label={`Delete invoice ${inv.invoiceNumber}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden xl:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice No</th>
                    <th scope="col">Client Company</th>
                    <th scope="col">Date</th>
                    <th scope="col">Tax Type</th>
                    <th scope="col" className="text-right">Grand Total</th>
                    <th scope="col" className="text-right">Received</th>
                    <th scope="col" className="text-right">Balance Due</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-brand-500 transition-colors">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-slate-800 dark:text-slate-200 max-w-[16rem]">
                        <span className="line-clamp-2">{inv.client?.companyName}</span>
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {inv.gstType?.replace('_', ' + ')}
                      </td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(inv.amountReceived)}
                      </td>
                      <td className="text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(inv.balanceDue)}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className={`badge transition-opacity hover:opacity-80 ${getStatusBadgeClass(inv.status)}`}
                          title="Click to update payment"
                        >
                          {inv.status}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="btn-icon btn-icon-soft hover:text-brand-500"
                            aria-label={`View invoice ${inv.invoiceNumber}`}
                            title="View / Print A4 Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="btn-icon btn-icon-soft hover:text-emerald-500"
                            aria-label={`Record payment for ${inv.invoiceNumber}`}
                            title="Record Payment"
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShareInvoice(inv)}
                            className="btn-icon btn-icon-soft hover:text-indigo-500"
                            aria-label={`Share invoice ${inv.invoiceNumber}`}
                            title="Share via WhatsApp/Email"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(inv.id)}
                            className="btn-icon btn-icon-soft hover:text-purple-500"
                            aria-label={`Duplicate invoice ${inv.invoiceNumber}`}
                            title="Duplicate Invoice"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                            className="btn-icon btn-danger-soft"
                            aria-label={`Delete invoice ${inv.invoiceNumber}`}
                            title="Delete Invoice"
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
            <button onClick={() => fetchInvoices(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Invoices</span>
              )}
            </button>
          </div>
        )}
      </div>

      {shareInvoice && <ShareModal invoice={shareInvoice} onClose={() => setShareInvoice(null)} />}

      {/* Payment recording & history */}
      <Modal
        open={Boolean(paymentModalInvoice)}
        onClose={() => setPaymentModalInvoice(null)}
        size="2xl"
        title="Payment Log & History"
        subtitle={
          paymentModalInvoice
            ? `Invoice #${paymentModalInvoice.invoiceNumber} • ${paymentModalInvoice.client?.companyName || ''}`
            : ''
        }
        icon={History}
        iconClass="text-emerald-500"
      >
        {paymentModalInvoice && (
          <div className="space-y-5">
            {/* Financial summary */}
            <dl className="grid grid-cols-1 xs:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Amount</dt>
                <dd className="text-sm font-bold text-slate-900 dark:text-white break-words mt-0.5">
                  {formatCurrency(paymentModalInvoice.grandTotal)}
                </dd>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Total Received</dt>
                <dd className="text-sm font-bold text-emerald-700 dark:text-emerald-400 break-words mt-0.5">
                  {formatCurrency(paymentModalInvoice.amountReceived || 0)}
                </dd>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Balance Due</dt>
                <dd className="text-sm font-bold text-rose-700 dark:text-rose-400 break-words mt-0.5">
                  {formatCurrency(paymentBalanceDue)}
                </dd>
              </div>
            </dl>

            {/* Nothing left to collect — the form would only be able to
                produce an over-payment, so it's replaced by a settled notice. */}
            {isFullyPaid ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Payment Fully Received</span>
                </div>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  This invoice has been paid in full.
                </p>
              </div>
            ) : (
            /* Add payment */
            <form
              onSubmit={handleAddPayment}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Record New Payment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-amount" className="label">Amount Received (₹) *</label>
                  <input
                    id="pay-amount"
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    required
                    data-autofocus
                    placeholder="Enter amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="input font-bold focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Balance due: <span className="font-semibold">{formatCurrency(paymentBalanceDue)}</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="pay-date" className="label">Payment Date & Time *</label>
                  <input
                    id="pay-date"
                    type="datetime-local"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="input focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="pay-mode" className="label">Payment Mode</label>
                  <select
                    id="pay-mode"
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="select focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pay-ref" className="label">Ref / Txn No.</label>
                  <input
                    id="pay-ref"
                    type="text"
                    placeholder="UTR / Cheque / Txn ID"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    className="input font-mono focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pay-notes" className="label">Notes / Remarks</label>
                <input
                  id="pay-notes"
                  type="text"
                  placeholder="e.g. Part payment via GPay"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="input focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={savingPayment} className="btn btn-emerald w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  <span>{savingPayment ? 'Saving…' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
            )}

            {/* History */}
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Transaction Log ({(paymentModalInvoice.payments || []).length})
              </h4>

              {(!paymentModalInvoice.payments || paymentModalInvoice.payments.length === 0) ? (
                <div className="p-5 text-center text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  No payments recorded yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {paymentModalInvoice.payments.map((p) => (
                    <li
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex flex-wrap items-start justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {new Date(p.paymentDate).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span className="badge badge-neutral">{p.paymentMode || 'CASH'}</span>
                        </div>
                        {(p.referenceNo || p.notes) && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 break-words">
                            {p.referenceNo && <span>Ref: <strong>{p.referenceNo}</strong></span>}
                            {p.referenceNo && p.notes && <span aria-hidden="true"> • </span>}
                            {p.notes && <span>{p.notes}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          aria-label="Delete this payment record"
                          title="Delete this payment record"
                          className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
