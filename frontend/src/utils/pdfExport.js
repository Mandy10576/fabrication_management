import { api } from '../services/api';
import { renderInvoicePdfBlob, renderQuotationPdfBlob } from './documentPdf';

/**
 * Produces the PDF from the same React template the app renders on screen, so
 * the file matches the preview exactly and there is no second design to keep
 * in sync. Only the document data is fetched; the rendering happens here.
 *
 * @param {string} docId   - Document database ID
 * @param {string} docType - 'invoice' | 'quotation'
 */
const fetchPdfBlob = async (docId = null, docType = null) => {
  if (!docId || !docType) {
    throw new Error('A document type and id are required to generate a PDF');
  }

  if (docType === 'invoice') {
    // Fetched fresh rather than reusing list-row data, which omits items.
    const [invoice, company] = await Promise.all([
      api.get(`/invoices/${docId}`, true),
      api.get('/company').catch(() => null),
    ]);
    return renderInvoicePdfBlob(invoice, company);
  }

  if (docType === 'quotation') {
    const [quotation, company] = await Promise.all([
      api.get(`/quotations/${docId}`, true),
      api.get('/company').catch(() => null),
    ]);
    return renderQuotationPdfBlob(quotation, company);
  }

  throw new Error(`Unsupported document type: ${docType}`);
};

/**
 * Generates and downloads the document PDF.
 * @param {string} elementId - Retained for call-site compatibility; unused.
 * @param {string} filename  - Desired output filename (.pdf)
 * @param {string} [docId]   - Document database ID
 * @param {string} [docType] - 'invoice' | 'quotation'
 */
export const downloadPDF = async (
  elementId = 'printable-invoice',
  filename = 'document.pdf',
  docId = null,
  docType = null
) => {
  try {
    const blob = await fetchPdfBlob(docId, docType);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Shares the generated PDF as a file via the OS share sheet (WhatsApp, Email
 * and so on appear as targets with the PDF attached). Returns true if the
 * native sheet opened, false if this device can't share files so the caller
 * can fall back to downloadPDF.
 * @param {string} docId    - Document database ID
 * @param {string} docType  - 'invoice' | 'quotation'
 * @param {string} filename - Desired output filename (.pdf)
 */
export const sharePDF = async (docId, docType, filename = 'document.pdf') => {
  const blob = await fetchPdfBlob(docId, docType);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file] });
    return true;
  }

  return false;
};

export const printElement = (elementId) => {
  window.print();
};
