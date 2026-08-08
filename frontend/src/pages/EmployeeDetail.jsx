import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  UsersRound,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  HandCoins,
  Receipt,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { value: 'salary', label: 'Salary', icon: Wallet },
  { value: 'advances', label: 'Advances', icon: HandCoins },
  { value: 'payments', label: 'Payments', icon: Receipt },
];

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'PAID_LEAVE', label: 'Paid Leave' },
  { value: 'UNPAID_LEAVE', label: 'Unpaid Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
];

const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const shiftMonthStr = (monthStr, delta) => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const dayCellClass = (day) => {
  if (day.source === 'future' || day.source === 'not-employed') {
    return 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed';
  }
  switch (day.status) {
    case 'PRESENT':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';
    case 'PAID_LEAVE':
      return 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50';
    case 'UNPAID_LEAVE':
      return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50';
    case 'ABSENT':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50';
    case 'HOLIDAY':
      return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50';
    default:
      return 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800';
  }
};

const cycleLabel = (cycle) => `${formatDate(cycle.cycleStart)} – ${formatDate(cycle.cycleEnd)}`;

export const EmployeeDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/employees/${id}`);
      setEmployee(res);
    } catch (err) {
      console.error('Failed to load employee profile:', err);
      setFailed(true);
      toast.error(err.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
    setActiveTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading employee">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-64 rounded-2xl" />
        <span className="sr-only">Loading employee profile…</span>
      </div>
    );
  }

  if (failed || !employee) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <UsersRound className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Employee not found</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This employee may have been deleted, or the link is no longer valid.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-5">
          <Link to="/employees" className="btn btn-secondary">Back to Employees</Link>
          <button onClick={fetchEmployee} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to="/employees" className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Employees</span>
      </Link>

      {/* Profile header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-brand-600/25">
              {employee.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="page-title break-words">{employee.name}</h2>
                <span className={`badge ${getStatusBadgeClass(employee.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {employee.mobile && (
                  <a href={`tel:${employee.mobile}`} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                    <strong className="text-slate-900 dark:text-white font-mono">{employee.mobile}</strong>
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                  Joined {formatDate(employee.joiningDate)}
                </span>
                {employee.address && (
                  <span className="flex items-start gap-1.5 max-w-md">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words">{employee.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 shrink-0 min-w-0">
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Monthly Salary</dt>
              <dd className="text-xs sm:text-sm font-bold mt-1 break-words text-slate-900 dark:text-white">
                {formatCurrency(employee.monthlySalary)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cycle Start</dt>
              <dd className="text-xs sm:text-sm font-bold mt-1 break-words text-slate-900 dark:text-white">
                Day {employee.salaryCycleStartDay}
              </dd>
            </div>
            <div className="min-w-0 col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Deduction Basis</dt>
              <dd className="text-xs sm:text-sm font-bold mt-1 break-words text-slate-900 dark:text-white">
                {employee.deductionBasis === 'WORKING_DAYS' ? 'Working Days' : 'Calendar Days'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && <OverviewPanel employee={employee} />}
      {activeTab === 'attendance' && <AttendancePanel employee={employee} />}
      {activeTab === 'salary' && <SalaryPanel employee={employee} />}
      {activeTab === 'advances' && <AdvancesPanel employee={employee} />}
      {activeTab === 'payments' && <PaymentsPanel employee={employee} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const OverviewPanel = ({ employee }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [advances, setAdvances] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [salaryRes, attendanceRes, advancesRes] = await Promise.all([
          api.get(`/employees/${employee.id}/salary`),
          api.get(`/employees/${employee.id}/attendance?month=${currentMonthStr()}`),
          api.get(`/employees/${employee.id}/advances`),
        ]);
        setSalary(salaryRes.currentCycle);
        setAttendanceSummary(attendanceRes.summary);
        setAdvances(advancesRes.slice(0, 3));
      } catch (err) {
        toast.error(err.message || 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="card card-pad space-y-3">
        <h3 className="section-label flex items-center gap-2"><Wallet className="w-4 h-4" />Current Cycle</h3>
        {salary && (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">{cycleLabel(salary)}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Net Payable</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">{formatCurrency(salary.netPayable)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Balance</span>
              <span className={`text-sm font-bold ${salary.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(Math.max(0, salary.balance))}
              </span>
            </div>
            <span className={`badge ${getStatusBadgeClass(salary.status)}`}>{salary.status}</span>
          </>
        )}
      </div>

      <div className="card card-pad space-y-3">
        <h3 className="section-label flex items-center gap-2"><CalendarCheck className="w-4 h-4" />This Month Attendance</h3>
        {attendanceSummary && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Present</span><strong className="text-emerald-600 dark:text-emerald-400">{attendanceSummary.present}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Absent</span><strong className="text-rose-600 dark:text-rose-400">{attendanceSummary.absent}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid Leave</span><strong>{attendanceSummary.paidLeave}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Unpaid Leave</span><strong className="text-amber-600 dark:text-amber-400">{attendanceSummary.unpaidLeave}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Holiday</span><strong className="text-blue-600 dark:text-blue-400">{attendanceSummary.holiday}</strong></div>
          </div>
        )}
      </div>

      <div className="card card-pad space-y-3">
        <h3 className="section-label flex items-center gap-2"><HandCoins className="w-4 h-4" />Recent Advances</h3>
        {advances.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No advances recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {advances.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{formatDate(a.advanceDate)}</span>
                <strong className="text-slate-900 dark:text-white">{formatCurrency(a.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

const AttendancePanel = ({ employee }) => {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMonth = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${employee.id}/attendance?month=${month}`);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, month]);

  const leadingBlanks = useMemo(() => {
    if (!data?.days?.length) return 0;
    return new Date(data.days[0].date).getUTCDay();
  }, [data]);

  const handleSetStatus = async (statusValue) => {
    if (!selectedDay) return;
    setSaving(true);
    try {
      await api.post(`/employees/${employee.id}/attendance`, {
        date: selectedDay.date,
        status: statusValue,
      });
      setSelectedDay(null);
      fetchMonth();
    } catch (err) {
      toast.error(err.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!selectedDay) return;
    setSaving(true);
    try {
      const dateStr = new Date(selectedDay.date).toISOString().split('T')[0];
      await api.delete(`/employees/${employee.id}/attendance/${dateStr}`);
      setSelectedDay(null);
      fetchMonth();
    } catch (err) {
      toast.error(err.message || 'Failed to clear override');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card card-pad space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonthStr(m, -1))} className="btn-icon btn-icon-soft" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-44 font-semibold"
          />
          <button
            onClick={() => setMonth((m) => shiftMonthStr(m, 1))}
            disabled={month >= currentMonthStr()}
            className="btn-icon btn-icon-soft disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {data?.summary && (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="badge bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60">Present {data.summary.present}</span>
            <span className="badge bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60">Absent {data.summary.absent}</span>
            <span className="badge bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60">Paid Leave {data.summary.paidLeave}</span>
            <span className="badge bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60">Unpaid Leave {data.summary.unpaidLeave}</span>
            <span className="badge bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60">Holiday {data.summary.holiday}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-72 rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 uppercase">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
            {data?.days?.map((day) => {
              const canEdit = day.source !== 'future' && day.source !== 'not-employed';
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && setSelectedDay(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-colors ${dayCellClass(day)}`}
                  title={day.status || day.source}
                >
                  {new Date(day.date).getUTCDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        size="sm"
        title={selectedDay ? formatDate(selectedDay.date) : ''}
        icon={CalendarCheck}
      >
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => handleSetStatus(opt.value)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${
                selectedDay?.status === opt.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {selectedDay?.source === 'override' && (
            <button
              type="button"
              disabled={saving}
              onClick={handleClearOverride}
              className="w-full text-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear override (revert to default)
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Salary
// ---------------------------------------------------------------------------

const SALARY_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];

const EMPTY_PAYMENT_FORM = { amount: '', paymentDate: '', paymentMode: 'CASH', referenceNo: '', notes: '' };

const nowLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const SalaryPanel = ({ employee }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [availableCycles, setAvailableCycles] = useState([]);
  const [selectedCycleStart, setSelectedCycleStart] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [savingPayment, setSavingPayment] = useState(false);

  const loadCycle = async (cycleStart) => {
    try {
      setLoading(true);
      const qs = cycleStart ? `?cycleStart=${cycleStart}` : '';
      const res = await api.get(`/employees/${employee.id}/salary${qs}`);
      setAvailableCycles(res.availableCycles);
      setSummary(res.currentCycle);
      setSelectedCycleStart(new Date(res.currentCycle.cycleStart).toISOString());
      const paymentsRes = await api.get(`/employees/${employee.id}/salary-payments`);
      setPayments(paymentsRes);
    } catch (err) {
      toast.error(err.message || 'Failed to load salary details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const cycleTransactions = useMemo(() => {
    if (!selectedCycleStart) return [];
    return payments.filter((p) => new Date(p.cycleStart).toISOString() === selectedCycleStart);
  }, [payments, selectedCycleStart]);

  const resetPaymentForm = () => setPaymentForm({ ...EMPTY_PAYMENT_FORM, paymentDate: nowLocalISO() });

  const handleOpenPaymentModal = () => {
    resetPaymentForm();
    setShowPaymentModal(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    setSavingPayment(true);
    try {
      const res = await api.post(`/employees/${employee.id}/salary-payments`, {
        cycleStart: selectedCycleStart,
        amount: amt,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : undefined,
        paymentMode: paymentForm.paymentMode,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      });
      setSummary(res);
      resetPaymentForm();
      setShowPaymentModal(false);
      const paymentsRes = await api.get(`/employees/${employee.id}/salary-payments`);
      setPayments(paymentsRes);
      toast.success('Payment recorded');
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const ok = await confirm({ title: 'Delete this payment?', message: 'This will reduce the amount paid for this cycle.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      const res = await api.delete(`/employees/${employee.id}/salary-payments/${paymentId}`);
      setSummary(res);
      const paymentsRes = await api.get(`/employees/${employee.id}/salary-payments`);
      setPayments(paymentsRes);
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  if (loading && !summary) {
    return <div className="skeleton h-96 rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="card card-pad space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <select
            value={selectedCycleStart || ''}
            onChange={(e) => loadCycle(e.target.value)}
            className="select font-semibold sm:w-72"
          >
            {availableCycles.map((c) => (
              <option key={c.cycleStart} value={new Date(c.cycleStart).toISOString()}>{cycleLabel(c)}</option>
            ))}
          </select>
          <button onClick={handleOpenPaymentModal} className="btn btn-emerald">
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>

        {summary && (
          <>
            {!summary.isCycleComplete && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                Cycle in progress — figures are as of {formatDate(summary.computedThrough)}.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Per Day Rate" value={formatCurrency(summary.perDayRate)} />
              <StatTile label="Earned Salary" value={formatCurrency(summary.earned)} />
              <StatTile label="Advances Deducted" value={formatCurrency(summary.advancesInCycle)} accent="text-amber-600 dark:text-amber-400" />
              <StatTile label="Net Payable" value={formatCurrency(summary.netPayable)} accent="text-slate-900 dark:text-white" bold />
              <StatTile label="Paid So Far" value={formatCurrency(summary.paidSoFar)} accent="text-emerald-600 dark:text-emerald-400" />
              <StatTile
                label={summary.isOverpaid ? 'Overpaid By' : 'Balance Due'}
                value={formatCurrency(Math.abs(summary.balance))}
                accent={summary.isOverpaid ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}
                bold
              />
              {summary.excessAdvance > 0 && (
                <StatTile label="Excess Advance" value={formatCurrency(summary.excessAdvance)} accent="text-rose-600 dark:text-rose-400" />
              )}
              <div className="flex items-end">
                <span className={`badge ${getStatusBadgeClass(summary.status)}`}>{summary.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-center"><div className="font-bold text-emerald-600 dark:text-emerald-400">{summary.counts.present}</div><div className="text-slate-400">Present</div></div>
              <div className="text-center"><div className="font-bold text-rose-600 dark:text-rose-400">{summary.counts.absent}</div><div className="text-slate-400">Absent</div></div>
              <div className="text-center"><div className="font-bold text-teal-600 dark:text-teal-400">{summary.counts.paidLeave}</div><div className="text-slate-400">Paid Leave</div></div>
              <div className="text-center"><div className="font-bold text-amber-600 dark:text-amber-400">{summary.counts.unpaidLeave}</div><div className="text-slate-400">Unpaid Leave</div></div>
              <div className="text-center"><div className="font-bold text-blue-600 dark:text-blue-400">{summary.counts.holiday}</div><div className="text-slate-400">Holiday</div></div>
            </div>
          </>
        )}
      </div>

      <div className="card overflow-hidden">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white p-4 border-b border-slate-100 dark:border-slate-800">
          Payments for this cycle
        </h3>
        {cycleTransactions.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No payments recorded for this cycle yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cycleTransactions.map((p) => (
              <li key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.paymentDate)} · <span className="badge badge-neutral">{p.paymentMode}</span></div>
                </div>
                <button onClick={() => handleDeletePayment(p.id)} className="btn-icon btn-danger-soft shrink-0" aria-label="Delete payment">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        size="lg"
        title="Record Salary Payment"
        icon={Wallet}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="salary-payment-form" disabled={savingPayment} className="btn btn-emerald">
              {savingPayment ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        }
      >
        <form id="salary-payment-form" onSubmit={handleAddPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sp-amount" className="label">Amount (₹) *</label>
              <input
                id="sp-amount"
                type="number"
                step="any"
                required
                data-autofocus
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                className="input font-semibold"
              />
            </div>
            <div>
              <label htmlFor="sp-date" className="label">Payment Date & Time *</label>
              <input
                id="sp-date"
                type="datetime-local"
                required
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sp-mode" className="label">Payment Mode</label>
              <select
                id="sp-mode"
                value={paymentForm.paymentMode}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMode: e.target.value }))}
                className="select"
              >
                {SALARY_PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sp-ref" className="label">Reference No</label>
              <input
                id="sp-ref"
                type="text"
                value={paymentForm.referenceNo}
                onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="sp-notes" className="label">Notes</label>
            <textarea
              id="sp-notes"
              rows={2}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              className="textarea"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

const StatTile = ({ label, value, accent = 'text-slate-700 dark:text-slate-300', bold }) => (
  <div className="min-w-0">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`text-sm mt-0.5 break-words ${bold ? 'font-extrabold' : 'font-semibold'} ${accent}`}>{value}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Advances
// ---------------------------------------------------------------------------

const ADVANCE_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];
const EMPTY_ADVANCE_FORM = { amount: '', advanceDate: '', paymentMode: 'CASH', referenceNo: '', notes: '' };

const AdvancesPanel = ({ employee }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_ADVANCE_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${employee.id}/advances`);
      setAdvances(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load advances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const handleOpenAdd = () => {
    setForm({ ...EMPTY_ADVANCE_FORM, advanceDate: nowLocalISO() });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid advance amount');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/employees/${employee.id}/advances`, {
        amount: amt,
        advanceDate: form.advanceDate ? new Date(form.advanceDate).toISOString() : undefined,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo,
        notes: form.notes,
      });
      toast.success('Advance recorded');
      setShowModal(false);
      fetchAdvances();
    } catch (err) {
      toast.error(err.message || 'Failed to record advance');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (advanceId) => {
    const ok = await confirm({ title: 'Delete this advance?', message: 'This will reduce future salary deductions for the cycle it was taken in.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/employees/${employee.id}/advances/${advanceId}`);
      fetchAdvances();
    } catch (err) {
      toast.error(err.message || 'Failed to delete advance');
    }
  };

  const total = advances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Advance History</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total advanced: {formatCurrency(total)}</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-sm btn-primary">
          <Plus className="w-4 h-4" />
          <span>Add Advance</span>
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : advances.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No advances recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {advances.map((a) => (
            <li key={a.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(a.amount)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(a.advanceDate)} · <span className="badge badge-neutral">{a.paymentMode.replace('_', ' ')}</span>
                  {a.referenceNo && <span className="ml-1.5 font-mono">#{a.referenceNo}</span>}
                </div>
                {a.notes && <p className="text-xs text-slate-400 mt-0.5">{a.notes}</p>}
              </div>
              <button onClick={() => handleDelete(a.id)} className="btn-icon btn-danger-soft shrink-0" aria-label="Delete advance">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        title="Add Advance"
        icon={HandCoins}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="advance-form" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : 'Add Advance'}
            </button>
          </div>
        }
      >
        <form id="advance-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="adv-amount" className="label">Amount (₹) *</label>
              <input
                id="adv-amount"
                type="number"
                step="any"
                required
                data-autofocus
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="input font-semibold"
              />
            </div>
            <div>
              <label htmlFor="adv-date" className="label">Date & Time *</label>
              <input
                id="adv-date"
                type="datetime-local"
                required
                value={form.advanceDate}
                onChange={(e) => setForm((p) => ({ ...p, advanceDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="adv-mode" className="label">Payment Mode</label>
              <select
                id="adv-mode"
                value={form.paymentMode}
                onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))}
                className="select"
              >
                {ADVANCE_PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="adv-ref" className="label">Reference No</label>
              <input
                id="adv-ref"
                type="text"
                value={form.referenceNo}
                onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="adv-notes" className="label">Note</label>
            <textarea
              id="adv-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="textarea"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Payments (read-only history across all cycles)
// ---------------------------------------------------------------------------

const PaymentsPanel = ({ employee }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/employees/${employee.id}/salary-payments`);
        setPayments(res);
      } catch (err) {
        toast.error(err.message || 'Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div className="card overflow-hidden">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Receipt className="w-4 h-4 text-brand-500" />
        <span>Payment History ({payments.length})</span>
      </h3>
      {payments.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No salary payments recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cycle</th>
                <th scope="col">Payment Date</th>
                <th scope="col" className="text-right">Amount</th>
                <th scope="col">Mode</th>
                <th scope="col">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(p.cycleStart)}</td>
                  <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDate(p.paymentDate)}</td>
                  <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-neutral">{p.paymentMode.replace('_', ' ')}</span></td>
                  <td className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.referenceNo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
