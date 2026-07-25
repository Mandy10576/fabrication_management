import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';

export const QuotationTemplate = ({ quotation, company, id = "printable-quotation" }) => {
  if (!quotation) return null;

  const comp = company || quotation.company || {
    companyName: 'Khodiyar Steel Fabrication',
    address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
    phone: '9825534229 / 8128209488',
    email: 'khodiyarsteelandfabrication@gmail.com',
    termsConditions: 'Thank you for doing business with us!'
  };

  const client = quotation.client || {};
  const totalQuantity = quotation.items ? quotation.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

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
              <span>State: <strong>Gujarat</strong></span>
            </div>
          </div>
        </div>

        {/* QUOTATION Header Banner */}
        <div className="border-t border-b border-slate-300 py-1.5 my-3 text-center">
          <h2 className="text-sm font-extrabold tracking-[0.35em] text-[#4c40aa] uppercase">
            Q U O T A T I O N
          </h2>
        </div>

        {/* Bill To & Quotation Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              PREPARED FOR
            </div>
            <div className="font-extrabold text-sm text-slate-900">{client.companyName}</div>
            <div className="text-slate-600 whitespace-pre-line leading-snug mt-0.5 font-medium">
              {client.address}
            </div>
            <div className="mt-1 space-y-0.5 text-slate-700 font-medium">
              {client.mobile && <div>Phone: <strong>{client.mobile}</strong></div>}
            </div>
          </div>

          <div className="text-right flex flex-col justify-start items-end">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 w-full text-right">
              QUOTATION DETAILS
            </div>
            <div className="w-56 space-y-1 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Quote No :</span>
                <strong className="font-bold text-slate-900 text-xs">{quotation.quotationNumber}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date :</span>
                <strong className="text-slate-900">{formatDate(quotation.date)}</strong>
              </div>
              {quotation.validUntil && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Valid Until :</span>
                  <strong className="text-slate-900">{formatDate(quotation.validUntil)}</strong>
                </div>
              )}
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
              {quotation.items && quotation.items.map((item, idx) => (
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
            <tfoot>
              <tr className="border-t-2 border-b-2 border-slate-300 font-bold text-slate-900 text-xs">
                <td colSpan={3} className="p-2 font-extrabold uppercase">Total</td>
                <td className="p-2 text-center font-extrabold">{totalQuantity}</td>
                <td colSpan={2}></td>
                <td className="p-2 text-right font-extrabold text-sm">{Number(quotation.subtotal).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lower Summary */}
        <div className="grid grid-cols-12 gap-6 my-4 text-xs">
          <div className="col-span-7 space-y-4">
            {quotation.notes && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                  Scope / Notes
                </div>
                <div className="text-slate-700 font-medium">{quotation.notes}</div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Terms and Conditions
              </div>
              <div className="text-slate-700 font-medium">
                {quotation.terms || comp.termsConditions || 'Thank you for doing business with us!'}
              </div>
            </div>
          </div>

          <div className="col-span-5 space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Sub Total</span>
              <span className="font-bold text-slate-900">{formatCurrency(quotation.subtotal)}</span>
            </div>

            {quotation.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Discount</span>
                <span className="font-bold text-rose-600">- {formatCurrency(quotation.discount)}</span>
              </div>
            )}

            <div className="bg-[#4c40aa] text-white flex justify-between items-center p-2.5 rounded font-extrabold text-sm my-1 shadow-sm">
              <span>Estimated Total</span>
              <span>{formatCurrency(quotation.grandTotal)}</span>
            </div>

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

      <div className="mt-8 text-center text-[10px] text-slate-400 italic pt-3 border-t border-slate-100">
        This is a computer generated quotation and requires no physical signature.
      </div>
    </div>
  );
};
