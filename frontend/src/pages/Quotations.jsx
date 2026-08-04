import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { QuotationTemplate } from '../components/QuotationTemplate';
import { downloadPDF } from '../utils/pdfExport';
import {
  Quote,
  Search,
  Plus,
  ArrowRight,
  FileCheck2,
  Trash2,
  Printer,
  Download,
  Edit2,
  X
} from 'lucide-react';

export const Quotations = () => {
  const { selectedFY } = useFY();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [previewQuotation, setPreviewQuotation] = useState(null);

  const fetchQuotations = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const res = await api.get(`/quotations?financialYearId=${selectedFY}&search=${encodeURIComponent(search)}&limit=20${cursorParam}`);

      const newItems = Array.isArray(res) ? res : (res.items || []);
      const newNextCursor = res.nextCursor || null;
      const newHasMore = Boolean(res.hasMore);

      if (isLoadMore) {
        setQuotations(prev => [...prev, ...newItems]);
      } else {
        setQuotations(newItems);
      }
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [selectedFY, search]);

  const handleConvert = async (id, quoteNo) => {
    if (!window.confirm(`Convert Quotation #${quoteNo} into a Tax Invoice?`)) return;
    try {
      const inv = await api.post(`/quotations/${id}/convert`);
      alert(`Quotation successfully converted to Tax Invoice #${inv.invoiceNumber}!`);
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      alert(err.message || 'Failed to convert quotation');
    }
  };

  const handleDelete = async (id, quoteNo) => {
    if (!window.confirm(`Delete quotation #${quoteNo}?`)) return;
    try {
      await api.delete(`/quotations/${id}`);
      fetchQuotations();
    } catch (err) {
      alert(err.message || 'Failed to delete quotation');
    }
  };

  const openPreview = async (q) => {
    try {
      const full = await api.get(`/quotations/${q.id}`);
      setPreviewQuotation(full);
    } catch (err) {
      setPreviewQuotation(q);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Quote className="w-6 h-6 text-indigo-500" />
            <span>Quotations & Estimations</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create professional fabrication estimates and convert them into Tax Invoices with 1 click
          </p>
        </div>

        <Link
          to="/quotations/new"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </Link>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by quotation number, client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400"
        />
      </div>

      {/* Quotations Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Quote className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No Quotations Found</div>
            <p className="text-xs mt-1">Create an estimate for your clients to start sending proposals.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md screens) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map((q) => (
                <div key={q.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {q.quotationNumber}
                      </span>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                        {q.client?.companyName}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${getStatusBadgeClass(q.status)}`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Date: {formatDate(q.date)}</span>
                    <span>Valid: {formatDate(q.validUntil)}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Total:</span>
                    <strong className="text-slate-900 dark:text-white font-extrabold text-sm">{formatCurrency(q.grandTotal)}</strong>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => openPreview(q)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <Link
                      to={`/quotations/${q.id}/edit`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    {q.status !== 'CONVERTED' && (
                      <button
                        onClick={() => handleConvert(q.id, q.quotationNumber)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Convert</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(q.id, q.quotationNumber)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
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
                    <th className="py-3.5 px-4">Quote No</th>
                    <th className="py-3.5 px-4">Client Company</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Valid Until</th>
                    <th className="py-3.5 px-4 text-right">Estimated Total</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {q.quotationNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {q.client?.companyName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(q.date)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(q.validUntil)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${getStatusBadgeClass(q.status)}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => openPreview(q)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-500 inline-flex items-center"
                          title="Preview A4 Quotation"
                        >
                          <Quote className="w-4 h-4" />
                        </button>

                        <Link
                          to={`/quotations/${q.id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-500 inline-flex items-center"
                          title="Edit Quotation"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {q.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvert(q.id, q.quotationNumber)}
                            className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[10px] inline-flex items-center gap-1 hover:bg-emerald-100"
                            title="Convert to Invoice"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Convert to Invoice</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(q.id, q.quotationNumber)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 inline-flex items-center"
                          title="Delete Quotation"
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
              onClick={() => fetchQuotations(true)}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading More Quotations...</span>
                </>
              ) : (
                <span>Load More Quotations</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewQuotation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 no-print">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Quotation Preview - #{previewQuotation.quotationNumber}
              </h3>
              <div className="flex items-center gap-2">
                <Link
                  to={`/quotations/${previewQuotation.id}/edit`}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </Link>
                <button
                  onClick={() => downloadPDF('printable-quotation', `Quotation_${previewQuotation.quotationNumber}.pdf`, previewQuotation.id, 'quotation')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto pb-4 flex justify-center mt-2">
              <div className="min-w-[210mm]">
                <QuotationTemplate quotation={previewQuotation} id="printable-quotation" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
