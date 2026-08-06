/**
 * Helper to format numbers as INR currency
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Helper to format date strings
 */
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

/**
 * Helper to clean and parse client address & state without duplicate lines
 */
function parseClientAddress(client) {
  const addressText = client.address ? client.address.replace(/\\n/g, '\n') : '';
  const lines = addressText.split('\n').map(l => l.trim()).filter(Boolean);
  const addressWithoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
  const existingStateLine = lines.find(l => l.toLowerCase().startsWith('state:'));
  const defaultState = client.gstin ? 'State: 24 - Gujarat' : 'State: Gujarat';
  const stateLine = existingStateLine || defaultState;

  return {
    addressLines: addressWithoutState,
    stateLine: stateLine.startsWith('State:') ? stateLine : `State: ${stateLine}`
  };
}

/**
 * Helper to clean and parse company address
 */
function parseCompanyAddress(comp) {
  const addressText = comp.address ? comp.address.replace(/\\n/g, '\n') : '';
  const lines = addressText.split('\n').map(l => l.trim()).filter(Boolean);
  const addressWithoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
  const stateLine = lines.find(l => l.toLowerCase().startsWith('state:')) || 'State: Gujarat';

  return {
    addressLines: addressWithoutState,
    stateLine: stateLine.startsWith('State:') ? stateLine : `State: ${stateLine}`
  };
}

/**
 * Wraps any HTML content inside a complete, self-contained HTML document
 * equipped with embedded Inter web fonts, print CSS, page-break optimizations,
 * and high-DPI rendering support.
 */
