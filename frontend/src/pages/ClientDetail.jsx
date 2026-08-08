import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Quote,
  ArrowLeft,
  Plus,
  Eye
} from 'lucide-react';

export const ClientDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/clients/${id}`);
      setClient(res);
    } catch (err) {
      console.error('Failed to load client profile:', err);
      setFailed(true);
      toast.error(err.message || 'Failed to load client profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading client">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-44 rounded-3xl" />
        <div className="skeleton h-64 rounded-2xl" />
        <span className="sr-only">Loading client profile…</span>
      </div>
    );
  }

  // The old version rendered the loading text forever when the request failed.
  if (failed || !client) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Client not found</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This client may have been deleted, or the link is no longer valid.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-5">
          <Link to="/clients" className="btn btn-secondary">Back to Clients</Link>
          <button onClick={fetchClientDetails} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const invoices = client.invoices || [];
  const quotations = client.quotations || [];

  const totalBilled = invoices.reduce((a, b) => a + b.grandTotal, 0);
  const totalPaid = invoices.reduce((a, b) => a + b.amountReceived, 0);
  const totalOutstanding = invoices.reduce((a, b) => a + b.balanceDue, 0);

  const stats = [
    { label: 'Total Billed', value: totalBilled, cls: 'text-slate-900 dark:text-white' },
    { label: 'Amount Paid', value: totalPaid, cls: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Balance Due', value: totalOutstanding, cls: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back + primary action */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <Link to="/clients" className="btn btn-sm btn-ghost self-start -ml-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients</span>
        </Link>

        <Link to={`/invoices/new?clientId=${client.id}`} className="btn btn-primary w-full xs:w-auto">
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Link>
      </div>

      {/* Profile */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-brand-600/25">
              {client.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="page-title break-words">{client.companyName}</h2>
              {client.contactPerson && (
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Contact: <span className="font-semibold text-slate-800 dark:text-slate-200">{client.contactPerson}</span>
                </div>
              )}
              {client.address && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-start gap-1.5 max-w-xl">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words">{client.address}</span>
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 shrink-0">
            {stats.map(({ label, value, cls }) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className={`text-xs sm:text-sm font-bold mt-1 break-words ${cls}`}>{formatCurrency(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Contact details */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-5 gap-y-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
          {client.mobile && (
            <a href={`tel:${client.mobile}`} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              <Phone className="w-4 h-4 text-brand-500 shrink-0" />
              <strong className="text-slate-900 dark:text-white font-mono">{client.mobile}</strong>
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 min-w-0 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              <Mail className="w-4 h-4 text-brand-500 shrink-0" />
              <strong className="text-slate-900 dark:text-white truncate">{client.email}</strong>
            </a>
          )}
          {client.gstin && (
            <div className="flex items-center gap-1.5">
              <span>GSTIN</span>
              <strong className="badge badge-neutral font-mono normal-case">{client.gstin}</strong>
            </div>
          )}
          {client.pan && (
            <div className="flex items-center gap-1.5">
              <span>PAN</span>
              <strong className="badge badge-neutral font-mono normal-case">{client.pan}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500 shrink-0" />
          <span>Invoice History ({invoices.length})</span>
        </h3>

        {invoices.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">No invoices created for this client yet.</p>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <li key={inv.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/invoices/${inv.id}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                      #{inv.invoiceNumber}
                    </Link>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDate(inv.date)} · {inv.gstType?.replace('_', ' + ')}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 mt-1.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </span>
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Due {formatCurrency(inv.balanceDue)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${getStatusBadgeClass(inv.status)}`}>{inv.status}</span>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="btn-icon btn-icon-soft"
                      aria-label={`View invoice ${inv.invoiceNumber}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice No</th>
                    <th scope="col">Date</th>
                    <th scope="col">GST Type</th>
                    <th scope="col" className="text-right">Grand Total</th>
                    <th scope="col" className="text-right">Balance Due</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-brand-500 transition-colors">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {inv.gstType?.replace('_', ' + ')}
                      </td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(inv.balanceDue)}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getStatusBadgeClass(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="btn-icon btn-icon-soft hover:text-brand-500"
                            aria-label={`View invoice ${inv.invoiceNumber}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Quotation history */}
      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Quote className="w-5 h-5 text-indigo-500 shrink-0" />
          <span>Quotation History ({quotations.length})</span>
        </h3>

        {quotations.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">No quotations created for this client yet.</p>
        ) : (
          <>
            <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map((q) => (
                <li key={q.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">#{q.quotationNumber}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(q.date)}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      {formatCurrency(q.grandTotal)}
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${getStatusBadgeClass(q.status)}`}>{q.status}</span>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Quotation No</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="text-right">Estimated Total</th>
                    <th scope="col" className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{q.quotationNumber}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(q.date)}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getStatusBadgeClass(q.status)}`}>{q.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
