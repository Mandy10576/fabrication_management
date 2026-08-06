import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import {
  Quote,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Layers,
  Zap,
  ChevronDown,
  X,
  Settings
} from 'lucide-react';

const DEFAULT_UNITS = ['sq ft', 'meter', 'kg', 'pcs', 'hrs', 'ton', 'set', 'lot', 'nos', 'mm', 'inch', 'sq mtr', 'job'];

export const QuotationForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { financialYears, selectedFY } = useFY();
  const navigate = useNavigate();

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
      alert(err.message || 'Failed to save Rate Master item');
    } finally {
      setSavingRate(false);
    }
  };

  const [financialYearId, setFinancialYearId] = useState('');
  const [clientId, setClientId] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstRate, setGstRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  const [items, setItems] = useState([
    { description: '', hsnSac: '', quantity: 1, unit: 'sq ft', rate: 0, amount: 0 }
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
      { description: '', hsnSac: '', quantity: 1, unit: 'sq ft', rate: 0, amount: 0 }
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
    updated[index].unit = rateItem.unit || 'sq ft';
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
    return <div className="p-8 text-center text-slate-500">Loading quotation form...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl 2xl:max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/quotations')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Quote className="w-5 h-5 text-indigo-500" />
          <span>{isEditing ? `Edit Quotation #${quotationNumber}` : 'Create New Quotation'}</span>
        </h2>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Quotation Number *
              </label>
              <input
                type="text"
                required
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Select Client *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Quotation Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                GST Tax Inclusion *
              </label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              >
                <option value="CGST_SGST">Include CGST + SGST (Intrastate)</option>
                <option value="IGST">Include IGST (Interstate)</option>
                <option value="NON_GST">Non-GST (Estimate Quotation)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                GST Rate (%)
              </label>
              <select
                disabled={gstType === 'NON_GST'}
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none disabled:opacity-50"
              >
                <option value={18}>18% (Standard Rate)</option>
                <option value={12}>12% (Reduced Rate)</option>
                <option value={5}>5% (Essential Rate)</option>
                <option value={28}>28% (Luxury/Heavy Metal Rate)</option>
                <option value={0}>0% (Exempted)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
              Work Items & Material Details
            </h3>

            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Line Item #{idx + 1}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1}
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 text-xs font-semibold"
                    title="Remove Line Item"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        Description / Rate Master Catalog *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRateModal(idx)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        title="Save this item to Rate Master database catalog"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Save to Rate Master</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="Type custom description or click drop arrow..."
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                        <select
                          value=""
                          title="Click to select Rate Master Preset"
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW__') {
                              handleOpenAddRateModal(idx);
                            } else {
                              const rItem = rateMaster.find(r => r.id === e.target.value);
                              if (rItem) handleSelectRateMaster(idx, rItem);
                            }
                          }}
                          className="w-8 h-8 opacity-0 cursor-pointer absolute inset-0 z-10"
                        >
                          <option value="" disabled>⚡ Select Rate Master Catalog Preset</option>
                          <option value="__ADD_NEW__" className="font-bold text-indigo-600 bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 py-1">
                            ➕ + Add New Item to Rate Master Catalog...
                          </option>
                          {rateMaster.map(r => (
                            <option key={r.id} value={r.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100 py-1">
                              {r.serviceName} — ₹{r.rate} / {r.unit}{r.hsnSac ? ` (HSN: ${r.hsnSac})` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="p-1.5 text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer flex items-center gap-0.5">
                          <Zap className="w-3.5 h-3.5 fill-indigo-500" />
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      HSN / SAC
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9988"
                      value={item.hsnSac || ''}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-right outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        Unit
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowManageUnitsModal(true)}
                        className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                        title="Manage units dropdown options list"
                      >
                        <Settings className="w-2.5 h-2.5" />
                        <span>Edit List</span>
                      </button>
                    </div>
                    <select
                      value={item.unit || 'sq ft'}
                      onChange={(e) => {
                        if (e.target.value === '__MANAGE_UNITS__') {
                          setShowManageUnitsModal(true);
                        } else {
                          handleItemChange(idx, 'unit', e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-center"
                    >
                      {Array.from(new Set([...availableUnits, item.unit].filter(Boolean))).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="__MANAGE_UNITS__" className="font-bold text-indigo-600 bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 py-1">
                        ⚙️ + Add / Edit Units List...
                      </option>
                    </select>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Rate (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={item.rate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-right outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-1 text-right flex flex-col justify-end">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Amount
                    </label>
                    <div className="py-2 text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Financial Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Notes / Quotation Remarks
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Quotation valid for 30 days from date of issue"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-2">
              Quotation Financial Summary
            </h3>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(subtotal)}</strong>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Discount (₹):</span>
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-32 px-3 py-1 text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
              />
            </div>

            {gstType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                  <span>CGST ({gstRate / 2}%):</span>
                  <span>{formatCurrency((taxableAmount * (gstRate / 2)) / 100)}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                  <span>SGST ({gstRate / 2}%):</span>
                  <span>{formatCurrency((taxableAmount * (gstRate / 2)) / 100)}</span>
                </div>
              </>
            )}

            {gstType === 'IGST' && (
              <div className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                <span>IGST ({gstRate}%):</span>
                <span>{formatCurrency((taxableAmount * gstRate) / 100)}</span>
              </div>
            )}


            <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-indigo-900 text-white font-extrabold text-sm">
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Update Quotation' : 'Save Quotation'}</span>
          </button>
        </div>

        {/* Sticky Mobile Bar for quick save */}
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3 border-t border-slate-800 flex items-center justify-between shadow-2xl">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Estimated Total</div>
            <div className="text-base font-extrabold text-white">{formatCurrency(grandTotal)}</div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Update' : 'Save Quote'}</span>
          </button>
        </div>
      </form>

      {/* Quick Add Rate Master Modal */}
      {isAddRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                <span>Save to Rate Master Catalog</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSaveRateMaster} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Service / Work Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parking Stand Fabrication"
                  value={newRateData.serviceName}
                  onChange={(e) => setNewRateData({ ...newRateData, serviceName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Standard Rate (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="3000"
                    value={newRateData.rate}
                    onChange={(e) => setNewRateData({ ...newRateData, rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Unit</label>
                  <select
                    value={newRateData.unit || 'sq ft'}
                    onChange={(e) => setNewRateData({ ...newRateData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {Array.from(new Set([...availableUnits, newRateData.unit].filter(Boolean))).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  placeholder="e.g. 9988"
                  value={newRateData.hsnSac}
                  onChange={(e) => setNewRateData({ ...newRateData, hsnSac: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRate}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingRate ? 'Saving...' : 'Save to Master & Auto-Fill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Units Modal */}
      {showManageUnitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <span>Manage Units Dropdown Options</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManageUnitsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add custom measurement units (e.g. sq mtr, bundle, feet, box) or delete unwanted units from the dropdown list.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type new unit name (e.g. sq mtr, bundle, box)..."
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (newUnitInput.trim()) {
                    handleAddUnitOption(newUnitInput);
                    setNewUnitInput('');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-indigo-600/30"
              >
                + Add Unit
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableUnits.map(u => (
                <div
                  key={u}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>{u}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnitOption(u)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                    title={`Delete "${u}" option`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => saveAvailableUnits(DEFAULT_UNITS)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
              >
                Reset Standard Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowManageUnitsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
