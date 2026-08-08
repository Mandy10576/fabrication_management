import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { QuotationTemplate } from '../components/QuotationTemplate';
import { ResponsivePdfViewer } from '../components/ResponsivePdfViewer';
import { Modal } from '../components/ui/Modal';
import { downloadPDF } from '../utils/pdfExport';
import {
  Quote,
  Search,
  Plus,
  FileCheck2,
  Trash2,
  Download,
  Edit2
} from 'lucide-react';

export const Quotations = () => {
  const { selectedFY } = useFY();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

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
      toast.error(err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [selectedFY, search]);

  const handleConvert = async (id, quoteNo) => {
    const ok = await confirm({
      title: `Convert quotation #${quoteNo}?`,
      message: 'A new Tax Invoice will be created from this quotation, and the quotation will be marked as converted.',
      confirmText: 'Convert to invoice',
      tone: 'default'
    });
    if (!ok) return;

    try {
      const inv = await api.post(`/quotations/${id}/convert`);
      toast.success(`Converted to Tax Invoice #${inv.invoiceNumber}`);
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to convert quotation');
    }
  };

  const handleDelete = async (id, quoteNo) => {
    const ok = await confirm({
      title: `Delete quotation #${quoteNo}?`,
      message: 'This permanently removes the quotation. This cannot be undone.',
      confirmText: 'Delete quotation'
    });
    if (!ok) return;

    try {
      await api.delete(`/quotations/${id}`);
      toast.success(`Quotation #${quoteNo} deleted`);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || 'Failed to delete quotation');
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Quote className="w-6 h-6 text-indigo-500 shrink-0" />
            <span>Quotations</span>
          </h2>
          <p className="page-subtitle">
            Create fabrication estimates and convert them into Tax Invoices in one click
          </p>
        </div>

        <Link to="/quotations/new" className="btn btn-indigo w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </Link>
      </div>

      {/* Search */}
      <div className="card card-pad">
        <div className="search-field">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search quotations"
            placeholder="Search by quotation number or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                <div className="skeleton h-6 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Quote className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No quotations found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? 'No quotations match your search.'
                : 'Create an estimate for your clients to start sending proposals.'}
            </p>
            <Link to="/quotations/new" className="btn btn-indigo mt-5">
              <Plus className="w-4 h-4" />
              <span>New Quotation</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Card view up to lg */}
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map((q) => (
                <li key={q.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        #{q.quotationNumber}
                      </span>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 break-words">
                        {q.client?.companyName}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(q.status)}`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>Date: {formatDate(q.date)}</span>
                    <span>Valid: {formatDate(q.validUntil)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estimated Total</span>
                    <strong className="text-sm font-extrabold text-slate-900 dark:text-white break-words">
                      {formatCurrency(q.grandTotal)}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => openPreview(q)} className="btn btn-sm btn-secondary">
                      <Quote className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <Link to={`/quotations/${q.id}/edit`} className="btn btn-sm btn-secondary">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    {q.status !== 'CONVERTED' && (
                      <button
                        onClick={() => handleConvert(q.id, q.quotationNumber)}
                        className="btn btn-sm bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Convert</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(q.id, q.quotationNumber)}
                      className="btn-icon btn-danger-soft ml-auto"
                      aria-label={`Delete quotation ${q.quotationNumber}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Quote No</th>
                    <th scope="col">Client Company</th>
                    <th scope="col">Date</th>
                    <th scope="col">Valid Until</th>
                    <th scope="col" className="text-right">Estimated Total</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {q.quotationNumber}
                      </td>
                      <td className="text-slate-800 dark:text-slate-200 max-w-[18rem]">
                        <span className="line-clamp-2">{q.client?.companyName}</span>
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(q.date)}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(q.validUntil)}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getStatusBadgeClass(q.status)}`}>{q.status}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openPreview(q)}
                            className="btn-icon btn-icon-soft hover:text-indigo-500"
                            aria-label={`Preview quotation ${q.quotationNumber}`}
                            title="Preview A4 Quotation"
                          >
                            <Quote className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/quotations/${q.id}/edit`}
                            className="btn-icon btn-icon-soft hover:text-indigo-500"
                            aria-label={`Edit quotation ${q.quotationNumber}`}
                            title="Edit Quotation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {q.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleConvert(q.id, q.quotationNumber)}
                              className="btn btn-sm bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                              title="Convert to Invoice"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Convert</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(q.id, q.quotationNumber)}
                            className="btn-icon btn-danger-soft"
                            aria-label={`Delete quotation ${q.quotationNumber}`}
                            title="Delete Quotation"
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
            <button onClick={() => fetchQuotations(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Quotations</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      <Modal
        open={Boolean(previewQuotation)}
        onClose={() => setPreviewQuotation(null)}
        size="4xl"
        title={previewQuotation ? `Quotation #${previewQuotation.quotationNumber}` : ''}
        icon={Quote}
        iconClass="text-indigo-500"
        bodyClassName="bg-slate-100 dark:bg-slate-950/40 px-2 sm:px-4"
        footer={
          previewQuotation && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Link to={`/quotations/${previewQuotation.id}/edit`} className="btn btn-secondary">
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </Link>
              <button
                onClick={() =>
                  downloadPDF(
                    'printable-quotation',
                    `Quotation_${previewQuotation.quotationNumber}.pdf`,
                    previewQuotation.id,
                    'quotation'
                  )
                }
                className="btn btn-indigo"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          )
        }
      >
        {previewQuotation && (
          <ResponsivePdfViewer documentTitle={`Quotation #${previewQuotation.quotationNumber}`}>
            <QuotationTemplate quotation={previewQuotation} id="printable-quotation" />
          </ResponsivePdfViewer>
        )}
      </Modal>
    </div>
  );
};
