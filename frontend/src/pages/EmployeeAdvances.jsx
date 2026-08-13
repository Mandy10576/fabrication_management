import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { EmployeeAutocomplete } from '../components/EmployeeAutocomplete';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { HandCoins, FileSpreadsheet, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const ADVANCE_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];
const EMPTY_FORM = { employeeId: '', amount: '', advanceDate: '', paymentMode: 'CASH', referenceNo: '', notes: '' };

const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const shiftMonthStr = (monthStr, delta) => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const nowLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const EmployeeAdvances = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [month, setMonth] = useState(currentMonthStr());
  const [employeeFilterId, setEmployeeFilterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmployees, setFilterEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month, all: 'true' });
      if (employeeFilterId) params.set('employeeId', employeeFilterId);
      const res = await api.get(`/advances?${params.toString()}`);
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
  }, [month, employeeFilterId]);

  useEffect(() => {
    api.get('/employees?status=ACTIVE&all=true').then(setEmployees).catch(() => {});
    // Unrestricted by status — filtering advance history shouldn't hide an
    // ex-employee's past records the way picking who to ADD an advance for
    // correctly does.
    api.get('/employees?status=ALL&all=true').then(setFilterEmployees).catch(() => {});
  }, []);

  const total = advances.reduce((sum, a) => sum + a.amount, 0);

  const exportToExcel = () => {
    if (advances.length === 0) {
      toast.warning('There are no records to export.');
      return;
    }
    const data = advances.map((a) => ({
      'Employee': a.employee?.name || '',
      'Mobile': a.employee?.mobile || '',
      'Date': formatDate(a.advanceDate),
      'Amount (₹)': a.amount,
      'Payment Mode': a.paymentMode,
      'Reference No': a.referenceNo || '',
      'Note': a.notes || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Advance Report');
    XLSX.writeFile(workbook, `Advance_Report_${month}.xlsx`);
    toast.success(`Exported ${advances.length} records to Excel`);
  };

  const handleOpenAdd = () => {
    setForm({ ...EMPTY_FORM, advanceDate: nowLocalISO() });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error('Select an employee');
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid advance amount');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/employees/${form.employeeId}/advances`, {
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

  const handleDelete = async (advance) => {
    const ok = await confirm({ title: 'Delete this advance?', message: 'This will reduce future salary deductions for the cycle it was taken in.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/employees/${advance.employeeId}/advances/${advance.id}`);
      fetchAdvances();
    } catch (err) {
      toast.error(err.message || 'Failed to delete advance');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Advances</span>
          </h2>
          <p className="page-subtitle">Advance history across all employees — total this month: {formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button onClick={exportToExcel} className="btn btn-secondary flex-1 sm:flex-none">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary flex-1 sm:flex-none">
            <Plus className="w-4 h-4" />
            <span>Add Advance</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <EmployeeAutocomplete
            employees={filterEmployees}
            value={employeeFilterId}
            onSelect={(e) => setEmployeeFilterId(e ? e.id : '')}
            placeholder="Search employee name or mobile…"
            required={false}
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
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
        ) : advances.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <HandCoins className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No advances found for this month</div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {advances.map((a) => (
              <li key={a.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/employees/${a.employeeId}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                    {a.employee?.name}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(a.advanceDate)} · <span className="badge badge-neutral">{a.paymentMode.replace('_', ' ')}</span>
                    {a.referenceNo && <span className="ml-1.5 font-mono">#{a.referenceNo}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(a.amount)}</span>
                  <button onClick={() => handleDelete(a)} className="btn-icon btn-danger-soft" aria-label="Delete advance">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        title="Add Advance"
        icon={HandCoins}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="org-advance-form" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : 'Add Advance'}
            </button>
          </div>
        }
      >
        <form id="org-advance-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="oadv-employee" className="label">Employee *</label>
            <EmployeeAutocomplete
              id="oadv-employee"
              employees={employees}
              value={form.employeeId}
              onSelect={(e) => setForm((p) => ({ ...p, employeeId: e ? e.id : '' }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="oadv-amount" className="label">Amount (₹) *</label>
              <input
                id="oadv-amount"
                type="number"
                step="any"
                required
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="input font-semibold"
              />
            </div>
            <div>
              <label htmlFor="oadv-date" className="label">Date & Time *</label>
              <input
                id="oadv-date"
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
              <label htmlFor="oadv-mode" className="label">Payment Mode</label>
              <SearchableSelect
                id="oadv-mode"
                mode="button"
                value={form.paymentMode}
                options={ADVANCE_PAYMENT_MODES}
                getOptionLabel={(m) => m.replace('_', ' ')}
                onSelect={(m) => setForm((p) => ({ ...p, paymentMode: m }))}
              />
            </div>
            <div>
              <label htmlFor="oadv-ref" className="label">Reference No</label>
              <input
                id="oadv-ref"
                type="text"
                value={form.referenceNo}
                onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="oadv-notes" className="label">Note</label>
            <textarea
              id="oadv-notes"
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
