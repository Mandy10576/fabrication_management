import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  UsersRound,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Phone,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  mobile: '',
  address: '',
  joiningDate: new Date().toISOString().split('T')[0],
  monthlySalary: '',
  salaryCycleStartDay: 1,
  deductionBasis: 'CALENDAR_DAYS',
  isActive: true,
  notes: '',
};

export const Employees = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [employees, setEmployees] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const fetchEmployees = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const res = await api.get(`/employees?status=${status}&search=${encodeURIComponent(search)}&limit=20${cursorParam}`);

      const newItems = Array.isArray(res) ? res : (res.items || []);
      const newNextCursor = res.nextCursor || null;
      const newHasMore = Boolean(res.hasMore);

      if (isLoadMore) {
        setEmployees(prev => [...prev, ...newItems]);
      } else {
        setEmployees(newItems);
      }
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);
    } catch (err) {
      console.error('Failed to load employees:', err);
      toast.error(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [status, search]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      mobile: employee.mobile || '',
      address: employee.address || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      monthlySalary: employee.monthlySalary ?? '',
      salaryCycleStartDay: employee.salaryCycleStartDay || 1,
      deductionBasis: employee.deductionBasis || 'CALENDAR_DAYS',
      isActive: employee.isActive,
      notes: employee.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post('/employees', formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: 'This permanently removes the employee record. Employees with recorded attendance, advances, or payments cannot be deleted — mark them Inactive instead.',
      confirmText: 'Delete employee',
    });
    if (!ok) return;

    try {
      await api.delete(`/employees/${id}`);
      toast.success(`${name} deleted`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message || 'Failed to delete employee');
    }
  };

  const setField = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Employees</span>
          </h2>
          <p className="page-subtitle">
            Manage staff records, salary cycles, and active/inactive status
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search + Status filter */}
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
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select sm:w-48 font-medium"
          aria-label="Filter by status"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ALL">All Employees</option>
        </select>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-24 shrink-0" />
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <UsersRound className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No employees found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'No employees match your search.' : 'Add your first employee to start tracking attendance and salary.'}
            </p>
            <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        ) : (
          <>
            {/* Card view up to lg */}
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map((e) => (
                <li key={e.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/employees/${e.id}`}
                        className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline break-words"
                      >
                        {e.name}
                      </Link>
                      {e.mobile && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {e.mobile}
                        </div>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(e.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                      {e.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(e.monthlySalary)}<span className="text-xs font-medium text-slate-400">/mo</span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {e.mobile && (
                        <a
                          href={`tel:${e.mobile}`}
                          className="btn-icon bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          aria-label={`Call ${e.name}`}
                          title="Call Employee"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        to={`/employees/${e.id}`}
                        className="btn-icon btn-icon-soft"
                        aria-label={`View ${e.name}`}
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(e)}
                        className="btn-icon btn-icon-soft"
                        aria-label={`Edit ${e.name}`}
                        title="Edit Employee"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id, e.name)}
                        className="btn-icon btn-danger-soft"
                        aria-label={`Delete ${e.name}`}
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Joining Date</th>
                    <th scope="col" className="text-right">Monthly Salary</th>
                    <th scope="col">Cycle Start</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id}>
                      <td className="max-w-[16rem]">
                        <Link
                          to={`/employees/${e.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-brand-500 transition-colors"
                        >
                          {e.name}
                        </Link>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                        {e.mobile || '—'}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(e.joiningDate)}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(e.monthlySalary)}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        Day {e.salaryCycleStartDay}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getStatusBadgeClass(e.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                          {e.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/employees/${e.id}`}
                            className="btn-icon btn-icon-soft hover:text-brand-500"
                            aria-label={`View ${e.name}`}
                            title="View Employee Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(e)}
                            className="btn-icon btn-icon-soft hover:text-amber-500"
                            aria-label={`Edit ${e.name}`}
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id, e.name)}
                            className="btn-icon btn-danger-soft"
                            aria-label={`Delete ${e.name}`}
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hasMore && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button onClick={() => fetchEmployees(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Employees</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit employee */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="2xl"
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        icon={UsersRound}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="employee-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingEmployee ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-name" className="label">Full Name *</label>
              <input
                id="emp-name"
                type="text"
                required
                data-autofocus
                placeholder="e.g. Ramesh Yadav"
                value={formData.name}
                onChange={setField('name')}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="emp-mobile" className="label">Mobile Number *</label>
              <input
                id="emp-mobile"
                type="tel"
                inputMode="tel"
                required
                placeholder="e.g. 9822011223"
                value={formData.mobile}
                onChange={setField('mobile')}
                className="input font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="emp-address" className="label">Address</label>
            <textarea
              id="emp-address"
              rows={2}
              placeholder="Home address…"
              value={formData.address}
              onChange={setField('address')}
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-joining" className="label">Joining Date *</label>
              <input
                id="emp-joining"
                type="date"
                required
                value={formData.joiningDate}
                onChange={setField('joiningDate')}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="emp-salary" className="label">Monthly Salary (₹) *</label>
              <input
                id="emp-salary"
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="e.g. 20000"
                value={formData.monthlySalary}
                onChange={setField('monthlySalary')}
                className="input font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-cycle-day" className="label">Salary Cycle Start Day *</label>
              <input
                id="emp-cycle-day"
                type="number"
                min="1"
                max="31"
                required
                value={formData.salaryCycleStartDay}
                onChange={setField('salaryCycleStartDay')}
                className="input font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                e.g. 7 → cycle runs 7th of a month to 6th of the next
              </p>
            </div>
            <div>
              <label htmlFor="emp-deduction-basis" className="label">Salary Deduction Basis</label>
              <select
                id="emp-deduction-basis"
                value={formData.deductionBasis}
                onChange={setField('deductionBasis')}
                className="select font-medium"
              >
                <option value="CALENDAR_DAYS">Calendar Days</option>
                <option value="WORKING_DAYS">Working Days</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active employee</span>
          </label>

          <div>
            <label htmlFor="emp-notes" className="label">Internal Notes</label>
            <input
              id="emp-notes"
              type="text"
              placeholder="Role, department, etc."
              value={formData.notes}
              onChange={setField('notes')}
              className="input"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
