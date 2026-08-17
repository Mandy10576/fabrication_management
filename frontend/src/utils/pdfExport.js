import { getApiBase } from '../services/api';

/**
 * Fetches the generated PDF as a Blob from the backend (@react-pdf/renderer).
 * Shared by downloadPDF and sharePDF so the request logic lives in one place.
 * @param {string} [docId] - Document database ID
 * @param {string} [docType] - Document type ('invoice' | 'quotation' | 'rent-bill')
 */
const fetchPdfBlob = async (docId = null, docType = null) => {
  // Shared with services/api.js so the backend origin is declared once.
  const API_BASE = getApiBase();

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  let requestUrl = '';

  if (docType === 'invoice' && docId) {
    requestUrl = `${API_BASE}/invoices/${docId}/pdf`;
  } else if (docType === 'quotation' && docId) {
    requestUrl = `${API_BASE}/quotations/${docId}/pdf`;
  } else if (docType === 'rent-bill' && docId) {
    requestUrl = `${API_BASE}/rent/bills/${docId}/pdf`;
  } else {
    console.warn('⚠️ Missing docType or docId for React PDF stream. Requesting render fallback endpoint.');
    requestUrl = `${API_BASE}/pdf/render`;
  }

  const response = await fetch(requestUrl, { headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to generate PDF');
  }

  return response.blob();
};

/**
 * Triggers official React PDF generation via backend API (@react-pdf/renderer)
 * @param {string} elementId - DOM ID of printable element (fallback/reference)
 * @param {string} filename - Desired output filename (.pdf)
 * @param {string} [docId] - Document database ID
 * @param {string} [docType] - Document type ('invoice' | 'quotation' | 'rent-bill')
 */
export const downloadPDF = async (elementId = 'printable-invoice', filename = 'document.pdf', docId = null, docType = null) => {
  console.log(`🚀 [React PDF Export] Requesting binary stream for docType="${docType}", docId="${docId}"`);

  try {
    const blob = await fetchPdfBlob(docId, docType);

    console.log(`✅ [React PDF Export] Received binary buffer from @react-pdf/renderer. Downloading: "${filename}"`);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('❌ [React PDF Export] Generation failed:', error);
    alert('Failed to generate PDF: ' + (error.message || 'Server error'));
  }
};

/**
 * Shares the generated PDF directly (as a file) via the OS share sheet
 * (WhatsApp, Email, etc. all appear as share targets with the PDF attached —
 * no composed text). Returns true if the native share sheet was invoked,
 * false if this device/browser doesn't support sharing files, so the caller
 * can fall back to downloadPDF.
 * @param {string} docId - Document database ID
 * @param {string} docType - Document type ('invoice' | 'quotation' | 'rent-bill')
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
