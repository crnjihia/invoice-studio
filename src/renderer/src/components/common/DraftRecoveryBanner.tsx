// path: src/renderer/src/components/common/DraftRecoveryBanner.tsx
import React from 'react';
import { AlertTriangle, RotateCcw, Trash2, X } from 'lucide-react';
import { useDraftRecovery } from '../../hooks/useDraftRecovery';
import { useUiStore } from '../../store/useUiStore';

export const DraftRecoveryBanner: React.FC = () => {
  const {
    activeRecoverableDraft,
    restoreDraft,
    discardDraft,
    dismissRecoveryBanner
  } = useDraftRecovery();
  const showToast = useUiStore(state => state.showToast);
  const setCurrentView = useUiStore(state => state.setCurrentView);

  if (!activeRecoverableDraft) return null;

  const handleRestore = async (): Promise<void> => {
    await restoreDraft(activeRecoverableDraft);
    setCurrentView('editor');
    showToast('Unsaved draft restored successfully', 'success');
  };

  const handleDiscard = async (): Promise<void> => {
    await discardDraft(activeRecoverableDraft.draftId);
    showToast('Unsaved draft discarded', 'info');
  };

  const formattedDate = new Date(activeRecoverableDraft.lastModified).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const reasonLabel =
    activeRecoverableDraft.reason === 'unsaved_edits_after_crash'
      ? 'Unsaved edits to invoice'
      : 'Unsaved new invoice draft';

  return (
    <div className="border-b border-amber-500/30 bg-amber-950/40 px-6 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-amber-200">{reasonLabel} detected!</span>
            <span className="ml-2 text-slate-300">
              Recovered from unexpected shutdown ({formattedDate}).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-emerald-500"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Draft
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            Discard
          </button>
          <button
            type="button"
            onClick={dismissRecoveryBanner}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

