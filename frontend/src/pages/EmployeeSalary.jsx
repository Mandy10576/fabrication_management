import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getStatusBadgeClass } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { Wallet, Search, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';

const STATUS_FILTER_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ALL', label: 'All' },
];

const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const shiftMonthStr = (monthStr, delta) => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const EmployeeSalary = () => {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthStr());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/salary?month=${month}&status=${status}&search=${encodeURIComponent(search)}`);
      setRows(res.rows || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load salary report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, status, search]);

  const totals = rows.reduce(
    (acc, r) => ({
      earned: acc.earned + r.earned,
      netPayable: acc.netPayable + r.netPayable,
      paidSoFar: acc.paidSoFar + r.paidSoFar,
      balance: acc.balance + Math.max(0, r.balance),
    }),
    { earned: 0, netPayable: 0, paidSoFar: 0, balance: 0 }
  );

  const exportToExcel = () => {
    if (rows.length === 0) {
      toast.warning('There are no records to export.');
      return;
    }
    const data = rows.map((r) => ({
      'Employee': r.name,
      'Mobile': r.mobile,
      'Cycle Start': new Date(r.cycleStart).toISOString().split('T')[0],
      'Cycle End': new Date(r.cycleEnd).toISOString().split('T')[0],
      'Earned Salary (₹)': r.earned,
      'Advances Deducted (₹)': r.advancesInCycle,
      'Net Payable (₹)': r.netPayable,
      'Paid So Far (₹)': r.paidSoFar,
      'Balance (₹)': r.balance,
      'Status': r.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
    XLSX.writeFile(workbook, `Salary_Report_${month}.xlsx`);
    toast.success(`Exported ${rows.length} records to Excel`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Salary</span>
          </h2>
          <p className="page-subtitle">Salary cycle summary and payment status for every employee</p>
        </div>
        <button onClick={exportToExcel} className="btn btn-secondary w-full sm:w-auto shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Earned" value={totals.earned} valueClass="text-slate-900 dark:text-white" />
        <StatCard label="Total Net Payable" value={totals.netPayable} valueClass="text-slate-900 dark:text-white" />
        <StatCard label="Total Paid" value={totals.paidSoFar} valueClass="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Total Balance Due" value={totals.balance} valueClass="text-rose-600 dark:text-rose-400" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-field flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search employees"
            placeholder="Search name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonthStr(m, -1))} className="btn-icon btn-icon-soft" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input font-semibold" />
          <button
            onClick={() => setMonth((m) => shiftMonthStr(m, 1))}
            disabled={month >= currentMonthStr()}
            className="btn-icon btn-icon-soft disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="sm:w-40">
          <SearchableSelect
            mode="button"
            value={status}
            options={STATUS_FILTER_OPTIONS}
            onSelect={(opt) => setStatus(opt.value)}
            ariaLabel="Filter by status"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No employees found</div>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <li key={r.employeeId} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/employees/${r.employeeId}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                      {r.name}
                    </Link>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(r.netPayable)}</span>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Due {formatCurrency(Math.max(0, r.balance))}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col" className="text-right">Earned</th>
                    <th scope="col" className="text-right">Advances</th>
                    <th scope="col" className="text-right">Net Payable</th>
                    <th scope="col" className="text-right">Paid</th>
                    <th scope="col" className="text-right">Balance</th>
                    <th scope="col" className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/employees/${r.employeeId}`} className="hover:text-brand-500 transition-colors">{r.name}</Link>
                      </td>
                      <td className="text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.earned)}</td>
                      <td className="text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatCurrency(r.advancesInCycle)}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(r.netPayable)}</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(r.paidSoFar)}</td>
                      <td className="text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(Math.max(0, r.balance))}</td>
                      <td className="text-center"><span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span></td>
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

const StatCard = ({ label, value, valueClass }) => (
  <div className="card card-pad">
    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`text-lg sm:text-xl font-extrabold mt-1 break-words ${valueClass}`}>{formatCurrency(value)}</div>
  </div>
);
