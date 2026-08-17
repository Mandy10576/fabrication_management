const React = require('react');
const path = require('path');
const { formatStateWithCode } = require('./indianStates');
const { numberToWords } = require('./numberToWords');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

let reactPdfModule = null;
let fontRegistered = false;
let cachedStyles = null;

function setReactPdfModule(m) {
  if (m) {
    reactPdfModule = m;
  }
}

function getReactPdf() {
  if (!reactPdfModule) {
    try {
      reactPdfModule = require('@react-pdf/renderer');
    } catch (e) {
      console.warn('Sync require(@react-pdf/renderer) failed, module will be injected via setReactPdfModule:', e.message);
    }
  }
  if (reactPdfModule && !fontRegistered) {
    fontRegistered = true;
    try {
      const Font = reactPdfModule.Font || reactPdfModule.default?.Font;
      if (Font && typeof Font.register === 'function') {
        const fontsDir = path.join(__dirname, '../assets/fonts');
        Font.register({
          family: 'Inter',
          fonts: [
            { src: path.join(fontsDir, 'Inter-Regular.ttf'), fontWeight: 400 },
            { src: path.join(fontsDir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
            { src: path.join(fontsDir, 'Inter-Bold.ttf'), fontWeight: 700 },
            { src: path.join(fontsDir, 'Inter-ExtraBold.ttf'), fontWeight: 800 },
          ]
        });
      }
    } catch (e) {
      console.warn('Font registration notice:', e.message);
    }
  }
  return reactPdfModule;
}

function getStyles() {
  if (!cachedStyles) {
    const { StyleSheet } = getReactPdf();
    cachedStyles = StyleSheet.create({
      page: {
        paddingTop: 28,
        paddingBottom: 35,
        paddingHorizontal: 32,
        fontSize: 9,
        fontFamily: 'Inter',
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
      },
      headerContainer: {
        marginBottom: 8,
      },
      companyName: {
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: 800,
        color: '#0F172A',
        marginBottom: 3,
      },
      companyInfo: {
        fontSize: 8.5,
        color: '#1E293B',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      titleBannerBorder: {
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
        borderBottomWidth: 1,
        borderBottomColor: '#CBD5E1',
        paddingVertical: 5,
        marginVertical: 10,
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
      },
      titleText: {
        color: '#4C40AA',
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: 800,
        letterSpacing: 2,
        textAlign: 'center',
      },
      detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
      },
      detailsColLeft: {
        width: '52%',
      },
      detailsColRight: {
        width: '44%',
      },
      sectionTitle: {
        fontSize: 7.5,
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 3,
      },
      clientName: {
        fontSize: 11,
        fontFamily: 'Inter',
        fontWeight: 800,
        color: '#0F172A',
        marginBottom: 2,
      },
      clientText: {
        fontSize: 8.5,
        color: '#334155',
        fontWeight: 500,
        lineHeight: 1.35,
      },
      metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
      },
      metaLabel: {
        color: '#64748B',
        fontSize: 8.5,
      },
      metaValue: {
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#0F172A',
        fontSize: 8.5,
      },
      table: {
        width: '100%',
        marginVertical: 8,
      },
      tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#4C40AA',
        borderRadius: 3,
        paddingVertical: 5,
        paddingHorizontal: 4,
        alignItems: 'center',
      },
      tableHeaderCell: {
        color: '#FFFFFF',
        fontFamily: 'Inter',
        fontWeight: 700,
        fontSize: 8,
        textTransform: 'uppercase',
      },
      tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 5,
        paddingHorizontal: 4,
        minHeight: 20,
        alignItems: 'center',
      },
      tableRowAlt: {
        backgroundColor: '#F8FAFC',
      },
      tableCell: {
        fontSize: 8.5,
        color: '#1E293B',
      },
      tableCellBold: {
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#0F172A',
      },
      colSr: { width: '6%', textAlign: 'center' },
      colItem: { width: '40%' },
      colHsn: { width: '12%', textAlign: 'center' },
      colQty: { width: '8%', textAlign: 'center' },
      colUnit: { width: '8%', textAlign: 'center' },
      colRate: { width: '13%', textAlign: 'right' },
      colAmt: { width: '13%', textAlign: 'right' },
      tableFooterRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 4,
        alignItems: 'center',
      },
      summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
      },
      summaryLeft: {
        width: '54%',
      },
      summaryRight: {
        width: '42%',
      },
      boxBlock: {
        marginBottom: 10,
      },
      boxTitle: {
        fontSize: 7.5,
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 2,
      },
      boxContent: {
        fontSize: 8.5,
        color: '#334155',
        lineHeight: 1.35,
      },
      // Mirrors the preview's amount-in-words line, which is semibold and a
      // darker slate than the surrounding body copy rather than plain text.
      // (The preview also renders it italic, but that is a browser-synthesised
      // oblique — no Inter italic file is bundled for the PDF to use.)
      amountWordsContent: {
        fontSize: 8.5,
        fontFamily: 'Inter',
        fontWeight: 600,
        color: '#1E293B',
        lineHeight: 1.35,
      },
      calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2.5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F1F5F9',
      },
      totalBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#4C40AA',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 3,
        marginVertical: 4,
      },
      totalBannerText: {
        color: '#FFFFFF',
        fontFamily: 'Inter',
        fontWeight: 800,
        fontSize: 10,
      },
      signatorySection: {
        marginTop: 15,
        alignItems: 'flex-end',
      },
      signatoryCompany: {
        fontSize: 8.5,
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: 30,
      },
      signatoryLine: {
        borderTopWidth: 1,
        borderTopColor: '#94A3B8',
        width: 140,
        textAlign: 'center',
        paddingTop: 3,
        fontSize: 8.5,
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#0F172A',
      },
      footerNote: {
        position: 'absolute',
        bottom: 15,
        left: 32,
        right: 32,
        textAlign: 'center',
        fontSize: 7.5,
        color: '#94A3B8',
      }
    });
  }
  return cachedStyles;
}

