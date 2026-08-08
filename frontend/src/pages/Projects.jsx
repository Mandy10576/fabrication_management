import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Construction,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Phone,
  AlertCircle,
  MapPin,
} from 'lucide-react';

const EMPTY_FORM = {
  clientId: '',
  name: '',
  siteAddress: '',
  contactNumber: '',
  startDate: new Date().toISOString().split('T')[0],
  expectedCompletion: '',
  status: 'ACTIVE',
  notes: '',
};

export const Projects = ({ fixedStatus }) => {
  const toast = useToast();
  const confirm = useConfirm();

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(fixedStatus || 'ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const effectiveStatus = fixedStatus || status;

  const fetchProjects = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const res = await api.get(`/projects?status=${effectiveStatus}&search=${encodeURIComponent(search)}&limit=20${cursorParam}`);

      const newItems = Array.isArray(res) ? res : (res.items || []);
      const newNextCursor = res.nextCursor || null;
      const newHasMore = Boolean(res.hasMore);

      if (isLoadMore) {
        setProjects(prev => [...prev, ...newItems]);
      } else {
        setProjects(newItems);
      }
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);
    } catch (err) {
      console.error('Failed to load projects:', err);
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStatus, search]);

  useEffect(() => {
    api.get('/clients?all=true').then(setClients).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({ ...EMPTY_FORM, status: fixedStatus || 'ACTIVE' });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setFormData({
      clientId: project.client?.id || '',
      name: project.name || '',
      siteAddress: project.siteAddress || '',
      contactNumber: project.contactNumber || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      expectedCompletion: project.expectedCompletion ? project.expectedCompletion.split('T')[0] : '',
      status: project.status || 'ACTIVE',
      notes: project.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }
    try {
      setSaving(true);
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, formData);
        toast.success(`${formData.name} updated`);
      } else {
        await api.post('/projects', formData);
        toast.success(`${formData.name} added`);
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: 'This permanently removes the project record. Projects with recorded work logs or work items cannot be deleted — mark them Completed instead.',
      confirmText: 'Delete project',
    });
    if (!ok) return;

    try {
      await api.delete(`/projects/${id}`);
      toast.success(`${name} deleted`);
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    }
  };

  const setField = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const pageTitle = fixedStatus === 'ACTIVE' ? 'Active Projects' : 'All Projects';
  const pageSubtitle = fixedStatus === 'ACTIVE'
    ? 'Sites currently in progress'
    : 'Manage client sites, work logs, and progress';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <Construction className="w-6 h-6 text-brand-500 shrink-0" />
            <span>{pageTitle}</span>
          </h2>
          <p className="page-subtitle">{pageSubtitle}</p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Search + Status filter */}
      <div className="card card-pad flex flex-col sm:flex-row gap-3">
        <div className="search-field flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search site name, address, or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!fixedStatus && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select sm:w-48 font-medium"
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        )}
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
        ) : projects.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <Construction className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No projects found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'No projects match your search.' : 'Add your first project/site to start logging work.'}
            </p>
            <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </div>
        ) : (
          <>
            {/* Card view up to lg */}
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((p) => (
                <li key={p.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline break-words"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        {p.client?.companyName}
                      </div>
                      {p.siteAddress && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1 line-clamp-2">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{p.siteAddress}</span>
                        </p>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${getStatusBadgeClass(p.status)}`}>{p.status.replace('_', ' ')}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Started {formatDate(p.startDate)}
                    </span>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {p.contactNumber && (
                        <a
                          href={`tel:${p.contactNumber}`}
                          className="btn-icon bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          aria-label={`Call ${p.name} site`}
                          title="Call Site Contact"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        to={`/projects/${p.id}`}
                        className="btn-icon btn-icon-soft"
                        aria-label={`View ${p.name}`}
                        title="View Project"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="btn-icon btn-icon-soft"
                        aria-label={`Edit ${p.name}`}
                        title="Edit Project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="btn-icon btn-danger-soft"
                        aria-label={`Delete ${p.name}`}
                        title="Delete Project"
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
                    <th scope="col">Project / Site</th>
                    <th scope="col">Client</th>
                    <th scope="col">Start Date</th>
                    <th scope="col">Expected Completion</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td className="max-w-[20rem]">
                        <Link
                          to={`/projects/${p.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-brand-500 transition-colors"
                        >
                          {p.name}
                        </Link>
                        {p.siteAddress && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal line-clamp-1 mt-0.5">
                            {p.siteAddress}
                          </div>
                        )}
                      </td>
                      <td className="text-slate-800 dark:text-slate-200">{p.client?.companyName || '—'}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(p.startDate)}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {p.expectedCompletion ? formatDate(p.expectedCompletion) : '—'}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getStatusBadgeClass(p.status)}`}>{p.status.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/projects/${p.id}`}
                            className="btn-icon btn-icon-soft hover:text-brand-500"
                            aria-label={`View ${p.name}`}
                            title="View Project Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="btn-icon btn-icon-soft hover:text-amber-500"
                            aria-label={`Edit ${p.name}`}
                            title="Edit Project"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="btn-icon btn-danger-soft"
                            aria-label={`Delete ${p.name}`}
                            title="Delete Project"
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
            <button onClick={() => fetchProjects(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>Load More Projects</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit project */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="2xl"
        title={editingProject ? 'Edit Project' : 'Add New Project'}
        icon={Construction}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="project-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingProject ? 'Save Changes' : 'Create Project'}
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

        <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="proj-client" className="label">Client *</label>
            <ClientAutocomplete
              id="proj-client"
              clients={clients}
              value={formData.clientId}
              onSelect={(c) => setFormData((prev) => ({ ...prev, clientId: c ? c.id : '' }))}
            />
          </div>

          <div>
            <label htmlFor="proj-name" className="label">Project / Site Name *</label>
            <input
              id="proj-name"
              type="text"
              required
              placeholder="e.g. Main Road Gate & Grill Work"
              value={formData.name}
              onChange={setField('name')}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="proj-address" className="label">Site Address *</label>
            <textarea
              id="proj-address"
              rows={2}
              required
              placeholder="Full site address…"
              value={formData.siteAddress}
              onChange={setField('siteAddress')}
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="proj-contact" className="label">Contact Number</label>
              <input
                id="proj-contact"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 9822011223"
                value={formData.contactNumber}
                onChange={setField('contactNumber')}
                className="input font-mono"
              />
            </div>
            <div>
              <label htmlFor="proj-status" className="label">Status</label>
              <select
                id="proj-status"
                value={formData.status}
                onChange={setField('status')}
                className="select font-medium"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="proj-start" className="label">Start Date *</label>
              <input
                id="proj-start"
                type="date"
                required
                value={formData.startDate}
                onChange={setField('startDate')}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="proj-completion" className="label">Expected Completion</label>
              <input
                id="proj-completion"
                type="date"
                value={formData.expectedCompletion}
                onChange={setField('expectedCompletion')}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proj-notes" className="label">Notes</label>
            <textarea
              id="proj-notes"
              rows={2}
              placeholder="Access instructions, site contact person, etc."
              value={formData.notes}
              onChange={setField('notes')}
              className="textarea"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
