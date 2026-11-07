// path: src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/channels';
import { IpcResult } from '../shared/errors';
import {
  BackupInfo,
  BackupType,
  CategoryExpenseSummary,
  Client,
  ClientFilter,
  CreateClientInput,
  CreateExpenseInput,
  CreateInvoiceInput,
  CsvExportResult,
  EmailInvoiceOptions,
  Expense,
  ExpenseFilter,
  ExportPdfOptions,
  FinancialSummary,
  Invoice,
  InvoiceFilter,
  MonthlyRevenue,
  Payment,
  PdfExportResult,
  PdfRenderOptions,
  PrepareEmailResult,
  RecordPaymentInput,
  ReportFilter,
  RestorePreview,
  UpdateClientInput,
  UpdateExpenseInput,
  UpdateInvoiceInput,
  NetworkStatus,
  RecoverableDraft,
  SaveDraftSnapshotInput,
  CheckUpdateOptions,
  UpdateStatusResponse
} from '../shared/types';

/**
 * Invokes an IPC channel and unwraps the IpcResult, throwing if the handler returned an error.
 */
async function invokeChannel<T>(channel: string, payload?: unknown): Promise<T> {
  const result: IpcResult<T> = await ipcRenderer.invoke(channel, payload);
  if (!result.success) {
    const error = new Error(result.error.message);
    (error as Error & { code: string; fieldErrors?: Record<string, string[]> }).code =
      result.error.code;
    (error as Error & { code: string; fieldErrors?: Record<string, string[]> }).fieldErrors =
      result.error.fieldErrors;
    throw error;
  }
  return result.data;
}

/**
 * Narrow preload API exposing typed operations via contextBridge.
 * Raw ipcRenderer is NEVER exposed to the window context.
 */
contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
    getPlatform: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PLATFORM),
    openExternal: (url: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP.OPEN_EXTERNAL, url),
    onMenuAction: (callback: (action: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, action: string): void => {
        callback(action);
      };
      ipcRenderer.on('menu:action', listener);
      return () => {
        ipcRenderer.removeListener('menu:action', listener);
      };
    }
  },
  clients: {
    create: (input: CreateClientInput): Promise<Client> =>
      invokeChannel<Client>(IPC_CHANNELS.CLIENT.CREATE, input),
    get: (id: string): Promise<Client> => invokeChannel<Client>(IPC_CHANNELS.CLIENT.GET, { id }),
    list: (filter: ClientFilter): Promise<{ items: Client[]; total: number }> =>
      invokeChannel<{ items: Client[]; total: number }>(IPC_CHANNELS.CLIENT.LIST, filter),
    update: (input: UpdateClientInput): Promise<Client> =>
      invokeChannel<Client>(IPC_CHANNELS.CLIENT.UPDATE, input),
    delete: (id: string): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.CLIENT.DELETE, { id })
  },
  invoices: {
    create: (input: CreateInvoiceInput): Promise<Invoice> =>
      invokeChannel<Invoice>(IPC_CHANNELS.INVOICE.CREATE, input),
    get: (id: string): Promise<Invoice> => invokeChannel<Invoice>(IPC_CHANNELS.INVOICE.GET, { id }),
    list: (filter: InvoiceFilter): Promise<{ items: Invoice[]; total: number }> =>
      invokeChannel<{ items: Invoice[]; total: number }>(IPC_CHANNELS.INVOICE.LIST, filter),
    update: (input: UpdateInvoiceInput): Promise<Invoice> =>
      invokeChannel<Invoice>(IPC_CHANNELS.INVOICE.UPDATE, input),
    delete: (id: string): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.INVOICE.DELETE, { id }),
    duplicate: (id: string): Promise<Invoice> =>
      invokeChannel<Invoice>(IPC_CHANNELS.INVOICE.DUPLICATE, { id }),
    checkOverdue: (): Promise<{ updatedCount: number; overdueInvoiceIds: string[] }> =>
      invokeChannel<{ updatedCount: number; overdueInvoiceIds: string[] }>(
        IPC_CHANNELS.INVOICE.CHECK_OVERDUE,
        {}
      )
  },
  expenses: {
    create: (input: CreateExpenseInput): Promise<Expense> =>
      invokeChannel<Expense>(IPC_CHANNELS.EXPENSE.CREATE, input),
    get: (id: string): Promise<Expense> => invokeChannel<Expense>(IPC_CHANNELS.EXPENSE.GET, { id }),
    list: (filter: ExpenseFilter): Promise<{ items: Expense[]; total: number }> =>
      invokeChannel<{ items: Expense[]; total: number }>(IPC_CHANNELS.EXPENSE.LIST, filter),
    update: (input: UpdateExpenseInput): Promise<Expense> =>
      invokeChannel<Expense>(IPC_CHANNELS.EXPENSE.UPDATE, input),
    delete: (id: string): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.EXPENSE.DELETE, { id }),
    saveReceipt: (
      fileName: string,
      mimeType: string,
      base64Data: string
    ): Promise<{ hash: string; fileName: string; filePath: string; bytes: number }> =>
      invokeChannel<{ hash: string; fileName: string; filePath: string; bytes: number }>(
        IPC_CHANNELS.EXPENSE.SAVE_RECEIPT,
        { fileName, mimeType, base64Data }
      ),
    getReceiptPath: (hash: string): Promise<string | null> =>
      invokeChannel<string | null>(IPC_CHANNELS.EXPENSE.GET_RECEIPT_PATH, { hash })
  },
  payments: {
    record: (input: RecordPaymentInput): Promise<Payment> =>
      invokeChannel<Payment>(IPC_CHANNELS.PAYMENT.RECORD, input),
    listByInvoice: (invoiceId: string): Promise<Payment[]> =>
      invokeChannel<Payment[]>(IPC_CHANNELS.PAYMENT.LIST_BY_INVOICE, { invoiceId }),
    delete: (id: string): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.PAYMENT.DELETE, { id })
  },
  reports: {
    getFinancialSummary: (filter?: ReportFilter): Promise<FinancialSummary> =>
      invokeChannel<FinancialSummary>(IPC_CHANNELS.REPORT.GET_FINANCIAL_SUMMARY, filter || {}),
    getRevenueByMonth: (filter?: ReportFilter): Promise<MonthlyRevenue[]> =>
      invokeChannel<MonthlyRevenue[]>(IPC_CHANNELS.REPORT.GET_REVENUE_BY_MONTH, filter || {}),
    getExpensesByCategory: (filter?: ReportFilter): Promise<CategoryExpenseSummary[]> =>
      invokeChannel<CategoryExpenseSummary[]>(
        IPC_CHANNELS.REPORT.GET_EXPENSES_BY_CATEGORY,
        filter || {}
      ),
    exportInvoicesCsv: (
      filter?: InvoiceFilter,
      targetPath?: string
    ): Promise<CsvExportResult | null> =>
      invokeChannel<CsvExportResult | null>(IPC_CHANNELS.REPORT.EXPORT_INVOICES_CSV, {
        filter,
        targetPath
      }),
    exportExpensesCsv: (
      filter?: ExpenseFilter,
      targetPath?: string
    ): Promise<CsvExportResult | null> =>
      invokeChannel<CsvExportResult | null>(IPC_CHANNELS.REPORT.EXPORT_EXPENSES_CSV, {
        filter,
        targetPath
      })
  },
  pdf: {
    generate: (
      options: PdfRenderOptions
    ): Promise<{ fileName: string; bytes: number; base64: string }> =>
      invokeChannel<{ fileName: string; bytes: number; base64: string }>(
        IPC_CHANNELS.INVOICE.GENERATE_PDF,
        options
      ),
    preview: (options: PdfRenderOptions): Promise<string> =>
      invokeChannel<string>(IPC_CHANNELS.INVOICE.PREVIEW_PDF, options),
    export: (options: ExportPdfOptions): Promise<PdfExportResult | null> =>
      invokeChannel<PdfExportResult | null>(IPC_CHANNELS.INVOICE.EXPORT_PDF, options),
    open: (filePath: string): Promise<string> =>
      invokeChannel<string>(IPC_CHANNELS.INVOICE.OPEN_PDF, { filePath }),
    reveal: (filePath: string): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.INVOICE.REVEAL_PDF, { filePath }),
    prepareEmail: (options: EmailInvoiceOptions): Promise<PrepareEmailResult> =>
      invokeChannel<PrepareEmailResult>(IPC_CHANNELS.INVOICE.PREPARE_EMAIL, options)
  },
  backups: {
    trigger: (type: BackupType = 'manual'): Promise<BackupInfo> =>
      invokeChannel<BackupInfo>(IPC_CHANNELS.BACKUP.TRIGGER, { type }),
    list: (customFolder?: string): Promise<BackupInfo[]> =>
      invokeChannel<BackupInfo[]>(IPC_CHANNELS.BACKUP.LIST, { customFolder }),
    selectFolder: (): Promise<string | null> =>
      invokeChannel<string | null>(IPC_CHANNELS.BACKUP.SELECT_FOLDER, {}),
    preview: (backupPath: string): Promise<RestorePreview> =>
      invokeChannel<RestorePreview>(IPC_CHANNELS.BACKUP.PREVIEW, { backupPath }),
    restore: (
      backupPath: string
    ): Promise<{ success: boolean; preRestoreSnapshotPath: string | null }> =>
      invokeChannel<{ success: boolean; preRestoreSnapshotPath: string | null }>(
        IPC_CHANNELS.BACKUP.RESTORE,
        { backupPath }
      ),
    seedDemoData: (
      forceReset = true
    ): Promise<{
      success: boolean;
      clientCount: number;
      invoiceCount: number;
      expenseCount: number;
    }> =>
      invokeChannel<{
        success: boolean;
        clientCount: number;
        invoiceCount: number;
        expenseCount: number;
      }>(IPC_CHANNELS.BACKUP.SEED_DEMO_DATA, { forceReset })
  },
  drafts: {
    saveSnapshot: (
      snapshot: SaveDraftSnapshotInput
    ): Promise<{ success: boolean; filePath: string }> =>
      invokeChannel<{ success: boolean; filePath: string }>(
        IPC_CHANNELS.DRAFT.SAVE_SNAPSHOT,
        snapshot
      ),
    listRecoverable: (): Promise<RecoverableDraft[]> =>
      invokeChannel<RecoverableDraft[]>(IPC_CHANNELS.DRAFT.LIST_RECOVERABLE, {}),
    discardSnapshot: (draftId: string): Promise<{ success: boolean }> =>
      invokeChannel<{ success: boolean }>(IPC_CHANNELS.DRAFT.DISCARD_SNAPSHOT, { draftId })
  },
  network: {
    getStatus: (): Promise<NetworkStatus> =>
      invokeChannel<NetworkStatus>(IPC_CHANNELS.NETWORK.GET_STATUS, {})
  },
  updates: {
    check: (options?: CheckUpdateOptions): Promise<UpdateStatusResponse> =>
      invokeChannel<UpdateStatusResponse>(IPC_CHANNELS.UPDATE.CHECK, options),
    startDownload: (): Promise<UpdateStatusResponse> =>
      invokeChannel<UpdateStatusResponse>(IPC_CHANNELS.UPDATE.START_DOWNLOAD, {}),
    install: (): Promise<boolean> =>
      invokeChannel<boolean>(IPC_CHANNELS.UPDATE.INSTALL, {}),
    getStatus: (): Promise<UpdateStatusResponse> =>
      invokeChannel<UpdateStatusResponse>(IPC_CHANNELS.UPDATE.GET_STATUS, {})
  }
});
