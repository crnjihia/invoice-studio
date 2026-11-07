// path: src/renderer/src/components/invoices/InvoiceList.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  FileText,
  Copy,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  BadgeCheck
} from 'lucide-react';
import { Invoice, InvoiceStatus, Client } from '@shared/types';
import { formatMoney } from '@shared/utils/money';
import { useUiStore } from '../../store/useUiStore';
import { useDraftStore } from '../../store/useDraftStore';

const STATUS_FILTERS: Array<{ id: InvoiceStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All Invoices' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'partially_paid', label: 'Partially Paid' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' }
];

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const statusFilter = useUiStore(state => state.statusFilter);
  const setStatusFilter = useUiStore(state => state.setStatusFilter);
  const searchQuery = useUiStore(state => state.searchQuery);
  const setSearchQuery = useUiStore(state => state.setSearchQuery);
  const setCurrentView = useUiStore(state => state.setCurrentView);
  const showToast = useUiStore(state => state.showToast);

  const resetDraft = useDraftStore(state => state.resetDraft);
  const loadFromInvoice = useDraftStore(state => state.loadFromInvoice);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Check overdue invoices in background
      await window.api.invoices.checkOverdue().catch(() => {});

      const [invoicesRes, clientsRes] = await Promise.all([
        window.api.invoices.list({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
          limit: 100
        }),
        window.api.clients.list({ limit: 100 })
      ]);

      const map: Record<string, string> = {};
      clientsRes.items.forEach((c: Client) => {
        map[c.id] = c.name;
      });

      setInvoices(invoicesRes.items);
      setTotal(invoicesRes.total);
      setClientsMap(map);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let billedMinor = 0;
    let dueMinor = 0;
    let paidMinor = 0;

    for (const inv of invoices) {
      billedMinor += inv.totalMinor;
      dueMinor += inv.balanceDueMinor;
      paidMinor += inv.amountPaidMinor;
    }

    return {
      billedMinor,
      dueMinor,
      paidMinor,
      count: invoices.length
    };
  }, [invoices]);

  const handleNewInvoice = (): void => {
    resetDraft();
    setCurrentView('editor');
  };

  const handleEditInvoice = async (invoiceId: string): Promise<void> => {
    try {
      const fullInvoice = await window.api.invoices.get(invoiceId);
      loadFromInvoice(fullInvoice);
      setCurrentView('editor');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open invoice';
      showToast(message, 'error');
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string): Promise<void> => {
    try {
      const duplicated = await window.api.invoices.duplicate(invoiceId);
      showToast(`Duplicated as ${duplicated.invoiceNumber}`, 'success');
      void loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate invoice';
      showToast(message, 'error');
    }
  };

  const handleExportPdf = async (invoiceId: string): Promise<void> => {
    setIsExporting(invoiceId);
    try {
      const result = await window.api.pdf.export({
        invoiceId,
        templateId: 'modern',
        primaryColor: '#059669',
        accentColor: '#10b981'
      });
      if (result) {
        showToast(`Saved PDF (${(result.bytes / 1024).toFixed(0)} KB)`, 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      showToast(message, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice): Promise<void> => {
    const confirmed = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoiceNumber}?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await window.api.invoices.delete(invoice.id);
      showToast(`Invoice ${invoice.invoiceNumber} deleted`, 'success');
      void loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete invoice';
      showToast(message, 'error');
    }
  };

  const handleExportCsv = async (): Promise<void> => {
    try {
      const result = await window.api.reports.exportInvoicesCsv({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined
      });
      if (result) {
        showToast(`Exported ${result.rowCount} invoices to CSV`, 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      showToast(message, 'error');
    }
  };

  const getStatusBadge = (status: InvoiceStatus): JSX.Element => {
    const config = {
      draft: {
        label: 'Draft',
        icon: Clock,
        style:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      },
      sent: {
        label: 'Sent',
        icon: FileText,
        style:
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30'
      },
      partially_paid: {
        label: 'Partially Paid',
        icon: AlertCircle,
        style:
          'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30'
      },
      paid: {
        label: 'Paid',
        icon: CheckCircle,
        style:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
      },
      overdue: {
        label: 'Overdue',
        icon: AlertTriangle,
        style:
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 animate-pulse'
      },
      void: {
        label: 'Void',
        icon: AlertCircle,
        style:
          'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700 line-through'
      }
    }[status];

    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.style}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Financial Pulse Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Billed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatMoney(metrics.billedMinor, 'KES')}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            Across {metrics.count} displayed invoice{metrics.count === 1 ? '' : 's'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Outstanding Balance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatMoney(metrics.dueMinor, 'KES')}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">Awaiting client settlement</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Collected
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(metrics.paidMinor, 'KES')}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">Successfully reconciled</span>
        </div>
      </div>

      {/* Top Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            title="Export CSV Report"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Export CSV
          </button>
        </div>

        {/* The single, clear primary Create Invoice button */}
        <button
          type="button"
          onClick={handleNewInvoice}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
        {STATUS_FILTERS.map(tab => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Invoices List / Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Loading invoices...
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/20">
          <FileText className="h-10 w-10 text-slate-400 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-200">
            No invoices found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'No invoices match your selected filter criteria. Try clearing the search or status tab.'
              : 'Create your first invoice to bill Kenyan clients in KES with automatic 16% VAT and Paybill reconciliation.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              type="button"
              onClick={handleNewInvoice}
              className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-medium">Invoice #</th>
                <th className="px-5 py-3.5 font-medium">Client</th>
                <th className="px-5 py-3.5 font-medium">Due Date</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Total</th>
                <th className="px-5 py-3.5 font-medium text-right">Balance Due</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {invoices.map(inv => {
                const clientName = clientsMap[inv.clientId] || 'Unknown Client';
                const formattedTotal = formatMoney(inv.totalMinor, inv.currency);
                const formattedBalance = formatMoney(inv.balanceDueMinor, inv.currency);

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleEditInvoice(inv.id)}
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {clientName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-KE')}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(inv.status)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formattedTotal}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                      {inv.balanceDueMinor === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Settled
                        </span>
                      ) : (
                        formattedBalance
                      )}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditInvoice(inv.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Edit Invoice"
                          aria-label={`Edit ${inv.invoiceNumber}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateInvoice(inv.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                          title="Duplicate Invoice"
                          aria-label={`Duplicate ${inv.invoiceNumber}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(inv.id)}
                          disabled={isExporting === inv.id}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400 disabled:opacity-50"
                          title="Export PDF"
                          aria-label={`Export PDF ${inv.invoiceNumber}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                          title="Delete Invoice"
                          aria-label={`Delete ${inv.invoiceNumber}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer counter */}
      {!isLoading && invoices.length > 0 && (
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          Showing {invoices.length} of {total} invoice{total === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
};
