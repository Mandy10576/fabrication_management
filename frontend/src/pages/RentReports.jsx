import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { BarChart3, FileSpreadsheet, FileText } from 'lucide-react';

const cycleLabel = (c) => (c ? `${formatDate(c.cycleStart)} – ${formatDate(c.cycleEnd)}` : '—');

export const RentReports = () => {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [collection, dashboard] = await Promise.all([
        api.get('/rent/collection?status=ALL'),
        api.get('/rent/dashboard')
      ]);
      setRows(collection);
      setStats(dashboard);
    } catch (err) {
      toast.error(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportToExcel = () => {
    if (rows.length === 0) {
      toast.warning('There are no records to export.');
      return;
    }

    const data = rows.map((r) => ({
      'Property': r.room.property.name,
      'City': r.room.property.city,
      'Room': r.room.roomNumber,
      'Tenant': r.tenant.name,
      'Mobile': r.tenant.mobile,
      'Monthly Rent (₹)': r.monthlyRent,
      'Rent Start': formatDate(r.startDate),
      'Current Cycle': cycleLabel(r.currentCycle),
      'Paid This Cycle (₹)': r.currentCycle?.paid || 0,
      'Pending This Cycle (₹)': r.currentCycle?.pending || 0,
      'Total Pending (₹)': r.totalPending,
      'Status': r.currentCycle?.status || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rent Collection Report');
    XLSX.writeFile(workbook, `Rent_Collection_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${rows.length} records to Excel`);
  };

  const overviewCards = stats ? [
    { label: 'Expected Rent (This Cycle)', value: stats.expectedRent, note: `${stats.activeContractCount} active contracts`, valueClass: 'text-slate-900 dark:text-white', noteClass: 'text-slate-400' },
    { label: 'Collected (This Cycle)', value: stats.collectedRent, note: 'Payments received this cycle', valueClass: 'text-emerald-600 dark:text-emerald-400', noteClass: 'text-emerald-500' },
    { label: 'Total Rent Pending', value: stats.pendingRent, note: 'Across all cycles, all rooms', valueClass: 'text-rose-600 dark:text-rose-400', noteClass: 'text-rose-500' },
    { label: 'Electricity Pending', value: stats.electricity.pendingAmount, note: `${stats.electricity.pendingCount} unpaid bill(s)`, valueClass: 'text-amber-600 dark:text-amber-400', noteClass: 'text-amber-500' },
  ] : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Reports</span>
          </h2>
          <p className="page-subtitle">Rent collection summary across every property</p>
        </div>
        <button onClick={exportToExcel} className="btn btn-emerald w-full sm:w-auto shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {(loading ? [1, 2, 3, 4] : overviewCards).map((card, i) => (
          <div key={loading ? i : card.label} className="card p-4 sm:p-5">
            {loading ? (
              <>
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-6 w-28 rounded mt-2" />
              </>
            ) : (
              <>
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</div>
                <div className={`text-lg sm:text-xl font-bold mt-1.5 break-words leading-tight ${card.valueClass}`}>{formatCurrency(card.value)}</div>
                <div className={`text-[11px] mt-1.5 ${card.noteClass}`}>{card.note}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          Rent Ledger
          <span className="font-medium text-slate-500 dark:text-slate-400"> ({rows.length} active contracts)</span>
        </h3>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No active contracts yet</div>
          </div>
        ) : (
          <>
            <ul className="xl:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <li key={r.contractId} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{r.tenant.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.room.property.name} · {r.room.roomNumber}</div>
                    </div>
                    {r.currentCycle && <span className={`badge shrink-0 ${getStatusBadgeClass(r.currentCycle.status)}`}>{r.currentCycle.status}</span>}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                    <div><dt className="text-[10px] uppercase font-bold text-slate-400">Rent</dt><dd className="text-xs font-semibold">{formatCurrency(r.monthlyRent)}</dd></div>
                    <div><dt className="text-[10px] uppercase font-bold text-slate-400">Paid</dt><dd className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.currentCycle?.paid || 0)}</dd></div>
                    <div><dt className="text-[10px] uppercase font-bold text-slate-400">Pending</dt><dd className="text-xs font-bold text-rose-600 dark:text-rose-400">{formatCurrency(r.totalPending)}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden xl:block table-wrap max-h-[70vh] overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Property / Room</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Current Cycle</th>
                    <th scope="col" className="text-right">Rent</th>
                    <th scope="col" className="text-right">Paid</th>
                    <th scope="col" className="text-right">Total Pending</th>
                    <th scope="col" className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.contractId}>
                      <td className="text-slate-800 dark:text-slate-200 whitespace-nowrap">{r.room.property.name} · {r.room.roomNumber}</td>
                      <td className="font-semibold text-slate-900 dark:text-white">{r.tenant.name}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{cycleLabel(r.currentCycle)}</td>
                      <td className="text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.monthlyRent)}</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">{formatCurrency(r.currentCycle?.paid || 0)}</td>
                      <td className={`text-right font-bold whitespace-nowrap ${r.totalPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(r.totalPending)}</td>
                      <td className="text-center">{r.currentCycle && <span className={`badge ${getStatusBadgeClass(r.currentCycle.status)}`}>{r.currentCycle.status}</span>}</td>
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