// Formatters
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0.00';
  const num = Number(amount);
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function parseAddress(addressStr) {
  if (!addressStr) return { lines: [], stateLine: null };
  const text = addressStr.replace(/\\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const withoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
  const foundStateLine = lines.find(l => l.toLowerCase().startsWith('state:'));
  return {
    lines: withoutState,
    // Raw state name only (no "State:" prefix) so callers can prefer a real
    // `.state` field first and fall back to this parsed-from-address value.
    stateLine: foundStateLine ? foundStateLine.replace(/^state:\s*/i, '').trim() : null
  };
}

/**
 * React PDF Document for Invoice
 */
const InvoicePDFDocument = ({ invoice, company }) => {
  const { Document, Page, Text, View } = getReactPdf();
  const styles = getStyles();

  const comp = company || invoice.company || {
    companyName: 'Khodiyar Steel Fabrication',
    ownerName: 'Prayag Sharma',
    gstin: 'N/A',
    pan: 'N/A',
    email: 'khodiyarsteelandfabrication@gmail.com',
    phone: '9825534229 / 8128209488',
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004',
    state: 'Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = invoice.client || {};

  const compAddr = parseAddress(comp.address);
  const clientAddr = parseAddress(client.address);
  const resolvedCompState = comp.state || compAddr.stateLine || 'N/A';
  // The invoice's own saved snapshot wins (Place of Supply as it was when
  // billed), then the client's current profile, then whatever's parseable
  // out of their address text — never silently claim a specific state.
  const resolvedState = invoice.state || client.state || clientAddr.stateLine || 'N/A';

  const titleText = invoice.gstType === 'NON_GST' ? 'I N V O I C E' : 'T A X       I N V O I C E';

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Company Header
      React.createElement(View, { style: styles.headerContainer },
        React.createElement(Text, { style: styles.companyName }, comp.companyName),
        React.createElement(View, { style: styles.companyInfo },
          ...compAddr.lines.map((line, i) => React.createElement(Text, { key: i }, line)),
          comp.phone ? React.createElement(Text, null, `Phone no. : ${comp.phone}`) : null,
          comp.email ? React.createElement(Text, null, `Email : ${comp.email}`) : null,
          React.createElement(Text, null, `GSTIN: ${comp.gstin || 'N/A'} | PAN: ${comp.pan || 'N/A'}`),
          React.createElement(Text, null, `State: ${formatStateWithCode(resolvedCompState)}`)
        )
      ),

      // Title Banner with top and bottom border line
      React.createElement(View, { style: styles.titleBannerBorder },
        React.createElement(Text, { style: styles.titleText }, titleText)
      ),

      // Details Grid (Bill To + Invoice Details)
      React.createElement(View, { style: styles.detailsGrid },
        React.createElement(View, { style: styles.detailsColLeft },
          React.createElement(Text, { style: styles.sectionTitle }, 'BILL TO'),
          React.createElement(Text, { style: styles.clientName }, client.companyName || client.name || 'Client'),
          React.createElement(View, { style: styles.clientText },
            ...clientAddr.lines.map((line, i) => React.createElement(Text, { key: i }, line)),
            client.mobile ? React.createElement(Text, null, `Phone: ${client.mobile}`) : null,
            React.createElement(Text, null, `State: ${formatStateWithCode(resolvedState)}`),
            client.gstin ? React.createElement(Text, null, `GSTIN: ${client.gstin}`) : null
          )
        ),
        React.createElement(View, { style: styles.detailsColRight },
          React.createElement(Text, { style: styles.sectionTitle }, 'INVOICE DETAILS'),
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Invoice No :'),
            React.createElement(Text, { style: styles.metaValue }, invoice.invoiceNumber)
          ),
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Date :'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(invoice.date))
          ),
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Place of Supply :'),
            React.createElement(Text, { style: styles.metaValue }, formatStateWithCode(resolvedState))
          )
        )
      ),

      // Items Table
      React.createElement(View, { style: styles.table },
        // Header
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colSr] }, 'Sr.'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colItem] }, 'Item / Particulars'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colHsn] }, 'HSN/SAC'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colQty] }, 'Qty'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colUnit] }, 'Unit'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colRate] }, 'Price/Unit'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colAmt] }, 'Amount')
        ),

        // Rows
        (invoice.items || []).map((item, idx) =>
          React.createElement(View, {
            key: idx,
            style: idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow
          },
            React.createElement(Text, { style: [styles.tableCell, styles.colSr] }, idx + 1),
            React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colItem] }, item.description),
            React.createElement(Text, { style: [styles.tableCell, styles.colHsn] }, (item.hsnSac && item.hsnSac !== '9988') ? item.hsnSac : '-'),
            React.createElement(Text, { style: [styles.tableCell, styles.colQty] }, item.quantity),
            React.createElement(Text, { style: [styles.tableCell, styles.colUnit] }, item.unit),
            React.createElement(Text, { style: [styles.tableCell, styles.colRate] }, Number(item.rate).toFixed(2)),
            React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colAmt] }, Number(item.amount).toFixed(2))
          )
        ),

        // Footer Total Row (Qty is left blank — summing quantities across
        // mismatched units, e.g. sq ft + kg, produces a meaningless number)
        React.createElement(View, { style: styles.tableFooterRow },
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, { width: '58%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.tableCell, styles.colQty] }, ''),
          React.createElement(Text, { style: [styles.tableCell, { width: '21%' }] }, ''),
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colAmt] }, Number(invoice.subtotal).toFixed(2))
        )
      ),

      // Summary Section
      React.createElement(View, { style: styles.summaryGrid },
        // Left Column (Words & Terms)
        React.createElement(View, { style: styles.summaryLeft },
          invoice.amountInWords ? React.createElement(View, { style: styles.boxBlock },
            React.createElement(Text, { style: styles.boxTitle }, 'Invoice Amount In Words'),
            React.createElement(Text, { style: styles.amountWordsContent }, invoice.amountInWords)
          ) : null,

          React.createElement(View, { style: styles.boxBlock },
            React.createElement(Text, { style: styles.boxTitle }, 'Terms and Conditions'),
            React.createElement(Text, { style: styles.boxContent }, invoice.terms || comp.termsConditions || 'Thank you for doing business with us!')
          )
        ),

        // Right Column (Totals)
        React.createElement(View, { style: styles.summaryRight },
          React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Sub Total'),
            React.createElement(Text, { style: styles.metaValue }, formatCurrency(invoice.subtotal))
          ),

          invoice.discount > 0 ? React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Discount'),
            React.createElement(Text, { style: [styles.metaValue, { color: '#E11D48' }] }, `- ${formatCurrency(invoice.discount)}`)
          ) : null,

          ...(invoice.gstType === 'CGST_SGST' ? [
            React.createElement(View, { key: 'cgst', style: styles.calcRow },
              React.createElement(Text, { style: styles.metaLabel }, `CGST (${(invoice.gstRate || 18) / 2}%)`),
              React.createElement(Text, { style: styles.metaValue }, formatCurrency(invoice.cgstAmount))
            ),
            React.createElement(View, { key: 'sgst', style: styles.calcRow },
              React.createElement(Text, { style: styles.metaLabel }, `SGST (${(invoice.gstRate || 18) / 2}%)`),
              React.createElement(Text, { style: styles.metaValue }, formatCurrency(invoice.sgstAmount))
            )
          ] : []),

          invoice.gstType === 'IGST' ? React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, `IGST (${invoice.gstRate || 18}%)`),
            React.createElement(Text, { style: styles.metaValue }, formatCurrency(invoice.igstAmount))
          ) : null,

          // Total Banner
          React.createElement(View, { style: styles.totalBanner },
            React.createElement(Text, { style: styles.totalBannerText }, 'Total'),
            React.createElement(Text, { style: styles.totalBannerText }, formatCurrency(invoice.grandTotal))
          ),

          React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Amount Received'),
            React.createElement(Text, { style: styles.metaValue }, formatCurrency(invoice.amountReceived))
          ),

          React.createElement(View, { style: [styles.calcRow, { borderBottomWidth: 0 }] },
            React.createElement(Text, { style: [styles.metaLabel, { color: '#E11D48', fontFamily: 'Inter', fontWeight: 700 }] }, 'Balance Due'),
            React.createElement(Text, { style: [styles.metaValue, { color: '#E11D48', fontSize: 9.5 }] }, formatCurrency(invoice.balanceDue))
          ),

          // Signatory
          React.createElement(View, { style: styles.signatorySection },
            React.createElement(Text, { style: styles.signatoryCompany }, `For : ${comp.companyName}`),
            React.createElement(Text, { style: styles.signatoryLine }, 'Authorized Signatory')
          )
        )
      ),

      // Footer Note
      React.createElement(Text, { style: styles.footerNote }, 'This is a computer generated invoice and requires no physical signature.')
    )
  );
};

