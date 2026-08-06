import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { ShareModal } from '../components/ShareModal';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Share2,
  IndianRupee,
  Filter,
  CheckCircle,
  X,
  Clock,
  Calendar,
  CreditCard,
  History
} from 'lucide-react';

export const Invoices = () => {
  const { selectedFY } = useFY();
  const navigate = useNavigate();
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
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedFY, statusFilter, gstFilter, search]);

  const handleDuplicate = async (id) => {
    if (!window.confirm('Duplicate this invoice into a new invoice?')) return;
    try {
      const duplicated = await api.post(`/invoices/${id}/duplicate`);
      alert(`Invoice duplicated successfully! New Invoice #${duplicated.invoiceNumber}`);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (id, invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to delete invoice #${invoiceNumber}?`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  const handleOpenPaymentModal = async (inv) => {
    try {
      const fullInv = await api.get(`/invoices/${inv.id}`);
      setPaymentModalInvoice(fullInv);
      const remaining = Math.max(0, fullInv.grandTotal - (fullInv.amountReceived || 0));
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setPaymentForm({
        amount: remaining > 0 ? String(remaining) : '',
        paymentDate: localIso,
        paymentMode: 'CASH',
        referenceNo: '',
        notes: ''
      });
    } catch (e) {
      setPaymentModalInvoice(inv);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount');
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
      setInvoices(prev => prev.map(item => item.id === updatedInv.id ? { ...item, amountReceived: updatedInv.amountReceived, balanceDue: updatedInv.balanceDue, status: updatedInv.status, payments: updatedInv.payments } : item));
      
      const newRemaining = Math.max(0, updatedInv.grandTotal - (updatedInv.amountReceived || 0));
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setPaymentForm({
        amount: newRemaining > 0 ? String(newRemaining) : '',
        paymentDate: localIso,
        paymentMode: 'CASH',
        referenceNo: '',
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment entry?')) return;
    try {
      const updatedInv = await api.delete(`/invoices/${paymentModalInvoice.id}/payments/${paymentId}`);
      setPaymentModalInvoice(updatedInv);
      setInvoices(prev => prev.map(item => item.id === updatedInv.id ? { ...item, amountReceived: updatedInv.amountReceived, balanceDue: updatedInv.balanceDue, status: updatedInv.status, payments: updatedInv.payments } : item));
    } catch (err) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            <span>Invoices Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            GST and Non-GST Invoice generator, payment tracking, and print exports
          </p>
        </div>

        <Link
          to="/invoices/new"
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium outline-none"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* GST Filter */}
          <select
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium outline-none"
          >
            <option value="ALL">All Tax Types</option>
            <option value="CGST_SGST">CGST + SGST (18%)</option>
            <option value="IGST">IGST (18%)</option>
            <option value="NON_GST">Non-GST</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading && invoices.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No Invoices Found</div>
            <p className="text-xs mt-1">Create an invoice for FY {selectedFY} to get started.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md screens) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/invoices/${inv.id}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                        {inv.client?.companyName}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${getStatusBadgeClass(inv.status)}`}
                    >
                      {inv.status}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(inv.date)}</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{inv.gstType?.replace('_', ' + ')}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-sm">{formatCurrency(inv.grandTotal)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Received</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(inv.amountReceived)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{formatCurrency(inv.balanceDue)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Pay</span>
                    </button>
                    <button
                      onClick={() => setShareInvoice(inv)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                    <button
                      onClick={() => handleDuplicate(inv.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-500"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Client Company</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Tax Type</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-right">Received</th>
                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-brand-500 transition-colors">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {inv.client?.companyName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {inv.gstType?.replace('_', ' + ')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.amountReceived)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(inv.balanceDue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${getStatusBadgeClass(inv.status)} hover:opacity-80 transition-opacity`}
                          title="Click to update payment"
                        >
                          {inv.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500 inline-flex items-center"
                          title="View / Print A4 Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500 inline-flex items-center"
                          title="Record Payment"
                        >
                          <IndianRupee className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShareInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-500 inline-flex items-center"
                          title="Share via WhatsApp/Email"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(inv.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-500 inline-flex items-center"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 inline-flex items-center"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hasMore && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => fetchInvoices(true)}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading More Invoices...</span>
                </>
              ) : (
                <span>Load More Invoices</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareInvoice && (
        <ShareModal invoice={shareInvoice} onClose={() => setShareInvoice(null)} />
      )}

      {/* Payment Recording & History Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPaymentModalInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Payment Log & History
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Invoice #{paymentModalInvoice.invoiceNumber} • {paymentModalInvoice.client?.companyName || ''}
            </p>

            {/* Financial Summary Badges */}
            <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] font-semibold uppercase text-slate-500 block">Total Amount</span>
                <strong className="text-sm text-slate-900 dark:text-white font-mono">
                  {formatCurrency(paymentModalInvoice.grandTotal)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 block">Total Received</span>
                <strong className="text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatCurrency(paymentModalInvoice.amountReceived || 0)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                <span className="text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-400 block">Balance Due</span>
                <strong className="text-sm text-rose-700 dark:text-rose-400 font-mono">
                  {formatCurrency(Math.max(0, paymentModalInvoice.grandTotal - (paymentModalInvoice.amountReceived || 0)))}
                </strong>
              </div>
            </div>

            {/* Add New Payment Form */}
            <form onSubmit={handleAddPayment} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs mb-6">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Record New Payment Received
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">📜 Cheque</option>
                    <option value="OTHER">💳 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Ref / Txn No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR / Cheque / Txn ID"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid part payment via GPay"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{savingPayment ? 'Saving Payment...' : 'Record Payment Entry'}</span>
                </button>
              </div>
            </form>

            {/* Payment History List */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Payment Transaction Logs ({(paymentModalInvoice.payments || []).length})
              </h4>

              {(!paymentModalInvoice.payments || paymentModalInvoice.payments.length === 0) ? (
                <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  No payment history recorded yet. Add a payment entry above.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {paymentModalInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(p.paymentDate).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                            {p.paymentMode || 'CASH'}
                          </span>
                        </div>
                        {(p.referenceNo || p.notes) && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            {p.referenceNo && <span>Ref: <strong>{p.referenceNo}</strong></span>}
                            {p.notes && <span>• {p.notes}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          +{formatCurrency(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          title="Delete this payment record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
