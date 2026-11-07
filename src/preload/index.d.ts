// path: src/preload/index.d.ts
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

export interface IpcApi {
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    openExternal: (url: string) => Promise<boolean>;
    onMenuAction: (callback: (action: string) => void) => () => void;
  };
  clients: {
    create: (input: CreateClientInput) => Promise<Client>;
    get: (id: string) => Promise<Client>;
    list: (filter: ClientFilter) => Promise<{ items: Client[]; total: number }>;
    update: (input: UpdateClientInput) => Promise<Client>;
    delete: (id: string) => Promise<boolean>;
  };
  invoices: {
    create: (input: CreateInvoiceInput) => Promise<Invoice>;
    get: (id: string) => Promise<Invoice>;
    list: (filter: InvoiceFilter) => Promise<{ items: Invoice[]; total: number }>;
    update: (input: UpdateInvoiceInput) => Promise<Invoice>;
    delete: (id: string) => Promise<boolean>;
    duplicate: (id: string) => Promise<Invoice>;
    checkOverdue: () => Promise<{ updatedCount: number; overdueInvoiceIds: string[] }>;
  };
  expenses: {
    create: (input: CreateExpenseInput) => Promise<Expense>;
    get: (id: string) => Promise<Expense>;
    list: (filter: ExpenseFilter) => Promise<{ items: Expense[]; total: number }>;
    update: (input: UpdateExpenseInput) => Promise<Expense>;
    delete: (id: string) => Promise<boolean>;
    saveReceipt: (
      fileName: string,
      mimeType: string,
      base64Data: string
    ) => Promise<{ hash: string; fileName: string; filePath: string; bytes: number }>;
    getReceiptPath: (hash: string) => Promise<string | null>;
  };
  payments: {
    record: (input: RecordPaymentInput) => Promise<Payment>;
    listByInvoice: (invoiceId: string) => Promise<Payment[]>;
    delete: (id: string) => Promise<boolean>;
  };
  reports: {
    getFinancialSummary: (filter?: ReportFilter) => Promise<FinancialSummary>;
    getRevenueByMonth: (filter?: ReportFilter) => Promise<MonthlyRevenue[]>;
    getExpensesByCategory: (filter?: ReportFilter) => Promise<CategoryExpenseSummary[]>;
    exportInvoicesCsv: (
      filter?: InvoiceFilter,
      targetPath?: string
    ) => Promise<CsvExportResult | null>;
    exportExpensesCsv: (
      filter?: ExpenseFilter,
      targetPath?: string
    ) => Promise<CsvExportResult | null>;
  };
  pdf: {
    generate: (
      options: PdfRenderOptions
    ) => Promise<{ fileName: string; bytes: number; base64: string }>;
    preview: (options: PdfRenderOptions) => Promise<string>;
    export: (options: ExportPdfOptions) => Promise<PdfExportResult | null>;
    open: (filePath: string) => Promise<string>;
    reveal: (filePath: string) => Promise<boolean>;
    prepareEmail: (options: EmailInvoiceOptions) => Promise<PrepareEmailResult>;
  };
  backups: {
    trigger: (type?: BackupType) => Promise<BackupInfo>;
    list: (customFolder?: string) => Promise<BackupInfo[]>;
    selectFolder: () => Promise<string | null>;
    preview: (backupPath: string) => Promise<RestorePreview>;
    restore: (
      backupPath: string
    ) => Promise<{ success: boolean; preRestoreSnapshotPath: string | null }>;
  };
  drafts: {
    saveSnapshot: (
      snapshot: SaveDraftSnapshotInput
    ) => Promise<{ success: boolean; filePath: string }>;
    listRecoverable: () => Promise<RecoverableDraft[]>;
    discardSnapshot: (draftId: string) => Promise<{ success: boolean }>;
  };
  network: {
    getStatus: () => Promise<NetworkStatus>;
  };
  updates: {
    check: (options?: CheckUpdateOptions) => Promise<UpdateStatusResponse>;
    startDownload: () => Promise<UpdateStatusResponse>;
    install: () => Promise<boolean>;
    getStatus: () => Promise<UpdateStatusResponse>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