/**
 * React PDF Document for Quotation
 */
const QuotationPDFDocument = ({ quotation, company }) => {
  const { Document, Page, Text, View } = getReactPdf();
  const styles = getStyles();

  const comp = company || quotation.company || {
    companyName: 'Khodiyar Steel Fabrication',
    ownerName: 'Prayag Sharma',
    gstin: 'N/A',
    pan: 'N/A',
    email: 'khodiyarsteelandfabrication@gmail.com',
    phone: '9825534229 / 8128209488',
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004',
    state: 'Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = quotation.client || {};

  const subtotal = quotation.subtotal || 0;
  const discount = quotation.discount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstRate = quotation.gstRate ?? 18;
  const gstType = quotation.gstType || 'CGST_SGST';

  let cgstAmount = quotation.cgstAmount;
  let sgstAmount = quotation.sgstAmount;
  let igstAmount = quotation.igstAmount;

  if (gstType === 'CGST_SGST') {
    const halfRate = gstRate / 2;
    if (cgstAmount === undefined || cgstAmount === null) {
      cgstAmount = (taxableAmount * halfRate) / 100;
    }
    if (sgstAmount === undefined || sgstAmount === null) {
      sgstAmount = (taxableAmount * halfRate) / 100;
    }
  } else if (gstType === 'IGST') {
    if (igstAmount === undefined || igstAmount === null) {
      igstAmount = (taxableAmount * gstRate) / 100;
    }
  }

  const compAddr = parseAddress(comp.address);
  const clientAddr = parseAddress(client.address);
  const resolvedCompState = comp.state || compAddr.stateLine || 'N/A';
  const resolvedState = quotation.state || client.state || clientAddr.stateLine || 'N/A';

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Company Header
      React.createElement(View, { style: styles.headerContainer },
        React.createElement(Text, { style: styles.companyName }, comp.companyName),
        React.createElement(View, { style: styles.companyInfo },
          ...compAddr.lines.map((line, i) => React.createElement(Text, { key: i }, line)),
          comp.phone ? React.createElement(Text, null, `Phone no. : ${comp.phone}`) : null,
          comp.email ? React.createElement(Text, null, `Email : ${comp.email}`) : null,
          React.createElement(Text, null, `GSTIN: ${comp.gstin || 'N/A'} | PAN: ${comp.pan || 'N/A'}`),
          React.createElement(Text, null, `State: ${formatStateWithCode(resolvedCompState)}`)
        )
      ),

      // Title Banner
      React.createElement(View, { style: styles.titleBannerBorder },
        React.createElement(Text, { style: styles.titleText }, 'Q U O T A T I O N')
      ),

      // Details Grid
      React.createElement(View, { style: styles.detailsGrid },
        React.createElement(View, { style: styles.detailsColLeft },
          React.createElement(Text, { style: styles.sectionTitle }, 'QUOTATION FOR'),
          React.createElement(Text, { style: styles.clientName }, client.companyName || client.name || 'Client'),
          React.createElement(View, { style: styles.clientText },
            ...clientAddr.lines.map((line, i) => React.createElement(Text, { key: i }, line)),
            client.mobile ? React.createElement(Text, null, `Phone: ${client.mobile}`) : null,
            React.createElement(Text, null, `State: ${formatStateWithCode(resolvedState)}`),
            client.gstin ? React.createElement(Text, null, `GSTIN: ${client.gstin}`) : null
          )
        ),
        React.createElement(View, { style: styles.detailsColRight },
          React.createElement(Text, { style: styles.sectionTitle }, 'QUOTATION DETAILS'),
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Quotation No :'),
            React.createElement(Text, { style: styles.metaValue }, quotation.quotationNumber)
          ),
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Date :'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(quotation.date))
          ),
          quotation.validUntil ? React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Valid Until :'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(quotation.validUntil))
          ) : null,
          React.createElement(View, { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Place of Supply :'),
            React.createElement(Text, { style: styles.metaValue }, formatStateWithCode(resolvedState))
          )
        )
      ),

      // Items Table
      React.createElement(View, { style: styles.table },
        // Header
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colSr] }, 'Sr.'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colItem] }, 'Item / Particulars'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colHsn] }, 'HSN/SAC'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colQty] }, 'Qty'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colUnit] }, 'Unit'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colRate] }, 'Price/Unit'),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colAmt] }, 'Amount')
        ),

        // Rows
        (quotation.items || []).map((item, idx) =>
          React.createElement(View, {
            key: idx,
            style: idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow
          },
            React.createElement(Text, { style: [styles.tableCell, styles.colSr] }, idx + 1),
            React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colItem] }, item.description),
            React.createElement(Text, { style: [styles.tableCell, styles.colHsn] }, (item.hsnSac && item.hsnSac !== '9988') ? item.hsnSac : '-'),
            React.createElement(Text, { style: [styles.tableCell, styles.colQty] }, item.quantity),
            React.createElement(Text, { style: [styles.tableCell, styles.colUnit] }, item.unit),
            React.createElement(Text, { style: [styles.tableCell, styles.colRate] }, Number(item.rate).toFixed(2)),
            React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colAmt] }, Number(item.amount).toFixed(2))
          )
        ),

        // Footer Total Row (Qty is left blank — summing quantities across
        // mismatched units, e.g. sq ft + kg, produces a meaningless number)
        React.createElement(View, { style: styles.tableFooterRow },
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, { width: '58%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.tableCell, styles.colQty] }, ''),
          React.createElement(Text, { style: [styles.tableCell, { width: '21%' }] }, ''),
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colAmt] }, Number(quotation.subtotal).toFixed(2))
        )
      ),

      // Summary Section
      React.createElement(View, { style: styles.summaryGrid },
        // Left Column (Terms)
        React.createElement(View, { style: styles.summaryLeft },
          React.createElement(View, { style: styles.boxBlock },
            React.createElement(Text, { style: styles.boxTitle }, 'Terms and Conditions'),
            React.createElement(Text, { style: styles.boxContent }, quotation.terms || comp.termsConditions || 'Thank you for doing business with us!')
          )
        ),

        // Right Column (Totals)
        React.createElement(View, { style: styles.summaryRight },
          React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Sub Total'),
            React.createElement(Text, { style: styles.metaValue }, formatCurrency(subtotal))
          ),

          discount > 0 ? React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, 'Discount'),
            React.createElement(Text, { style: [styles.metaValue, { color: '#E11D48' }] }, `- ${formatCurrency(discount)}`)
          ) : null,

          ...(gstType === 'CGST_SGST' ? [
            React.createElement(View, { key: 'cgst', style: styles.calcRow },
              React.createElement(Text, { style: styles.metaLabel }, `CGST (${gstRate / 2}%)`),
              React.createElement(Text, { style: styles.metaValue }, formatCurrency(cgstAmount))
            ),
            React.createElement(View, { key: 'sgst', style: styles.calcRow },
              React.createElement(Text, { style: styles.metaLabel }, `SGST (${gstRate / 2}%)`),
              React.createElement(Text, { style: styles.metaValue }, formatCurrency(sgstAmount))
            )
          ] : []),

          gstType === 'IGST' ? React.createElement(View, { style: styles.calcRow },
            React.createElement(Text, { style: styles.metaLabel }, `IGST (${gstRate}%)`),
            React.createElement(Text, { style: styles.metaValue }, formatCurrency(igstAmount))
          ) : null,

          // Total Banner
          React.createElement(View, { style: styles.totalBanner },
            React.createElement(Text, { style: styles.totalBannerText }, 'Total'),
            React.createElement(Text, { style: styles.totalBannerText }, formatCurrency(quotation.grandTotal))
          ),

          // Signatory
          React.createElement(View, { style: styles.signatorySection },
            React.createElement(Text, { style: styles.signatoryCompany }, `For : ${comp.companyName}`),
            React.createElement(Text, { style: styles.signatoryLine }, 'Authorized Signatory')
          )
        )
      ),

      // Footer Note
      React.createElement(Text, { style: styles.footerNote }, 'This is a computer generated quotation and requires no physical signature.')
    )
  );
};

