import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Mail, Copy, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const ShareModal = ({ invoice, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const clientMobile = invoice.client?.mobile ? invoice.client.mobile.replace(/\D/g, '') : '';
  const clientEmail = invoice.client?.email || '';

  const defaultMsg = `Dear ${invoice.client?.contactPerson || invoice.client?.companyName || 'Valued Client'},

Please find the details of your Invoice #${invoice.invoiceNumber}:

*Invoice No:* ${invoice.invoiceNumber}
*Date:* ${new Date(invoice.date).toLocaleDateString('en-IN')}
*Grand Total:* ${formatCurrency(invoice.grandTotal)}
*Amount Received:* ${formatCurrency(invoice.amountReceived)}
*Balance Due:* ${formatCurrency(invoice.balanceDue)}
*Status:* ${invoice.status}

Thank you for doing business with us!
Khodiyar Steel Fabrication`;

  const [message, setMessage] = useState(defaultMsg);

  const whatsappUrl = `https://wa.me/${clientMobile ? '91' + clientMobile.slice(-10) : ''}?text=${encodeURIComponent(message)}`;
  const mailtoUrl = `mailto:${clientEmail}?subject=${encodeURIComponent(`Invoice #${invoice.invoiceNumber} - Khodiyar Steel Fabrication`)}&body=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-500" />
          <span>Share Invoice via WhatsApp & Email</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Invoice #{invoice.invoiceNumber} • {invoice.client?.companyName}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Message Content
            </label>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <a
              href={mailtoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Send Email</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
