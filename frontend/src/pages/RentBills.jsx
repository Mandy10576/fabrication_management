import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { downloadPDF, sharePDF } from '../utils/pdfExport';
import { Receipt, Search, RefreshCw, Zap, CheckCircle2, Download, Send, Loader2, MapPin, User, Home, ClipboardCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Bills' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
];

const SORT_OPTIONS = [
  { value: 'cycle_desc', label: 'Newest Cycle First' },
  { value: 'cycle_asc', label: 'Oldest Cycle First' },
  { value: 'due_desc', label: 'Amount Due: High to Low' },
  { value: 'due_asc', label: 'Amount Due: Low to High' },
  { value: 'tenant_asc', label: 'Tenant: A to Z' },
  { value: 'tenant_desc', label: 'Tenant: Z to A' },
  { value: 'status_asc', label: 'Status' },
];

const TABS = [
  { value: 'generate', label: 'Generate' },
  { value: 'all', label: 'All Bills' },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const RentBills = () => {
  const toast = useToast();
  const confirm = useConfirm();
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
  // Every unbilled cycle for the loaded contract, oldest first — lets the
  // admin explicitly pick which month to generate instead of the system
  // silently deciding "whatever's next" behind the scenes.
  const [billableMonths, setBillableMonths] = useState([]);
  const [billableMonthsLoading, setBillableMonthsLoading] = useState(false);
  const [genBillingMonth, setGenBillingMonth] = useState('');
  const [genPreviousReading, setGenPreviousReading] = useState('');
  const [genCurrentReading, setGenCurrentReading] = useState('');
  // Whether the tenant's earlier unpaid balance is counted in the summary
  // total below. The carryover stays on its own earlier bill either way —
  // this only chooses between "what this bill is worth" and "what the tenant
  // owes in total" as the headline figure.
  const [genIncludeCarryover, setGenIncludeCarryover] = useState(true);

  // All Bills tab
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyId, setPropertyId] = useState('');
  const [sort, setSort] = useState('cycle_desc');
  // The list is fetched in full and sorted server-side, but pagination
  // itself is client-side — the due-amount sort is computed after the
  // query (amountDue isn't a real column), so the backend can't do a
  // DB-level cursor page for that sort anyway. Same approach as Invoices.
  const [billsPage, setBillsPage] = useState(1);
  const BILLS_PAGE_SIZE = 20;
  const [downloadingBillId, setDownloadingBillId] = useState(null);
  const [sharingBillId, setSharingBillId] = useState(null);
  const [deletingBillId, setDeletingBillId] = useState(null);

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
    setBillableMonths([]);
    setGenBillingMonth('');
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

    if (contract) {
      setBillableMonthsLoading(true);
      api.get(`/rent/contracts/${contract.contractId}/billable-months`)
        .then((months) => {
          setBillableMonths(months);
          // Default to the oldest unbilled month — the FIFO philosophy the
          // rest of rent collection already follows (clear the backlog
          // before the current month).
          setGenBillingMonth(months[0]?.cycleStart || '');
        })
        .catch(() => setBillableMonths([]))
        .finally(() => setBillableMonthsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genRoomId, contracts]);

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (propertyId) params.set('propertyId', propertyId);
      if (sort) params.set('sort', sort);
      const res = await api.get(`/rent/bills?${params.toString()}`);
      setBills(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load bills');
    } finally {
      setBillsLoading(false);
    }
  };

  // Hard delete — permanently removes the bill and any payments recorded
  // against it, regardless of status (an admin explicitly asked for this to
  // work even on PAID/PARTIAL bills, e.g. to undo a wrongly generated one).
  const handleDeleteBill = async (bill) => {
    const hasPayments = (bill.amountPaid || 0) > 0.01;
    const ok = await confirm({
      title: `Delete this bill for ${bill.contract.tenant.name}?`,
      message: hasPayments
        ? `This bill has ${formatCurrency(bill.amountPaid)} in recorded payments — deleting it permanently erases those payment records too. This cannot be undone.`
        : 'This permanently removes the bill. This cannot be undone.',
      confirmText: hasPayments ? 'Delete bill and its payments' : 'Delete bill'
    });
    if (!ok) return;
    try {
      setDeletingBillId(bill.id);
      await api.delete(`/rent/bills/${bill.id}`);
      toast.success('Bill deleted');
      fetchBills();
    } catch (err) {
      toast.error(err.message || 'Failed to delete bill');
    } finally {
      setDeletingBillId(null);
    }
  };

  useEffect(() => {
    if (tab === 'all') fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, status, propertyId, sort]);

  // Any filter change invalidates the current page — land back on page 1
  // instead of showing an empty page 4 for a filter that now has fewer.
  useEffect(() => {
    setBillsPage(1);
  }, [search, status, propertyId, sort]);

  const billsTotalPages = Math.max(1, Math.ceil(bills.length / BILLS_PAGE_SIZE));
  const billsClampedPage = Math.min(billsPage, billsTotalPages);
  const pageBills = bills.slice((billsClampedPage - 1) * BILLS_PAGE_SIZE, billsClampedPage * BILLS_PAGE_SIZE);

  // A compact page-number strip: always show first, last, current ±1, with
  // "…" gaps — same pattern as Invoices.jsx.
  const billsPageNumbers = () => {
    const nums = new Set([1, billsTotalPages, billsClampedPage, billsClampedPage - 1, billsClampedPage + 1]);
    return Array.from(nums).filter((n) => n >= 1 && n <= billsTotalPages).sort((a, b) => a - b);
  };

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
  const carryoverApplied = genIncludeCarryover ? previewPreviousBalance : 0;
  const previewNetDue = round2(
    Math.max(0, previewRent + previewLateFee + previewMisc - previewDiscount)
    + (electricityAmountPreview || 0)
    + carryoverApplied
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

  const selectedBillingMonth = billableMonths.find((m) => m.cycleStart === genBillingMonth) || null;

  // Generates the rent bill for the EXPLICITLY chosen billing month, then —
  // if this room bills electricity and a current reading was entered —
  // generates the electricity bill too, via the existing separate-ledger
  // endpoint, defaulting to that same billing month so the two land on the
  // same invoice automatically. Two independent writes under one admin
  // action; each can succeed/fail on its own, so both outcomes are reported.
  const handleGenerate = async (contract) => {
    if (!genBillingMonth) {
      toast.error('Select a billing month.');
      return;
    }
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
        cycleStart: genBillingMonth,
        force: selectedBillingMonth ? !selectedBillingMonth.ended : false,
        rentAmount: genRentAmount,
        lateFee: genLateFee || 0,
        discountAmount: genDiscountAmount || 0,
        miscAmount: genMiscAmount || 0,
        miscLabel: genMiscLabel,
        notes: genNotes
      };

      const res = await api.post('/rent/bills/generate', billBody);
      messages.push(
        res.generated > 0
          ? `Rent bill generated${billBody.force ? ' for the in-progress cycle' : ''}.`
          : 'A bill for this billing month already exists.'
      );

      if (hasElectricity && genCurrentReading !== '') {
        try {
          // Same billing month picked above, so the two land on the same
          // invoice automatically — this is exactly the "co-generated
          // together" case the electricity/rent match relies on.
          const billingMonth = genBillingMonth.slice(0, 7);
          const elecRes = await api.post(`/rent/rooms/${contract.room.id}/electricity`, {
            billingMonth,
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
                {selectedContract.totalPending > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    Rent pending: {formatCurrency(selectedContract.totalPending)}.
                  </p>
                )}

                <div className="pt-2 border-t border-brand-200/60 dark:border-brand-900/60">
                  <label className="label">Billing Month *</label>
                  {billableMonthsLoading ? (
                    <div className="skeleton h-10 rounded-lg" />
                  ) : billableMonths.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">Nothing to bill yet — this contract's first cycle hasn't started.</p>
                  ) : (
                    <>
                      <SearchableSelect
                        mode="button"
                        value={genBillingMonth}
                        options={billableMonths.map((m) => ({
                          value: m.cycleStart,
                          label: `${new Date(m.cycleStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })} (${formatDate(m.cycleStart)} – ${formatDate(m.cycleEnd)})${m.ended ? '' : ' — cycle in progress'}`
                        }))}
                        onSelect={(opt) => setGenBillingMonth(opt.value)}
                        ariaLabel="Select billing month"
                      />
                      {selectedBillingMonth && !selectedBillingMonth.ended && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          This month's cycle hasn't ended yet — generating it now bills ahead of schedule (forced).
                        </p>
                      )}
                      {billableMonths.length > 1 && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {billableMonths.length} unbilled months for this contract — defaulted to the oldest.
                        </p>
                      )}
                    </>
                  )}
                </div>

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
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <label htmlFor="gen-include-carryover" className="flex items-center gap-2 cursor-pointer">
                          <input
                            id="gen-include-carryover"
                            type="checkbox"
                            checked={genIncludeCarryover}
                            onChange={(e) => setGenIncludeCarryover(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <span className={genIncludeCarryover ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 line-through'}>
                            Previous Balance Carryover
                          </span>
                        </label>
                        <span className={`font-semibold ${genIncludeCarryover ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 line-through'}`}>
                          {formatCurrency(previewPreviousBalance)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {genIncludeCarryover
                          ? 'Total below shows everything this tenant owes. The carryover stays on its own earlier bill — it is not added to this bill.'
                          : 'Total below shows only this bill. The earlier unpaid balance is still owed on its own bill.'}
                      </p>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {previewPreviousBalance > 0 && genIncludeCarryover ? 'Total Net Due (incl. arrears)' : 'Total Net Due'}
                    </span>
                    <span className="font-bold text-lg text-brand-600 dark:text-brand-400">{formatCurrency(previewNetDue)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleGenerate(selectedContract)}
                    disabled={generatingContractId === selectedContract.contractId || !genBillingMonth}
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
            <div className="sm:w-56">
              <SearchableSelect mode="button" value={sort} options={SORT_OPTIONS} onSelect={(opt) => setSort(opt.value)} ariaLabel="Sort bills" />
            </div>
          </div>

          {!billsLoading && bills.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{pageBills.length}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{bills.length}</span> bill{bills.length === 1 ? '' : 's'}
            </p>
          )}

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
                    {pageBills.map((b) => (
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
                            <button
                              onClick={() => handleDeleteBill(b)}
                              disabled={deletingBillId === b.id}
                              className="btn-icon btn-icon-soft hover:text-rose-500"
                              aria-label={`Delete bill for ${b.contract.tenant.name}`}
                              title="Delete bill"
                            >
                              {deletingBillId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {billsTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                  disabled={billsClampedPage === 1}
                  className="btn-icon btn-icon-soft"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {billsPageNumbers().map((n, i, arr) => (
                  <React.Fragment key={n}>
                    {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-slate-400 select-none">…</span>}
                    <button
                      onClick={() => setBillsPage(n)}
                      aria-current={n === billsClampedPage ? 'page' : undefined}
                      className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold transition-colors ${
                        n === billsClampedPage
                          ? 'bg-brand-600 text-white shadow'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  </React.Fragment>
                ))}

                <button
                  onClick={() => setBillsPage((p) => Math.min(billsTotalPages, p + 1))}
                  disabled={billsClampedPage === billsTotalPages}
                  className="btn-icon btn-icon-soft"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
