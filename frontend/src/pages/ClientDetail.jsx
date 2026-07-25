import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Quote,
  ArrowLeft,
  IndianRupee,
  Clock,
  Plus,
  Eye
} from 'lucide-react';

export const ClientDetail = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/clients/${id}`);
      setClient(res);
    } catch (err) {
      console.error('Failed to load client profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  if (loading || !client) {
    return <div className="p-8 text-center text-slate-500">Loading client profile...</div>;
  }

  const invoices = client.invoices || [];
  const quotations = client.quotations || [];

  const totalBilled = invoices.reduce((a, b) => a + b.grandTotal, 0);
  const totalPaid = invoices.reduce((a, b) => a + b.amountReceived, 0);
  const totalOutstanding = invoices.reduce((a, b) => a + b.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients Directory</span>
        </Link>

        <div className="flex gap-2">
          <Link
            to={`/invoices/new?clientId=${client.id}`}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice for Client</span>
          </Link>
        </div>
      </div>

      {/* Client Profile Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg">
              {client.companyName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {client.companyName}
              </h2>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Contact Person: <span className="text-slate-900 dark:text-slate-200">{client.contactPerson}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-start gap-1.5 max-w-xl">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{client.address}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Billed</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(totalBilled)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Amount Paid</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Balance Due</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(totalOutstanding)}
              </div>
            </div>
          </div>
        </div>

        {/* Info Pills */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-brand-500" />
            <span>Mobile: <strong className="text-slate-900 dark:text-white">{client.mobile}</strong></span>
          </div>
          {client.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-brand-500" />
              <span>Email: <strong className="text-slate-900 dark:text-white">{client.email}</strong></span>
            </div>
          )}
          {client.gstin && (
            <div>
              GSTIN: <strong className="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{client.gstin}</strong>
            </div>
          )}
          {client.pan && (
            <div>
              PAN: <strong className="font-mono text-slate-900 dark:text-white">{client.pan}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <span>Invoice History ({invoices.length})</span>
        </h3>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No invoices created for this client yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3 px-3">Invoice No</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">GST Type</th>
                  <th className="pb-3 px-3 text-right">Grand Total</th>
                  <th className="pb-3 px-3 text-right">Balance Due</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                  <th className="pb-3 px-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(inv.date)}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{inv.gstType?.replace('_', ' + ')}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(inv.grandTotal)}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(inv.balanceDue)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link to={`/invoices/${inv.id}`} className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-brand-500 inline-flex">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quotation History */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Quote className="w-5 h-5 text-indigo-500" />
          <span>Quotation History ({quotations.length})</span>
        </h3>

        {quotations.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No quotations created for this client yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3 px-3">Quotation No</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3 text-right">Estimated Total</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{q.quotationNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(q.date)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(q.grandTotal)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeClass(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
