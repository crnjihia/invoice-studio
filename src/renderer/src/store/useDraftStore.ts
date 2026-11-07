// path: src/renderer/src/store/useDraftStore.ts
import { create } from 'zustand';
import { CurrencyCode, Invoice, LineItem } from '@shared/types';
import { calculateInvoiceTotals } from '@shared/utils/money';

export interface DraftLineItem extends LineItem {
  id: string;
}

export interface DraftState {
  isEditingExistingId: string | null;
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  lineItems: DraftLineItem[];
  notes: string;
  terms: string;
  isDirty: boolean;
  lastSavedAt: string | null;

  // Live computed totals
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
  balanceDueMinor: number;

  // Actions
  setField: <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => void;
  addLineItem: (item?: Partial<DraftLineItem>) => void;
  updateLineItem: (id: string, updates: Partial<DraftLineItem>) => void;
  removeLineItem: (id: string) => void;
  resetDraft: () => void;
  loadFromInvoice: (invoice: Invoice) => void;
  loadFromDraftData: (
    data: {
      clientId?: string;
      issueDate?: string;
      dueDate?: string;
      currency?: CurrencyCode;
      lineItems?: Partial<DraftLineItem>[];
      notes?: string;
      terms?: string;
    },
    existingInvoiceId?: string | null
  ) => void;
  restoreFromLocalStorage: () => boolean;
  clearLocalStorageDraft: () => void;
  hasLocalStorageDraft: () => boolean;
}

export type DraftFields = Pick<
  DraftState,
  'clientId' | 'issueDate' | 'dueDate' | 'currency' | 'notes' | 'terms'
>;

const STORAGE_KEY = 'invoice_studio_active_draft_v1';

function getDefaultDates(): { issueDate: string; dueDate: string } {
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDate = due.toISOString().split('T')[0];
  return { issueDate, dueDate };
}

function createDefaultLineItem(): DraftLineItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    description: '',
    quantity: 1,
    unitPriceMinor: 0,
    discountPercent: 0,
    taxRatePercent: 16
  };
}

function computeTotals(items: DraftLineItem[]): {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
  balanceDueMinor: number;
} {
  return calculateInvoiceTotals(items, 0);
}

function persistToStorage(state: Partial<DraftState>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload = {
      isEditingExistingId: state.isEditingExistingId,
      clientId: state.clientId,
      issueDate: state.issueDate,
      dueDate: state.dueDate,
      currency: state.currency,
      lineItems: state.lineItems,
      notes: state.notes,
      terms: state.terms,
      lastSavedAt: new Date().toISOString()
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[DraftStore] Failed to persist draft to localStorage:', err);
  }
}

const initialDates = getDefaultDates();
const initialItem = createDefaultLineItem();
const initialTotals = computeTotals([initialItem]);

