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
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = invoice.client || {};
  const totalQuantity = invoice.items ? invoice.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

  return (
    <div
      id={id}
      className="a4-page bg-white text-slate-900 p-8 shadow-2xl rounded-xl max-w-[210mm] mx-auto text-xs leading-relaxed font-sans border border-slate-200 relative flex flex-col justify-between"
      style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
    >
      <div>
        {/* Company Header */}
        {(() => {
          const addressText = comp.address ? comp.address.replace(/\\n/g, '\n') : '';
          const lines = addressText.split('\n').filter(l => l.trim());
          const addressWithoutState = lines.filter(l => !l.toLowerCase().startsWith('state:'));
          const stateLine = lines.find(l => l.toLowerCase().startsWith('state:')) || 'State: Gujarat';

          return (
            <div className="mb-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '3px' }}>
                {comp.companyName}
              </h1>
              <div className="text-slate-800 text-[11px] leading-snug space-y-0.5 font-medium" style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600', lineHeight: '1.45' }}>
                {addressWithoutState.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
                {comp.phone && <div>Phone no. : {comp.phone}</div>}
                {comp.email && <div>Email : {comp.email}</div>}
                <div>GSTIN: {comp.gstin || 'N/A'} | PAN: {comp.pan || 'N/A'}</div>
                <div>{stateLine.startsWith('State:') ? stateLine : `State: ${stateLine}`}</div>
              </div>
            </div>
          );
        })()}

        <div className="border-t border-b border-slate-300 py-2 my-3 text-center" style={{ borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', paddingTop: '6px', paddingBottom: '6px', marginTop: '12px', marginBottom: '12px', textAlign: 'center' }}>
          {invoice.gstType === 'NON_GST' ? (
            <h2 className="text-sm font-extrabold uppercase" style={{ color: '#4c40aa', fontSize: '15px', fontWeight: '800', letterSpacing: '0.35em', margin: 0 }}>
              I N V O I C E
            </h2>
          ) : (
            <h2 className="text-sm font-extrabold uppercase" style={{ color: '#4c40aa', fontSize: '15px', fontWeight: '800', letterSpacing: '0.35em', margin: 0 }}>
              T A X &nbsp;&nbsp;&nbsp;&nbsp; I N V O I C E
            </h2>
          )}
        </div>

        {/* Bill To & Invoice Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              BILL TO
            </div>
            <div className="font-extrabold text-sm text-slate-900" style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              {client.companyName}
            </div>
            <div className="text-slate-600 whitespace-pre-line leading-snug mt-0.5 font-medium" style={{ color: '#475569', fontSize: '11px', whiteSpace: 'pre-line' }}>
              {client.address ? client.address.replace(/\\n/g, '\n') : ''}
            </div>
            <div className="mt-1 space-y-0.5 text-slate-700 font-medium" style={{ fontSize: '11px', color: '#334155' }}>
              {client.mobile && <div>Phone: <strong>{client.mobile}</strong></div>}
              <div>State: <strong>{client.gstin ? '24 - Gujarat' : 'Gujarat'}</strong></div>
            </div>
          </div>

          <div className="text-right flex flex-col justify-start items-end" style={{ textAlign: 'right' }}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 w-full text-right" style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              INVOICE DETAILS
            </div>
            <div className="w-56 space-y-1 text-slate-700" style={{ width: '220px', marginLeft: 'auto' }}>
              <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-slate-500" style={{ color: '#64748b' }}>Invoice No :</span>
                <strong className="font-bold text-slate-900 text-xs" style={{ color: '#0f172a', fontWeight: '700' }}>{invoice.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-slate-500" style={{ color: '#64748b' }}>Date :</span>
                <strong className="text-slate-900" style={{ color: '#0f172a' }}>{formatDate(invoice.date)}</strong>
              </div>
              <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-slate-500" style={{ color: '#64748b' }}>Place of Supply :</span>
                <strong className="text-slate-900" style={{ color: '#0f172a' }}>Gujarat</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4" style={{ marginBottom: '16px' }}>
          <table className="w-full text-left border-collapse" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#4c40aa', color: '#ffffff', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>
                <th className="p-2 w-10 text-center" style={{ padding: '8px', textAlign: 'center', width: '40px' }}>Sr.</th>
                <th className="p-2" style={{ padding: '8px', textAlign: 'left' }}>Item / Particulars</th>
                <th className="p-2 w-20 text-center" style={{ padding: '8px', textAlign: 'center', width: '80px' }}>HSN/SAC</th>
                <th className="p-2 w-16 text-center" style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Qty</th>
                <th className="p-2 w-16 text-center" style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Unit</th>
                <th className="p-2 w-24 text-right" style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Price/Unit</th>
                <th className="p-2 w-28 text-right" style={{ padding: '8px', textAlign: 'right', width: '100px' }}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium" style={{ fontSize: '11px', color: '#1e293b' }}>
              {invoice.items && invoice.items.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                  <td className="p-2 text-center text-slate-500" style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td className="p-2 font-bold text-slate-900" style={{ padding: '8px', fontWeight: '700', color: '#0f172a' }}>{item.description}</td>
                  <td className="p-2 text-center text-slate-500" style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{item.hsnSac && item.hsnSac !== '9988' ? item.hsnSac : '-'}</td>
                  <td className="p-2 text-center" style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                  <td className="p-2 text-center" style={{ padding: '8px', textAlign: 'center' }}>{item.unit}</td>
                  <td className="p-2 text-right" style={{ padding: '8px', textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                  <td className="p-2 text-right font-bold text-slate-900" style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr style={{ borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>
                <td colSpan={3} className="p-2 font-extrabold uppercase" style={{ padding: '8px', fontWeight: '800', textTransform: 'uppercase' }}>Total</td>
                <td className="p-2 text-center font-extrabold" style={{ padding: '8px', textAlign: 'center', fontWeight: '800' }}>{totalQuantity}</td>
                <td colSpan={2}></td>
                <td className="p-2 text-right font-extrabold text-sm" style={{ padding: '8px', textAlign: 'right', fontWeight: '800', fontSize: '13px' }}>{Number(invoice.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lower Summary Section (2 Columns) */}
        <div className="grid grid-cols-12 gap-6 my-4 text-xs" style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', margin: '16px 0' }}>
          {/* Left Column: Words & Terms */}
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5" style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Invoice Amount In Words
              </div>
              <div className="italic font-medium text-slate-800 text-xs" style={{ fontStyle: 'italic', fontWeight: '500', color: '#1e293b', fontSize: '11px' }}>
                {invoice.amountInWords}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5" style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Terms and Conditions
              </div>
              <div className="text-slate-700 font-medium" style={{ color: '#334155', fontSize: '11px', whiteSpace: 'pre-line' }}>
                {invoice.terms || comp.termsConditions || 'Thank you for doing business with us!'}
              </div>
            </div>
          </div>

          {/* Right Column: Financial Calculation */}
          <div className="space-y-1 text-xs" style={{ fontSize: '11px' }}>
            <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>Sub Total</span>
              <span className="font-bold text-slate-900" style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>Discount</span>
                <span className="font-bold text-rose-600" style={{ fontWeight: '700', color: '#e11d48' }}>- {formatCurrency(invoice.discount)}</span>
              </div>
            )}

            {invoice.gstType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>CGST ({invoice.gstRate / 2}%)</span>
                  <span className="font-bold text-slate-900" style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>SGST ({invoice.gstRate / 2}%)</span>
                  <span className="font-bold text-slate-900" style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.sgstAmount)}</span>
                </div>
              </>
            )}

            {invoice.gstType === 'IGST' && (
              <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>IGST ({invoice.gstRate}%)</span>
                <span className="font-bold text-slate-900" style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.igstAmount)}</span>
              </div>
            )}

            {/* Total Fill Banner */}
            <div style={{ backgroundColor: '#4c40aa', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '4px', fontWeight: '800', fontSize: '13px', margin: '6px 0' }}>
              <span>Total</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-600 font-medium" style={{ color: '#475569' }}>Amount Received</span>
              <span className="font-bold text-slate-900" style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(invoice.amountReceived)}</span>
            </div>

            <div className="flex justify-between py-1" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="text-rose-600 font-bold" style={{ color: '#e11d48', fontWeight: '700' }}>Balance Due</span>
              <span className="font-extrabold text-rose-600 text-sm" style={{ color: '#e11d48', fontWeight: '800', fontSize: '13px' }}>{formatCurrency(invoice.balanceDue)}</span>
            </div>

            {/* Authorized Signatory Box */}
            <div className="text-right pt-6" style={{ textAlign: 'right', paddingTop: '24px' }}>
              <div className="text-[11px] font-bold text-slate-900" style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                For : {comp.companyName}
              </div>
              <div className="h-12" style={{ height: '48px' }}></div>
              <div className="border-t border-slate-400 w-44 ml-auto pt-1 text-center font-bold text-slate-900 text-[11px]" style={{ borderTop: '1px solid #94a3b8', width: '176px', marginLeft: 'auto', paddingTop: '4px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#0f172a' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-[10px] text-slate-400 italic pt-3 border-t border-slate-100" style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
        This is a computer generated invoice and requires no physical signature.
      </div>
    </div>
  );
};
