const React = require('react');

/**
 * Generates an Invoice PDF buffer using React PDF engine
 * @param {object} invoice
 * @param {object} company
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDFBuffer(invoice, company) {
  const ReactPDF = require('@react-pdf/renderer');
  const { InvoicePDFDocument } = require('../utils/reactPdfTemplates');
  const element = React.createElement(InvoicePDFDocument, { invoice, company });
  const buffer = await ReactPDF.renderToBuffer(element);
  return buffer;
}

/**
 * Generates a Quotation PDF buffer using React PDF engine
 * @param {object} quotation
 * @param {object} company
 * @returns {Promise<Buffer>}
 */
async function generateQuotationPDFBuffer(quotation, company) {
  const ReactPDF = require('@react-pdf/renderer');
  const { QuotationPDFDocument } = require('../utils/reactPdfTemplates');
  const element = React.createElement(QuotationPDFDocument, { quotation, company });
  const buffer = await ReactPDF.renderToBuffer(element);
  return buffer;
}

module.exports = {
  generateInvoicePDFBuffer,
  generateQuotationPDFBuffer
};
