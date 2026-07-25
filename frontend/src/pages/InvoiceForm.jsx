import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Layers,
  Building2,
  Calendar,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const InvoiceForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const { financialYears, selectedFY, activeFYObj } = useFY();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [clients, setClients] = useState([]);
  const [rateMaster, setRateMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [financialYearId, setFinancialYearId] = useState('');
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstRate, setGstRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
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
          api.get('/clients?financialYearId=ALL'),
          api.get('/rates'),
          api.get('/company')
        ]);
        setClients(clientsRes);
        setRateMaster(ratesRes);
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
          setGstType(inv.gstType);
          setGstRate(inv.gstRate);
          setDiscount(inv.discount);
          setAmountReceived(inv.amountReceived);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');
          setItems(inv.items.map(i => ({
            description: i.description,
            hsnSac: i.hsnSac || '9988',
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
    return <div className="p-8 text-center text-slate-500">Loading invoice form...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <span>{isEditing ? `Edit Invoice #${invoiceNumber}` : 'Create New Tax Invoice'}</span>
        </h2>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Meta Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
            General & Client Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Financial Year *
              </label>
              <select
                value={financialYearId}
                onChange={(e) => handleFYChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
              >
                {financialYears.map(fy => (
                  <option key={fy.id} value={fy.id}>
                    FY {fy.year} {fy.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                GST Tax Mode *
              </label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="CGST_SGST">CGST + SGST (18% Intra-State)</option>
                <option value="IGST">IGST (18% Inter-State)</option>
                <option value="NON_GST">Non-GST (Retail / Bill of Supply)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
              Fabrication Items & Services Table
            </h3>

            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Line Item #{idx + 1}</span>
                  </div>

                  {/* Auto fill rate master selector */}
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-500" />
                    <select
                      onChange={(e) => handleSelectRateMaster(idx, e.target.value)}
                      defaultValue=""
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium outline-none"
                    >
                      <option value="" disabled>-- Quick Fill from Rate Master --</option>
                      {rateMaster.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.serviceName} (₹{r.rate}/{r.unit})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded transition-colors disabled:opacity-30"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Description of Goods / Fabrication Work *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Laser Cutting & Bending Work"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      HSN / SAC
                    </label>
                    <input
                      type="text"
                      placeholder="9988"
                      value={item.hsnSac}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-right outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-1.5">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Rate (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-right outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-1.5 text-right flex flex-col justify-end">
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
                Notes / Special Instructions
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Delivered as per PO # PO/2026/089"
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
              Payment & Tax Calculation Summary
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
                  <span>CGST (9%):</span>
                  <span>{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                  <span>SGST (9%):</span>
                  <span>{formatCurrency(sgst)}</span>
                </div>
              </>
            )}

            {gstType === 'IGST' && (
              <div className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                <span>IGST (18%):</span>
                <span>{formatCurrency(igst)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-slate-900 text-white font-extrabold text-sm">
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 pt-2">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Amount Received (Advance / Payment):</span>
              <input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-36 px-3 py-1.5 text-right rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold outline-none"
              />
            </div>

            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold">
              <span>Balance Due:</span>
              <span className="text-sm font-extrabold">{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold text-xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-brand-600/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Invoice...' : isEditing ? 'Update Invoice' : 'Generate Tax Invoice'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
