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
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
    info: 'bg-slate-900/90 border-slate-700 text-slate-200'
  }[activeToast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[activeToast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur transition-all duration-200">
      <div className={`flex items-center gap-2.5 ${bgStyles}`}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{activeToast.message}</span>
        <button
          type="button"
          onClick={dismissToast}
          className="ml-2 rounded p-1 hover:bg-white/10"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

