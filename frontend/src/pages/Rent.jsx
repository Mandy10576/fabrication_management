import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';
import { StatCard } from '../components/StatCard';
import { getPushStatus, enablePushNotifications, disablePushNotifications, sendTestNotification } from '../services/pushNotifications';
import { Building2, DoorOpen, CheckCircle2, Clock, Plus, Wallet, Bell, BellRing } from 'lucide-react';

export const Rent = () => {
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

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading rent dashboard">
        <div className="skeleton h-28 sm:h-32 rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
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
    </div>
  );
};
