import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { RateMasterAutocomplete } from '../components/RateMasterAutocomplete';
import { UnitSelect } from '../components/UnitSelect';
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
  Quote,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Zap,
  Settings
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

export const QuotationForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { financialYears, selectedFY } = useFY();
  const navigate = useNavigate();
  const toast = useToast();

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

  const [financialYearId, setFinancialYearId] = useState('');
  const [clientId, setClientId] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [state, setState] = useState('Gujarat');
  const [companyState, setCompanyState] = useState('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstRate, setGstRate] = useState(18);
  const [discount, setDiscount] = useState(0);
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

        const targetFY = selectedFY === 'ALL'
          ? (financialYears.find(f => f.isCurrent)?.id || financialYears[0]?.id)
          : selectedFY;

        setFinancialYearId(targetFY);

        if (companyRes.termsConditions) {
          setTerms(companyRes.termsConditions);
        }

        // Set default validUntil + 30 days
        const valDate = new Date();
        valDate.setDate(valDate.getDate() + 30);
        setValidUntil(valDate.toISOString().split('T')[0]);

        if (isEditing) {
          const q = await api.get(`/quotations/${id}`);
          setFinancialYearId(q.financialYearId);
          setClientId(q.clientId);
          setQuotationNumber(q.quotationNumber);
          setDate(q.date ? q.date.split('T')[0] : '');
          setValidUntil(q.validUntil ? q.validUntil.split('T')[0] : '');
          setState(q.state || 'Gujarat');
          setGstType(q.gstType || 'CGST_SGST');
          setGstRate(q.gstRate ?? 18);
          setDiscount(q.discount || 0);
          setNotes(q.notes || '');
          setTerms(q.terms || '');
          setItems(q.items.map(i => ({
            description: i.description,
            hsnSac: i.hsnSac || '',
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
            amount: i.amount
          })));
        } else {
          if (targetFY) {
            try {
              const nextRes = await api.get(`/quotations/next-number?financialYearId=${targetFY}`);
              setQuotationNumber(nextRes.quotationNumber);
            } catch (e) {
              const fyObj = financialYears.find(f => f.id === targetFY);
              setQuotationNumber(`QT-${fyObj?.year || '2026-27'}/001`);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [id, selectedFY, financialYears]);

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

  const subtotal = items.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
  const disc = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - disc);

  let taxAmount = 0;
  if (gstType !== 'NON_GST') {
    taxAmount = (taxableAmount * gstRate) / 100;
  }
  const grandTotal = Math.round(taxableAmount + taxAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select a client');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        quotationNumber,
        financialYearId,
        clientId,
        date,
        validUntil: validUntil || null,
        state,
        gstType,
        gstRate,
        discount: disc,
        notes,
        terms,
        items
      };

      if (isEditing) {
        await api.put(`/quotations/${id}`, payload);
      } else {
        await api.post('/quotations', payload);
      }
      navigate('/quotations');
    } catch (err) {
      setError(err.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto" role="status" aria-label="Loading form">
        <div className="skeleton h-9 w-52 rounded-lg" />
        <div className="skeleton h-52 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
        <span className="sr-only">Loading quotation form…</span>
      </div>
    );
  }

  return (
    // Extra bottom padding on mobile clears the sticky save bar.
    <div className="space-y-4 sm:space-y-6 max-w-6xl 2xl:max-w-[1600px] mx-auto pb-20 md:pb-0">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="btn btn-sm btn-ghost self-start -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </button>

        <h2 className="page-title flex items-center gap-2 min-w-0">
          <Quote className="w-5 h-5 text-indigo-500 shrink-0" />
          <span className="truncate">
            {isEditing ? `Edit Quotation #${quotationNumber}` : 'Create Quotation'}
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
        <div className="card card-pad space-y-4">
          <h3 className="section-label">General & Client Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="qt-number" className="label">Quotation Number *</label>
              <input
                id="qt-number"
                type="text"
                required
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="input font-bold"
              />
            </div>

            <div>
              <label htmlFor="qt-client" className="label">Select Client *</label>
              <select
                id="qt-client"
                required
                value={clientId}
                onChange={(e) => {
                  const newClientId = e.target.value;
                  setClientId(newClientId);
                  const selectedClient = clients.find((c) => c.id === newClientId);
                  const clientState = selectedClient?.state || 'Gujarat';
                  setState(clientState);
                  setGstType((prev) => applyAutoGstMode(clientState, companyState, prev));
                }}
                className="select font-semibold"
              >
                <option value="">— Choose Client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}{c.contactPerson ? ` (${c.contactPerson})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="qt-date" className="label">Quotation Date *</label>
              <input
                id="qt-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="qt-gsttype" className="label">GST Tax Mode *</label>
              <GstModeSelect id="qt-gsttype" value={gstType} onChange={setGstType} />
            </div>

            <div>
              <label htmlFor="qt-gstrate" className="label">GST Rate (%)</label>
              <select
                id="qt-gstrate"
                disabled={gstType === 'NON_GST'}
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                className="select font-semibold"
              >
                <option value={18}>18% (Standard Rate)</option>
                <option value={12}>12% (Reduced Rate)</option>
                <option value={5}>5% (Essential Rate)</option>
                <option value={28}>28% (Luxury/Heavy Metal Rate)</option>
                <option value={0}>0% (Exempted)</option>
              </select>
            </div>

            <div>
              <label htmlFor="qt-state" className="label">State / Place of Supply</label>
              <StateSelect
                id="qt-state"
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
              <label htmlFor="qt-valid" className="label">Valid Until</label>
              <input
                id="qt-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="card card-pad space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="section-label">Work Items & Material Details</h3>

            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
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
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
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
                    title={items.length === 1 ? 'A quotation needs at least one item' : 'Remove line item'}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xs:inline">Delete</span>
                  </button>
                </div>

                {/* Full six-field row lands at xl, where the content area is
                    finally wide enough beside the sidebar. */}
                <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                  <div className="col-span-12 xl:col-span-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="label mb-0">Description *</label>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRateModal(idx)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 shrink-0"
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
                      themeColor="indigo"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                    <label className="label">HSN / SAC</label>
                    <input
                      type="text"
                      placeholder="9988"
                      value={item.hsnSac || ''}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      className="input font-mono text-center focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="input font-semibold text-right focus:ring-indigo-500 focus:border-indigo-500"
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
                      themeColor="indigo"
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
                      className="input font-semibold text-right focus:ring-indigo-500 focus:border-indigo-500"
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
              <label htmlFor="qt-notes" className="label">Notes / Quotation Remarks</label>
              <textarea
                id="qt-notes"
                rows={3}
                placeholder="e.g. Quotation valid for 30 days from date of issue"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea"
              />
            </div>

            <div>
              <label htmlFor="qt-terms" className="label">Terms & Conditions</label>
              <textarea
                id="qt-terms"
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="textarea"
              />
            </div>
          </div>

          <div className="card card-pad space-y-3">
            <h3 className="section-label">Quotation Financial Summary</h3>

            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <strong className="text-slate-900 dark:text-white font-bold break-words text-right">
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
              <label htmlFor="qt-discount" className="text-slate-600 dark:text-slate-400">Discount (₹)</label>
              <input
                id="qt-discount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="input w-28 sm:w-36 py-1.5 text-right font-semibold shrink-0 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {gstType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                  <span>CGST ({gstRate / 2}%)</span>
                  <span className="break-words text-right">{formatCurrency((taxableAmount * (gstRate / 2)) / 100)}</span>
                </div>
                <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                  <span>SGST ({gstRate / 2}%)</span>
                  <span className="break-words text-right">{formatCurrency((taxableAmount * (gstRate / 2)) / 100)}</span>
                </div>
              </>
            )}

            {gstType === 'IGST' && (
              <div className="flex justify-between items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-400">
                <span>IGST ({gstRate}%)</span>
                <span className="break-words text-right">{formatCurrency((taxableAmount * gstRate) / 100)}</span>
              </div>
            )}

            <div className="flex justify-between items-center gap-3 py-3 px-3.5 rounded-xl bg-indigo-900 dark:bg-indigo-950 text-white font-extrabold">
              <span>Grand Total</span>
              <span className="break-words text-right">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions (hidden on mobile — the sticky bar below handles it) */}
        <div className="hidden md:flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/quotations')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn btn-indigo">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : isEditing ? 'Update Quotation' : 'Save Quotation'}</span>
          </button>
        </div>

        {/* Sticky mobile save bar — sits directly on top of the bottom nav
            instead of overlapping it (it used to be pinned at `bottom-14`). */}
        <div className="md:hidden fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 border-t border-slate-800 flex items-center justify-between gap-3 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.5)]">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Estimated Total</div>
            <div className="text-base font-extrabold text-white break-words">{formatCurrency(grandTotal)}</div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-sm btn-indigo shrink-0">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : isEditing ? 'Update' : 'Save Quote'}</span>
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
        iconClass="text-indigo-500"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsAddRateModalOpen(false)} className="btn btn-secondary sm:min-w-[7rem]">
              Cancel
            </button>
            <button type="submit" form="quick-rate-form" disabled={savingRate} className="btn btn-indigo">
              {savingRate ? 'Saving…' : 'Save & Auto-Fill'}
            </button>
          </div>
        }
      >
        <form id="quick-rate-form" onSubmit={handleQuickSaveRateMaster} className="space-y-4">
          <div>
            <label htmlFor="qtr-name" className="label">Service / Work Item Name *</label>
            <input
              id="qtr-name"
              type="text"
              required
              data-autofocus
              placeholder="e.g. Parking Stand Fabrication"
              value={newRateData.serviceName}
              onChange={(e) => setNewRateData({ ...newRateData, serviceName: e.target.value })}
              className="input font-medium focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qtr-rate" className="label">Standard Rate (₹) *</label>
              <input
                id="qtr-rate"
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="3000"
                value={newRateData.rate}
                onChange={(e) => setNewRateData({ ...newRateData, rate: e.target.value })}
                className="input font-semibold focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="qtr-unit" className="label">Unit</label>
              <select
                id="qtr-unit"
                value={newRateData.unit || 'sq ft'}
                onChange={(e) => setNewRateData({ ...newRateData, unit: e.target.value })}
                className="select font-medium focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Array.from(new Set([...availableUnits, newRateData.unit].filter(Boolean))).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="qtr-hsn" className="label">HSN / SAC Code</label>
            <input
              id="qtr-hsn"
              type="text"
              placeholder="e.g. 9988"
              value={newRateData.hsnSac}
              onChange={(e) => setNewRateData({ ...newRateData, hsnSac: e.target.value })}
              className="input font-mono focus:ring-indigo-500 focus:border-indigo-500"
            />
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
        iconClass="text-indigo-500"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => saveAvailableUnits(DEFAULT_UNITS)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
            >
              Reset defaults
            </button>
            <button type="button" onClick={() => setShowManageUnitsModal(false)} className="btn btn-indigo min-w-[6rem]">
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
            className="input focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => {
              if (newUnitInput.trim()) {
                handleAddUnitOption(newUnitInput);
                setNewUnitInput('');
              }
            }}
            className="btn btn-indigo shrink-0"
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
    </div>
  );
};
