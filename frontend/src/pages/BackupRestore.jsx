import React, { useState } from 'react';
import { api } from '../services/api';
import {
  DatabaseBackup,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const BackupRestore = () => {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleExportBackup = async () => {
    setDownloading(true);
    setMsg('');
    setError('');
    try {
      const data = await api.get('/backup/export');
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `fabrication_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setMsg('Full database backup exported successfully!');
    } catch (err) {
      setError(err.message || 'Failed to export backup');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      setError('Please select a JSON backup file first');
      return;
    }

    if (!window.confirm('WARNING: Restoring backup will overwrite or update existing database records. Do you wish to continue?')) {
      return;
    }

    setRestoring(true);
    setMsg('');
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          await api.post('/backup/restore', parsed);
          setMsg('Database backup restored successfully!');
        } catch (err) {
          setError(err.message || 'Failed to parse or restore backup JSON file');
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err) {
      setError('Failed to read file');
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl 2xl:max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-brand-500" />
          <span>System Backup & Restore</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Safeguard company invoices, client history, rate catalog, and financial data with JSON backups
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Export System Backup
            </h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Download a complete JSON snapshot containing all clients, financial years, fabrication rate master items, tax invoices, and quotations.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={downloading}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting...' : 'Download Complete Backup JSON'}</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Restore System Data
            </h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a previously exported JSON backup file to restore system records.
            </p>

            <form id="restore-form" onSubmit={handleRestoreBackup} className="mt-4">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
            </form>
          </div>

          <button
            type="submit"
            form="restore-form"
            disabled={restoring || !restoreFile}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{restoring ? 'Restoring Backup...' : 'Restore Data from File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
