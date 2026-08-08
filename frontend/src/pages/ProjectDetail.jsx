import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { EmployeeMultiSelect } from '../components/EmployeeMultiSelect';
import { UnitSelect } from '../components/UnitSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Construction,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
  LayoutDashboard,
  ListChecks,
  History,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Wallet,
  Package,
  UsersRound,
  Image as ImageIcon,
  X,
} from 'lucide-react';

const TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'progress', label: 'Work Progress', icon: ListChecks },
  { value: 'history', label: 'Work History', icon: History },
];

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'OTHER'];
const WORK_ITEM_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

const nextWorkItemStatus = (status) => {
  const idx = WORK_ITEM_STATUSES.indexOf(status);
  return WORK_ITEM_STATUSES[(idx + 1) % WORK_ITEM_STATUSES.length];
};

const nowLocalDate = () => new Date().toISOString().split('T')[0];

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];
const getAvailableUnits = () => {
  try {
    const saved = localStorage.getItem('khodiyar_managed_units');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_UNITS;
};

const EMPTY_LOG_FORM = {
  visitDate: nowLocalDate(),
  visitTime: '',
  workDone: '',
  workInProgress: '',
  workPending: '',
  amount: '',
  paymentReceived: '',
  paymentMode: 'CASH',
  notes: '',
  employeeIds: [],
  materials: [],
};

export const ProjectDetail = () => {
  const { id } = useParams();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProject = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/projects/${id}`);
      setProject(res);
    } catch (err) {
      console.error('Failed to load project:', err);
      setFailed(true);
      toast.error(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    setActiveTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading project">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-64 rounded-2xl" />
        <span className="sr-only">Loading project…</span>
      </div>
    );
  }

  if (failed || !project) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <Construction className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Project not found</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This project may have been deleted, or the link is no longer valid.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-5">
          <Link to="/projects" className="btn btn-secondary">Back to Projects</Link>
          <button onClick={fetchProject} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to="/projects" className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Projects</span>
      </Link>

      {/* Profile header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/25">
              <Construction className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="page-title break-words">{project.name}</h2>
                <span className={`badge ${getStatusBadgeClass(project.status)}`}>{project.status.replace('_', ' ')}</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Client:{' '}
                <Link to={`/clients/${project.client?.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                  {project.client?.companyName}
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {project.contactNumber && (
                  <a href={`tel:${project.contactNumber}`} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                    <strong className="text-slate-900 dark:text-white font-mono">{project.contactNumber}</strong>
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                  Started {formatDate(project.startDate)}
                  {project.expectedCompletion && ` · Expected ${formatDate(project.expectedCompletion)}`}
                </span>
                {project.siteAddress && (
                  <span className="flex items-start gap-1.5 max-w-md">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words">{project.siteAddress}</span>
                  </span>
                )}
              </div>
              {project.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{project.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && <OverviewPanel project={project} />}
      {activeTab === 'progress' && <ProgressPanel project={project} />}
      {activeTab === 'history' && <HistoryPanel project={project} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const OverviewPanel = ({ project }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/projects/${project.id}/overview`);
        setOverview(res);
      } catch (err) {
        toast.error(err.message || 'Failed to load project overview');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
      </div>
    );
  }

  if (!overview) return null;
  const { totals, financials, materials, employees, lastVisit } = overview;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-pad space-y-2">
          <h3 className="section-label flex items-center gap-2"><ListChecks className="w-4 h-4" />Work Items</h3>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totals.workItems.completed} <span className="text-sm font-medium text-slate-400">/ {totals.workItems.total} completed</span>
          </div>
          <div className="flex gap-1.5 flex-wrap text-[11px]">
            <span className="badge bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60">{totals.workItems.inProgress} In Progress</span>
            <span className="badge bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60">{totals.workItems.pending} Pending</span>
          </div>
        </div>

        <div className="card card-pad space-y-2">
          <h3 className="section-label flex items-center gap-2"><Wallet className="w-4 h-4" />Financials</h3>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Work Value</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(financials.totalWorkValue)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Received</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financials.totalReceived)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Pending</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(financials.pendingAmount)}</span>
          </div>
        </div>

        <div className="card card-pad space-y-2">
          <h3 className="section-label flex items-center gap-2"><Package className="w-4 h-4" />Materials Used</h3>
          {materials.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No materials recorded yet.</p>
          ) : (
            <ul className="space-y-1 text-xs max-h-24 overflow-y-auto">
              {materials.map((m) => (
                <li key={`${m.materialName}-${m.unit}`} className="flex justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300 truncate">{m.materialName}</span>
                  <strong className="text-slate-900 dark:text-white shrink-0">{m.totalQuantity} {m.unit}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card-pad space-y-2">
          <h3 className="section-label flex items-center gap-2"><UsersRound className="w-4 h-4" />Employees Worked</h3>
          {employees.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No visits logged yet.</p>
          ) : (
            <ul className="space-y-1 text-xs max-h-24 overflow-y-auto">
              {employees.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300 truncate">{e.name}</span>
                  <strong className="text-slate-900 dark:text-white shrink-0">{e.visitCount} visit{e.visitCount !== 1 ? 's' : ''}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-brand-500 shrink-0" />
          <span>Last Visit Summary</span>
        </h3>
        {!lastVisit ? (
          <p className="text-sm text-slate-400 py-10 text-center">No site visits logged yet.</p>
        ) : (
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {formatDate(lastVisit.visitDate)}{lastVisit.visitTime ? ` · ${lastVisit.visitTime}` : ''}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(lastVisit.amount)} <span className="text-emerald-600 dark:text-emerald-400 font-semibold">({formatCurrency(lastVisit.paymentReceived)} received)</span>
              </span>
            </div>

            {lastVisit.employees?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lastVisit.employees.map((e) => (
                  <span key={e.id} className="badge badge-neutral">{e.name}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">Work Done</div><p className="text-slate-700 dark:text-slate-300">{lastVisit.workDone || '—'}</p></div>
              <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">In Progress</div><p className="text-slate-700 dark:text-slate-300">{lastVisit.workInProgress || '—'}</p></div>
              <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">Pending</div><p className="text-slate-700 dark:text-slate-300">{lastVisit.workPending || '—'}</p></div>
            </div>

            {lastVisit.materials?.length > 0 && (
              <div className="text-xs">
                <div className="text-slate-400 font-bold uppercase tracking-wide mb-1">Materials Used</div>
                <div className="flex flex-wrap gap-1.5">
                  {lastVisit.materials.map((m) => (
                    <span key={m.id} className="badge badge-neutral">{m.materialName}: {m.quantity} {m.unit}</span>
                  ))}
                </div>
              </div>
            )}

            {lastVisit.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">{lastVisit.notes}</p>
            )}

            {lastVisit.photos?.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {lastVisit.photos.map((photo) => (
                  <img key={photo.id} src={photo.url} alt="Work visit" className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Work Progress
// ---------------------------------------------------------------------------

const ProgressPanel = ({ project }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${project.id}/workitems`);
      setItems(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAdding(true);
    try {
      await api.post(`/projects/${project.id}/workitems`, { name: newItemName.trim() });
      setNewItemName('');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to add work item');
    } finally {
      setAdding(false);
    }
  };

  const handleCycleStatus = async (item) => {
    try {
      const updated = await api.put(`/projects/${project.id}/workitems/${item.id}`, { status: nextWorkItemStatus(item.status) });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      toast.error(err.message || 'Failed to update work item');
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({ title: `Remove "${item.name}"?`, message: 'This removes it from the work progress checklist.', confirmText: 'Remove' });
    if (!ok) return;
    try {
      await api.delete(`/projects/${project.id}/workitems/${item.id}`);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to delete work item');
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Work Progress Checklist</h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Main Gate, Front Grill, Shed Structure…"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" disabled={adding || !newItemName.trim()} className="btn btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No work items yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 min-w-0 truncate">{item.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCycleStatus(item)}
                  className={`badge cursor-pointer ${getStatusBadgeClass(item.status)}`}
                  title="Click to change status"
                >
                  {item.status.replace('_', ' ')}
                </button>
                <button onClick={() => handleDelete(item)} className="btn-icon btn-danger-soft" aria-label={`Remove ${item.name}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Work History (timeline + add/edit work log)
// ---------------------------------------------------------------------------

const HistoryPanel = ({ project }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState(EMPTY_LOG_FORM);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchLogs = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const res = await api.get(`/projects/${project.id}/worklogs?limit=10${cursorParam}`);
      setLogs((prev) => (isLoadMore ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      toast.error(err.message || 'Failed to load work history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    api.get('/employees?status=ACTIVE&all=true').then(setEmployees).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setForm({ ...EMPTY_LOG_FORM, visitDate: nowLocalDate() });
    setPhotoFiles([]);
    setShowModal(true);
  };

  const handleOpenEdit = (log) => {
    setEditingLog(log);
    setForm({
      visitDate: log.visitDate.split('T')[0],
      visitTime: log.visitTime || '',
      workDone: log.workDone || '',
      workInProgress: log.workInProgress || '',
      workPending: log.workPending || '',
      amount: log.amount ?? '',
      paymentReceived: log.paymentReceived ?? '',
      paymentMode: log.paymentMode || 'CASH',
      notes: log.notes || '',
      employeeIds: log.employees.map((e) => e.id),
      materials: log.materials.map((m) => ({ materialName: m.materialName, quantity: m.quantity, unit: m.unit })),
    });
    setPhotoFiles([]);
    setShowModal(true);
  };

  const handleAddMaterialRow = () => setForm((p) => ({ ...p, materials: [...p.materials, { materialName: '', quantity: '', unit: '' }] }));
  const handleRemoveMaterialRow = (idx) => setForm((p) => ({ ...p, materials: p.materials.filter((_, i) => i !== idx) }));
  const handleMaterialChange = (idx, field, val) => setForm((p) => ({
    ...p,
    materials: p.materials.map((m, i) => (i === idx ? { ...m, [field]: val } : m)),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? 0 : parseFloat(form.amount),
        paymentReceived: form.paymentReceived === '' ? 0 : parseFloat(form.paymentReceived),
        materials: form.materials.filter((m) => m.materialName && m.unit && m.quantity !== ''),
      };

      let savedLog;
      if (editingLog) {
        savedLog = await api.put(`/projects/${project.id}/worklogs/${editingLog.id}`, payload);
      } else {
        savedLog = await api.post(`/projects/${project.id}/worklogs`, payload);
      }

      if (photoFiles.length > 0) {
        const formData = new FormData();
        Array.from(photoFiles).forEach((f) => formData.append('photos', f));
        await api.upload(`/projects/${project.id}/worklogs/${savedLog.id}/photos`, formData);
      }

      toast.success(editingLog ? 'Work log updated' : 'Work log added');
      setShowModal(false);
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to save work log');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (log) => {
    const ok = await confirm({ title: 'Delete this work log?', message: 'This permanently removes this visit record, including its materials and photos.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/projects/${project.id}/worklogs/${log.id}`);
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to delete work log');
    }
  };

  const handleDeletePhoto = async (log, photo) => {
    try {
      await api.delete(`/projects/${project.id}/worklogs/${log.id}/photos/${photo.id}`);
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to delete photo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Work History</h3>
        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" />
          <span>Add Work Log</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : logs.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No work logs yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add the first site visit record above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="card card-pad space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatDate(log.visitDate)}{log.visitTime ? ` · ${log.visitTime}` : ''}
                  </span>
                  {log.employees?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {log.employees.map((e) => <span key={e.id} className="badge badge-neutral">{e.name}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleOpenEdit(log)} className="btn-icon btn-icon-soft" aria-label="Edit work log">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteLog(log)} className="btn-icon btn-danger-soft" aria-label="Delete work log">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {log.workDone && <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">Done</div><p className="text-slate-700 dark:text-slate-300">{log.workDone}</p></div>}
                {log.workInProgress && <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">In Progress</div><p className="text-slate-700 dark:text-slate-300">{log.workInProgress}</p></div>}
                {log.workPending && <div><div className="text-slate-400 font-bold uppercase tracking-wide mb-0.5">Pending</div><p className="text-slate-700 dark:text-slate-300">{log.workPending}</p></div>}
              </div>

              {log.materials?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {log.materials.map((m) => <span key={m.id} className="badge badge-neutral">{m.materialName}: {m.quantity} {m.unit}</span>)}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(log.amount)} <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">({formatCurrency(log.paymentReceived)} via {log.paymentMode})</span>
                </span>
              </div>

              {log.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{log.notes}</p>}

              {log.photos?.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {log.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img src={photo.url} alt="Work visit" className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                      <button
                        onClick={() => handleDeletePhoto(log, photo)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button onClick={() => fetchLogs(true)} disabled={loadingMore} className="btn btn-secondary">
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

      {/* Add / Edit work log */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="3xl"
        title={editingLog ? 'Edit Work Log' : 'Add Work Log'}
        icon={History}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="worklog-form" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : editingLog ? 'Save Changes' : 'Add Work Log'}
            </button>
          </div>
        }
      >
        <form id="worklog-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wl-date" className="label">Date *</label>
              <input
                id="wl-date"
                type="date"
                required
                data-autofocus
                value={form.visitDate}
                onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="wl-time" className="label">Time</label>
              <input
                id="wl-time"
                type="time"
                value={form.visitTime}
                onChange={(e) => setForm((p) => ({ ...p, visitTime: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="wl-employees" className="label">Employees Who Worked</label>
            <EmployeeMultiSelect
              id="wl-employees"
              employees={employees}
              value={form.employeeIds}
              onChange={(ids) => setForm((p) => ({ ...p, employeeIds: ids }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wl-done" className="label">Work Completed</label>
              <textarea id="wl-done" rows={2} value={form.workDone} onChange={(e) => setForm((p) => ({ ...p, workDone: e.target.value }))} className="textarea" />
            </div>
            <div>
              <label htmlFor="wl-progress" className="label">Work In Progress</label>
              <textarea id="wl-progress" rows={2} value={form.workInProgress} onChange={(e) => setForm((p) => ({ ...p, workInProgress: e.target.value }))} className="textarea" />
            </div>
            <div>
              <label htmlFor="wl-pending" className="label">Pending Work</label>
              <textarea id="wl-pending" rows={2} value={form.workPending} onChange={(e) => setForm((p) => ({ ...p, workPending: e.target.value }))} className="textarea" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Material Used</label>
              <button type="button" onClick={handleAddMaterialRow} className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" />
                <span>Add Material</span>
              </button>
            </div>
            {form.materials.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No materials added.</p>
            ) : (
              <div className="space-y-2">
                {form.materials.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Material name"
                      value={m.materialName}
                      onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                      className="input col-span-5"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={m.quantity}
                      onChange={(e) => handleMaterialChange(idx, 'quantity', e.target.value)}
                      className="input col-span-3"
                    />
                    <div className="col-span-3">
                      <UnitSelect
                        value={m.unit}
                        onChange={(u) => handleMaterialChange(idx, 'unit', u)}
                        options={getAvailableUnits()}
                        placeholder="Unit"
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveMaterialRow(idx)} className="btn-icon btn-danger-soft col-span-1" aria-label="Remove material">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wl-amount" className="label">Amount / Work Value (₹)</label>
              <input id="wl-amount" type="number" step="any" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="input font-semibold" />
            </div>
            <div>
              <label htmlFor="wl-received" className="label">Payment Received (₹)</label>
              <input id="wl-received" type="number" step="any" value={form.paymentReceived} onChange={(e) => setForm((p) => ({ ...p, paymentReceived: e.target.value }))} className="input font-semibold" />
            </div>
            <div>
              <label htmlFor="wl-mode" className="label">Payment Mode</label>
              <select id="wl-mode" value={form.paymentMode} onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))} className="select">
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="wl-notes" className="label">Notes</label>
            <textarea id="wl-notes" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
          </div>

          <div>
            <label htmlFor="wl-photos" className="label flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />Photos</label>
            <input
              id="wl-photos"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setPhotoFiles(e.target.files)}
              className="input file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-950/60 dark:file:text-brand-300 file:font-semibold file:text-xs"
            />
            {editingLog?.photos?.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                {editingLog.photos.length} existing photo(s) — manage them from the Work History card after saving.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};
