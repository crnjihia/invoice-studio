// path: src/renderer/src/components/common/Toast.tsx
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';

export const Toast: React.FC = () => {
  const activeToast = useUiStore(state => state.activeToast);
  const dismissToast = useUiStore(state => state.dismissToast);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const bgStyles = {
    success:
      'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30',
    error:
      'bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-950/30',
    info:
      'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/30'
  }[activeToast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[activeToast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${bgStyles}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-xs font-medium">{activeToast.message}</span>
        <button
          type="button"
          onClick={dismissToast}
          className="ml-2 rounded-lg p-1 hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
