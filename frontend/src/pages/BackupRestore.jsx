import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import {
  DatabaseBackup,
  Download,
  Upload,
  FileJson,
  AlertTriangle
} from 'lucide-react';

export const BackupRestore = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);

  const handleExportBackup = async () => {
    setDownloading(true);
    try {
      const data = await api.get('/backup/export');
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `fabrication_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('Full database backup exported successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export backup');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      toast.warning('Please select a JSON backup file first');
      return;
    }

    const ok = await confirm({
      title: 'Restore from backup?',
      message: 'Restoring will overwrite or update existing database records. Export a fresh backup first if you are unsure.',
      confirmText: 'Restore data'
    });
    if (!ok) return;

    setRestoring(true);

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        toast.error('Failed to read the selected file');
        setRestoring(false);
      };
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          await api.post('/backup/restore', parsed);
          toast.success('Database backup restored successfully');
        } catch (err) {
          toast.error(err.message || 'Failed to parse or restore the backup file');
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err) {
      toast.error('Failed to read file');
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-brand-500 shrink-0" />
          <span>Backup & Restore</span>
        </h2>
        <p className="page-subtitle">
          Safeguard invoices, client history, rate catalog, and financial data with JSON backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Export */}
        <div className="card card-pad flex flex-col justify-between gap-5">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Export System Backup
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Download a complete JSON snapshot containing all clients, financial years, rate master items,
              tax invoices, and quotations.
            </p>
          </div>

          <button onClick={handleExportBackup} disabled={downloading} className="btn btn-primary w-full">
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Backup JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Restore */}
        <div className="card card-pad flex flex-col justify-between gap-5">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Restore System Data
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a previously exported JSON backup file to restore system records.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                This overwrites existing records. Export a fresh backup before restoring.
              </p>
            </div>

            <form id="restore-form" onSubmit={handleRestoreBackup} className="mt-4">
              <label htmlFor="restore-file" className="label">Backup file (.json)</label>
              <input
                id="restore-file"
                type="file"
                accept=".json,application/json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 dark:text-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5
                           file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-950/60 dark:file:text-amber-300
                           hover:file:bg-amber-100 dark:hover:file:bg-amber-900/50 file:cursor-pointer"
              />
              {restoreFile && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 min-w-0">
                  <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{restoreFile.name}</span>
                </p>
              )}
            </form>
          </div>

          <button
            type="submit"
            form="restore-form"
            disabled={restoring || !restoreFile}
            className="btn w-full bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25"
          >
            {restoring ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Restoring…</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Restore Data from File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
