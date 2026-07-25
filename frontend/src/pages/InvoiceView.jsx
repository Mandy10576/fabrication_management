import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { ShareModal } from '../components/ShareModal';
import { downloadPDF, printElement } from '../utils/pdfExport';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  Copy,
  Edit2,
  IndianRupee
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
      downloadPDF('printable-invoice', `Invoice_${invoice.invoiceNumber.replace('/', '_')}.pdf`);
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Action Bar - Mobile Friendly Flex Wrap */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={handleDuplicate}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-4 h-4 text-purple-500" />
            <span>Duplicate</span>
          </button>

          <Link
            to={`/invoices/${id}/edit`}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      {/* Touch-Scrollable A4 Document Container for Mobile */}
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div className="min-w-[210mm]">
          <InvoiceTemplate invoice={invoice} company={invoice.company} id="printable-invoice" />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal invoice={invoice} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};
