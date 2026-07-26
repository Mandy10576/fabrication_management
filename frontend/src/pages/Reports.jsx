import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Receipt,
  Layers,
  Search
} from 'lucide-react';

export const Reports = () => {
  const { selectedFY, activeFYObj } = useFY();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices?all=true&financialYearId=${selectedFY}&search=${encodeURIComponent(search)}`);
      const itemsList = Array.isArray(res) ? res : (res?.items || []);
      setInvoices(itemsList);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedFY, search]);

  // Aggregate totals
  const totalBilled = invoices.reduce((a, b) => a + b.grandTotal, 0);
  const totalReceived = invoices.reduce((a, b) => a + b.amountReceived, 0);
  const totalBalance = invoices.reduce((a, b) => a + b.balanceDue, 0);

  const gstInvoices = invoices.filter(i => i.gstType !== 'NON_GST');
  const nonGstInvoices = invoices.filter(i => i.gstType === 'NON_GST');

  const totalCGST = gstInvoices.reduce((a, b) => a + (b.cgstAmount || 0), 0);
  const totalSGST = gstInvoices.reduce((a, b) => a + (b.sgstAmount || 0), 0);
  const totalIGST = gstInvoices.reduce((a, b) => a + (b.igstAmount || 0), 0);
  const totalTaxCollected = totalCGST + totalSGST + totalIGST;

  const exportToExcel = () => {
    const data = invoices.map(inv => ({
      'Invoice No': inv.invoiceNumber,
      'Date': formatDate(inv.date),
      'Client Company': inv.client?.companyName || '',
      'Client GSTIN': inv.client?.gstin || 'NON-GST',
      'Tax Type': inv.gstType,
      'Subtotal (₹)': inv.subtotal,
      'Discount (₹)': inv.discount,
      'CGST (₹)': inv.cgstAmount || 0,
      'SGST (₹)': inv.sgstAmount || 0,
      'IGST (₹)': inv.igstAmount || 0,
      'Total Tax (₹)': inv.totalTax || 0,
      'Grand Total (₹)': inv.grandTotal,
      'Amount Received (₹)': inv.amountReceived,
      'Balance Due (₹)': inv.balanceDue,
      'Status': inv.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GST & Financial Report");
    XLSX.writeFile(workbook, `GST_Financial_Report_FY_${activeFYObj ? activeFYObj.year : 'ALL'}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500" />
            <span>Financial & GST Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            GST tax returns breakdown, tax collected, and Excel spreadsheet exports for FY {activeFYObj ? activeFYObj.year : 'All Years'}
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel (.XLSX) Report</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Billed Revenue</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalBilled)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length} total invoices</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Amount Collected</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalReceived)}
          </div>
          <div className="text-[11px] text-emerald-500 mt-1">Actual bank deposits</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Outstanding Balance</div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalBalance)}
          </div>
          <div className="text-[11px] text-rose-500 mt-1">Pending payments due</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Total GST Tax Collected</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(totalTaxCollected)}
          </div>
          <div className="text-[11px] text-indigo-500 mt-1">CGST + SGST + IGST</div>
        </div>
      </div>

      {/* Tax Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
          <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase">CGST Collected</div>
          <div className="text-lg font-extrabold text-indigo-950 dark:text-indigo-200 mt-1">
            {formatCurrency(totalCGST)}
          </div>
          <div className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">Central Goods & Services Tax (9%)</div>
        </div>

        <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
          <div className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase">SGST Collected</div>
          <div className="text-lg font-extrabold text-purple-950 dark:text-purple-200 mt-1">
            {formatCurrency(totalSGST)}
          </div>
          <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">State Goods & Services Tax (9%)</div>
        </div>

        <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">IGST Collected</div>
          <div className="text-lg font-extrabold text-blue-950 dark:text-blue-200 mt-1">
            {formatCurrency(totalIGST)}
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">Integrated GST (18% Inter-State)</div>
        </div>
      </div>

      {/* Search and Detailed Report Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Comprehensive Financial Ledger ({invoices.length} Records)
          </h3>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="pb-3 px-3">Invoice No</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Client Company</th>
                <th className="pb-3 px-3">GSTIN</th>
                <th className="pb-3 px-3 text-right">Subtotal</th>
                <th className="pb-3 px-3 text-right">Tax (CGST+SGST/IGST)</th>
                <th className="pb-3 px-3 text-right">Grand Total</th>
                <th className="pb-3 px-3 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                  <td className="py-3 px-3 text-slate-500">{formatDate(inv.date)}</td>
                  <td className="py-3 px-3 text-slate-800 dark:text-slate-200">{inv.client?.companyName}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{inv.client?.gstin || 'Non-GST'}</td>
                  <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(inv.subtotal)}</td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 font-semibold">{formatCurrency(inv.totalTax)}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(inv.grandTotal)}</td>
                  <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(inv.balanceDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
