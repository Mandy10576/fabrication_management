import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { ResponsivePdfViewer } from '../components/ResponsivePdfViewer';
import { ShareModal } from '../components/ShareModal';
import { downloadPDF, printElement } from '../utils/pdfExport';
import { formatCurrency } from '../utils/formatters';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  Copy,
  Edit2,
  FileText,
  History,
  Calendar
} from 'lucide-react';

export const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setFailed(true);
      toast.error(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPDF = () => {
    if (invoice) {
      downloadPDF('printable-invoice', `Invoice_${invoice.invoiceNumber.replace('/', '_')}.pdf`, invoice.id, 'invoice');
    }
  };

  const handlePrint = () => {
    printElement('printable-invoice');
  };

  const handleDuplicate = async () => {
    const ok = await confirm({
      title: 'Duplicate this invoice?',
      message: 'A new invoice will be created with the same line items and totals.',
      confirmText: 'Duplicate',
      tone: 'default'
    });
    if (!ok) return;

    try {
      const duplicated = await api.post(`/invoices/${id}/duplicate`);
      toast.success(`Duplicated as invoice #${duplicated.invoiceNumber}`);
      navigate(`/invoices/${duplicated.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate invoice');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto" role="status" aria-label="Loading invoice">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-[28rem] rounded-2xl" />
        <span className="sr-only">Loading invoice document…</span>
      </div>
    );
  }

  // Previously a failed fetch left "Loading invoice document..." on screen forever.
  if (failed || !invoice) {
    return (
      <div className="card p-10 sm:p-16 text-center max-w-lg mx-auto">
        <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Invoice not found</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This invoice may have been deleted, or the link is no longer valid.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-5">
          <Link to="/invoices" className="btn btn-secondary">Back to Invoices</Link>
          <button onClick={fetchInvoice} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Actions */}
      <div className="no-print card p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/invoices" className="btn btn-sm btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </Link>

          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 font-mono truncate">
            #{invoice.invoiceNumber}
          </span>
        </div>

        {/* Horizontally scrollable on narrow screens so buttons stay full size
            instead of squashing. */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
          <button onClick={handleDownloadPDF} className="btn btn-sm btn-primary shrink-0">
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button onClick={() => setShowShareModal(true)} className="btn btn-sm btn-emerald shrink-0">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button onClick={handlePrint} className="btn btn-sm btn-secondary shrink-0">
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button onClick={handleDuplicate} className="btn btn-sm btn-secondary shrink-0">
            <Copy className="w-4 h-4 text-purple-500" />
            <span>Duplicate</span>
          </button>

          <Link
            to={`/invoices/${id}/edit`}
            className="btn btn-sm bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25 shrink-0 sm:ml-auto"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      {/* A4 document */}
      <ResponsivePdfViewer documentTitle={`Invoice #${invoice.invoiceNumber}`}>
        <InvoiceTemplate invoice={invoice} company={invoice.company} id="printable-invoice" />
      </ResponsivePdfViewer>

      {/* Payment history (screen only) */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="no-print card overflow-hidden">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Payment History ({invoice.payments.length})</span>
            </h3>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Total Received:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatCurrency(invoice.amountReceived)}
              </strong>
            </div>
          </div>

          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 sm:p-5">
            {invoice.payments.map((p) => (
              <li
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
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
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                  +{formatCurrency(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showShareModal && <ShareModal invoice={invoice} onClose={() => setShowShareModal(false)} />}
    </div>
  );
};
