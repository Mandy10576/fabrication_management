import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import {
  Quote,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Layers
} from 'lucide-react';

export const QuotationForm = () => {
  const { financialYears, selectedFY } = useFY();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [rateMaster, setRateMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    { description: '', hsnSac: '9988', quantity: 1, unit: 'sq ft', rate: 0, amount: 0 }
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

        if (targetFY) {
          const fyObj = financialYears.find(f => f.id === targetFY);
          setQuotationNumber(`QT-${fyObj?.year || '2026-27'}/001`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [selectedFY, financialYears]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', hsnSac: '9988', quantity: 1, unit: 'sq ft', rate: 0, amount: 0 }
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

  const handleSelectRateMaster = (index, serviceId) => {
    const rateItem = rateMaster.find(r => r.id === serviceId);
    if (!rateItem) return;

    const updated = [...items];
    updated[index].description = rateItem.serviceName;
    updated[index].hsnSac = rateItem.hsnSac || '9988';
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
      await api.post('/quotations', {
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
      });
      navigate('/quotations');
    } catch (err) {
      setError(err.message || 'Failed to create quotation');
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
          <span>Create New Quotation</span>
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
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Line Item #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => handleSelectRateMaster(idx, e.target.value)}
                      defaultValue=""
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 text-[11px] font-medium outline-none"
                    >
                      <option value="" disabled>-- Rate Master Preset --</option>
                      {rateMaster.map(r => (
                        <option key={r.id} value={r.id}>{r.serviceName} (₹{r.rate}/{r.unit})</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description *</label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Qty *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rate (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right flex flex-col justify-end">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Amount</label>
                    <div className="py-2 text-sm font-extrabold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</div>
                  </div>
                </div>
              </div>
            ))}
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
            <span>{saving ? 'Creating Quotation...' : 'Save Quotation'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
