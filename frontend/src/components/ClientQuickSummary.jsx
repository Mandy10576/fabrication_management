import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Phone,
  MapPin,
  FileText,
  Wallet,
  Quote,
  Building2,
  ExternalLink,
  History
} from 'lucide-react';

const MiniStat = ({ label, value, cls }) => (
  <div className="min-w-0">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`text-xs sm:text-sm font-bold mt-0.5 truncate ${cls}`}>{formatCurrency(value)}</div>
  </div>
);

const SummarySection = ({ icon: Icon, title, count, children }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{title}{typeof count === 'number' ? ` (${count})` : ''}</span>
    </div>
    {children}
  </div>
);

/**
 * Compact client history preview shown on the invoice form right after a
 * client is picked. Reads from the same records the Client Detail page and
 * Dashboard already aggregate (via GET /clients/:id/summary) — it doesn't
 * introduce any new source of truth for billing totals or payment status.
 */
export const ClientQuickSummary = ({ clientId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setSummary(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api.get(`/clients/${clientId}/summary`)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;

  if (loading && !summary) {
    return (
      <div className="card card-pad mt-4 space-y-3" role="status" aria-label="Loading client summary">
        <div className="skeleton h-5 w-40 rounded-lg" />
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    );
  }

  if (failed || !summary) return null;

  const { client, totals, recentInvoices, invoiceCount, recentPayments, paymentCount,
    recentQuotations, quotationCount, projects, lastTransaction } = summary;

  const isNewClient = invoiceCount === 0 && paymentCount === 0 && quotationCount === 0 && projects.length === 0;

  return (
    <div className="card card-pad mt-4">
      {/* Header: identity + view full history */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
            {client.companyName?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{client.companyName}</div>
            {client.contactPerson && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{client.contactPerson}</div>
            )}
          </div>
        </div>

        <Link
          to={`/clients/${client.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-secondary shrink-0"
          title="Opens in a new tab so this invoice draft isn't lost"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">View Full History</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Contact line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-600 dark:text-slate-400">
        {client.mobile && (
          <a href={`tel:${client.mobile}`} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400">
            <Phone className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="font-mono font-semibold">{client.mobile}</span>
          </a>
        )}
        {client.address && (
          <span className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[16rem]">{client.address}</span>
          </span>
        )}
        {client.gstin && (
          <span className="badge badge-neutral font-mono normal-case">{client.gstin}</span>
        )}
      </div>

      {isNewClient ? (
        <p className="text-xs text-slate-400 italic mt-4">
          No prior invoices, payments, quotations, or projects — this will be their first record.
        </p>
      ) : (
        <>
          {/* Billing totals */}
          <div className="grid grid-cols-3 gap-3 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <MiniStat label="Total Billed" value={totals.totalBilled} cls="text-slate-900 dark:text-white" />
            <MiniStat label="Received" value={totals.totalReceived} cls="text-emerald-600 dark:text-emerald-400" />
            <MiniStat label="Outstanding" value={totals.totalOutstanding} cls="text-rose-600 dark:text-rose-400" />
          </div>

          {lastTransaction && (
            <p className="text-[11px] text-slate-400 mt-2">
              Last transaction: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatDate(lastTransaction.date)}</span>
              {' · '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(lastTransaction.amount)}</span>
              {' '}({lastTransaction.type === 'PAYMENT' ? 'Payment' : 'Invoice'})
            </p>
          )}

          {/* Recent activity grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <SummarySection icon={FileText} title="Recent Invoices" count={invoiceCount}>
              {recentInvoices.length === 0 ? (
                <p className="text-xs text-slate-400">None yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentInvoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">#{inv.invoiceNumber}</span>
                        <span className="text-slate-400"> · {formatDate(inv.date)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(inv.grandTotal)}</span>
                        <span className={`badge ${getStatusBadgeClass(inv.status)}`}>{inv.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SummarySection>

            <SummarySection icon={Wallet} title="Recent Payments" count={paymentCount}>
              {recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400">None yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
                        {formatDate(p.paymentDate)} · {p.paymentMode?.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SummarySection>

            <SummarySection icon={Quote} title="Recent Quotations" count={quotationCount}>
              {recentQuotations.length === 0 ? (
                <p className="text-xs text-slate-400">None yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentQuotations.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">#{q.quotationNumber}</span>
                        <span className="text-slate-400"> · {formatDate(q.date)}</span>
                      </span>
                      <span className={`badge shrink-0 ${getStatusBadgeClass(q.status)}`}>{q.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SummarySection>

            <SummarySection icon={Building2} title="Projects / Sites" count={projects.length}>
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400">None yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {projects.slice(0, 6).map((p) => (
                    <span key={p.id} className={`badge ${getStatusBadgeClass(p.status)}`} title={p.siteAddress}>
                      {p.name}
                    </span>
                  ))}
                  {projects.length > 6 && (
                    <span className="badge badge-neutral">+{projects.length - 6} more</span>
                  )}
                </div>
              )}
            </SummarySection>
          </div>
        </>
      )}
    </div>
  );
};
