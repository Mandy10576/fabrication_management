import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { downloadPDF, sharePDF } from '../utils/pdfExport';
import {
  FileText, ArrowLeft, User, Home, CalendarDays, Zap, Receipt, RefreshCw,
  LogOut, Trash2, Download, Send, Loader2, AlertCircle, PlusCircle
} from 'lucide-react';

const cycleLabel = (c) => `${formatDate(c.cycleStart)} – ${formatDate(c.cycleEnd)}`;

const LATE_FEE_LABELS = { NONE: 'None', FIXED_AMOUNT: 'Fixed Amount', PERCENTAGE: 'Percentage of Rent' };

export const RentContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyBillId, setBusyBillId] = useState(null); // `${billId}:download` | `${billId}:share`

  // Miscellaneous charge modal — attach/edit/clear a one-off extra charge on a bill.
  const [chargeCycle, setChargeCycle] = useState(null);
  const [chargeEnabled, setChargeEnabled] = useState(false);
  const [chargeLabel, setChargeLabel] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [savingCharge, setSavingCharge] = useState(false);
  const [chargeError, setChargeError] = useState('');

  const fetchContract = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/rent/contracts/${id}`);
      setContract(res);
    } catch (err) {
      setFailed(true);
      toast.error(err.message || 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Always produces a bill: tries the normal (cycle-must-have-ended) path
  // first, and if there's nothing billable that way (the current cycle just
  // hasn't ended yet), automatically falls back to force-generating that
  // in-progress cycle — a single "Generate Bill" action either way.
  const handleGenerateBill = async () => {
    try {
      setGenerating(true);
      let res = await api.post('/rent/bills/generate', { contractId: id });
      let forced = false;
      if (res.generated === 0) {
        res = await api.post('/rent/bills/generate', { contractId: id, force: true });
        forced = true;
      }
      toast.success(res.generated > 0 ? `Bill generated${forced ? ' for the current cycle' : ''}` : 'A bill for this cycle already exists.');
      fetchContract();
    } catch (err) {
      toast.error(err.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const handleEndContract = async () => {
    const ok = await confirm({
      title: `End this contract?`,
      message: `This moves ${contract.tenant.name} out and marks Room ${contract.room.roomNumber} vacant. Their rent and payment history is kept permanently.`,
      confirmText: 'End Contract'
    });
    if (!ok) return;
    try {
      setEnding(true);
      await api.patch(`/rent/contracts/${id}/end`, { endDate: new Date().toISOString().split('T')[0] });
      toast.success('Contract ended — room is now vacant');
      fetchContract();
    } catch (err) {
      toast.error(err.message || 'Failed to end contract');
    } finally {
      setEnding(false);
    }
  };

  const handleDeleteContract = async () => {
    const ok = await confirm({
      title: `Delete this contract permanently?`,
      message: `This permanently removes ${contract.tenant.name}'s contract and every rent bill/payment under it. This cannot be undone.`,
      confirmText: 'Delete Contract'
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await api.delete(`/rent/contracts/${id}`);
      toast.success('Contract deleted');
      navigate(`/rent/rooms/${contract.room.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete contract');
      setDeleting(false);
    }
  };

  const handleDownloadBillPdf = async (cycle) => {
    setBusyBillId(`${cycle.billId}:download`);
    try {
      const filename = `Rent_Bill_${contract.tenant.name.replace(/\s+/g, '_')}_${new Date(cycle.cycleStart).toISOString().slice(0, 7)}.pdf`;
      await downloadPDF('rent-bill', filename, cycle.billId, 'rent-bill');
    } finally {
      setBusyBillId(null);
    }
  };

  const handleShareBillPdf = async (cycle) => {
    setBusyBillId(`${cycle.billId}:share`);
    try {
      const filename = `Rent_Bill_${contract.tenant.name.replace(/\s+/g, '_')}_${new Date(cycle.cycleStart).toISOString().slice(0, 7)}.pdf`;
      const shared = await sharePDF(cycle.billId, 'rent-bill', filename);
      if (!shared) {
        toast.warning('Sharing files isn’t supported on this browser — downloading the PDF instead.');
        await downloadPDF('rent-bill', filename, cycle.billId, 'rent-bill');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(err.message || 'Failed to share bill PDF');
    } finally {
      setBusyBillId(null);
    }
  };

  const handleOpenChargeModal = (cycle) => {
    setChargeCycle(cycle);
    setChargeEnabled((cycle.miscAmount || 0) > 0);
    setChargeLabel(cycle.miscLabel || '');
    setChargeAmount(cycle.miscAmount > 0 ? cycle.miscAmount : '');
    setChargeError('');
  };

  const handleSubmitCharge = async (e) => {
    e.preventDefault();
    setChargeError('');
    if (chargeEnabled && !chargeLabel.trim()) {
      setChargeError('Enter what this charge is for.');
      return;
    }
    if (chargeEnabled && (!chargeAmount || parseFloat(chargeAmount) <= 0)) {
      setChargeError('Enter a valid charge amount.');
      return;
    }
    try {
      setSavingCharge(true);
      await api.patch(`/rent/bills/${chargeCycle.billId}/charge`, {
        miscAmount: chargeEnabled ? chargeAmount : 0,
        miscLabel: chargeEnabled ? chargeLabel.trim() : ''
      });
      toast.success(chargeEnabled ? 'Miscellaneous charge saved' : 'Miscellaneous charge removed');
      setChargeCycle(null);
      fetchContract();
    } catch (err) {
      setChargeError(err.message || 'Failed to save charge');
    } finally {
      setSavingCharge(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading contract">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (failed || !contract) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Contract not found</div>
        <button onClick={fetchContract} className="btn btn-primary mt-5">Try Again</button>
      </div>
    );
  }

  const cycles = contract.summary?.cycles || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to={`/rent/rooms/${contract.room.id}`} className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Room {contract.room.roomNumber}</span>
      </Link>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Contract Details</span>
          </h2>
          <span className={`badge ${getStatusBadgeClass(contract.status)}`}>{contract.status}</span>
        </div>

        <h3 className="section-label mb-2.5">Contract Associations</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden mb-5">
          <Link to={`/rent/tenants`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Tenant</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{contract.tenant.name}</div>
              </div>
            </div>
          </Link>
          <Link to={`/rent/rooms/${contract.room.id}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Room & Property</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Room {contract.room.roomNumber} at {contract.room.property.name}</div>
              </div>
            </div>
          </Link>
        </div>

        <h3 className="section-label mb-2.5">Rental Information</h3>
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 mb-5">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Start Date</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatDate(contract.startDate)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">End Date</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{contract.endDate ? formatDate(contract.endDate) : 'Open-ended'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Monthly Rent</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(contract.monthlyRent)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Security Deposit</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(contract.depositAmount || 0)}</div>
          </div>
        </div>

        {contract.room.property.electricityBilling && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 mb-5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Electricity Rate</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 ml-auto">₹{contract.room.property.electricityRate} / unit</span>
          </div>
        )}

        <h3 className="section-label mb-2.5 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          Invoicing Parameters
        </h3>
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 mb-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Rent Cycle Start Day</span>
            <span className="font-bold text-slate-900 dark:text-white">Day {new Date(contract.startDate).getUTCDate()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Grace Period</span>
            <span className="font-bold text-slate-900 dark:text-white">{contract.gracePeriodDays} day{contract.gracePeriodDays === 1 ? '' : 's'} after cycle ends</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Late Fee Policy</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {LATE_FEE_LABELS[contract.lateFeePolicy] || 'None'}
              {contract.lateFeePolicy !== 'NONE' && `: ${contract.lateFeePolicy === 'FIXED_AMOUNT' ? formatCurrency(contract.lateFeeValue) : `${contract.lateFeeValue}%`}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {contract.status === 'ACTIVE' && (
            <button onClick={handleGenerateBill} disabled={generating} className="btn btn-primary flex-1">
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating…' : 'Generate Bill for This Contract'}</span>
            </button>
          )}
          {contract.status === 'ACTIVE' && (
            <button onClick={handleEndContract} disabled={ending} className="btn btn-danger-soft flex-1">
              <LogOut className="w-4 h-4" />
              <span>{ending ? 'Ending…' : 'End Contract'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-brand-500" />
          <span>Contract Bills History</span>
        </h3>
        {cycles.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No bills generated yet for this contract.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cycles.map((c) => (
              <li key={c.billId} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {cycleLabel(c)}
                    {c.forced && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800">Forced</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(c.expected)}
                    {c.pending > 0 ? <span className="text-rose-600 dark:text-rose-400"> · {formatCurrency(c.pending)} due</span> : <span className="text-emerald-600 dark:text-emerald-400"> · Settled</span>}
                  </div>
                  {c.miscAmount > 0 && (
                    <div className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                      + {c.miscLabel}: {formatCurrency(c.miscAmount)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  <button
                    onClick={() => handleOpenChargeModal(c)}
                    className="btn-icon w-7 h-7 text-slate-400 hover:text-violet-500"
                    aria-label="Add miscellaneous charge"
                    title={c.miscAmount > 0 ? 'Edit miscellaneous charge' : 'Add miscellaneous charge'}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleShareBillPdf(c)}
                    disabled={busyBillId === `${c.billId}:share`}
                    className="btn-icon w-7 h-7 text-slate-400 hover:text-emerald-500"
                    aria-label="Share bill PDF"
                    title="Share PDF"
                  >
                    {busyBillId === `${c.billId}:share` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDownloadBillPdf(c)}
                    disabled={busyBillId === `${c.billId}:download`}
                    className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500"
                    aria-label="Download bill PDF"
                    title="Download PDF"
                  >
                    {busyBillId === `${c.billId}:download` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4 sm:p-6 border-rose-200 dark:border-rose-900">
        <h3 className="section-label mb-2 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Danger Zone
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Permanently deletes this contract and every rent bill/payment recorded under it. This cannot be undone — prefer "End Contract" above if you just want to mark the tenant as moved out.
        </p>
        <button onClick={handleDeleteContract} disabled={deleting} className="btn btn-danger w-full sm:w-auto">
          <Trash2 className="w-4 h-4" />
          <span>{deleting ? 'Deleting…' : 'Delete Contract'}</span>
        </button>
      </div>

      <Modal
        open={!!chargeCycle}
        onClose={() => setChargeCycle(null)}
        title="Miscellaneous Charge"
        icon={PlusCircle}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setChargeCycle(null)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="misc-charge-form" disabled={savingCharge} className="btn btn-primary sm:min-w-[9rem]">
              {savingCharge ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {chargeCycle && (
          <form id="misc-charge-form" onSubmit={handleSubmitCharge} className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{cycleLabel(chargeCycle)}</div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={chargeEnabled}
                onChange={(e) => setChargeEnabled(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a miscellaneous charge to this bill</span>
            </label>

            {chargeEnabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="mc-label" className="label">What is this charge for? *</label>
                  <input
                    id="mc-label"
                    type="text"
                    placeholder="e.g. Repair charges, Cleaning fee…"
                    value={chargeLabel}
                    onChange={(e) => setChargeLabel(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="mc-amount" className="label">Amount (₹) *</label>
                  <input
                    id="mc-amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    className="input font-semibold"
                  />
                </div>
              </div>
            )}

            {chargeError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{chargeError}</span>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};