// ---------------------------------------------------------------------------
// Rent Bill PDF — deliberately its own, simpler stylesheet rather than
// reusing getStyles() (which is shaped around GST invoice line items/tax
// columns that don't apply here). Rent + electricity stay separate ledgers
// (see rentBillController), so this only ever covers one RentBill — no
// meter-reading section, unlike a combined property-manager-style invoice.
// ---------------------------------------------------------------------------
let cachedRentBillStyles = null;
function getRentBillStyles() {
  if (!cachedRentBillStyles) {
    const { StyleSheet } = getReactPdf();
    cachedRentBillStyles = StyleSheet.create({
      page: {
        paddingBottom: 35,
        fontSize: 9,
        fontFamily: 'Inter',
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
      },
      headerBar: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 32,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
      logoBox: {
        width: 26, height: 26, borderRadius: 6, backgroundColor: '#3B82F6',
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
      },
      logoLetter: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: 800 },
      companyName: { fontSize: 12, fontFamily: 'Inter', fontWeight: 800, color: '#FFFFFF' },
      companyTagline: { fontSize: 7, color: '#94A3B8', marginTop: 1 },
      headerRightTitle: { fontSize: 13, fontFamily: 'Inter', fontWeight: 800, color: '#FFFFFF', textAlign: 'right' },
      headerRightSub: { fontSize: 7, color: '#94A3B8', textAlign: 'right', marginTop: 1 },

      body: { paddingHorizontal: 32, paddingTop: 16 },

      metaBar: {
        flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 6, padding: 10, marginBottom: 12,
      },
      metaCol: { flex: 1 },
      metaColLabel: { fontSize: 6.5, fontFamily: 'Inter', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
      metaColValue: { fontSize: 9, fontFamily: 'Inter', fontWeight: 800, color: '#0F172A' },
      metaColValueDue: { fontSize: 9, fontFamily: 'Inter', fontWeight: 800, color: '#B91C1C' },

      detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
      detailsCol: { width: '48%' },
      sectionTitle: { fontSize: 7.5, fontFamily: 'Inter', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 3 },
      entityName: { fontSize: 11, fontFamily: 'Inter', fontWeight: 800, color: '#0F172A', marginBottom: 2 },
      entityText: { fontSize: 8.5, color: '#334155', lineHeight: 1.5 },

      billBox: {
        backgroundColor: '#1D4ED8', borderRadius: 8, padding: 14, marginBottom: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      },
      billBoxLabel: { fontSize: 7.5, color: '#BFDBFE', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 },
      billBoxAmount: { fontSize: 22, fontFamily: 'Inter', fontWeight: 800, color: '#FFFFFF' },
      billBoxSub: { fontSize: 7.5, color: '#DBEAFE', marginTop: 3 },
      billBoxRight: { alignItems: 'flex-end' },
      dueBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: 8, alignItems: 'center', marginBottom: 6 },
      dueBoxLabel: { fontSize: 6.5, color: '#DBEAFE', textTransform: 'uppercase' },
      dueBoxValue: { fontSize: 9, fontFamily: 'Inter', fontWeight: 800, color: '#FFFFFF', marginTop: 1 },
      statusBadge: { fontSize: 7.5, fontWeight: 800, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, textTransform: 'uppercase' },

      chargesHeader: { fontSize: 8.5, fontFamily: 'Inter', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
      chargesRow: { flexDirection: 'row' },
      chargesTable: { flex: 1, marginRight: 12 },
      chartWrap: { width: 130, alignItems: 'center' },

      table: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4 },
      tableHeadRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
      tableHeadLabel: { fontSize: 7, fontFamily: 'Inter', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
      tableHeadValue: { fontSize: 7, fontFamily: 'Inter', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right', flex: 1 },
      tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
      tableRowLast: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8 },
      tableLabel: { fontSize: 8.5, color: '#334155' },
      tableValue: { fontSize: 8.5, color: '#0F172A', fontWeight: 600, textAlign: 'right', flex: 1 },
      totalLabel: { fontSize: 9.5, color: '#0F172A', fontWeight: 800 },
      totalValue: { fontSize: 9.5, color: '#0F172A', fontWeight: 800, textAlign: 'right', flex: 1 },
      balanceLabel: { fontSize: 9.5, color: '#DC2626', fontWeight: 800 },
      balanceValue: { fontSize: 9.5, color: '#DC2626', fontWeight: 800, textAlign: 'right', flex: 1 },

      chartCenterLabel: { fontSize: 6.5, color: '#94A3B8', textAlign: 'center' },
      chartCenterValue: { fontSize: 9, fontFamily: 'Inter', fontWeight: 800, color: '#0F172A', textAlign: 'center' },
      legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
      legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
      legendText: { fontSize: 7, color: '#334155' },

      wordsBox: { marginTop: 12, fontSize: 8.5, color: '#334155' },
      wordsLabel: { fontSize: 7.5, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },

      termsBox: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
      termsTitle: { fontSize: 7.5, fontFamily: 'Inter', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: 3 },
      termsText: { fontSize: 7.5, color: '#64748B', lineHeight: 1.5 },

      signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
      signatureLabel: { fontSize: 8, fontWeight: 700, color: '#0F172A' },
      signatureSub: { fontSize: 7.5, color: '#64748B', marginTop: 1 },

      footerNote: { marginTop: 18, textAlign: 'center', fontSize: 7.5, color: '#94A3B8' },
    });
  }
  return cachedRentBillStyles;
}

