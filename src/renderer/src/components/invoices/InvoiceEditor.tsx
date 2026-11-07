// path: src/renderer/src/components/invoices/InvoiceEditor.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { Client, CurrencyCode } from '@shared/types';
import { formatMoney, toMajorUnits, toMinorUnits, calculateLineItemTotals } from '@shared/utils/money';
import { useDraftStore, DraftLineItem } from '../../store/useDraftStore';
import { useUiStore } from '../../store/useUiStore';

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'KES', label: 'KES (Kenyan Shilling)' },
  { code: 'USD', label: 'USD (US Dollar)' },
  { code: 'EUR', label: 'EUR (Euro)' },
  { code: 'GBP', label: 'GBP (British Pound)' }
];

export const InvoiceEditor: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Draft store
  const isEditingExistingId = useDraftStore(state => state.isEditingExistingId);
  const clientId = useDraftStore(state => state.clientId);
  const issueDate = useDraftStore(state => state.issueDate);
  const dueDate = useDraftStore(state => state.dueDate);
  const currency = useDraftStore(state => state.currency);
  const lineItems = useDraftStore(state => state.lineItems);
  const notes = useDraftStore(state => state.notes);
  const terms = useDraftStore(state => state.terms);
  const isDirty = useDraftStore(state => state.isDirty);
  const subtotalMinor = useDraftStore(state => state.subtotalMinor);
  const discountTotalMinor = useDraftStore(state => state.discountTotalMinor);
  const taxTotalMinor = useDraftStore(state => state.taxTotalMinor);
  const totalMinor = useDraftStore(state => state.totalMinor);
  const balanceDueMinor = useDraftStore(state => state.balanceDueMinor);

  const setField = useDraftStore(state => state.setField);
  const addLineItem = useDraftStore(state => state.addLineItem);
  const updateLineItem = useDraftStore(state => state.updateLineItem);
  const removeLineItem = useDraftStore(state => state.removeLineItem);
  const resetDraft = useDraftStore(state => state.resetDraft);
  const loadFromInvoice = useDraftStore(state => state.loadFromInvoice);

  // UI store
  const setCurrentView = useUiStore(state => state.setCurrentView);
  const openCreateClientModal = useUiStore(state => state.openCreateClientModal);
  const showToast = useUiStore(state => state.showToast);

  const loadClients = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.clients.list({ limit: 100 });
      setClients(response.items);
    } catch (err: unknown) {
      console.error('Failed to load clients list:', err);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleSave = async (): Promise<string | null> => {
    setValidationErrors([]);
    const errors: string[] = [];

    if (!clientId) {
      errors.push('Please select a client.');
    }
    if (!issueDate) {
      errors.push('Please specify an issue date.');
    }
    if (!dueDate) {
      errors.push('Please specify a due date.');
    }
    if (lineItems.length === 0) {
      errors.push('Please add at least one line item.');
    }

    const hasEmptyDescription = lineItems.some(i => !i.description.trim());
    if (hasEmptyDescription) {
      errors.push('All line items must have a description.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast(errors[0], 'error');
      return null;
    }

    setIsSaving(true);
    try {
      const payloadLineItems = lineItems.map(item => ({
        description: item.description.trim(),
        quantity: Math.max(1, Math.floor(item.quantity)),
        unitPriceMinor: Math.max(0, Math.round(item.unitPriceMinor)),
        discountPercent: Math.min(100, Math.max(0, item.discountPercent)),
        taxRatePercent: Math.min(100, Math.max(0, item.taxRatePercent))
      }));

      if (isEditingExistingId) {
        const updated = await window.api.invoices.update({
          id: isEditingExistingId,
          clientId,
          issueDate,
          dueDate,
          currency,
          lineItems: payloadLineItems,
          notes,
          terms
        });
        loadFromInvoice(updated);
        showToast(`Invoice ${updated.invoiceNumber} updated`, 'success');
        return updated.id;
      } else {
        const created = await window.api.invoices.create({
          clientId,
          issueDate,
          dueDate,
          currency,
          lineItems: payloadLineItems,
          notes,
          terms
        });
        loadFromInvoice(created);
        showToast(`Invoice ${created.invoiceNumber} created`, 'success');
        return created.id;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save invoice';
      showToast(message, 'error');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    let invoiceId = isEditingExistingId;
    if (!invoiceId || isDirty) {
      invoiceId = await handleSave();
      if (!invoiceId) return;
    }

    setIsExporting(true);
    try {
      const result = await window.api.pdf.export({
        invoiceId,
        templateId: 'modern',
        primaryColor: '#059669',
        accentColor: '#10b981'
      });
      if (result) {
        const exportedName = result.filePath.split(/[\\/]/).pop() || 'invoice.pdf';
        showToast(`Exported PDF: ${exportedName}`, 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetDraft = (): void => {
    const confirmed = window.confirm(
      'Are you sure you want to reset this invoice draft? Unsaved changes will be cleared.'
    );
    if (!confirmed) return;
    resetDraft();
    showToast('Invoice draft reset', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('invoices')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Invoices
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditingExistingId ? 'Edit Invoice' : 'New Invoice'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Draft autosaved locally
              </span>
              {isDirty && <span className="text-amber-500 dark:text-amber-400">• Unsaved changes</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDraft}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || isSaving}
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : isEditingExistingId ? 'Update Invoice' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Validation Banner */}
      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-200">
            <AlertCircle className="h-4 w-4" />
            Please resolve the following errors:
          </div>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Invoice Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Client & Metadata Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Client &amp; Invoice Metadata
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Client Selector */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="invoice-client" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Billed Client <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={openCreateClientModal}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    <UserPlus className="h-3 w-3" />
                    New Client
                  </button>
                </div>
                <select
                  id="invoice-client"
                  value={clientId}
                  onChange={e => setField('clientId', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white shadow-sm"
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.taxPin ? `(PIN: ${c.taxPin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Date */}
              <div>
                <label htmlFor="invoice-issue-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Issue Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="invoice-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={e => setField('issueDate', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white shadow-sm"
                />
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="invoice-due-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="invoice-due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setField('dueDate', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white shadow-sm"
                />
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="invoice-currency" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Currency
                </label>
                <select
                  id="invoice-currency"
                  value={currency}
                  onChange={e => setField('currency', e.target.value as CurrencyCode)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white shadow-sm"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Line Items
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Standard Kenya VAT is 16%. Integer arithmetic ensures no rounding drift.
                </p>
              </div>
              <button
                type="button"
                onClick={() => addLineItem()}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item: DraftLineItem, index: number) => {
                const lineCalc = calculateLineItemTotals(
                  item.quantity,
                  item.unitPriceMinor,
                  item.discountPercent,
                  item.taxRatePercent
                );

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950 transition-colors"
                  >
                    {/* Item Description */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                        Description
                      </label>
                      <input
                        type="text"
                        placeholder={`Item ${index + 1} description (e.g. Mobile App Dev)`}
                        value={item.description}
                        onChange={e => updateLineItem(item.id, { description: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Quantity */}
                      <div className="w-16">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          title="Quantity"
                          value={item.quantity}
                          onChange={e =>
                            updateLineItem(item.id, {
                              quantity: Math.max(1, parseInt(e.target.value, 10) || 1)
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="w-28">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                          Unit Price ({currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          title={`Unit Price in ${currency}`}
                          placeholder="0.00"
                          value={toMajorUnits(item.unitPriceMinor) || ''}
                          onChange={e =>
                            updateLineItem(item.id, {
                              unitPriceMinor: toMinorUnits(parseFloat(e.target.value) || 0)
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Tax % */}
                      <div className="w-20">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                          Tax %
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            title="Tax Rate (16% VAT)"
                            value={item.taxRatePercent}
                            onChange={e =>
                              updateLineItem(item.id, {
                                taxRatePercent: Math.max(0, parseFloat(e.target.value) || 0)
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 pr-5 text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Discount % */}
                      <div className="w-20">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                          Disc %
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            title="Discount %"
                            value={item.discountPercent}
                            onChange={e =>
                              updateLineItem(item.id, {
                                discountPercent: Math.max(0, parseFloat(e.target.value) || 0)
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 pr-5 text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="w-24 text-right">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase sm:hidden">
                          Total
                        </label>
                        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(lineCalc.totalMinor, currency)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length <= 1}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-900 dark:hover:text-rose-400 disabled:opacity-30 transition-colors"
                        title="Remove Item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payment Settlement &amp; Terms
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="invoice-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Instructions (e.g. M-Pesa Paybill / Till / Bank)
                </label>
                <textarea
                  id="invoice-notes"
                  rows={3}
                  value={notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Paybill: 247247, Account: INV-2026-0001, or KCB Bank Nairobi..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="invoice-terms" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Terms &amp; Conditions
                </label>
                <textarea
                  id="invoice-terms"
                  rows={3}
                  value={terms}
                  onChange={e => setField('terms', e.target.value)}
                  placeholder="Payment due within 30 days. Cheques payable to Nairobi Tech Ventures..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Totals Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5 sticky top-6 dark:border-slate-800 dark:bg-slate-900/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Invoice Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono">{formatMoney(subtotalMinor, currency)}</span>
              </div>

              {discountTotalMinor > 0 && (
                <div className="flex justify-between text-rose-500 dark:text-rose-400">
                  <span>Discount</span>
                  <span className="font-mono">-{formatMoney(discountTotalMinor, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>VAT (16%)</span>
                <span className="font-mono">{formatMoney(taxTotalMinor, currency)}</span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                <span>Total Amount</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(totalMinor, currency)}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Balance Due</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                  {formatMoney(balanceDueMinor, currency)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : isEditingExistingId ? 'Save Changes' : 'Create Invoice'}
              </button>
            </div>

            {/* Scope boundary notice */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-400 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Kenyan SME Notice:</strong> Invoicing operates offline. Does not claim
                statutory KRA eTIMS transmission compliance.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
