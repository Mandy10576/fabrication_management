import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
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
  IndianRupee,
  History,
  Calendar
} from 'lucide-react';

export const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res);
    } catch (err) {
      console.error('Failed to load invoice:', err);
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
    if (!window.confirm('Duplicate this invoice into a new invoice?')) return;
    try {
      const duplicated = await api.post(`/invoices/${id}/duplicate`);
      alert(`Invoice duplicated! New Invoice #${duplicated.invoiceNumber}`);
      navigate(`/invoices/${duplicated.id}`);
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  if (loading || !invoice) {
    return <div className="p-8 text-center text-slate-500">Loading invoice document...</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Navigation & Action Header */}
      <div className="no-print p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </Link>

          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
            #{invoice.invoiceNumber}
          </span>
        </div>

        {/* Action Button Row - Touch Scrollable on Mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          <button
            onClick={handleDownloadPDF}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={handlePrint}
            className="shrink-0 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDuplicate}
            className="shrink-0 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-4 h-4 text-purple-500" />
            <span>Duplicate</span>
          </button>

          <Link
            to={`/invoices/${id}/edit`}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white flex items-center gap-1.5 transition-colors shadow-sm ml-auto sm:ml-0"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      {/* Mobile-Responsive Auto-Scaled PDF Viewer */}
      <ResponsivePdfViewer documentTitle={`Invoice #${invoice.invoiceNumber}`}>
        <InvoiceTemplate invoice={invoice} company={invoice.company} id="printable-invoice" />
      </ResponsivePdfViewer>

      {/* Payment History Section (Screen view only) */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="no-print p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              <span>Payment History & Transaction Logs ({invoice.payments.length})</span>
            </h3>
            <div className="text-xs text-slate-500 font-medium">
              Total Received: <strong className="text-emerald-600 font-mono text-sm">{formatCurrency(invoice.amountReceived)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {invoice.payments.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs"
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                      {p.paymentMode || 'CASH'}
                    </span>
                  </div>
                  {(p.referenceNo || p.notes) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {p.referenceNo && <span>Ref: <strong>{p.referenceNo}</strong> </span>}
                      {p.notes && <span>• {p.notes}</span>}
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                  +{formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal invoice={invoice} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};
