const React = require('react');
const path = require('path');

let reactPdfModule = null;
let fontRegistered = false;
let cachedStyles = null;

function getReactPdf() {
  if (!reactPdfModule) {
    reactPdfModule = require('@react-pdf/renderer');
  }
  if (!fontRegistered) {
    fontRegistered = true;
    try {
      const fontsDir = path.join(__dirname, '../assets/fonts');
      reactPdfModule.Font.register({
        family: 'Inter',
        fonts: [
          { src: path.join(fontsDir, 'Inter-Regular.ttf'), fontWeight: 400 },
          { src: path.join(fontsDir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
          { src: path.join(fontsDir, 'Inter-Bold.ttf'), fontWeight: 700 },
          { src: path.join(fontsDir, 'Inter-ExtraBold.ttf'), fontWeight: 800 },
        ]
      });
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
        borderTopWidth: 1.5,
        borderTopColor: '#CBD5E1',
        borderBottomWidth: 1.5,
        borderBottomColor: '#CBD5E1',
        paddingVertical: 5,
        paddingHorizontal: 4,
        marginTop: 2,
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
  if (!addressStr) return { lines: [], stateLine: 'State: Gujarat' };
  const text = addressStr.replace(/\\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const withoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
  const stateLine = lines.find(l => l.toLowerCase().startsWith('state:')) || 'State: Gujarat';
  return {
    lines: withoutState,
    stateLine: stateLine.startsWith('State:') ? stateLine : `State: ${stateLine}`
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
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = invoice.client || {};
  const totalQuantity = invoice.items ? invoice.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

  const compAddr = parseAddress(comp.address);
  const clientAddr = parseAddress(client.address);

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
          React.createElement(Text, null, compAddr.stateLine)
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
            React.createElement(Text, null, clientAddr.stateLine),
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
            React.createElement(Text, { style: styles.metaValue }, 'Gujarat')
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

        // Footer Total Row
        React.createElement(View, { style: styles.tableFooterRow },
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, { width: '58%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colQty] }, totalQuantity),
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
            React.createElement(Text, { style: styles.boxContent }, invoice.amountInWords)
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
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = quotation.client || {};
  const totalQuantity = quotation.items ? quotation.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

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
          React.createElement(Text, null, compAddr.stateLine)
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
            React.createElement(Text, null, clientAddr.stateLine),
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
          ) : null
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

        // Footer Total Row
        React.createElement(View, { style: styles.tableFooterRow },
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, { width: '58%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, styles.colQty] }, totalQuantity),
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

module.exports = {
  InvoicePDFDocument,
  QuotationPDFDocument
};
