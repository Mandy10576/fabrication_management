import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Receipt, Search, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Bills' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
];

const TABS = [
  { value: 'generate', label: 'Generate' },
  { value: 'all', label: 'All Bills' },
];

export const RentBills = () => {
  const toast = useToast();
  const [tab, setTab] = useState('generate');
  const [properties, setProperties] = useState([]);

  // Generate tab
  const [genPropertyId, setGenPropertyId] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingContractId, setGeneratingContractId] = useState(null);

  // All Bills tab
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyId, setPropertyId] = useState('');

  useEffect(() => {
    api.get('/rent/properties/all').then(setProperties).catch(() => {});
  }, []);

  const fetchContracts = async () => {
    try {
      setContractsLoading(true);
      const params = new URLSearchParams({ status: 'ACTIVE' });
      if (genPropertyId) params.set('propertyId', genPropertyId);
      const res = await api.get(`/rent/collection?${params.toString()}`);
      setContracts(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load contracts');
    } finally {
      setContractsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'generate') fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, genPropertyId]);

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (propertyId) params.set('propertyId', propertyId);
      const res = await api.get(`/rent/bills?${params.toString()}`);
      setBills(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load bills');
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'all') fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, status, propertyId]);

  const handleGenerateAll = async () => {
    try {
      setGeneratingAll(true);
      const res = await api.post('/rent/bills/generate', {});
      toast.success(res.generated > 0 ? `${res.generated} bill${res.generated > 1 ? 's' : ''} generated` : 'No new bills to generate — everything is up to date.');
      fetchContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to generate bills');
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleGenerateForContract = async (contractId) => {
    try {
      setGeneratingContractId(contractId);
      const res = await api.post('/rent/bills/generate', { contractId });
      toast.success(res.generated > 0 ? `${res.generated} bill${res.generated > 1 ? 's' : ''} generated` : 'No new bill to generate — the current cycle hasn\'t ended yet.');
      fetchContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to generate bill');
    } finally {
      setGeneratingContractId(null);
    }
  };

  const propertyOptions = [{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.id, label: p.name }))];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h2 className="page-title flex items-center gap-2">
          <Receipt className="w-6 h-6 text-brand-500 shrink-0" />
          <span>Bills</span>
        </h2>
        <p className="page-subtitle">Generate rent bills and browse every bill ever issued.</p>
      </div>

      <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold w-full sm:w-72">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${tab === t.value ? 'bg-white dark:bg-slate-900 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'generate' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:w-64">
              <SearchableSelect mode="button" value={genPropertyId} options={propertyOptions} onSelect={(opt) => setGenPropertyId(opt.value)} ariaLabel="Filter by property" />
            </div>
            <button onClick={handleGenerateAll} disabled={generatingAll} className="btn btn-primary sm:ml-auto">
              <RefreshCw className={`w-4 h-4 ${generatingAll ? 'animate-spin' : ''}`} />
              <span>{generatingAll ? 'Generating…' : 'Generate All Bills Now'}</span>
            </button>
          </div>

          <div className="card overflow-hidden">
            {contractsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : contracts.length === 0 ? (
              <div className="p-10 sm:p-16 text-center">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <div className="font-semibold text-slate-700 dark:text-slate-300">No active contracts found</div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {contracts.map((c) => (
                  <li key={c.contractId} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white">{c.tenant.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.room.property.name} · Room {c.room.roomNumber}</div>
                    </div>
                    <button
                      onClick={() => handleGenerateForContract(c.contractId)}
                      disabled={generatingContractId === c.contractId}
                      className="btn btn-sm btn-secondary shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingContractId === c.contractId ? 'animate-spin' : ''}`} />
                      <span>Generate Bills Now</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="search-field flex-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <input type="search" aria-label="Search bills" placeholder="Search by tenant, property, room…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="sm:w-44">
              <SearchableSelect mode="button" value={status} options={STATUS_FILTER_OPTIONS} onSelect={(opt) => setStatus(opt.value)} ariaLabel="Filter by status" />
            </div>
            <div className="sm:w-56">
              <SearchableSelect mode="button" value={propertyId} options={propertyOptions} onSelect={(opt) => setPropertyId(opt.value)} ariaLabel="Filter by property" />
            </div>
          </div>

          <div className="card overflow-hidden">
            {billsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : bills.length === 0 ? (
              <div className="p-10 sm:p-16 text-center">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <div className="font-semibold text-slate-700 dark:text-slate-300">No matching bills found</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Tenant</th>
                      <th scope="col">Property / Room</th>
                      <th scope="col">Cycle</th>
                      <th scope="col" className="text-right">Amount Due</th>
                      <th scope="col" className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b.id} className="cursor-pointer">
                        <td>
                          <Link to={`/rent/rooms/${b.contract.room.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
                            {b.contract.tenant.name}
                          </Link>
                        </td>
                        <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{b.contract.room.property.name} · {b.contract.room.roomNumber}</td>
                        <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(b.cycleStart)} – {formatDate(b.cycleEnd)}</td>
                        <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(b.amountDue)}</td>
                        <td className="text-center">
                          {b.status === 'PAID' ? (
                            <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              PAID
                            </span>
                          ) : (
                            <span className={`badge ${getStatusBadgeClass(b.status)}`}>{b.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
