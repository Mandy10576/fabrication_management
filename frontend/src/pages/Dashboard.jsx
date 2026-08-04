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
  CheckCircle2,
  FileCheck2,
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
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading dashboard analytics...
      </div>
    );
  }

  const { summary, monthlyAnalytics, paymentBreakdown, gstBreakdown, recentInvoices } = data;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white shadow-xl">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            Overview • FY {activeFYObj ? activeFYObj.year : 'All Years'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Fabrication Business Dashboard
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-1 max-w-xl">
            Real-time financial analytics, client revenue metrics, pending balance tracking, and GST bill insights.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/invoices/new"
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>

          <Link
            to="/quotations/new"
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                GST Bills Overview
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(summary.gstBillsAmount)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {summary.gstBillsCount} Bills
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400">CGST/SGST/IGST</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Non-GST Bills Overview
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(summary.nonGstBillsAmount)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
              {summary.nonGstBillsCount} Bills
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400">Direct Retail / Job Work</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                <span>Monthly Billing vs Collection</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Revenue generated vs actual payments received by month
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                <Bar dataKey="revenue" name="Total Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Amount Received" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Breakdown */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
              Payment Status Breakdown
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4">
              Distribution of Paid, Partial, and Unpaid invoices
            </p>

            <div className="h-48 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, item) => [`${value} Invoices (${formatCurrency(item.payload.amount)})`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            {paymentBreakdown.map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.value} ({formatCurrency(item.amount)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Invoices
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Latest transactions recorded for FY {activeFYObj ? activeFYObj.year : ''}
            </p>
          </div>
          <Link
            to="/invoices"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Recent Invoices Cards (< md screens) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {recentInvoices.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No invoices found for this financial year.
            </div>
          ) : (
            recentInvoices.map((inv) => (
              <div key={inv.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Link to={`/invoices/${inv.id}`} className="font-bold text-xs text-brand-600 dark:text-brand-400 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {inv.client?.companyName}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getStatusBadgeClass(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{formatDate(inv.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(inv.grandTotal)}</span>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Invoice No</th>
                <th className="pb-3 px-3">Client Company</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">GST Type</th>
                <th className="pb-3 px-3 text-right">Grand Total</th>
                <th className="pb-3 px-3 text-right">Balance Due</th>
                <th className="pb-3 px-3 text-center">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No invoices found for this financial year.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                      {inv.client?.companyName}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {inv.gstType?.replace('_', ' + ')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500 inline-flex items-center"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
