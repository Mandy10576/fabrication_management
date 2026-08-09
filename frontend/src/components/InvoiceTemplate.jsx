import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';

export const InvoiceTemplate = ({ invoice, company, id = "printable-invoice" }) => {
  if (!invoice) return null;

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

  const addressText = comp.address ? comp.address.replace(/\\n/g, '\n') : '';
  const lines = addressText.split('\n').filter(l => l.trim());
  const addressWithoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
  const parsedCompState = lines.find(l => l.toLowerCase().startsWith('state:'))?.replace(/^state:\s*/i, '').trim();
  const resolvedCompState = comp.state || parsedCompState || 'N/A';

  const clientAddressRaw = client.address ? client.address.replace(/\\n/g, '\n') : '';
  const clientLines = clientAddressRaw.split('\n').map(l => l.trim()).filter(Boolean);
  const clientAddressWithoutState = clientLines.filter(l => !l.toLowerCase().startsWith('state:'));
  const parsedClientState = clientLines.find(l => l.toLowerCase().startsWith('state:'))?.replace(/^state:\s*/i, '').trim();
  // The invoice's own saved snapshot wins (Place of Supply as it was when
  // billed), then the client's current profile, then whatever's parseable
  // out of their address text — never silently claim a specific state.
  const resolvedState = invoice.state || client.state || parsedClientState || 'N/A';

  return (
    <div
      id={id}
      className="a4-page bg-white text-slate-900 shadow-2xl rounded-xl w-[210mm] max-w-[210mm] mx-auto text-xs leading-relaxed font-sans border border-slate-200 relative flex flex-col justify-between box-border"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '10mm 12mm'
      }}
    >
      <div>
        {/* Company Header */}
        <div style={{ marginBottom: '12px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '-0.025em' }}>
            {comp.companyName}
          </h1>
          <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600', lineHeight: '1.45' }}>
            {addressWithoutState.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
            {comp.phone && <div>Phone no. : {comp.phone}</div>}
            {comp.email && <div>Email : {comp.email}</div>}
            <div>GSTIN: {comp.gstin || 'N/A'} | PAN: {comp.pan || 'N/A'}</div>
            <div>State: {resolvedCompState}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', paddingTop: '6px', paddingBottom: '6px', marginTop: '12px', marginBottom: '16px', textAlign: 'center', width: '100%' }}>
          {invoice.gstType === 'NON_GST' ? (
            <h2 style={{ color: '#4c40aa', fontSize: '18px', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              I N V O I C E
            </h2>
          ) : (
            <h2 style={{ color: '#4c40aa', fontSize: '18px', fontWeight: '800', margin: 0, textTransform: 'uppercase' }}>
              <span style={{ letterSpacing: '0.15em' }}>T A X</span>
              <span style={{ display: 'inline-block', width: '28px' }}></span>
              <span style={{ letterSpacing: '0.15em' }}>I N V O I C E</span>
            </h2>
          )}
        </div>

        {/* Bill To & Invoice Details Section (HTML Table format for 100% print & PDF canvas stability) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left Column: Bill To */}
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'left' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                  BILL TO
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
                  {client.companyName}
                </div>
                <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.4' }}>
                  {clientAddressWithoutState.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                  {client.mobile && <div>Phone: <strong>{client.mobile}</strong></div>}
                  <div><strong>State: {resolvedState}</strong></div>
                </div>
              </td>

              {/* Right Column: Invoice Details */}
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                  INVOICE DETAILS
                </div>
                <table style={{ width: '220px', marginLeft: 'auto', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748b', padding: '2px 0', textAlign: 'left' }}>Invoice No :</td>
                      <td style={{ color: '#0f172a', fontWeight: '700', padding: '2px 0', textAlign: 'right' }}>{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', padding: '2px 0', textAlign: 'left' }}>Date :</td>
                      <td style={{ color: '#0f172a', fontWeight: '600', padding: '2px 0', textAlign: 'right' }}>{formatDate(invoice.date)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', padding: '2px 0', textAlign: 'left' }}>Place of Supply :</td>
                      <td style={{ color: '#0f172a', fontWeight: '600', padding: '2px 0', textAlign: 'right' }}>{resolvedState}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <div style={{ marginBottom: '18px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#4c40aa', color: '#ffffff', fontWeight: '700', fontSize: '10.5px', textTransform: 'uppercase', height: '32px' }}>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '35px', verticalAlign: 'middle', lineHeight: '1.2', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}>Sr.</th>
                <th style={{ padding: '6px 6px', textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.2' }}>Item / Particulars</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '65px', verticalAlign: 'middle', lineHeight: '1.2' }}>HSN/SAC</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '45px', verticalAlign: 'middle', lineHeight: '1.2' }}>Qty</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '45px', verticalAlign: 'middle', lineHeight: '1.2' }}>Unit</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: '80px', verticalAlign: 'middle', lineHeight: '1.2' }}>Price/Unit</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: '90px', verticalAlign: 'middle', lineHeight: '1.2', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>Amount</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '11px', color: '#1e293b' }}>
              {invoice.items && invoice.items.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 6px', fontWeight: '700', color: '#0f172a', wordBreak: 'break-word', verticalAlign: 'middle' }}>{item.description}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>{item.hsnSac && item.hsnSac !== '9988' ? item.hsnSac : '-'}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{item.unit}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle' }}>{Number(item.rate).toFixed(2)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '700', color: '#0f172a', verticalAlign: 'middle' }}>{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr style={{ borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>
                <td colSpan={3} style={{ padding: '8px 6px', fontWeight: '800', textTransform: 'uppercase' }}>Total</td>
                <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '800' }}></td>
                <td colSpan={2}></td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '800', fontSize: '13px' }}>{Number(invoice.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lower Summary Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', marginBottom: '16px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left Column: Words & Terms */}
              <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Invoice Amount In Words
                  </div>
                  <div style={{ fontStyle: 'italic', fontWeight: '600', color: '#1e293b', fontSize: '11px' }}>
                    {invoice.amountInWords}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Terms and Conditions
                  </div>
                  <div style={{ color: '#334155', fontSize: '11px', whiteSpace: 'pre-line', lineHeight: '1.45' }}>
                    {invoice.terms || comp.termsConditions || 'Thank you for doing business with us!'}
                  </div>
                </div>
              </td>

              {/* Right Column: Financial Calculation */}
              <td style={{ width: '45%', verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>Sub Total</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.subtotal)}</td>
                    </tr>

                    {invoice.discount > 0 && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>Discount</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#e11d48' }}>- {formatCurrency(invoice.discount)}</td>
                      </tr>
                    )}

                    {invoice.gstType === 'CGST_SGST' && (
                      <>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>CGST ({invoice.gstRate / 2}%)</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.cgstAmount)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>SGST ({invoice.gstRate / 2}%)</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.sgstAmount)}</td>
                        </tr>
                      </>
                    )}

                    {invoice.gstType === 'IGST' && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>IGST ({invoice.gstRate}%)</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.igstAmount)}</td>
                      </tr>
                    )}

                    {/* Total Banner Row */}
                    <tr>
                      <td colSpan={2} style={{ padding: '6px 0' }}>
                        <div style={{ backgroundColor: '#4c40aa', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '4px', fontWeight: '800', fontSize: '13px' }}>
                          <span>Total</span>
                          <span>{formatCurrency(invoice.grandTotal)}</span>
                        </div>
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 0', color: '#475569', fontWeight: '500', textAlign: 'left' }}>Amount Received</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.amountReceived)}</td>
                    </tr>

                    <tr>
                      <td style={{ padding: '4px 0', color: '#e11d48', fontWeight: '700', textAlign: 'left' }}>Balance Due</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '800', color: '#e11d48', fontSize: '13px' }}>{formatCurrency(invoice.balanceDue)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Authorized Signatory Box */}
                <div style={{ textAlign: 'right', paddingTop: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                    For : {comp.companyName}
                  </div>
                  <div style={{ height: '44px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '176px', marginLeft: 'auto', paddingTop: '4px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>
                    Authorized Signatory
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
        This is a computer generated invoice and requires no physical signature.
      </div>
    </div>
  );
};
