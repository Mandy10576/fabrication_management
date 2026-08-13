import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';
import { CalendarCheck, Search, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import { getPushStatus, sendTestNotification } from '../services/pushNotifications';

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

export const EmployeeAttendance = () => {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthStr());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    getPushStatus().then((s) => setPushSubscribed(s.subscribed)).catch(() => {});
  }, []);

  const handleTestNotification = async () => {
    try {
      await sendTestNotification('employee');
      toast.success('Test notification sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send test notification');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance?month=${month}&status=${status}&search=${encodeURIComponent(search)}`);
      setRows(res.rows || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, status, search]);

  const exportToExcel = () => {
    if (rows.length === 0) {
      toast.warning('There are no records to export.');
      return;
    }
    const data = rows.map((r) => ({
      'Employee': r.name,
      'Mobile': r.mobile,
      'Status': r.isActive ? 'Active' : 'Inactive',
      'Present': r.summary.present,
      'Absent': r.summary.absent,
      'Paid Leave': r.summary.paidLeave,
      'Unpaid Leave': r.summary.unpaidLeave,
      'Holiday': r.summary.holiday,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, `Attendance_Report_${month}.xlsx`);
    toast.success(`Exported ${rows.length} records to Excel`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Attendance</span>
          </h2>
          <p className="page-subtitle">Monthly attendance overview across all employees</p>
        </div>
        <button onClick={exportToExcel} className="btn btn-secondary w-full sm:w-auto shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to Excel</span>
        </button>
      </div>

      {pushSubscribed && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>You'll get a daily 9:30 PM reminder here with today's attendance &amp; work log summary.</span>
          <button onClick={handleTestNotification} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0">
            Send test notification
          </button>
        </div>
      )}

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
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No employees found</div>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <li key={r.employeeId} className="p-4 space-y-2">
                  <Link to={`/employees/${r.employeeId}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                    {r.name}
                  </Link>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="badge bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60">P {r.summary.present}</span>
                    <span className="badge bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60">A {r.summary.absent}</span>
                    <span className="badge bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60">PL {r.summary.paidLeave}</span>
                    <span className="badge bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60">UL {r.summary.unpaidLeave}</span>
                    <span className="badge bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60">H {r.summary.holiday}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col" className="text-center">Present</th>
                    <th scope="col" className="text-center">Absent</th>
                    <th scope="col" className="text-center">Paid Leave</th>
                    <th scope="col" className="text-center">Unpaid Leave</th>
                    <th scope="col" className="text-center">Holiday</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/employees/${r.employeeId}`} className="hover:text-brand-500 transition-colors">{r.name}</Link>
                      </td>
                      <td className="text-center text-emerald-600 dark:text-emerald-400 font-bold">{r.summary.present}</td>
                      <td className="text-center text-rose-600 dark:text-rose-400 font-bold">{r.summary.absent}</td>
                      <td className="text-center text-teal-600 dark:text-teal-400 font-bold">{r.summary.paidLeave}</td>
                      <td className="text-center text-amber-600 dark:text-amber-400 font-bold">{r.summary.unpaidLeave}</td>
                      <td className="text-center text-blue-600 dark:text-blue-400 font-bold">{r.summary.holiday}</td>
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
