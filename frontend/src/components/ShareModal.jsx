import React, { useState } from 'react';
import { Send, Download, Loader2, FileText } from 'lucide-react';
import { Modal } from './ui/Modal';
import { sharePDF, downloadPDF } from '../utils/pdfExport';
import { useToast } from '../context/ToastContext';

export const ShareModal = ({ invoice, onClose }) => {
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!invoice) return null;

  const filename = `Invoice_${invoice.invoiceNumber}.pdf`;

  const handleShare = async () => {
    setSharing(true);
    try {
      const shared = await sharePDF(invoice.id, 'invoice', filename);
      if (shared) {
        onClose();
      } else {
        toast.warning('Sharing files isn’t supported on this browser — downloading the PDF instead.');
        await downloadPDF('printable-invoice', filename, invoice.id, 'invoice');
        onClose();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error(err.message || 'Failed to share invoice PDF');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPDF('printable-invoice', filename, invoice.id, 'invoice');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Share Invoice"
      subtitle={`#${invoice.invoiceNumber} • ${invoice.client?.companyName || ''}`}
      icon={Send}
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <FileText className="w-7 h-7" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Share the invoice PDF directly, or download it to attach manually.
        </p>

        <div className="w-full flex flex-col gap-2">
          <button onClick={handleShare} disabled={sharing || downloading} className="btn btn-emerald w-full">
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Share PDF</span>
          </button>
          <button onClick={handleDownload} disabled={sharing || downloading} className="btn btn-secondary w-full">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