export const useDraftStore = create<DraftState>(set => ({
  isEditingExistingId: null,
  clientId: '',
  issueDate: initialDates.issueDate,
  dueDate: initialDates.dueDate,
  currency: 'KES',
  lineItems: [initialItem],
  notes: 'Thank you for your business. Payment is due within 30 days.',
  terms: 'Late payments are subject to a 2% monthly fee.',
  isDirty: false,
  lastSavedAt: null,

  subtotalMinor: initialTotals.subtotalMinor,
  discountTotalMinor: initialTotals.discountTotalMinor,
  taxTotalMinor: initialTotals.taxTotalMinor,
  totalMinor: initialTotals.totalMinor,
  balanceDueMinor: initialTotals.balanceDueMinor,

  setField: (key, value) => {
    set(state => {
      const updated = { ...state, [key]: value, isDirty: true };
      persistToStorage(updated);
      return updated;
    });
  },

  addLineItem: customItem => {
    set(state => {
      const newItem: DraftLineItem = {
        ...createDefaultLineItem(),
        ...customItem
      };
      const lineItems = [...state.lineItems, newItem];
      const totals = computeTotals(lineItems);
      const updated = {
        ...state,
        lineItems,
        ...totals,
        isDirty: true
      };
      persistToStorage(updated);
      return updated;
    });
  },

  updateLineItem: (id, updates) => {
    set(state => {
      const lineItems = state.lineItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      const totals = computeTotals(lineItems);
      const updated = {
        ...state,
        lineItems,
        ...totals,
        isDirty: true
      };
      persistToStorage(updated);
      return updated;
    });
  },

  removeLineItem: id => {
    set(state => {
      if (state.lineItems.length <= 1) {
        // Keep at least one blank row
        const resetItem = createDefaultLineItem();
        const totals = computeTotals([resetItem]);
        const updated = {
          ...state,
          lineItems: [resetItem],
          ...totals,
          isDirty: true
        };
        persistToStorage(updated);
        return updated;
      }
      const lineItems = state.lineItems.filter(item => item.id !== id);
      const totals = computeTotals(lineItems);
      const updated = {
        ...state,
        lineItems,
        ...totals,
        isDirty: true
      };
      persistToStorage(updated);
      return updated;
    });
  },

  resetDraft: () => {
    const dates = getDefaultDates();
    const item = createDefaultLineItem();
    const totals = computeTotals([item]);
    const cleanState = {
      isEditingExistingId: null,
      clientId: '',
      issueDate: dates.issueDate,
      dueDate: dates.dueDate,
      currency: 'KES' as CurrencyCode,
      lineItems: [item],
      notes: 'Thank you for your business. Payment is due within 30 days.',
      terms: 'Late payments are subject to a 2% monthly fee.',
      isDirty: false,
      lastSavedAt: null,
      ...totals
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set(cleanState);
  },

  loadFromInvoice: invoice => {
    const lineItems: DraftLineItem[] = invoice.lineItems.map(item => ({
      id: item.id || createDefaultLineItem().id,
      description: item.description,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      discountPercent: item.discountPercent,
      taxRatePercent: item.taxRatePercent
    }));

    const totals = computeTotals(lineItems);

    const loadedState = {
      isEditingExistingId: invoice.id,
      clientId: invoice.clientId,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      lineItems: lineItems.length > 0 ? lineItems : [createDefaultLineItem()],
      notes: invoice.notes ?? '',
      terms: invoice.terms ?? '',
      isDirty: false,
      lastSavedAt: invoice.updatedAt,
      ...totals
    };

    set(loadedState);
  },

  loadFromDraftData: (data, existingInvoiceId = null) => {
    const dates = getDefaultDates();
    const rawItems = data.lineItems && data.lineItems.length > 0 ? data.lineItems : [createDefaultLineItem()];
    const lineItems: DraftLineItem[] = rawItems.map(item => ({
      id: item.id || createDefaultLineItem().id,
      description: item.description ?? '',
      quantity: item.quantity ?? 1,
      unitPriceMinor: item.unitPriceMinor ?? 0,
      discountPercent: item.discountPercent ?? 0,
      taxRatePercent: item.taxRatePercent ?? 16
    }));

    const totals = computeTotals(lineItems);
    const loadedState = {
      isEditingExistingId: existingInvoiceId || null,
      clientId: data.clientId ?? '',
      issueDate: data.issueDate ?? dates.issueDate,
      dueDate: data.dueDate ?? dates.dueDate,
      currency: (data.currency ?? 'KES') as CurrencyCode,
      lineItems,
      notes: data.notes ?? '',
      terms: data.terms ?? '',
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
      ...totals
    };
    persistToStorage(loadedState);
    set(loadedState);
  },

  hasLocalStorageDraft: () => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return Boolean(raw && raw.length > 10);
  },

  restoreFromLocalStorage: () => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.lineItems) || parsed.lineItems.length === 0) return false;

      const totals = computeTotals(parsed.lineItems);

      set({
        isEditingExistingId: parsed.isEditingExistingId ?? null,
        clientId: parsed.clientId ?? '',
        issueDate: parsed.issueDate ?? initialDates.issueDate,
        dueDate: parsed.dueDate ?? initialDates.dueDate,
        currency: parsed.currency ?? 'KES',
        lineItems: parsed.lineItems,
        notes: parsed.notes ?? '',
        terms: parsed.terms ?? '',
        isDirty: true,
        lastSavedAt: parsed.lastSavedAt ?? null,
        ...totals
      });
      return true;
    } catch (err) {
      console.warn('[DraftStore] Failed to restore draft:', err);
      return false;
    }
  },

  clearLocalStorageDraft: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}));
