import React, { useEffect, useState } from 'react';
import { useFY } from '../context/FYContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  FileSpreadsheet,
  Search,
  FileText
} from 'lucide-react';

export const Reports = () => {
  const { selectedFY, activeFYObj } = useFY();
  const toast = useToast();
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
      toast.error(err.message || 'Failed to load report data');
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

  const totalCGST = gstInvoices.reduce((a, b) => a + (b.cgstAmount || 0), 0);
  const totalSGST = gstInvoices.reduce((a, b) => a + (b.sgstAmount || 0), 0);
  const totalIGST = gstInvoices.reduce((a, b) => a + (b.igstAmount || 0), 0);
  const totalTaxCollected = totalCGST + totalSGST + totalIGST;

  const exportToExcel = () => {
    if (invoices.length === 0) {
      toast.warning('There are no records to export.');
      return;
    }

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GST & Financial Report');
    XLSX.writeFile(workbook, `GST_Financial_Report_FY_${activeFYObj ? activeFYObj.year : 'ALL'}.xlsx`);
    toast.success(`Exported ${invoices.length} records to Excel`);
  };

  const overviewCards = [
    {
      label: 'Total Billed Revenue',
      value: totalBilled,
      note: `${invoices.length} total invoices`,
      valueClass: 'text-slate-900 dark:text-white',
      noteClass: 'text-slate-400',
    },
    {
      label: 'Total Amount Collected',
      value: totalReceived,
      note: 'Actual payments received',
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      noteClass: 'text-emerald-500',
    },
    {
      label: 'Total Outstanding',
      value: totalBalance,
      note: 'Pending payments due',
      valueClass: 'text-rose-600 dark:text-rose-400',
      noteClass: 'text-rose-500',
    },
    {
      label: 'Total GST Collected',
      value: totalTaxCollected,
      note: 'CGST + SGST + IGST',
      valueClass: 'text-indigo-600 dark:text-indigo-400',
      noteClass: 'text-indigo-500',
    },
  ];

  const taxCards = [
    {
      label: 'CGST Collected',
      value: totalCGST,
      note: 'Central Goods & Services Tax',
      wrap: 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
      title: 'text-indigo-900 dark:text-indigo-300',
      amount: 'text-indigo-950 dark:text-indigo-200',
      note_: 'text-indigo-700 dark:text-indigo-400',
    },
    {
      label: 'SGST Collected',
      value: totalSGST,
      note: 'State Goods & Services Tax',
      wrap: 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
      title: 'text-purple-900 dark:text-purple-300',
      amount: 'text-purple-950 dark:text-purple-200',
      note_: 'text-purple-700 dark:text-purple-400',
    },
    {
      label: 'IGST Collected',
      value: totalIGST,
      note: 'Integrated GST (Inter-State)',
      wrap: 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      title: 'text-blue-900 dark:text-blue-300',
      amount: 'text-blue-950 dark:text-blue-200',
      note_: 'text-blue-700 dark:text-blue-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500 shrink-0" />
            <span>Reports & GST</span>
          </h2>
          <p className="page-subtitle">
            Tax breakdown and Excel exports for FY {activeFYObj ? activeFYObj.year : 'All Years'}
          </p>
        </div>

        <button onClick={exportToExcel} className="btn btn-emerald w-full sm:w-auto shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {overviewCards.map(({ label, value, note, valueClass, noteClass }) => (
          <div key={label} className="card p-4 sm:p-5">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className={`text-lg sm:text-xl font-bold mt-1.5 break-words leading-tight ${valueClass}`}>
              {loading ? <span className="skeleton block h-6 w-28 rounded" /> : formatCurrency(value)}
            </div>
            <div className={`text-[11px] mt-1.5 ${noteClass}`}>{note}</div>
          </div>
        ))}
      </div>

      {/* Tax breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {taxCards.map(({ label, value, note, wrap, title, amount, note_ }) => (
          <div key={label} className={`p-4 sm:p-5 rounded-2xl border ${wrap}`}>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${title}`}>{label}</div>
            <div className={`text-base sm:text-lg font-extrabold mt-1.5 break-words ${amount}`}>
              {formatCurrency(value)}
            </div>
            <div className={`text-[11px] mt-1 ${note_}`}>{note}</div>
          </div>
        ))}
      </div>

      {/* Ledger */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white min-w-0">
            Financial Ledger
            <span className="font-medium text-slate-500 dark:text-slate-400"> ({invoices.length} records)</span>
          </h3>

          <div className="search-field w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search ledger"
              placeholder="Search invoice or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No records found</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {search ? 'No invoices match your search.' : 'No invoices recorded for this financial year yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Card view up to xl — this table has 8 columns and used to force
                the whole page sideways on a phone. */}
            <ul className="xl:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <li key={inv.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        #{inv.invoiceNumber}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 break-words">
                        {inv.client?.companyName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(inv.date)}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {inv.client?.gstin || 'Non-GST'}
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 xs:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Subtotal</dt>
                      <dd className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
                        {formatCurrency(inv.subtotal)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Tax</dt>
                      <dd className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 break-words">
                        {formatCurrency(inv.totalTax)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Total</dt>
                      <dd className="text-xs font-bold text-slate-900 dark:text-white break-words">
                        {formatCurrency(inv.grandTotal)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Balance</dt>
                      <dd className="text-xs font-bold text-rose-600 dark:text-rose-400 break-words">
                        {formatCurrency(inv.balanceDue)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden xl:block table-wrap max-h-[70vh] overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice No</th>
                    <th scope="col">Date</th>
                    <th scope="col">Client Company</th>
                    <th scope="col">GSTIN</th>
                    <th scope="col" className="text-right">Subtotal</th>
                    <th scope="col" className="text-right">Tax</th>
                    <th scope="col" className="text-right">Grand Total</th>
                    <th scope="col" className="text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                      <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="text-slate-800 dark:text-slate-200 max-w-[16rem]">
                        <span className="line-clamp-2">{inv.client?.companyName}</span>
                      </td>
                      <td className="font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {inv.client?.gstin || 'Non-GST'}
                      </td>
                      <td className="text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="text-right text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                        {formatCurrency(inv.totalTax)}
                      </td>
                      <td className="text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(inv.balanceDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
