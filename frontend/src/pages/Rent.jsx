import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { StatCard } from '../components/StatCard';
import { SearchableSelect } from '../components/SearchableSelect';
import { isPushSupported, getPushStatus, enablePushNotifications, disablePushNotifications, sendTestNotification } from '../services/pushNotifications';
import {
  Building2, DoorOpen, CheckCircle2, Clock, Zap, Plus, Wallet, Search, MapPin, User, LayoutGrid, Edit2, Bell, BellRing
} from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'UNPAID', label: 'Unpaid' },
];

const cycleLabel = (c) => (c ? `${formatDate(c.cycleStart)} – ${formatDate(c.cycleEnd)}` : '—');

export const Rent = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Browser push notifications — rent due/overdue reminders
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'default', subscribed: false });
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = () => getPushStatus().then(setPushStatus).catch(() => {});

  useEffect(() => {
    refreshPushStatus();
  }, []);

  const handleTogglePush = async () => {
    setPushBusy(true);
    try {
      if (pushStatus.subscribed) {
        await disablePushNotifications();
        toast.success('Notifications turned off');
      } else {
        await enablePushNotifications();
        toast.success('Notifications enabled — you\'ll get a daily rent/electricity reminder.');
      }
      await refreshPushStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to update notification settings');
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const res = await sendTestNotification();
      toast.success(res.sent > 0 ? `Test notification sent (${res.sent})` : res.message);
    } catch (err) {
      toast.error(err.message || 'Failed to send test notification');
    }
  };

  // Unified tenant/room-wise overview
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [dueDate, setDueDate] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rent/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load rent dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      setRowsLoading(true);
      const params = new URLSearchParams({ status });
      if (search) params.set('search', search);
      if (propertyId) params.set('propertyId', propertyId);
      if (dueDate) params.set('dueDate', dueDate);
      const res = await api.get(`/rent/overview?${params.toString()}`);
      setRows(res);
    } catch (err) {
      console.error('Failed to load rent overview:', err);
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, propertyId, dueDate]);

  useEffect(() => {
    api.get('/rent/properties/all').then(setProperties).catch(() => {});
  }, []);

  const propertyOptions = [{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.id, label: p.name }))];

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading rent dashboard">
        <div className="skeleton h-28 sm:h-32 rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
        <span className="sr-only">Loading rent dashboard…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 text-white shadow-pop">
        <div className="min-w-0">
          <span className="inline-block px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2">
            Rent Overview
          </span>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
            Property & Tenant Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl">
            Properties, rooms, tenants, and rent collection in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:flex gap-2 shrink-0">
          <Link to="/rent/properties" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Manage Properties</span>
          </Link>
          <Link to="/rent/collection" className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm">
            <Wallet className="w-4 h-4" />
            <span>Collect Rent</span>
          </Link>
          {pushStatus.supported && pushStatus.permission !== 'denied' && (
            <button
              onClick={handleTogglePush}
              disabled={pushBusy}
              className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm col-span-2 lg:col-span-1"
            >
              {pushStatus.subscribed ? <BellRing className="w-4 h-4 text-emerald-400" /> : <Bell className="w-4 h-4" />}
              <span>{pushBusy ? 'Please wait…' : pushStatus.subscribed ? 'Notifications On' : 'Enable Notifications'}</span>
            </button>
          )}
          {pushStatus.supported && pushStatus.permission === 'denied' && (
            <span className="col-span-2 lg:col-span-1 text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
              <Bell className="w-3.5 h-3.5 shrink-0" />
              Notifications blocked — enable in browser settings
            </span>
          )}
          {!pushStatus.supported && !pushStatus.secure && (
            <span className="col-span-2 lg:col-span-1 text-[11px] text-slate-400 flex items-center gap-1.5 px-1" title="Push notifications need HTTPS (or localhost). Open this site over https, or on the same computer via localhost, to enable them.">
              <Bell className="w-3.5 h-3.5 shrink-0" />
              Notifications need HTTPS — not available on this connection
            </span>
          )}
        </div>
      </div>

      {pushStatus.subscribed && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 -mt-2 px-1">
          <span>You'll get a daily reminder here for pending rent &amp; electricity.</span>
          <button onClick={handleTestNotification} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0">
            Send test notification
          </button>
        </div>
      )}

      {/* Primary stat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Properties" value={data.totalProperties} subtitle={`${data.totalRooms} rooms total`} icon={Building2} color="brand" />
        <StatCard title="Occupied Rooms" value={data.occupiedRooms} subtitle={`${data.vacantRooms} vacant`} icon={DoorOpen} color="purple" />
        <StatCard title="Collected (This Cycle)" value={formatCurrency(data.collectedRent)} subtitle={`Expected ${formatCurrency(data.expectedRent)}`} icon={CheckCircle2} color="emerald" />
        <StatCard title="Rent Pending" value={formatCurrency(data.pendingRent)} subtitle="Across all bills" icon={Clock} color="rose" />
      </div>

      {/* Unified tenant/room-wise payment overview */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-brand-500" />
          <span>Tenant &amp; Room Payment Overview</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Rent and electricity combined into one balance per occupied room. Electricity only counts where billing is enabled for that property.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-field flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input type="search" aria-label="Search tenant, room or property" placeholder="Search tenant, room no. or property…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sm:w-48">
          <SearchableSelect mode="button" value={propertyId} options={propertyOptions} onSelect={(opt) => setPropertyId(opt.value)} ariaLabel="Filter by property" />
        </div>
        <div className="sm:w-40">
          <SearchableSelect mode="button" value={status} options={STATUS_FILTER_OPTIONS} onSelect={(opt) => setStatus(opt.value)} ariaLabel="Filter by payment status" />
        </div>
        <div className="sm:w-44">
          <input type="date" aria-label="Due on or before" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" title="Due on or before" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {rowsLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <LayoutGrid className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No occupied rooms found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {search || status !== 'ALL' || propertyId || dueDate ? 'No rooms match your filters.' : 'Occupy a room to start tracking combined rent & electricity dues.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <li key={row.contractId}>
                  <Link to={`/rent/rooms/${row.roomId}`} className="block p-4 pb-2.5 space-y-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {row.tenant.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {row.property.name} · Room {row.room.roomNumber}
                        </div>
                      </div>
                      <span className={`badge shrink-0 ${getStatusBadgeClass(row.status)}`}>{row.status}</span>
                    </div>
                    <div className="text-xs text-slate-400">{cycleLabel(row.currentCycle)}</div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Rent</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(row.rentCharge)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Electricity</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {row.property.electricityBilling ? formatCurrency(row.electricityCharge) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Total Due</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(row.totalAmount)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Paid {formatCurrency(row.totalPaid)}</span>
                      <span className={`text-xs font-bold ${row.balance > 0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Balance {formatCurrency(row.balance)}
                      </span>
                    </div>
                  </Link>
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button onClick={() => navigate(`/rent/rooms/${row.roomId}?action=pay`)} className="btn btn-sm btn-emerald flex-1">
                      <Wallet className="w-4 h-4" />
                      <span>{row.balance > 0.01 ? 'Record Payment' : 'Payments'}</span>
                    </button>
                    <button onClick={() => navigate(`/rent/rooms/${row.roomId}?action=edit`)} className="btn-icon btn-icon-soft" aria-label="Edit payments" title="Edit payments">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Property / Room</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Rent Cycle / Due</th>
                    <th scope="col" className="text-right">Monthly Rent</th>
                    <th scope="col" className="text-right">Electricity</th>
                    <th scope="col" className="text-right">Total Due</th>
                    <th scope="col" className="text-right">Paid</th>
                    <th scope="col" className="text-right">Balance</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.contractId}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => navigate(`/rent/rooms/${row.roomId}`)}
                    >
                      <td>
                        <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.property.name} · {row.room.roomNumber}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">{row.property.city}</div>
                      </td>
                      <td className="text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">{row.tenant.name}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{cycleLabel(row.currentCycle)}</td>
                      <td className="text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatCurrency(row.rentCharge)}</td>
                      <td className="text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {row.property.electricityBilling ? (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {formatCurrency(row.electricityCharge)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(row.totalAmount)}</td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(row.totalPaid)}</td>
                      <td className={`text-right font-bold whitespace-nowrap ${row.balance > 0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="text-center"><span className={`badge ${getStatusBadgeClass(row.status)}`}>{row.status}</span></td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/rent/rooms/${row.roomId}?action=edit`)} className="btn-icon btn-icon-soft hover:text-brand-500" aria-label={`Edit payments for ${row.tenant.name}`} title="Edit payments">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/rent/rooms/${row.roomId}?action=pay`)} className="btn-icon btn-icon-soft hover:text-emerald-500" aria-label={`Record payment for ${row.tenant.name}`} title="Record payment">
                            <Wallet className="w-4 h-4" />
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
      </div>
    </div>
  );
};