function wrapInFullDocument(bodyContent, title = 'Document') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background-color: #ffffff !important;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .a4-page {
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    /* Multi-page table optimizations */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-footer-group;
    }

    .keep-together, .avoid-break, .company-header, .details-section, .totals-section, .terms-section, .signatory-section {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Print media resets */
    @media print {
      html, body {
        width: 100%;
        background: #ffffff !important;
        color: #0f172a !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body style="background-color: #ffffff !important; color: #0f172a !important;">
  ${bodyContent}
</body>
</html>`;
}

/**
 * Builds HTML string for an Invoice
 */
function buildInvoiceHTML(invoice, company) {
  if (!invoice) return '';

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

  const { addressLines: compAddressLines, stateLine: compStateLine } = parseCompanyAddress(comp);
  const { addressLines: clientAddressLines, stateLine: clientStateLine } = parseClientAddress(client);

  const titleText = invoice.gstType === 'NON_GST' ? 'I N V O I C E' : 'T A X &nbsp;&nbsp;&nbsp; I N V O I C E';

  const itemsHTML = invoice.items && invoice.items.map((item, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 4px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 6px; font-weight: 700; color: #0f172a; word-break: break-word;">${item.description}</td>
      <td style="padding: 8px 4px; text-align: center; color: #64748b;">${item.hsnSac || ''}</td>
      <td style="padding: 8px 4px; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 4px; text-align: center;">${item.unit}</td>
      <td style="padding: 8px 6px; text-align: right;">${Number(item.rate).toFixed(2)}</td>
      <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: #0f172a;">${Number(item.amount).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  const bodyContent = `
    <div class="a4-page" style="width: 100%; box-sizing: border-box; background-color: #ffffff; color: #0f172a; font-size: 11px; line-height: 1.45;">
      <div>
        <!-- Company Header -->
        <div class="company-header" style="margin-bottom: 12px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 3px 0; letter-spacing: -0.025em;">
            ${comp.companyName}
          </h1>
          <div style="font-size: 11px; color: #1e293b; font-weight: 600; line-height: 1.45;">
            ${compAddressLines.map(line => `<div>${line}</div>`).join('')}
            ${comp.phone ? `<div>Phone no. : ${comp.phone}</div>` : ''}
            ${comp.email ? `<div>Email : ${comp.email}</div>` : ''}
            <div>GSTIN: ${comp.gstin || 'N/A'} | PAN: ${comp.pan || 'N/A'}</div>
            <div>${compStateLine}</div>
          </div>
        </div>

        <div style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding-top: 6px; padding-bottom: 6px; margin-top: 12px; margin-bottom: 12px; text-align: center;">
          <h2 style="color: #4c40aa; font-size: 18px; font-weight: 800; letter-spacing: 0.1em; margin: 0;">
            ${titleText}
          </h2>
        </div>

        <!-- Bill To & Invoice Details Section -->
        <div class="details-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              BILL TO
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
              ${client.companyName || ''}
            </div>
            <div style="color: #475569; font-size: 11px; margin-top: 2px;">
              ${clientAddressLines.map(line => `<div>${line}</div>`).join('')}
            </div>
            <div style="margin-top: 4px; font-size: 11px; color: #334155;">
              ${client.mobile ? `<div>Phone: <strong>${client.mobile}</strong></div>` : ''}
              <div>${clientStateLine}</div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              INVOICE DETAILS
            </div>
            <div style="width: 220px; margin-left: auto;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Invoice No :</span>
                <strong style="color: #0f172a; font-weight: 700;">${invoice.invoiceNumber}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Date :</span>
                <strong style="color: #0f172a;">${formatDate(invoice.date)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Place of Supply :</span>
                <strong style="color: #0f172a;">Gujarat</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;">
            <thead>
              <tr style="background-color: #4c40aa; color: #ffffff; font-weight: 700; font-size: 10.5px; text-transform: uppercase;">
                <th style="padding: 8px 4px; text-align: center; width: 35px; border-top-left-radius: 4px; border-bottom-left-radius: 4px;">Sr.</th>
                <th style="padding: 8px 6px; text-align: left;">Item / Particulars</th>
                <th style="padding: 8px 4px; text-align: center; width: 65px;">HSN/SAC</th>
                <th style="padding: 8px 4px; text-align: center; width: 45px;">Qty</th>
                <th style="padding: 8px 4px; text-align: center; width: 45px;">Unit</th>
                <th style="padding: 8px 6px; text-align: right; width: 80px;">Price/Unit</th>
                <th style="padding: 8px 6px; text-align: right; width: 90px; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">Amount</th>
              </tr>
            </thead>
            <tbody style="font-size: 11px; color: #1e293b;">
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-weight: 700; font-size: 11px; color: #0f172a;">
                <td colSpan="3" style="padding: 8px 6px; font-weight: 800; text-transform: uppercase;">Total</td>
                <td style="padding: 8px 4px; text-align: center; font-weight: 800;">${totalQuantity}</td>
                <td colSpan="2"></td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 800; font-size: 13px;">${Number(invoice.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Lower Summary Section -->
        <div class="totals-section" style="display: grid; grid-template-columns: 7fr 5fr; gap: 24px; margin: 16px 0;">
          <!-- Left Column: Words & Terms -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
                Invoice Amount In Words
              </div>
              <div style="font-style: italic; font-weight: 500; color: #1e293b; font-size: 11px;">
                ${invoice.amountInWords || ''}
              </div>
            </div>

            <div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
                Terms and Conditions
              </div>
              <div style="color: #334155; font-size: 11px; white-space: pre-line;">
                ${invoice.terms || comp.termsConditions || 'Thank you for doing business with us!'}
              </div>
            </div>
          </div>

          <!-- Right Column: Financial Calculation -->
          <div style="font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #475569;">Sub Total</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCurrency(invoice.subtotal)}</span>
            </div>

            ${invoice.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">Discount</span>
                <span style="font-weight: 700; color: #e11d48;">- ${formatCurrency(invoice.discount)}</span>
              </div>
            ` : ''}

            ${invoice.gstType === 'CGST_SGST' ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">CGST (${invoice.gstRate / 2}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(invoice.cgstAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">SGST (${invoice.gstRate / 2}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(invoice.sgstAmount)}</span>
              </div>
            ` : ''}

            ${invoice.gstType === 'IGST' ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">IGST (${invoice.gstRate}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(invoice.igstAmount)}</span>
              </div>
            ` : ''}

            <!-- Total Banner -->
            <div style="background-color: #4c40aa; color: #ffffff; display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 4px; font-weight: 800; font-size: 13px; margin: 6px 0;">
              <span>Total</span>
              <span>${formatCurrency(invoice.grandTotal)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #475569;">Amount Received</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCurrency(invoice.amountReceived)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #e11d48; font-weight: 700;">Balance Due</span>
              <span style="color: #e11d48; font-weight: 800; font-size: 13px;">${formatCurrency(invoice.balanceDue)}</span>
            </div>

            <!-- Authorized Signatory Box -->
            <div class="signatory-section" style="text-align: right; padding-top: 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">
                For : ${comp.companyName}
              </div>
              <div style="height: 48px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 176px; margin-left: auto; padding-top: 4px; text-align: center; font-weight: 700; font-size: 11px; color: #0f172a;">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="text-align: center; font-size: 10px; color: #94a3b8; font-style: italic; padding-top: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9;">
        This is a computer generated invoice and requires no physical signature.
      </div>
    </div>
  `;

  return wrapInFullDocument(bodyContent, `Invoice_${invoice.invoiceNumber}`);
}

/**
 * Builds HTML string for a Quotation
 */
function buildQuotationHTML(quotation, company) {
  if (!quotation) return '';

  const comp = company || quotation.company || {
    companyName: 'Khodiyar Steel Fabrication',
    ownerName: 'Prayag Sharma',
    gstin: 'N/A',
    pan: 'N/A',
    email: 'khodiyarsteelandfabrication@gmail.com',
    phone: '9825534229 / 8128209488',
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat \nCity: Surat\nPincode: 395004\nState: Gujarat',
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

  const { addressLines: compAddressLines, stateLine: compStateLine } = parseCompanyAddress(comp);
  const { addressLines: clientAddressLines, stateLine: clientStateLine } = parseClientAddress(client);

  const itemsHTML = quotation.items && quotation.items.map((item, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 4px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 6px; font-weight: 700; color: #0f172a; word-break: break-word;">${item.description}</td>
      <td style="padding: 8px 4px; text-align: center; color: #64748b;">${item.hsnSac || ''}</td>
      <td style="padding: 8px 4px; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 4px; text-align: center;">${item.unit}</td>
      <td style="padding: 8px 6px; text-align: right;">${Number(item.rate).toFixed(2)}</td>
      <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: #0f172a;">${Number(item.amount).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  const bodyContent = `
    <div class="a4-page" style="width: 100%; box-sizing: border-box; background-color: #ffffff; color: #0f172a; font-size: 11px; line-height: 1.45;">
      <div>
        <!-- Company Header -->
        <div class="company-header" style="margin-bottom: 12px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 3px 0; letter-spacing: -0.025em;">
            ${comp.companyName}
          </h1>
          <div style="font-size: 11px; color: #1e293b; font-weight: 600; line-height: 1.45;">
            ${compAddressLines.map(line => `<div>${line}</div>`).join('')}
            ${comp.phone ? `<div>Phone no. : ${comp.phone}</div>` : ''}
            ${comp.email ? `<div>Email : ${comp.email}</div>` : ''}
            <div>GSTIN: ${comp.gstin || 'N/A'} | PAN: ${comp.pan || 'N/A'}</div>
            <div>${compStateLine}</div>
          </div>
        </div>

        <div style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding-top: 6px; padding-bottom: 6px; margin-top: 12px; margin-bottom: 12px; text-align: center;">
          <h2 style="color: #4c40aa; font-size: 18px; font-weight: 800; letter-spacing: 0.1em; margin: 0;">
            Q U O T A T I O N
          </h2>
        </div>

        <!-- Bill To & Details Section -->
        <div class="details-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              QUOTATION FOR
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
              ${client.companyName || ''}
            </div>
            <div style="color: #475569; font-size: 11px; margin-top: 2px;">
              ${clientAddressLines.map(line => `<div>${line}</div>`).join('')}
            </div>
            <div style="margin-top: 4px; font-size: 11px; color: #334155;">
              ${client.mobile ? `<div>Phone: <strong>${client.mobile}</strong></div>` : ''}
              <div>${clientStateLine}</div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              QUOTATION DETAILS
            </div>
            <div style="width: 220px; margin-left: auto;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Quotation No :</span>
                <strong style="color: #0f172a; font-weight: 700;">${quotation.quotationNumber}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Date :</span>
                <strong style="color: #0f172a;">${formatDate(quotation.date)}</strong>
              </div>
              ${quotation.validUntil ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Valid Until :</span>
                  <strong style="color: #0f172a;">${formatDate(quotation.validUntil)}</strong>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;">
            <thead>
              <tr style="background-color: #4c40aa; color: #ffffff; font-weight: 700; font-size: 10.5px; text-transform: uppercase;">
                <th style="padding: 8px 4px; text-align: center; width: 35px; border-top-left-radius: 4px; border-bottom-left-radius: 4px;">Sr.</th>
                <th style="padding: 8px 6px; text-align: left;">Item / Particulars</th>
                <th style="padding: 8px 4px; text-align: center; width: 65px;">HSN/SAC</th>
                <th style="padding: 8px 4px; text-align: center; width: 45px;">Qty</th>
                <th style="padding: 8px 4px; text-align: center; width: 45px;">Unit</th>
                <th style="padding: 8px 6px; text-align: right; width: 80px;">Price/Unit</th>
                <th style="padding: 8px 6px; text-align: right; width: 90px; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">Amount</th>
              </tr>
            </thead>
            <tbody style="font-size: 11px; color: #1e293b;">
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-weight: 700; font-size: 11px; color: #0f172a;">
                <td colSpan="3" style="padding: 8px 6px; font-weight: 800; text-transform: uppercase;">Total</td>
                <td style="padding: 8px 4px; text-align: center; font-weight: 800;">${totalQuantity}</td>
                <td colSpan="2"></td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 800; font-size: 13px;">${Number(quotation.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Lower Summary Section -->
        <div class="totals-section" style="display: grid; grid-template-columns: 7fr 5fr; gap: 24px; margin: 16px 0;">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
                Terms and Conditions
              </div>
              <div style="color: #334155; font-size: 11px; white-space: pre-line;">
                ${quotation.terms || comp.termsConditions || 'Thank you for doing business with us!'}
              </div>
            </div>
          </div>

          <div style="font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #475569;">Sub Total</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCurrency(subtotal)}</span>
            </div>

            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">Discount</span>
                <span style="font-weight: 700; color: #e11d48;">- ${formatCurrency(discount)}</span>
              </div>
            ` : ''}

            ${gstType === 'CGST_SGST' ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">CGST (${gstRate / 2}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(cgstAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">SGST (${gstRate / 2}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(sgstAmount)}</span>
              </div>
            ` : ''}

            ${gstType === 'IGST' ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #475569;">IGST (${gstRate}%)</span>
                <span style="font-weight: 700; color: #0f172a;">${formatCurrency(igstAmount)}</span>
              </div>
            ` : ''}

            <!-- Total Banner -->
            <div style="background-color: #4c40aa; color: #ffffff; display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 4px; font-weight: 800; font-size: 13px; margin: 6px 0;">
              <span>Grand Total</span>
              <span>${formatCurrency(quotation.grandTotal)}</span>
            </div>

            <!-- Authorized Signatory Box -->
            <div class="signatory-section" style="text-align: right; padding-top: 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">
                For : ${comp.companyName}
              </div>
              <div style="height: 48px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 176px; margin-left: auto; padding-top: 4px; text-align: center; font-weight: 700; font-size: 11px; color: #0f172a;">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="text-align: center; font-size: 10px; color: #94a3b8; font-style: italic; padding-top: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9;">
        This is a computer generated quotation and requires no physical signature.
      </div>
    </div>
  `;

  return wrapInFullDocument(bodyContent, `Quotation_${quotation.quotationNumber}`);
}

module.exports = {
  wrapInFullDocument,
  buildInvoiceHTML,
  buildQuotationHTML
};
