import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';

export const InvoiceTemplate = ({ invoice, company, id = "printable-invoice" }) => {
  if (!invoice) return null;

  const comp = company || invoice.company || {
    companyName: 'Khodiyar Steel Fabrication',
    ownerName: 'Owner Name',
    gstin: 'N/A',
    pan: 'N/A',
    email: 'khodiyarsteelandfabrication@gmail.com',
    phone: '9825534229 / 8128209488',
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = invoice.client || {};

  // Total quantity calculation
  const totalQuantity = invoice.items ? invoice.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

  return (
    <div
      id={id}
      className="a4-page bg-white text-slate-900 p-8 shadow-2xl rounded-xl max-w-[210mm] mx-auto text-xs leading-relaxed font-sans border border-slate-200 relative flex flex-col justify-between"
      style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
    >
      <div>
        {/* Company Header */}
        <div className="mb-3">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {comp.companyName}
          </h1>
          <div className="text-slate-600 text-[11px] leading-tight space-y-0.5 mt-1 font-normal">
            <p>{comp.address}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-700 font-medium pt-0.5">
              {comp.phone && <span>Phone no. : <strong>{comp.phone}</strong></span>}
              {comp.email && <span>Email : <strong>{comp.email}</strong></span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-600">
              <span>GSTIN: <strong>{comp.gstin || 'N/A'}</strong></span>
              <span>|</span>
              <span>PAN: <strong>{comp.pan || 'N/A'}</strong></span>
              <span>|</span>
              <span>State: <strong>Gujarat</strong></span>
            </div>
          </div>
        </div>

        {/* TAX INVOICE Header Banner */}
        <div className="border-t border-b border-slate-300 py-1.5 my-3 text-center">
          <h2 className="text-sm font-extrabold tracking-[0.35em] text-[#4c40aa] uppercase">
            {invoice.gstType === 'NON_GST' ? 'I N V O I C E' : 'T A X   I N V O I C E'}
          </h2>
        </div>

        {/* Bill To & Invoice Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              BILL TO
            </div>
            <div className="font-extrabold text-sm text-slate-900">{client.companyName}</div>
            <div className="text-slate-600 whitespace-pre-line leading-snug mt-0.5 font-medium">
              {client.address}
            </div>
            <div className="mt-1 space-y-0.5 text-slate-700 font-medium">
              {client.mobile && <div>Phone: <strong>{client.mobile}</strong></div>}
              <div>State: <strong>{client.gstin ? '24 - Gujarat' : 'Gujarat'}</strong></div>
            </div>
          </div>

          <div className="text-right flex flex-col justify-start items-end">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 w-full text-right">
              INVOICE DETAILS
            </div>
            <div className="w-56 space-y-1 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Invoice No :</span>
                <strong className="font-bold text-slate-900 text-xs">{invoice.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date :</span>
                <strong className="text-slate-900">{formatDate(invoice.date)}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Place of Supply :</span>
                <strong className="text-slate-900">Gujarat</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#4c40aa] text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="p-2 w-10 text-center">Sr.</th>
                <th className="p-2">Item / Particulars</th>
                <th className="p-2 w-20 text-center">HSN/SAC</th>
                <th className="p-2 w-16 text-center">Qty</th>
                <th className="p-2 w-16 text-center">Unit</th>
                <th className="p-2 w-24 text-right">Price/Unit</th>
                <th className="p-2 w-28 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {invoice.items && invoice.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : ''}>
                  <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-2 font-bold text-slate-900">{item.description}</td>
                  <td className="p-2 text-center text-slate-500">{item.hsnSac && item.hsnSac !== '9988' ? item.hsnSac : '-'}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-center">{item.unit}</td>
                  <td className="p-2 text-right">{Number(item.rate).toFixed(2)}</td>
                  <td className="p-2 text-right font-bold text-slate-900">{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr className="border-t-2 border-b-2 border-slate-300 font-bold text-slate-900 text-xs">
                <td colSpan={3} className="p-2 font-extrabold uppercase">Total</td>
                <td className="p-2 text-center font-extrabold">{totalQuantity}</td>
                <td colSpan={2}></td>
                <td className="p-2 text-right font-extrabold text-sm">{Number(invoice.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lower Summary Section (2 Columns) */}
        <div className="grid grid-cols-12 gap-6 my-4 text-xs">
          {/* Left Column: Words & Terms */}
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Invoice Amount In Words
              </div>
              <div className="italic font-medium text-slate-800 text-xs">
                {invoice.amountInWords}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Terms and Conditions
              </div>
              <div className="text-slate-700 font-medium">
                {invoice.terms || comp.termsConditions || 'Thank you for doing business with us!'}
              </div>
            </div>
          </div>

          {/* Right Column: Financial Calculation */}
          <div className="col-span-5 space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Sub Total</span>
              <span className="font-bold text-slate-900">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Discount</span>
                <span className="font-bold text-rose-600">- {formatCurrency(invoice.discount)}</span>
              </div>
            )}

            {invoice.gstType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">CGST ({invoice.gstRate / 2}%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">SGST ({invoice.gstRate / 2}%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.sgstAmount)}</span>
                </div>
              </>
            )}

            {invoice.gstType === 'IGST' && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">IGST ({invoice.gstRate}%)</span>
                <span className="font-bold text-slate-900">{formatCurrency(invoice.igstAmount)}</span>
              </div>
            )}

            {/* Total Fill Banner */}
            <div className="bg-[#4c40aa] text-white flex justify-between items-center p-2.5 rounded font-extrabold text-sm my-1 shadow-sm">
              <span>Total</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Amount Received</span>
              <span className="font-bold text-slate-900">{formatCurrency(invoice.amountReceived)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-rose-600 font-bold">Balance Due</span>
              <span className="font-extrabold text-rose-600 text-sm">{formatCurrency(invoice.balanceDue)}</span>
            </div>

            {/* Authorized Signatory Box */}
            <div className="text-right pt-6">
              <div className="text-[11px] font-bold text-slate-900">
                For : {comp.companyName}
              </div>
              <div className="h-12"></div>
              <div className="border-t border-slate-400 w-44 ml-auto pt-1 text-center font-bold text-slate-900 text-[11px]">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-[10px] text-slate-400 italic pt-3 border-t border-slate-100">
        This is a computer generated invoice and requires no physical signature.
      </div>
    </div>
  );
};
