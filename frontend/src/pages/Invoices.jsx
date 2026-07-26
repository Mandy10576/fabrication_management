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
  X
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
  const [amountReceivedInput, setAmountReceivedInput] = useState('');

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

  const handleOpenPaymentModal = (inv) => {
    setPaymentModalInvoice(inv);
    setAmountReceivedInput(inv.amountReceived || '');
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    try {
      await api.patch(`/invoices/${paymentModalInvoice.id}/payment`, {
        amountReceived: parseFloat(amountReceivedInput) || 0
      });
      setPaymentModalInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to update payment');
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
          <div className="overflow-x-auto">
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

      {/* Payment Recording Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setPaymentModalInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Record Payment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice #{paymentModalInvoice.invoiceNumber} • Grand Total: {formatCurrency(paymentModalInvoice.grandTotal)}
            </p>

            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Total Amount Received So Far (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountReceivedInput}
                  onChange={(e) => setAmountReceivedInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-extrabold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <strong>{formatCurrency(paymentModalInvoice.grandTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Calculated Balance Due:</span>
                  <strong className="text-rose-600">
                    {formatCurrency(Math.max(0, paymentModalInvoice.grandTotal - (parseFloat(amountReceivedInput) || 0)))}
                  </strong>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30"
                >
                  Update Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
