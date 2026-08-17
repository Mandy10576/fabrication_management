import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { downloadPDF, sharePDF } from '../utils/pdfExport';
import { Receipt, Search, RefreshCw, Zap, CheckCircle2, Download, Send, Loader2, MapPin, User, Home, ClipboardCheck } from 'lucide-react';

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

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const RentBills = () => {
  const toast = useToast();
  const [tab, setTab] = useState('generate');
  const [properties, setProperties] = useState([]);

  // Generate tab — Select Property, then Select Room; the matching contract's
  // info loads automatically, then admin generates that one bill.
  const [genPropertyId, setGenPropertyId] = useState('');
  const [genRoomId, setGenRoomId] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingContractId, setGeneratingContractId] = useState(null);
  const [genRentAmount, setGenRentAmount] = useState('');
  const [genLateFee, setGenLateFee] = useState('');
  const [genDiscountAmount, setGenDiscountAmount] = useState('');
  const [genMiscAmount, setGenMiscAmount] = useState('');
  const [genMiscLabel, setGenMiscLabel] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [genRoomDetail, setGenRoomDetail] = useState(null);
  const [genRoomDetailLoading, setGenRoomDetailLoading] = useState(false);
  const [genPreviousReading, setGenPreviousReading] = useState('');
  const [genCurrentReading, setGenCurrentReading] = useState('');

  // All Bills tab
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyId, setPropertyId] = useState('');
  const [downloadingBillId, setDownloadingBillId] = useState(null);
  const [sharingBillId, setSharingBillId] = useState(null);

  const billPdfFilename = (bill) => `Rent_Bill_${bill.contract.tenant.name.replace(/\s+/g, '_')}_${new Date(bill.cycleStart).toISOString().slice(0, 7)}.pdf`;

  const handleDownloadBillPdf = async (bill) => {
    setDownloadingBillId(bill.id);
    try {
      await downloadPDF('rent-bill', billPdfFilename(bill), bill.id, 'rent-bill');
    } finally {
      setDownloadingBillId(null);
    }
  };

  const handleShareBillPdf = async (bill) => {
    setSharingBillId(bill.id);
    try {
      const filename = billPdfFilename(bill);
      const shared = await sharePDF(bill.id, 'rent-bill', filename);
      if (!shared) {
        toast.warning('Sharing files isn’t supported on this browser — downloading the PDF instead.');
        await downloadPDF('rent-bill', filename, bill.id, 'rent-bill');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(err.message || 'Failed to share bill PDF');
    } finally {
      setSharingBillId(null);
    }
  };

  useEffect(() => {
    api.get('/rent/properties/all').then(setProperties).catch(() => {});
  }, []);

  // /rent/collection already scopes to ACTIVE contracts on its own — its
  // `status` query param means something different (filters by the current
  // cycle's PAID/PARTIAL/UNPAID bill status, not the contract's own
  // ACTIVE/ENDED status), so it must NOT be passed here. Doing so used to
  // silently zero out every row, since no cycle ever has status "ACTIVE".
  const fetchContracts = async () => {
    try {
      setContractsLoading(true);
      const params = new URLSearchParams();
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

  // Property changed — the previously selected room may no longer be valid.
  useEffect(() => {
    setGenRoomId('');
    setGenRentAmount('');
    setGenLateFee('');
    setGenDiscountAmount('');
    setGenMiscAmount('');
    setGenMiscLabel('');
    setGenNotes('');
  }, [genPropertyId]);

  // Room selected — prefill Monthly Rent from the loaded contract, and load
  // electricity meter info (meter number, rate, last reading) so the
  // reading fields can prefill too.
  useEffect(() => {
    setGenCurrentReading('');
    setGenLateFee('');
    setGenDiscountAmount('');
    setGenMiscAmount('');
    setGenMiscLabel('');
    setGenNotes('');
    if (!genRoomId) {
      setGenRoomDetail(null);
      setGenPreviousReading('');
      setGenRentAmount('');
      return;
    }
    const contract = contracts.find((c) => c.room.id === genRoomId);
    setGenRentAmount(contract ? contract.monthlyRent : '');
    setGenRoomDetailLoading(true);
    api.get(`/rent/rooms/${genRoomId}`)
      .then((room) => {
        setGenRoomDetail(room);
        const lastBill = room.electricityBills?.[0];
        setGenPreviousReading(lastBill?.currentReading ?? '');
      })
      .catch(() => setGenRoomDetail(null))
      .finally(() => setGenRoomDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genRoomId, contracts]);

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

  // After a successful generate, jump to "All Bills" so the new bill is
  // immediately visible — the Generate tab only ever lists contracts, never
  // the bills it produces, so staying there hides the very thing just made.
  const showInAllBills = (searchTerm = '') => {
    setSearch(searchTerm);
    setStatus('ALL');
    setTab('all');
  };

  const handleGenerateAll = async () => {
    try {
      setGeneratingAll(true);
      const res = await api.post('/rent/bills/generate', {});
      if (res.generated > 0) {
        toast.success(`${res.generated} bill${res.generated > 1 ? 's' : ''} generated`);
        showInAllBills('');
      } else {
        toast.success('No new bills to generate — everything is up to date.');
      }
      fetchContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to generate bills');
    } finally {
      setGeneratingAll(false);
    }
  };

  const selectedContract = contracts.find((c) => c.room.id === genRoomId) || null;
  const hasElectricity = !!genRoomDetail?.property?.electricityBilling;
  const hasPriorElectricityBill = (genRoomDetail?.electricityBills?.length || 0) > 0;
  const unitsConsumed = hasElectricity && genCurrentReading !== '' && genPreviousReading !== ''
    ? Math.max(0, round2(parseFloat(genCurrentReading) - parseFloat(genPreviousReading)))
    : null;
  const electricityAmountPreview = unitsConsumed !== null ? round2(unitsConsumed * (genRoomDetail?.property?.electricityRate || 0)) : null;

  // Bill Summary Preview — purely informational, computed client-side from
  // whatever's currently typed; doesn't change what gets written (the rent
  // bill and electricity bill are still two independent records).
  const previewRent = parseFloat(genRentAmount) || 0;
  const previewLateFee = parseFloat(genLateFee) || 0;
  const previewDiscount = parseFloat(genDiscountAmount) || 0;
  const previewMisc = parseFloat(genMiscAmount) || 0;
  const previewPreviousBalance = selectedContract?.totalPending || 0;
  const previewNetDue = round2(
    Math.max(0, previewRent + previewLateFee + previewMisc - previewDiscount)
    + (electricityAmountPreview || 0)
    + previewPreviousBalance
  );

  const resetGenerateForm = () => {
    setGenRoomId('');
    setGenRentAmount('');
    setGenLateFee('');
    setGenDiscountAmount('');
    setGenMiscAmount('');
    setGenMiscLabel('');
    setGenNotes('');
    setGenCurrentReading('');
  };

  // Generates the rent bill, then — if this room bills electricity and a
  // current reading was entered — generates the electricity bill too, via
  // the existing separate-ledger endpoint. Two independent writes under one
  // admin action; each can succeed/fail on its own, so both outcomes are
  // reported.
  //
  // Always produces a bill: tries the normal (cycle-must-have-ended) path
  // first, and if there's nothing billable that way (the current cycle just
  // hasn't ended yet), automatically falls back to force-generating that
  // in-progress cycle — the admin only ever sees one "Generate Bill" action.
  const handleGenerate = async (contract) => {
    if (genMiscAmount && parseFloat(genMiscAmount) > 0 && !genMiscLabel.trim()) {
      toast.error('Enter what the miscellaneous charge is for.');
      return;
    }
    if (hasElectricity && genCurrentReading !== '') {
      if (!hasPriorElectricityBill && genPreviousReading === '') {
        toast.error('This is the first electricity bill for this room — enter a starting (previous) reading.');
        return;
      }
      if (parseFloat(genCurrentReading) < parseFloat(genPreviousReading || 0)) {
        toast.error('Current reading cannot be less than the previous reading.');
        return;
      }
    }

    try {
      setGeneratingContractId(contract.contractId);
      const messages = [];

      const billBody = {
        contractId: contract.contractId,
        rentAmount: genRentAmount,
        lateFee: genLateFee || 0,
        discountAmount: genDiscountAmount || 0,
        miscAmount: genMiscAmount || 0,
        miscLabel: genMiscLabel,
        notes: genNotes
      };

      let res = await api.post('/rent/bills/generate', billBody);
      let forced = false;
      if (res.generated === 0) {
        res = await api.post('/rent/bills/generate', { ...billBody, force: true });
        forced = true;
      }
      messages.push(
        res.generated > 0
          ? `Rent bill generated${forced ? ' for the current cycle' : ''}.`
          : 'A bill for this cycle already exists.'
      );

      if (hasElectricity && genCurrentReading !== '') {
        try {
          const elecRes = await api.post(`/rent/rooms/${contract.room.id}/electricity`, {
            currentReading: genCurrentReading,
            previousReading: hasPriorElectricityBill ? undefined : genPreviousReading
          });
          messages.push(`Electricity bill generated: ${elecRes.unitsConsumed} units, ₹${elecRes.amount}.`);
        } catch (elecErr) {
          messages.push(`Electricity bill failed: ${elecErr.message || 'unknown error'}`);
        }
      }

      toast.success(messages.join(' '));
      resetGenerateForm();
      showInAllBills(contract.tenant.name);
      fetchContracts();
    } catch (err) {
      toast.error(err.message || 'Failed to generate bill');
    } finally {
      setGeneratingContractId(null);
    }
  };

  const propertyOptions = [{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.id, label: p.name }))];
  const genPropertyOptions = properties.map((p) => ({ value: p.id, label: p.name }));
  const genRoomOptions = contracts.map((c) => ({ value: c.room.id, label: `Room ${c.room.roomNumber} — ${c.tenant.name}` }));

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
          <div className="card p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="section-label mb-2">Select Property *</h3>
              <SearchableSelect
                mode="button"
                value={genPropertyId}
                options={genPropertyOptions}
                onSelect={(opt) => setGenPropertyId(opt.value)}
                placeholder="Choose a property…"
                ariaLabel="Select property"
              />
            </div>

            <div>
              <h3 className="section-label mb-2">Select Room *</h3>
              <SearchableSelect
                mode="button"
                value={genRoomId}
                options={genRoomOptions}
                onSelect={(opt) => setGenRoomId(opt.value)}
                placeholder={genPropertyId ? 'Choose a room…' : 'Select a property first'}
                disabled={!genPropertyId}
                ariaLabel="Select room"
              />
            </div>

            {contractsLoading && genPropertyId ? (
              <div className="skeleton h-32 rounded-xl" />
            ) : genPropertyId && genRoomOptions.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">No active contracts found for this property.</p>
            ) : selectedContract ? (
              <div className="rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50/60 dark:bg-brand-950/20 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-brand-600 dark:text-brand-400">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Loaded Contract Info
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Tenant:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedContract.tenant.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Location:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Room {selectedContract.room.roomNumber} at {selectedContract.room.property.name}</span>
                  </div>
                  {selectedContract.electricityBilling && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">Electricity Pending:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedContract.electricityPending || 0)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {selectedContract.totalPending > 0
                    ? `Rent pending: ${formatCurrency(selectedContract.totalPending)}. Clicking Generate will bill the next cycle if it has ended.`
                    : 'This contract is settled — clicking Generate will bill the next cycle once it has ended.'}
                </p>

                {hasElectricity && (
                  <div className="pt-2 border-t border-brand-200/60 dark:border-brand-900/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-2 mt-2">
                      <Zap className="w-3.5 h-3.5" />
                      Electricity Meter Reading (optional — bills electricity too)
                    </div>
                    {genRoomDetailLoading ? (
                      <div className="skeleton h-10 rounded-lg" />
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Meter Number: </span>
                            <span className="font-bold text-slate-900 dark:text-white">{genRoomDetail?.electricityMeterNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Rate/Unit: </span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{genRoomDetail?.property?.electricityRate ?? 0}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="gen-prev-reading" className="label">Previous Reading {hasPriorElectricityBill ? '' : '*'}</label>
                            <input
                              id="gen-prev-reading"
                              type="number"
                              step="any"
                              placeholder={hasPriorElectricityBill ? '' : 'Starting reading'}
                              value={genPreviousReading}
                              onChange={(e) => setGenPreviousReading(e.target.value)}
                              disabled={hasPriorElectricityBill}
                              className="input"
                            />
                          </div>
                          <div>
                            <label htmlFor="gen-curr-reading" className="label">Current Reading</label>
                            <input
                              id="gen-curr-reading"
                              type="number"
                              step="any"
                              placeholder="Enter to also bill electricity"
                              value={genCurrentReading}
                              onChange={(e) => setGenCurrentReading(e.target.value)}
                              className="input"
                            />
                          </div>
                        </div>
                        {unitsConsumed !== null && (
                          <div className="flex items-center gap-1.5 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white">{unitsConsumed} units consumed</span>
                            <span className="text-slate-500 dark:text-slate-400 ml-auto">≈ {formatCurrency(electricityAmountPreview)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-brand-200/60 dark:border-brand-900/60 space-y-3 mt-2">
                  <div>
                    <label htmlFor="gen-rent-amount" className="label">Monthly Rent (₹)</label>
                    <input
                      id="gen-rent-amount"
                      type="number"
                      min="0"
                      step="any"
                      value={genRentAmount}
                      onChange={(e) => setGenRentAmount(e.target.value)}
                      className="input font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="gen-late-fee" className="label">Late Fee (₹)</label>
                      <input
                        id="gen-late-fee"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={genLateFee}
                        onChange={(e) => setGenLateFee(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="gen-discount" className="label">Discount Amount (₹)</label>
                      <input
                        id="gen-discount"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={genDiscountAmount}
                        onChange={(e) => setGenDiscountAmount(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gen-misc-amount" className="label">Other Miscellaneous (₹)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        id="gen-misc-amount"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={genMiscAmount}
                        onChange={(e) => setGenMiscAmount(e.target.value)}
                        className="input"
                      />
                      {parseFloat(genMiscAmount) > 0 && (
                        <input
                          type="text"
                          placeholder="What is this charge for?"
                          value={genMiscLabel}
                          onChange={(e) => setGenMiscLabel(e.target.value)}
                          className="input"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gen-notes" className="label">Invoice Notes / Grace Conditions</label>
                    <textarea
                      id="gen-notes"
                      rows={2}
                      placeholder="Optional"
                      value={genNotes}
                      onChange={(e) => setGenNotes(e.target.value)}
                      className="textarea"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Bill Summary Preview</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Base Monthly Rent</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(previewRent)}</span>
                  </div>
                  {previewLateFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Late Fee</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(previewLateFee)}</span>
                    </div>
                  )}
                  {previewMisc > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{genMiscLabel || 'Miscellaneous'}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(previewMisc)}</span>
                    </div>
                  )}
                  {previewDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Discount</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">− {formatCurrency(previewDiscount)}</span>
                    </div>
                  )}
                  {electricityAmountPreview !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Power Charges ({unitsConsumed} units)</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(electricityAmountPreview)}</span>
                    </div>
                  )}
                  {previewPreviousBalance > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-rose-600 dark:text-rose-400">Previous Balance Carryover</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(previewPreviousBalance)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Total Net Due</span>
                    <span className="font-bold text-lg text-brand-600 dark:text-brand-400">{formatCurrency(previewNetDue)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleGenerate(selectedContract)}
                    disabled={generatingContractId === selectedContract.contractId}
                    className="btn btn-primary w-full"
                  >
                    <RefreshCw className={`w-4 h-4 ${generatingContractId === selectedContract.contractId ? 'animate-spin' : ''}`} />
                    <span>{generatingContractId === selectedContract.contractId ? 'Generating…' : 'Generate Bill'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button onClick={handleGenerateAll} disabled={generatingAll} className="btn btn-secondary">
              <RefreshCw className={`w-4 h-4 ${generatingAll ? 'animate-spin' : ''}`} />
              <span>{generatingAll ? 'Generating…' : 'Generate All Bills Now'}</span>
            </button>
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
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <Link to={`/rent/rooms/${b.contract.room.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5">
                            {b.contract.tenant.name}
                            {b.forced && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800">Forced</span>}
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
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleShareBillPdf(b)}
                              disabled={sharingBillId === b.id}
                              className="btn-icon btn-icon-soft hover:text-emerald-500"
                              aria-label={`Share bill PDF for ${b.contract.tenant.name}`}
                              title="Share PDF"
                            >
                              {sharingBillId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDownloadBillPdf(b)}
                              disabled={downloadingBillId === b.id}
                              className="btn-icon btn-icon-soft hover:text-brand-500"
                              aria-label={`Download bill PDF for ${b.contract.tenant.name}`}
                              title="Download PDF"
                            >
                              {downloadingBillId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                          </div>
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
