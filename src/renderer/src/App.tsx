// path: src/renderer/src/App.tsx
import React, { useEffect, useState } from 'react';
import {
  FileText,
  Users,
  Database,
  Moon,
  Sun,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useUiStore } from './store/useUiStore';
import { useDraftStore } from './store/useDraftStore';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { Toast } from './components/common/Toast';
import { DraftRecoveryBanner } from './components/common/DraftRecoveryBanner';
import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceEditor } from './components/invoices/InvoiceEditor';
import { ClientList } from './components/clients/ClientList';
import { ClientModal } from './components/clients/ClientModal';
import { BackupView } from './components/backups/BackupView';

export const App: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('0.1.0');
  const [platform, setPlatform] = useState<string>('unknown');

  const currentView = useUiStore(state => state.currentView);
  const setCurrentView = useUiStore(state => state.setCurrentView);
  const isDark = useUiStore(state => state.isDark);
  const toggleTheme = useUiStore(state => state.toggleTheme);
  const openCreateClientModal = useUiStore(state => state.openCreateClientModal);

  const resetDraft = useDraftStore(state => state.resetDraft);
  const { isOnline, status } = useNetworkStatus();

  useEffect(() => {
    if (window.api && window.api.app) {
      window.api.app
        .getVersion()
        .then(setAppVersion)
        .catch(() => {});
      window.api.app
        .getPlatform()
        .then(setPlatform)
        .catch(() => {});

      // Register menu accelerator listeners
      const unsubscribe = window.api.app.onMenuAction((action: string) => {
        switch (action) {
          case 'new-invoice':
            resetDraft();
            setCurrentView('editor');
            break;
          case 'new-client':
            openCreateClientModal();
            break;
          case 'open-invoices':
            setCurrentView('invoices');
            break;
          case 'open-clients':
            setCurrentView('clients');
            break;
          case 'open-backups':
            setCurrentView('backups');
            break;
          default:
            break;
        }
      });

      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [resetDraft, setCurrentView, openCreateClientModal]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Check for Ctrl / Meta key combinations
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          resetDraft();
          setCurrentView('editor');
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setCurrentView('backups');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetDraft, setCurrentView]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
      {/* Top Application Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200/90 bg-white/90 px-6 backdrop-blur dark:border-slate-800/90 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-md shadow-emerald-600/30">
            IS
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
              Invoice Studio
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Offline-First Kenya SME Invoicing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Network Status Pill */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              status === 'online'
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Offline Native</span>
              </>
            )}
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors shadow-sm"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme mode"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Sandboxed Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sandboxed Native
          </span>

          {/* Version */}
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            v{appVersion} ({platform})
          </span>
        </div>
      </header>

      {/* Crash Draft Recovery Banner */}
      <DraftRecoveryBanner />

      {/* Navigation Sub-Header */}
      <nav className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-6 py-2 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentView('invoices')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentView === 'invoices'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Invoices
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('clients')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentView === 'clients'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Clients
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('backups')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentView === 'backups'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Backups &amp; Safety
          </button>

          {currentView === 'editor' && (
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-medium shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              Invoice Editor
            </button>
          )}
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 p-6 lg:p-8">
        <h2 className="sr-only">Invoicing Workspace</h2>
        <div className="mx-auto max-w-7xl">
          {currentView === 'invoices' && <InvoiceList />}
          {currentView === 'clients' && <ClientList />}
          {currentView === 'editor' && <InvoiceEditor />}
          {currentView === 'backups' && <BackupView />}
        </div>
      </main>

      {/* Modals & Feedback Notifications */}
      <ClientModal />
      <Toast />
    </div>
  );
};
