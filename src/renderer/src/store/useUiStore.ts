// path: src/renderer/src/store/useUiStore.ts
import { create } from 'zustand';
import { InvoiceStatus } from '@shared/types';

export type AppView = 'invoices' | 'clients' | 'editor' | 'backups' | 'reports';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UiState {
  currentView: AppView;
  searchQuery: string;
  statusFilter: InvoiceStatus | 'all';
  clientIdFilter: string | 'all';

  // Theme & Dark Mode
  themeMode: ThemeMode;
  isDark: boolean;

  // Modals
  isClientModalOpen: boolean;
  editingClientId: string | null;
  isBackupModalOpen: boolean;

  // Feedback toast
  activeToast: ToastNotification | null;

  // Actions
  setCurrentView: (view: AppView) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: InvoiceStatus | 'all') => void;
  setClientIdFilter: (clientId: string | 'all') => void;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  openCreateClientModal: () => void;
  openEditClientModal: (clientId: string) => void;
  closeClientModal: () => void;
  openBackupModal: () => void;
  closeBackupModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;
}

function applyTheme(isDark: boolean): void {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

function getInitialTheme(): { mode: ThemeMode; isDark: boolean } {
  if (typeof window === 'undefined') {
    return { mode: 'dark', isDark: true };
  }
  const saved = window.localStorage?.getItem('theme_mode') as ThemeMode | null;
  if (saved === 'light') {
    applyTheme(false);
    return { mode: 'light', isDark: false };
  }
  if (saved === 'dark') {
    applyTheme(true);
    return { mode: 'dark', isDark: true };
  }
  // Default dark for Invoice Studio's sleek slate palette
  applyTheme(true);
  return { mode: 'dark', isDark: true };
}

const initialTheme = getInitialTheme();

export const useUiStore = create<UiState>((set, get) => ({
  currentView: 'invoices',
  searchQuery: '',
  statusFilter: 'all',
  clientIdFilter: 'all',

  themeMode: initialTheme.mode,
  isDark: initialTheme.isDark,

  isClientModalOpen: false,
  editingClientId: null,
  isBackupModalOpen: false,

  activeToast: null,

  setCurrentView: currentView => set({ currentView }),
  setSearchQuery: searchQuery => set({ searchQuery }),
  setStatusFilter: statusFilter => set({ statusFilter }),
  setClientIdFilter: clientIdFilter => set({ clientIdFilter }),

  toggleTheme: () => {
    const nextDark = !get().isDark;
    const nextMode: ThemeMode = nextDark ? 'dark' : 'light';
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme_mode', nextMode);
    }
    applyTheme(nextDark);
    set({ isDark: nextDark, themeMode: nextMode });
  },

  setThemeMode: mode => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme_mode', mode);
    }
    applyTheme(isDark);
    set({ themeMode: mode, isDark });
  },

  openCreateClientModal: () => set({ isClientModalOpen: true, editingClientId: null }),
  openEditClientModal: clientId => set({ isClientModalOpen: true, editingClientId: clientId }),
  closeClientModal: () => set({ isClientModalOpen: false, editingClientId: null }),

  openBackupModal: () => set({ isBackupModalOpen: true }),
  closeBackupModal: () => set({ isBackupModalOpen: false }),

  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}`;
    set({ activeToast: { id, message, type } });
    setTimeout(() => {
      if (get().activeToast?.id === id) {
        set({ activeToast: null });
      }
    }, 4000);
  },

  dismissToast: () => set({ activeToast: null })
}));