/** React PDF Document for a single Rent Bill — `bill` must include
 * `contract.tenant`, `contract.room.property`, and `payments`. */
const RentBillPDFDocument = ({ bill, company, electricityBill }) => {
  const { Document, Page, Text, View } = getReactPdf();
  const styles = getRentBillStyles();

  const comp = company || {
    companyName: 'Khodiyar Steel Fabrication',
    address: 'Surat, Gujarat',
    phone: '',
    email: ''
  };
  const compAddr = parseAddress(comp.address);

  const tenant = bill.contract?.tenant || {};
  const room = bill.contract?.room || {};
  const property = room.property || {};

  const rentAmount = bill.rentAmount || 0;
  const lateFee = bill.lateFeeApplied || 0;
  const miscAmount = bill.miscAmount || 0;
  const miscLabel = bill.miscLabel || 'Miscellaneous';
  const discountAmount = bill.discountAmount || 0;
  const amountPaid = bill.amountPaid || 0;
  const subTotal = round2(rentAmount + lateFee + miscAmount);
  const amountDue = Math.max(0, round2(subTotal - discountAmount));
  const balanceDue = round2(amountDue - amountPaid);
  const billNo = `RENT-${new Date(bill.cycleStart).getFullYear()}-${String(new Date(bill.cycleStart).getMonth() + 1).padStart(2, '0')}-${bill.id.slice(0, 6).toUpperCase()}`;
  const billingMonth = new Date(bill.cycleStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  const statusColors = {
    PAID: { bg: '#DCFCE7', color: '#15803D' },
    PARTIAL: { bg: '#FEF3C7', color: '#B45309' },
    UNPAID: { bg: '#FEE2E2', color: '#B91C1C' }
  };
  const statusStyle = statusColors[bill.status] || statusColors.UNPAID;

  const chartSegments = [
    { label: 'Rent', value: rentAmount, color: '#1D4ED8' },
    { label: 'Late Fee', value: lateFee, color: '#F59E0B' },
    { label: miscLabel, value: miscAmount, color: '#7C3AED' }
  ].filter((s) => s.value > 0);

  const { Svg, G, Circle } = getReactPdf();
  const chartSize = 92, strokeW = 16, radius = (chartSize - strokeW) / 2, circumference = 2 * Math.PI * radius;
  const chartTotal = chartSegments.reduce((s, x) => s + x.value, 0) || 1;
  let arcOffset = 0;
  const arcs = chartSegments.map((s, i) => {
    const dash = (s.value / chartTotal) * circumference;
    const el = React.createElement(Circle, {
      key: i, cx: chartSize / 2, cy: chartSize / 2, r: radius,
      stroke: s.color, strokeWidth: strokeW, fill: 'none',
      // pdfkit's dash() rejects a zero-length segment (e.g. a single 100%
      // slice would otherwise produce "circumference 0") — clamp the gap to
      // a hairline minimum instead.
      strokeDasharray: `${dash} ${Math.max(circumference - dash, 0.01)}`, strokeDashoffset: -arcOffset,
    });
    arcOffset += dash;
    return el;
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header bar
      React.createElement(View, { style: styles.headerBar },
        React.createElement(View, { style: styles.headerLeft },
          React.createElement(View, { style: styles.logoBox },
            React.createElement(Text, { style: styles.logoLetter }, (comp.companyName || 'R').charAt(0).toUpperCase())
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: styles.companyName }, comp.companyName),
            React.createElement(Text, { style: styles.companyTagline }, 'Rental Management')
          )
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.headerRightTitle }, 'RENTAL INVOICE'),
          React.createElement(Text, { style: styles.headerRightSub }, `GSTIN: ${comp.gstin || 'N/A'} · PAN: ${comp.pan || 'N/A'}`)
        )
      ),

      React.createElement(View, { style: styles.body },
        // Meta bar
        React.createElement(View, { style: styles.metaBar },
          React.createElement(View, { style: styles.metaCol },
            React.createElement(Text, { style: styles.metaColLabel }, 'Billing Month'),
            React.createElement(Text, { style: styles.metaColValue }, billingMonth)
          ),
          React.createElement(View, { style: styles.metaCol },
            React.createElement(Text, { style: styles.metaColLabel }, 'Invoice No.'),
            React.createElement(Text, { style: styles.metaColValue }, billNo)
          ),
          React.createElement(View, { style: styles.metaCol },
            React.createElement(Text, { style: styles.metaColLabel }, 'Date'),
            React.createElement(Text, { style: styles.metaColValue }, formatDate(bill.generatedAt))
          ),
          React.createElement(View, { style: styles.metaCol },
            React.createElement(Text, { style: styles.metaColLabel }, 'Due Date'),
            React.createElement(Text, { style: styles.metaColValueDue }, formatDate(bill.dueDate))
          )
        ),

        // Landlord / Tenant grid
        React.createElement(View, { style: styles.detailsGrid },
          React.createElement(View, { style: styles.detailsCol },
            React.createElement(Text, { style: styles.sectionTitle }, 'LANDLORD DETAILS'),
            React.createElement(Text, { style: styles.entityName }, comp.ownerName || comp.companyName),
            React.createElement(View, { style: styles.entityText },
              comp.phone ? React.createElement(Text, null, `Phone: ${comp.phone}`) : null,
              ...compAddr.lines.map((line, i) => React.createElement(Text, { key: i }, line))
            )
          ),
          React.createElement(View, { style: styles.detailsCol },
            React.createElement(Text, { style: styles.sectionTitle }, 'BILLED TO'),
            React.createElement(Text, { style: styles.entityName }, tenant.name || 'Tenant'),
            React.createElement(View, { style: styles.entityText },
              React.createElement(Text, null, `Room ${room.roomNumber || ''}, ${property.name || ''}`),
              property.city ? React.createElement(Text, null, property.city) : null,
              tenant.mobile ? React.createElement(Text, null, `Phone: ${tenant.mobile}`) : null
            )
          )
        ),

        // Your Bill box
        React.createElement(View, { style: styles.billBox },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.billBoxLabel }, 'Your Bill'),
            React.createElement(Text, { style: styles.billBoxAmount }, formatCurrency(balanceDue)),
            React.createElement(Text, { style: styles.billBoxSub }, `Amount Paid: ${formatCurrency(amountPaid)}`)
          ),
          React.createElement(View, { style: styles.billBoxRight },
            React.createElement(View, { style: styles.dueBox },
              React.createElement(Text, { style: styles.dueBoxLabel }, 'Due by'),
              React.createElement(Text, { style: styles.dueBoxValue }, formatDate(bill.dueDate))
            ),
            React.createElement(Text, { style: [styles.statusBadge, { backgroundColor: statusStyle.bg, color: statusStyle.color }] }, bill.status)
          )
        ),

        // Charges + donut chart
        React.createElement(Text, { style: styles.chargesHeader }, 'Charges & Bill Components'),
        React.createElement(View, { style: styles.chargesRow },
          React.createElement(View, { style: styles.chargesTable },
            React.createElement(View, { style: styles.table },
              React.createElement(View, { style: styles.tableHeadRow },
                React.createElement(Text, { style: styles.tableHeadLabel }, 'Description'),
                React.createElement(Text, { style: styles.tableHeadValue }, 'Amount')
              ),
              React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.tableLabel }, 'Monthly Rent'),
                React.createElement(Text, { style: styles.tableValue }, formatCurrency(rentAmount))
              ),
              lateFee > 0 ? React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.tableLabel }, 'Late Fee'),
                React.createElement(Text, { style: styles.tableValue }, formatCurrency(lateFee))
              ) : null,
              miscAmount > 0 ? React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.tableLabel }, miscLabel),
                React.createElement(Text, { style: styles.tableValue }, formatCurrency(miscAmount))
              ) : null,
              React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.totalLabel }, 'Sub Total'),
                React.createElement(Text, { style: styles.totalValue }, formatCurrency(subTotal))
              ),
              discountAmount > 0 ? React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.tableLabel }, 'Discount'),
                React.createElement(Text, { style: [styles.tableValue, { color: '#16A34A' }] }, `- ${formatCurrency(discountAmount)}`)
              ) : null,
              React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.totalLabel }, 'Total'),
                React.createElement(Text, { style: styles.totalValue }, formatCurrency(amountDue))
              ),
              React.createElement(View, { style: styles.tableRow },
                React.createElement(Text, { style: styles.tableLabel }, 'Amount Received'),
                React.createElement(Text, { style: styles.tableValue }, formatCurrency(amountPaid))
              ),
              React.createElement(View, { style: styles.tableRowLast },
                React.createElement(Text, { style: styles.balanceLabel }, 'Balance Due'),
                React.createElement(Text, { style: styles.balanceValue }, formatCurrency(balanceDue))
              )
            )
          ),
          React.createElement(View, { style: styles.chartWrap },
            React.createElement(Svg, { width: chartSize, height: chartSize, viewBox: `0 0 ${chartSize} ${chartSize}` },
              React.createElement(G, { transform: `rotate(-90 ${chartSize / 2} ${chartSize / 2})` }, ...arcs)
            ),
            ...chartSegments.map((s, i) => React.createElement(View, { key: i, style: styles.legendRow },
              React.createElement(View, { style: [styles.legendDot, { backgroundColor: s.color }] }),
              React.createElement(Text, { style: styles.legendText }, `${s.label}: ${formatCurrency(s.value)}`)
            ))
          )
        ),

        // Electricity — informational only, kept out of the rent totals above
        // (rent and electricity stay separate ledgers; this is just shown
        // for reference on the same PDF when a matching reading exists).
        electricityBill ? React.createElement(View, { style: { marginTop: 12 } },
          React.createElement(Text, { style: styles.chargesHeader }, 'Electricity Charges (Informational)'),
          React.createElement(View, { style: styles.table },
            React.createElement(View, { style: styles.tableRow },
              React.createElement(Text, { style: styles.tableLabel }, 'Meter Reading'),
              React.createElement(Text, { style: styles.tableValue }, `${electricityBill.previousReading ?? '-'} → ${electricityBill.currentReading ?? '-'} units`)
            ),
            React.createElement(View, { style: styles.tableRow },
              React.createElement(Text, { style: styles.tableLabel }, `Units Consumed @ ₹${electricityBill.ratePerUnit}/unit`),
              React.createElement(Text, { style: styles.tableValue }, `${electricityBill.unitsConsumed} units`)
            ),
            React.createElement(View, { style: styles.tableRowLast },
              React.createElement(Text, { style: styles.balanceLabel }, `Electricity Amount (${electricityBill.status})`),
              React.createElement(Text, { style: styles.balanceValue }, formatCurrency(electricityBill.amount))
            )
          )
        ) : null,

        // Amount in words
        React.createElement(View, { style: styles.wordsBox },
          React.createElement(Text, { style: styles.wordsLabel }, 'Invoice amount in words:'),
          React.createElement(Text, null, numberToWords(amountDue))
        ),

        // Terms
        React.createElement(View, { style: styles.termsBox },
          React.createElement(Text, { style: styles.termsTitle }, 'Terms and Conditions'),
          React.createElement(Text, { style: styles.termsText },
            'Please remit payment by the due date as per the lease agreement. Late payments may attract additional charges. This is a computer generated invoice and requires no physical signature.'
          )
        ),

        // Signature row
        React.createElement(View, { style: styles.signatureRow },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.signatureLabel }, `For: ${comp.companyName}`),
            React.createElement(Text, { style: styles.signatureSub }, 'Authorized Signatory')
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: styles.signatureLabel }, `Landlord: ${comp.ownerName || comp.companyName}`),
            comp.phone ? React.createElement(Text, { style: styles.signatureSub }, `Phone: ${comp.phone}`) : null
          )
        ),

        React.createElement(Text, { style: styles.footerNote }, `Thank you for your business! Generated via ${comp.companyName} — Rent Management.`)
      )
    )
  );
};

module.exports = {
  setReactPdfModule,
  InvoicePDFDocument,
  QuotationPDFDocument,
  RentBillPDFDocument
};
