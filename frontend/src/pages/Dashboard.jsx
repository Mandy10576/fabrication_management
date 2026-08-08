import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { StatCard } from '../components/StatCard';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  IndianRupee,
  Clock,
  Plus,
  ArrowUpRight,
  Eye,
  TrendingUp,
  Receipt,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  borderRadius: 12,
  border: '1px solid #1e293b',
  color: '#fff',
  fontSize: 12,
  padding: '8px 12px',
};

/** Short axis labels (₹1.2L / ₹85k) — full rupee values overflow the Y axis. */
const compactAmount = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${Math.round(n / 1e3)}k`;
  return `₹${n}`;
};

export const Dashboard = () => {
  const { selectedFY, activeFYObj } = useFY();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/stats?financialYearId=${selectedFY}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedFY]);

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading dashboard">
        <div className="skeleton h-28 sm:h-32 rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
        <span className="sr-only">Loading dashboard analytics…</span>
      </div>
    );
  }

  const { summary, monthlyAnalytics, paymentBreakdown, recentInvoices } = data;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 text-white shadow-pop">
        <div className="min-w-0">
          <span className="inline-block px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2">
            Overview • FY {activeFYObj ? activeFYObj.year : 'All Years'}
          </span>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
            Fabrication Business Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl">
            Real-time financial analytics, client revenue metrics, pending balance tracking, and GST bill insights.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:flex gap-2 shrink-0">
          <Link to="/invoices/new" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>

          <Link
            to="/quotations/new"
            className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </Link>
        </div>
      </div>

      {/* Primary Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue (Billed)"
          value={formatCurrency(summary.totalRevenue)}
          subtitle={`Collected: ${formatCurrency(summary.amountReceivedTotal)}`}
          icon={IndianRupee}
          color="emerald"
          badgeText="Financial Year Revenue"
        />

        <StatCard
          title="Pending Payments"
          value={formatCurrency(summary.pendingPayments)}
          subtitle="Outstanding balances due"
          icon={Clock}
          color="rose"
          badgeText="Balance Due"
        />

        <StatCard
          title="Total Invoices"
          value={summary.totalInvoices}
          subtitle={`GST: ${summary.gstBillsCount} | Non-GST: ${summary.nonGstBillsCount}`}
          icon={FileText}
          color="brand"
          badgeText="Generated Invoices"
        />

        <StatCard
          title="Total Clients"
          value={summary.totalClients}
          subtitle="Registered clients in FY"
          icon={Users}
          color="purple"
          badgeText="Active Client Base"
        />
      </div>

      {/* Secondary GST / Non-GST Summary Pill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {[
          {
            icon: Receipt,
            label: 'GST Bills Overview',
            amount: summary.gstBillsAmount,
            count: summary.gstBillsCount,
            note: 'CGST / SGST / IGST',
            chip: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
            accent: 'text-indigo-600 dark:text-indigo-400',
          },
          {
            icon: Layers,
            label: 'Non-GST Bills Overview',
            amount: summary.nonGstBillsAmount,
            count: summary.nonGstBillsCount,
            note: 'Direct Retail / Job Work',
            chip: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            accent: 'text-amber-600 dark:text-amber-400',
          },
        ].map(({ icon: Icon, label, amount, count, note, chip, accent }) => (
          <div key={label} className="card p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 ${chip}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 break-words">
                  {formatCurrency(amount)}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-bold ${accent}`}>{count} Bills</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Monthly Revenue Chart */}
        <div className="card card-pad lg:col-span-2 min-w-0">
          <div className="mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500 shrink-0" />
              <span>Monthly Billing vs Collection</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Revenue generated vs actual payments received by month
            </p>
          </div>

          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAnalytics} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={compactAmount}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#94a3b820' }} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                <Bar dataKey="revenue" name="Total Billed" fill="#0c8de4" radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Bar dataKey="received" name="Amount Received" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Breakdown */}
        <div className="card card-pad flex flex-col min-w-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Payment Status Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
              Distribution of Paid, Partial, and Unpaid invoices
            </p>

            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, item) => [`${value} Invoices (${formatCurrency(item.payload.amount)})`, name]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <dl className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            {paymentBreakdown.map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                <dt className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                </dt>
                <dd className="font-bold text-slate-900 dark:text-white text-right shrink-0">
                  {item.value}
                  <span className="font-medium text-slate-500 dark:text-slate-400"> · {formatCurrency(item.amount)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Invoices
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Latest transactions for FY {activeFYObj ? activeFYObj.year : 'All Years'}
            </p>
          </div>
          <Link
            to="/invoices"
            className="btn btn-sm btn-ghost text-brand-600 dark:text-brand-400 shrink-0"
          >
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No invoices found for this financial year.
            </p>
          </div>
        ) : (
          <>
            {/* Card view up to xl */}
            <ul className="xl:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {recentInvoices.map((inv) => (
                <li key={inv.id} className="p-4 space-y-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                        {inv.client?.companyName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(inv.date)} · {inv.gstType?.replace('_', ' + ')}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </span>
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        Due {formatCurrency(inv.balanceDue)}
                      </span>
                    </div>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="btn-icon btn-icon-soft shrink-0"
                      aria-label={`View invoice ${inv.invoiceNumber}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden xl:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice No</th>
                    <th scope="col">Client Company</th>
                    <th scope="col">Date</th>
                    <th scope="col">GST Type</th>
                    <th scope="col" className="text-right">Grand Total</th>
                    <th scope="col" className="text-right">Balance Due</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-brand-500 transition-colors">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-slate-800 dark:text-slate-200 max-w-[18rem]">
                        <span className="line-clamp-2">{inv.client?.companyName}</span>
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
                            title="View Invoice"
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
    </div>
  );
};
