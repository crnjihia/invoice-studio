// path: src/renderer/src/components/backups/BackupView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  RotateCcw,
  Plus,
  FolderOpen,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { BackupInfo, RestorePreview, BackupType } from '@shared/types';
import { useUiStore } from '../../store/useUiStore';

export const BackupView: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [customFolder, setCustomFolder] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Restore Modal State
  const [restoreCandidate, setRestoreCandidate] = useState<{
    path: string;
    preview: RestorePreview;
  } | null>(null);

  const showToast = useUiStore(state => state.showToast);

  const loadBackups = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const list = await window.api.backups.list(customFolder);
      setBackups(list);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list backups';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [customFolder, showToast]);

  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async (): Promise<void> => {
    setIsBackingUp(true);
    try {
      const backup = await window.api.backups.trigger('manual');
      showToast(`Backup created: ${backup.filename} (${(backup.sizeBytes / 1024).toFixed(0)} KB)`, 'success');
      void loadBackups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create backup';
      showToast(message, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectFolder = async (): Promise<void> => {
    try {
      const folder = await window.api.backups.selectFolder();
      if (folder) {
        setCustomFolder(folder);
        showToast(`Backup folder changed to: ${folder}`, 'info');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to select folder';
      showToast(message, 'error');
    }
  };

  const handleOpenRestorePreview = async (backupPath: string): Promise<void> => {
    try {
      const preview = await window.api.backups.preview(backupPath);
      setRestoreCandidate({ path: backupPath, preview });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to preview backup';
      showToast(message, 'error');
    }
  };

  const handleConfirmRestore = async (): Promise<void> => {
    if (!restoreCandidate) return;

    setIsRestoring(true);
    try {
      const result = await window.api.backups.restore(restoreCandidate.path);
      if (result.success) {
        showToast('Database successfully restored from backup!', 'success');
        setRestoreCandidate(null);
        void loadBackups();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore database';
      showToast(message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTypeBadge = (type: BackupType): JSX.Element => {
    const config: Record<BackupType, string> = {
      manual:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
      scheduled:
        'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30',
      'on-exit':
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
      'pre-migration':
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
      'pre-restore':
        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
      'pre-update':
        'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30'
    };

    const style =
      config[type] ||
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${style}`}
      >
        {type.replace('-', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Database Backups &amp; Safety Snapshots
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Online non-blocking SQLite backups with automated 7-daily / 4-weekly retention and PRAGMA integrity verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectFolder}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            <FolderOpen className="h-4 w-4 text-slate-400" />
            {customFolder ? 'Custom Folder' : 'Change Folder'}
          </button>
          <button
            type="button"
            onClick={() => void handleCreateBackup()}
            disabled={isBackingUp}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isBackingUp ? 'Backing up...' : 'Create Backup Now'}
          </button>
        </div>
      </div>

      {/* Safety Info Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-slate-200">Zero Data Loss Policy</h4>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Backups are performed using SQLite&apos;s Online Backup API without locking or stopping the application.
              Restoring any backup automatically takes an immutable safety snapshot of your current state first, so you can never accidentally overwrite uncommitted work.
            </p>
            {customFolder && (
              <p className="font-mono text-emerald-600 dark:text-emerald-400 pt-1">
                Custom backup directory: {customFolder}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Backups List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Loading backups...
          </div>
        </div>
      ) : backups.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/20">
          <HardDrive className="h-10 w-10 text-slate-400 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-200">No backups found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Click &ldquo;Create Backup Now&rdquo; to generate a point-in-time snapshot of your clients, invoices, and expenses.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-medium">Backup File</th>
                <th className="px-5 py-3.5 font-medium">Type</th>
                <th className="px-5 py-3.5 font-medium">Created At</th>
                <th className="px-5 py-3.5 font-medium">Size</th>
                <th className="px-5 py-3.5 font-medium">Integrity</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {backups.map(backup => (
                <tr key={backup.fullPath} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">
                    {backup.filename}
                  </td>
                  <td className="px-5 py-3.5">{getTypeBadge(backup.type)}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {new Date(backup.createdAt).toLocaleString('en-KE', {
                      timeZone: 'Africa/Nairobi',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                    {formatSize(backup.sizeBytes)}
                  </td>
                  <td className="px-5 py-3.5">
                    {backup.isVerified ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Unchecked
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => void handleOpenRestorePreview(backup.fullPath)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white shadow-sm transition-colors"
                    >
                      <RotateCcw className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restore Preview Modal */}
      {restoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <RotateCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Confirm Database Restore
              </div>
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safety Guarantee:</strong> An automatic pre-restore safety snapshot will be saved to disk before this backup is applied.
              </span>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="text-slate-600 dark:text-slate-400 font-medium">Backup Contents:</div>
              <div className="grid grid-cols-2 gap-3 text-center pt-1">
                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {restoreCandidate.preview.clientCount}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Clients</div>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {restoreCandidate.preview.invoiceCount}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Invoices</div>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Created: {new Date(restoreCandidate.preview.createdAt).toLocaleString('en-KE')}
              </div>
              {restoreCandidate.preview.lastInvoiceDate && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Latest invoice date: {restoreCandidate.preview.lastInvoiceDate}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                disabled={isRestoring}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRestore()}
                disabled={isRestoring}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isRestoring ? 'Restoring...' : 'Restore Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
