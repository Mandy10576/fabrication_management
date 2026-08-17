const React = require('react');

let pdfModulePromise = null;

async function getReactPdfModule() {
  if (!pdfModulePromise) {
    pdfModulePromise = import('@react-pdf/renderer').then(mod => {
      return (mod.default && typeof mod.default.renderToBuffer === 'function') ? mod.default : mod;
    });
  }
  return pdfModulePromise;
}

/**
 * Generates an Invoice PDF buffer using React PDF engine
 * @param {object} invoice
 * @param {object} company
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDFBuffer(invoice, company) {
  const ReactPDF = await getReactPdfModule();
  const { setReactPdfModule, InvoicePDFDocument } = require('../utils/reactPdfTemplates');
  setReactPdfModule(ReactPDF);

  const element = React.createElement(InvoicePDFDocument, { invoice, company });
  const renderToBuffer = ReactPDF.renderToBuffer || (ReactPDF.default && ReactPDF.default.renderToBuffer);
  if (typeof renderToBuffer !== 'function') {
    throw new Error('renderToBuffer function not found on @react-pdf/renderer module');
  }
  const buffer = await renderToBuffer(element);
  return buffer;
}

/**
 * Generates a Quotation PDF buffer using React PDF engine
 * @param {object} quotation
 * @param {object} company
 * @returns {Promise<Buffer>}
 */
async function generateQuotationPDFBuffer(quotation, company) {
  const ReactPDF = await getReactPdfModule();
  const { setReactPdfModule, QuotationPDFDocument } = require('../utils/reactPdfTemplates');
  setReactPdfModule(ReactPDF);

  const element = React.createElement(QuotationPDFDocument, { quotation, company });
  const renderToBuffer = ReactPDF.renderToBuffer || (ReactPDF.default && ReactPDF.default.renderToBuffer);
  if (typeof renderToBuffer !== 'function') {
    throw new Error('renderToBuffer function not found on @react-pdf/renderer module');
  }
  const buffer = await renderToBuffer(element);
  return buffer;
}

/**
 * Generates a Rent Bill PDF buffer using React PDF engine
 * @param {object} bill
 * @param {object} company
 * @param {object|null} electricityBill - the electricity bill from the same billing round, if any (informational only, kept out of the rent totals)
 * @returns {Promise<Buffer>}
 */
async function generateRentBillPDFBuffer(bill, company, electricityBill = null) {
  const ReactPDF = await getReactPdfModule();
  const { setReactPdfModule, RentBillPDFDocument } = require('../utils/reactPdfTemplates');
  setReactPdfModule(ReactPDF);

  const element = React.createElement(RentBillPDFDocument, { bill, company, electricityBill });
  const renderToBuffer = ReactPDF.renderToBuffer || (ReactPDF.default && ReactPDF.default.renderToBuffer);
  if (typeof renderToBuffer !== 'function') {
    throw new Error('renderToBuffer function not found on @react-pdf/renderer module');
  }
  const buffer = await renderToBuffer(element);
  return buffer;
}

module.exports = {
  generateInvoicePDFBuffer,
  generateQuotationPDFBuffer,
  generateRentBillPDFBuffer
};
