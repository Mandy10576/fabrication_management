/**
 * Triggers official React PDF generation via backend API (@react-pdf/renderer)
 * @param {string} elementId - DOM ID of printable element (fallback/reference)
 * @param {string} filename - Desired output filename (.pdf)
 * @param {string} [docId] - Document database ID
 * @param {string} [docType] - Document type ('invoice' | 'quotation')
 */
export const downloadPDF = async (elementId = 'printable-invoice', filename = 'document.pdf', docId = null, docType = null) => {
  console.log(`🚀 [React PDF Export] Requesting binary stream for docType="${docType}", docId="${docId}"`);

  try {
    const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : '/api';

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
    } else {
      console.warn('⚠️ Missing docType or docId for React PDF stream. Requesting render fallback endpoint.');
      requestUrl = `${API_BASE}/pdf/render`;
    }

    const response = await fetch(requestUrl, { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to generate React PDF');
    }

    console.log(`✅ [React PDF Export] Received binary buffer from @react-pdf/renderer. Downloading: "${filename}"`);

    const blob = await response.blob();
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

export const printElement = (elementId) => {
  window.print();
};
