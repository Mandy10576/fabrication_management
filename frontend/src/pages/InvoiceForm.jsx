import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { RateMasterAutocomplete } from '../components/RateMasterAutocomplete';
import { UnitSelect } from '../components/UnitSelect';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { ClientDuplicateDialog } from '../components/ClientDuplicateDialog';
import { ClientQuickSummary } from '../components/ClientQuickSummary';
import { SearchableSelect } from '../components/SearchableSelect';
import { StateSelect } from '../components/StateSelect';
import { GstModeSelect } from '../components/GstModeSelect';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { INDIAN_STATES } from '../utils/indianStates';

/** Auto-derives GST mode from a state comparison, but never auto-switches
 * into/out of Non-GST (a deliberate manual choice) and leaves the current
 * mode untouched until both states are known. */
const applyAutoGstMode = (newState, companyState, currentGstType) => {
  if (currentGstType === 'NON_GST') return currentGstType;
  if (!newState || !companyState) return currentGstType;
  return newState.trim().toLowerCase() === companyState.trim().toLowerCase() ? 'CGST_SGST' : 'IGST';
};
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Zap,
  Settings,
  UserPlus
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

export const InvoiceForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const { financialYears, selectedFY } = useFY();
  const navigate = useNavigate();
  const toast = useToast();

  const isEditing = Boolean(id);

  const [availableUnits, setAvailableUnits] = useState(() => {
    try {
      const saved = localStorage.getItem('khodiyar_managed_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_UNITS;
  });

  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  const saveAvailableUnits = (newUnitsList) => {
    setAvailableUnits(newUnitsList);
    try {
      localStorage.setItem('khodiyar_managed_units', JSON.stringify(newUnitsList));
    } catch (e) {
      console.error('Failed to save units:', e);
    }
  };

  const handleAddUnitOption = (newUnitName) => {
    if (!newUnitName) return;
    const trimmed = newUnitName.trim();
    if (!trimmed) return;
    if (!availableUnits.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...availableUnits, trimmed];
      saveAvailableUnits(updated);
    }
  };

  const handleRemoveUnitOption = (unitToRemove) => {
    const updated = availableUnits.filter(u => u !== unitToRemove);
    saveAvailableUnits(updated);
  };

  const [clients, setClients] = useState([]);
  const [rateMaster, setRateMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Quick Add Rate Master State
  const [isAddRateModalOpen, setIsAddRateModalOpen] = useState(false);
  const [activeItemIndexForModal, setActiveItemIndexForModal] = useState(0);
  const [savingRate, setSavingRate] = useState(false);
  const [newRateData, setNewRateData] = useState({
    serviceName: '',
    rate: '',
    unit: 'sq ft',
    hsnSac: ''
  });

  const handleOpenAddRateModal = (index) => {
    setActiveItemIndexForModal(index);
    const targetItem = items[index] || {};
    setNewRateData({
      serviceName: targetItem.description || '',
      rate: targetItem.rate || '',
      unit: targetItem.unit || 'sq ft',
      hsnSac: targetItem.hsnSac || ''
    });
    setIsAddRateModalOpen(true);
  };

  const handleQuickSaveRateMaster = async (e) => {
    e.preventDefault();
    if (!newRateData.serviceName || !newRateData.rate) return;

    setSavingRate(true);
    try {
      const createdRate = await api.post('/rates', {
        serviceName: newRateData.serviceName,
        rate: parseFloat(newRateData.rate) || 0,
        unit: newRateData.unit || 'sq ft',
        hsnSac: newRateData.hsnSac || ''
      });

      setRateMaster(prev => [createdRate, ...prev]);
      handleSelectRateMaster(activeItemIndexForModal, createdRate);
      setIsAddRateModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save Rate Master item');
    } finally {
      setSavingRate(false);
    }
  };

  // Quick Add Client State
  const EMPTY_NEW_CLIENT = { companyName: '', contactPerson: '', mobile: '', email: '', gstin: '', address: '' };
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newClientData, setNewClientData] = useState(EMPTY_NEW_CLIENT);
  const [clientDuplicates, setClientDuplicates] = useState(null);

  const handleOpenAddClientModal = (typedName) => {
    setNewClientData({ ...EMPTY_NEW_CLIENT, companyName: typedName || '' });
    setClientDuplicates(null);
    setIsAddClientModalOpen(true);
  };

  /** Selecting a client also refreshes Place of Supply and the GST mode. */
  const applyClientSelection = (c) => {
    setClientId(c ? c.id : '');
    const clientState = c?.state || 'Gujarat';
    setState(clientState);
    setGstType((prev) => applyAutoGstMode(clientState, companyState, prev));
  };

  const persistNewClient = async (confirmDuplicate = false) => {
    setSavingClient(true);
    try {
      const createdClient = await api.post('/clients', {
        ...newClientData,
        financialYearId: financialYearId === 'ALL' ? 'current' : financialYearId,
        confirmDuplicate
      });

      setClients(prev => [createdClient, ...prev]);
      applyClientSelection(createdClient);
      setClientDuplicates(null);
      setIsAddClientModalOpen(false);
      toast.success(`${createdClient.companyName} added`);
    } catch (err) {
      if (err.status === 409 && err.data?.existingClients?.length) {
        setClientDuplicates({ exactMatches: err.data.existingClients, mobileMatches: [] });
        return;
      }
      toast.error(err.message || 'Failed to save client');
    } finally {
      setSavingClient(false);
    }
  };

  const handleQuickSaveClient = async (e) => {
    e.preventDefault();
    if (!newClientData.companyName || !newClientData.mobile || !newClientData.address) return;

    try {
      const params = new URLSearchParams({
        mobile: newClientData.mobile || '',
        companyName: newClientData.companyName || '',
        address: newClientData.address || ''
      });
      const found = await api.get(`/clients/check-duplicate?${params.toString()}`, true);
      // A shared name alone is not a collision, so it never interrupts.
      if (found.hasExactMatch || found.hasMobileMatch) {
        setClientDuplicates({ exactMatches: found.exactMatches, mobileMatches: found.mobileMatches });
        return;
      }
    } catch (err) {
      // Pre-check is best-effort; the server still guards the write.
      console.error('Duplicate check failed:', err);
    }

    persistNewClient(false);
  };

  /** Picks the already-registered client into this invoice instead of duplicating it. */
  const handleUseExistingClient = (client) => {
    setClients(prev => (prev.some(c => c.id === client.id) ? prev : [client, ...prev]));
    applyClientSelection(client);
    setClientDuplicates(null);
    setIsAddClientModalOpen(false);
    toast.success(`Using existing client ${client.companyName}`);
  };

  const [financialYearId, setFinancialYearId] = useState('');
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [state, setState] = useState('Gujarat');
  const [companyState, setCompanyState] = useState('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstRate, setGstRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  const [items, setItems] = useState([
    { description: '', hsnSac: '', quantity: 1, unit: '', rate: 0, amount: 0 }
  ]);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [clientsRes, ratesRes, companyRes] = await Promise.all([
          api.get('/clients?all=true&financialYearId=ALL'),
          api.get('/rates'),
          api.get('/company')
        ]);
        setClients(Array.isArray(clientsRes) ? clientsRes : (clientsRes?.items || []));
        setRateMaster(Array.isArray(ratesRes) ? ratesRes : (ratesRes?.items || []));
        setCompanyState(companyRes.state || '');
        if (companyRes.termsConditions && !terms) {
          setTerms(companyRes.termsConditions);
        }

        // Target FY
        const targetFY = selectedFY === 'ALL'
          ? (financialYears.find(f => f.isCurrent)?.id || financialYears[0]?.id)
          : selectedFY;
        
        setFinancialYearId(targetFY);

        if (isEditing) {
          const inv = await api.get(`/invoices/${id}`);
          setFinancialYearId(inv.financialYearId);
          setClientId(inv.clientId);
          setInvoiceNumber(inv.invoiceNumber);
          setDate(inv.date ? inv.date.split('T')[0] : '');
          setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
          setState(inv.state || 'Gujarat');
          setGstType(inv.gstType);
          setGstRate(inv.gstRate);
          setDiscount(inv.discount);
          setAmountReceived(inv.amountReceived);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');
          setItems(inv.items.map(i => ({
            description: i.description,
            hsnSac: i.hsnSac || '',
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
            amount: i.amount
          })));
        } else {
          // Fetch next invoice number preview
          if (targetFY) {
            const nextRes = await api.get(`/invoices/next-number?financialYearId=${targetFY}`);
            setInvoiceNumber(nextRes.invoiceNumber);
          }
        }
      } catch (err) {
        console.error('Failed to initialize form:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, selectedFY, financialYears]);

  const handleFYChange = async (fyId) => {
    setFinancialYearId(fyId);
    if (!isEditing && fyId) {
      try {
        const nextRes = await api.get(`/invoices/next-number?financialYearId=${fyId}`);
        setInvoiceNumber(nextRes.invoiceNumber);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', hsnSac: '', quantity: 1, unit: '', rate: 0, amount: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'quantity' || field === 'rate') {
      const q = parseFloat(updated[index].quantity) || 0;
      const r = parseFloat(updated[index].rate) || 0;
      updated[index].amount = q * r;
    }

    setItems(updated);
  };

  const handleSelectRateMaster = (index, rateItem) => {
    if (!rateItem) return;
    const updated = [...items];
    updated[index].description = rateItem.serviceName;
    updated[index].hsnSac = rateItem.hsnSac || '';
    updated[index].unit = rateItem.unit || '';
    updated[index].rate = rateItem.rate;
    const q = parseFloat(updated[index].quantity) || 1;
    updated[index].amount = q * rateItem.rate;
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
  const disc = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - disc);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;

  if (gstType === 'CGST_SGST') {
    cgst = (taxableAmount * (gstRate / 2)) / 100;
    sgst = (taxableAmount * (gstRate / 2)) / 100;
    totalTax = cgst + sgst;
  } else if (gstType === 'IGST') {
    igst = (taxableAmount * gstRate) / 100;
    totalTax = igst;
  }

  const grandTotal = Math.round(taxableAmount + totalTax);
  const amtReceived = parseFloat(amountReceived) || 0;
  const balanceDue = Math.max(0, grandTotal - amtReceived);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select a client');
      return;
    }

    if (items.some(i => !i.description || i.quantity <= 0)) {
      setError('Please fill in valid descriptions and quantities for all items');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        invoiceNumber,
        financialYearId,
        clientId,
        date,
        dueDate: dueDate || null,
        state,
        gstType,
        gstRate,
        discount: disc,
        amountReceived: amtReceived,
        notes,
        terms,
        items
      };

      if (isEditing) {
        await api.put(`/invoices/${id}`, payload);
        navigate(`/invoices/${id}`);
      } else {
        const created = await api.post('/invoices', payload);
        navigate(`/invoices/${created.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto" role="status" aria-label="Loading form">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-52 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
        <span className="sr-only">Loading invoice form…</span>
      </div>
    );
  }

  return (
    // Extra bottom padding on mobile clears the sticky save bar.
    <div className="space-y-4 sm:space-y-6 max-w-6xl 2xl:max-w-[1600px] mx-auto pb-20 md:pb-0">
      {/* Top Bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="btn btn-sm btn-ghost self-start -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <h2 className="page-title flex items-center gap-2 min-w-0">
          <FileText className="w-5 h-5 text-brand-500 shrink-0" />
          <span className="truncate">
            {isEditing ? `Edit Invoice #${invoiceNumber}` : 'Create Tax Invoice'}
          </span>
        </h2>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm font-medium"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Invoice Meta Section */}
        <div className="card card-pad space-y-4">
          <h3 className="section-label">General & Client Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-fy" className="label">Financial Year *</label>
              <SearchableSelect
                id="inv-fy"
                mode="button"
                value={financialYearId}
                options={financialYears}
                getOptionValue={(fy) => fy.id}
                getOptionLabel={(fy) => `FY ${fy.year}${fy.isCurrent ? ' (Active)' : ''}`}
                onSelect={(fy) => handleFYChange(fy.id)}
              />
            </div>

            <div>
              <label htmlFor="inv-number" className="label">Invoice Number *</label>
              <input
                id="inv-number"
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="input font-bold"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="inv-client" className="label">Select Client *</label>
              <ClientAutocomplete
                id="inv-client"
                clients={clients}
                value={clientId}
                onSelect={applyClientSelection}
                onAddNew={(typedName) => handleOpenAddClientModal(typedName)}
                placeholder="Type client name or click drop arrow..."
              />
            </div>
          </div>

          <ClientQuickSummary clientId={clientId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="inv-date" className="label">Invoice Date *</label>
              <input
                id="inv-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="inv-due" className="label">Payment Due Date</label>
              <input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="inv-state" className="label">State / Place of Supply</label>
              <StateSelect
                id="inv-state"
                options={INDIAN_STATES}
                value={state}
                onChange={(newState) => {
                  setState(newState);
                  setGstType((prev) => applyAutoGstMode(newState, companyState, prev));
                }}
                placeholder="Select or type a state"
              />
            </div>

            <div>
              <label htmlFor="inv-gst" className="label">GST Tax Mode *</label>
              <GstModeSelect id="inv-gst" value={gstType} onChange={setGstType} />
            </div>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="card card-pad space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="section-label">Fabrication Items & Services</h3>

            <button type="button" onClick={handleAddItem} className="btn btn-sm bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50">
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                      Line Item {idx + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1}
                    className="btn btn-sm btn-danger-soft"
                    title={items.length === 1 ? 'An invoice needs at least one item' : 'Remove line item'}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xs:inline">Delete</span>
                  </button>
                </div>

                {/* 12-col grid. The Rate and Amount cells used to carry
                    `md:col-span-1.5`, which isn't a real Tailwind class — the
                    row silently overflowed to 24 columns on desktop and wrapped.
                    Full row now lands at xl, where the content area is finally
                    wide enough for six fields beside the sidebar. */}
                <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                  <div className="col-span-12 xl:col-span-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="label mb-0">Description *</label>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRateModal(idx)}
                        className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1 shrink-0"
                        title="Save this item to the Rate Master catalog"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Save to Rate Master</span>
                      </button>
                    </div>

                    <RateMasterAutocomplete
                      value={item.description}
                      onChange={(val) => handleItemChange(idx, 'description', val)}
                      rateMasterList={rateMaster}
                      onSelectRateMaster={(rItem) => handleSelectRateMaster(idx, rItem)}
                      onAddNew={() => handleOpenAddRateModal(idx)}
                      themeColor="brand"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                    <label className="label">HSN / SAC</label>
                    <input
                      type="text"
                      placeholder="9988"
                      value={item.hsnSac}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      className="input font-mono text-center"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 xl:col-span-1">
                    <label className="label">Qty *</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="input font-semibold text-right"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                    <label className="label">Unit</label>
                    <UnitSelect
                      value={item.unit}
                      onChange={(u) => handleItemChange(idx, 'unit', u)}
                      options={availableUnits}
                      onManageUnits={() => setShowManageUnitsModal(true)}
                      placeholder="Select unit"
                      themeColor="brand"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                    <label className="label">Rate (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={item.rate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="input font-semibold text-right"
                    />
                  </div>

                  <div className="col-span-12 xl:col-span-1 flex xl:flex-col items-center xl:items-end justify-between xl:justify-end gap-2 pt-1 xl:pt-0 border-t xl:border-t-0 border-slate-200 dark:border-slate-700/60">
                    <span className="label mb-0 xl:self-end">Amount</span>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white break-words text-right xl:py-2.5">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Financial Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card card-pad space-y-4">
            <div>
              <label htmlFor="inv-notes" className="label">Notes / Special Instructions</label>
              <textarea
                id="inv-notes"
                rows={3}
                placeholder="e.g. Delivered as per PO # PO/2026/089"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea"
              />
            </div>

            <div>
              <label htmlFor="inv-terms" className="label">Terms & Conditions</label>
              <textarea
                id="inv-terms"
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="textarea"
              />
            </div>
          </div>

          <div className="card card-pad space-y-3">
            <h3 className="section-label">Payment & Tax Summary</h3>

            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <strong className="text-slate-900 dark:text-white font-bold break-words text-right">
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
              <label htmlFor="inv-discount" className="text-slate-600 dark:text-slate-400">Discount (₹)</label>
              <input
                id="inv-discount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="input w-28 sm:w-36 py-1.5 text-right font-semibold shrink-0"
              />
            </div>

            {gstType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                  <span>CGST (9%)</span>
                  <span className="break-words text-right">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                  <span>SGST (9%)</span>
                  <span className="break-words text-right">{formatCurrency(sgst)}</span>
                </div>
              </>
            )}

            {gstType === 'IGST' && (
              <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                <span>IGST (18%)</span>
                <span className="break-words text-right">{formatCurrency(igst)}</span>
              </div>
            )}

            <div className="flex justify-between items-center gap-3 py-3 px-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-extrabold">
              <span>Grand Total</span>
              <span className="break-words text-right">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center gap-3 py-1.5 text-sm">
              <label htmlFor="inv-received" className="text-slate-700 dark:text-slate-300 font-semibold">
                Amount Received
              </label>
              <input
                id="inv-received"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="input w-28 sm:w-36 py-1.5 text-right font-extrabold shrink-0 border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-between items-center gap-3 py-3 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold">
              <span>Balance Due</span>
              <span className="font-extrabold break-words text-right">{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions (hidden on mobile — the sticky bar below handles it) */}
        <div className="hidden md:flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/invoices')} className="btn btn-secondary">
            Cancel
          </button>

          <button type="submit" disabled={saving} className="btn btn-accent">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : isEditing ? 'Update Invoice' : 'Generate Tax Invoice'}</span>
          </button>
        </div>

        {/* Sticky mobile save bar. It sat at `bottom-14` (3.5rem) while the
            bottom nav is 4.25rem tall plus the iOS safe area, so it used to
            overlap the nav. Now it stacks directly on top of it. */}
        <div className="md:hidden fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 border-t border-slate-800 flex items-center justify-between gap-3 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.5)]">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Grand Total</div>
            <div className="text-base font-extrabold text-white break-words">{formatCurrency(grandTotal)}</div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-sm btn-primary shrink-0">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : isEditing ? 'Update' : 'Save Invoice'}</span>
          </button>
        </div>
      </form>


      {/* Quick add to Rate Master */}
      <Modal
        open={isAddRateModalOpen}
        onClose={() => setIsAddRateModalOpen(false)}
        size="lg"
        title="Save to Rate Master"
        icon={Zap}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsAddRateModalOpen(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="quick-rate-form" disabled={savingRate} className="btn btn-primary">
              {savingRate ? 'Saving…' : 'Save & Auto-Fill'}
            </button>
          </div>
        }
      >
        <form id="quick-rate-form" onSubmit={handleQuickSaveRateMaster} className="space-y-4">
          <div>
            <label htmlFor="qr-name" className="label">Service / Work Item Name *</label>
            <input
              id="qr-name"
              type="text"
              required
              data-autofocus
              placeholder="e.g. Parking Stand Fabrication"
              value={newRateData.serviceName}
              onChange={(e) => setNewRateData({ ...newRateData, serviceName: e.target.value })}
              className="input font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qr-rate" className="label">Standard Rate (₹) *</label>
              <input
                id="qr-rate"
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="3000"
                value={newRateData.rate}
                onChange={(e) => setNewRateData({ ...newRateData, rate: e.target.value })}
                className="input font-semibold"
              />
            </div>

            <div>
              <label htmlFor="qr-unit" className="label">Unit</label>
              <UnitSelect
                id="qr-unit"
                value={newRateData.unit || 'sq ft'}
                onChange={(val) => setNewRateData({ ...newRateData, unit: val })}
                options={availableUnits}
              />
            </div>
          </div>

          <div>
            <label htmlFor="qr-hsn" className="label">HSN / SAC Code</label>
            <input
              id="qr-hsn"
              type="text"
              placeholder="e.g. 9988"
              value={newRateData.hsnSac}
              onChange={(e) => setNewRateData({ ...newRateData, hsnSac: e.target.value })}
              className="input font-mono"
            />
          </div>
        </form>
      </Modal>

      {/* Quick add new client */}
      <Modal
        open={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        size="lg"
        title="Add New Client"
        icon={UserPlus}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsAddClientModalOpen(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="quick-client-form" disabled={savingClient} className="btn btn-primary">
              {savingClient ? 'Saving…' : 'Save & Use Client'}
            </button>
          </div>
        }
      >
        <form id="quick-client-form" onSubmit={handleQuickSaveClient} className="space-y-4">
          <div>
            <label htmlFor="qc-name" className="label">Company / Client Name *</label>
            <input
              id="qc-name"
              type="text"
              required
              data-autofocus
              placeholder="e.g. Shree Ganesh Fabricators"
              value={newClientData.companyName}
              onChange={(e) => setNewClientData({ ...newClientData, companyName: e.target.value })}
              className="input font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qc-mobile" className="label">Mobile Number *</label>
              <input
                id="qc-mobile"
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={newClientData.mobile}
                onChange={(e) => setNewClientData({ ...newClientData, mobile: e.target.value })}
                className="input font-semibold"
              />
            </div>

            <div>
              <label htmlFor="qc-contact" className="label">Contact Person</label>
              <input
                id="qc-contact"
                type="text"
                placeholder="e.g. Ramesh Patel"
                value={newClientData.contactPerson}
                onChange={(e) => setNewClientData({ ...newClientData, contactPerson: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="qc-address" className="label">Billing Address *</label>
            <textarea
              id="qc-address"
              rows={2}
              required
              placeholder="Full office or factory address…"
              value={newClientData.address}
              onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qc-email" className="label">Email Address</label>
              <input
                id="qc-email"
                type="email"
                inputMode="email"
                placeholder="e.g. client@example.com"
                value={newClientData.email}
                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="qc-gstin" className="label">GST Number (GSTIN)</label>
              <input
                id="qc-gstin"
                placeholder="e.g. 24AAAAA0000A1Z5"
                value={newClientData.gstin}
                onChange={(e) => setNewClientData({ ...newClientData, gstin: e.target.value.toUpperCase() })}
                className="input font-mono uppercase"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Manage units */}
      <Modal
        open={showManageUnitsModal}
        onClose={() => setShowManageUnitsModal(false)}
        size="md"
        title="Manage Units"
        icon={Settings}
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => saveAvailableUnits(DEFAULT_UNITS)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
            >
              Reset defaults
            </button>
            <button type="button" onClick={() => setShowManageUnitsModal(false)} className="btn btn-primary min-w-[6rem]">
              Done
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Add custom measurement units (sq mtr, bundle, box…) or remove ones you don't use.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            aria-label="New unit name"
            placeholder="e.g. sq mtr, bundle, box"
            value={newUnitInput}
            onChange={(e) => setNewUnitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newUnitInput.trim()) {
                  handleAddUnitOption(newUnitInput);
                  setNewUnitInput('');
                }
              }
            }}
            className="input"
          />
          <button
            type="button"
            onClick={() => {
              if (newUnitInput.trim()) {
                handleAddUnitOption(newUnitInput);
                setNewUnitInput('');
              }
            }}
            className="btn btn-primary shrink-0"
          >
            Add
          </button>
        </div>

        <ul className="space-y-1.5">
          {availableUnits.map(u => (
            <li
              key={u}
              className="flex items-center justify-between gap-2 pl-3.5 pr-1.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <span className="truncate">{u}</span>
              <button
                type="button"
                onClick={() => handleRemoveUnitOption(u)}
                className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                aria-label={`Delete ${u}`}
                title={`Delete "${u}" option`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <ClientDuplicateDialog
        open={Boolean(clientDuplicates)}
        exactMatches={clientDuplicates?.exactMatches || []}
        mobileMatches={clientDuplicates?.mobileMatches || []}
        busy={savingClient}
        useExistingLabel="Use This Client"
        onUseExisting={handleUseExistingClient}
        onCreateAnyway={() => persistNewClient(true)}
        onCancel={() => setClientDuplicates(null)}
      />
    </div>
  );
};
