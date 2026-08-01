/**
 * Triggers React PDF-based PDF generation via backend API
 * @param {string} elementId - DOM ID of printable element
 * @param {string} filename - Desired output filename (.pdf)
 * @param {string} [docId] - Optional document database ID
 * @param {string} [docType] - Optional document type ('invoice' | 'quotation')
 */
export const downloadPDF = async (elementId, filename = 'document.pdf', docId = null, docType = null) => {
  console.log(`🚀 [PDF Export] Initiating React PDF download for docType="${docType}", docId="${docId}", elementId="${elementId}"`);

  try {
    const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : '/api';

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    let response;
    let requestUrl = '';

    if (docType === 'invoice' && docId) {
      requestUrl = `${API_BASE}/invoices/${docId}/pdf`;
      console.log(`📡 [PDF Export] Fetching React PDF from backend endpoint: ${requestUrl}`);
      response = await fetch(requestUrl, { headers });
    } else if (docType === 'quotation' && docId) {
      requestUrl = `${API_BASE}/quotations/${docId}/pdf`;
      console.log(`📡 [PDF Export] Fetching React PDF from backend endpoint: ${requestUrl}`);
      response = await fetch(requestUrl, { headers });
    } else {
      requestUrl = `${API_BASE}/pdf/render`;
      console.log(`📡 [PDF Export] Posting request to React PDF endpoint: ${requestUrl}`);
      response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename
        })
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to generate PDF');
    }

    console.log(`✅ [PDF Export] Successfully generated PDF via React PDF engine. Downloading binary file: "${filename}"`);

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
    console.error('❌ [PDF Export] React PDF export failed:', error);
  }
};

export const printElement = (elementId) => {
  window.print();
};
