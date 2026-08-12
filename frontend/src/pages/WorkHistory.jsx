import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SearchableSelect } from '../components/SearchableSelect';
import { History } from 'lucide-react';

export const WorkHistory = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');

  const fetchLogs = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      const cursorParam = isLoadMore && nextCursor ? `&cursor=${nextCursor}` : '';
      const projectParam = projectId ? `&projectId=${projectId}` : '';
      const res = await api.get(`/worklogs?limit=20${cursorParam}${projectParam}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    api.get('/projects?all=true').then(setProjects).catch(() => {});
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h2 className="page-title flex items-center gap-2">
          <History className="w-6 h-6 text-brand-500 shrink-0" />
          <span>Work History</span>
        </h2>
        <p className="page-subtitle">Every site visit logged across all projects, most recent first</p>
      </div>

      <div className="card card-pad flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchableSelect
            mode="button"
            value={projectId}
            options={[{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            onSelect={(opt) => setProjectId(opt.value)}
            ariaLabel="Filter by project"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No work logs found</div>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <li key={log.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/projects/${log.project?.id}`} className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                      {log.project?.name}
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{formatDate(log.visitDate)}</span>
                  </div>
                  {log.employees?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.employees.map((e) => <span key={e.id} className="badge badge-neutral">{e.name}</span>)}
                    </div>
                  )}
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(log.amount)} <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">({formatCurrency(log.paymentReceived)} received)</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Project / Site</th>
                    <th scope="col">Date</th>
                    <th scope="col">Employees</th>
                    <th scope="col" className="text-right">Work Value</th>
                    <th scope="col" className="text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <Link to={`/projects/${log.project?.id}`} className="hover:text-brand-500 transition-colors">{log.project?.name}</Link>
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(log.visitDate)}</td>
                      <td className="text-slate-600 dark:text-slate-300">
                        {log.employees?.map((e) => e.name).join(', ') || '—'}
                      </td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(log.amount)}</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(log.paymentReceived)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hasMore && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button onClick={() => fetchLogs(true)} disabled={loadingMore} className="btn btn-secondary">
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
