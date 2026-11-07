// path: src/shared/types/index.ts
import { z } from 'zod';
import { ClientFilterSchema, CreateClientSchema, UpdateClientSchema } from '../schemas/client';
import {
  CreateInvoiceSchema,
  InvoiceFilterSchema,
  InvoiceStatusSchema,
  LineItemSchema,
  UpdateInvoiceSchema
} from '../schemas/invoice';
import { CurrencyCodeSchema } from '../schemas/common';
import {
  BackupConfigSchema,
  BackupInfoSchema,
  BackupTypeSchema,
  RestorePreviewSchema
} from '../schemas/backup';
import { BusinessProfileSchema, TemplateIdSchema } from '../schemas/pdf';
import {
  CreateExpenseSchema,
  ExpenseCategorySchema,
  ExpenseFilterSchema,
  UpdateExpenseSchema
} from '../schemas/expense';
import { PaymentMethodSchema, RecordPaymentSchema } from '../schemas/payment';
import { ReportFilterSchema } from '../schemas/report';

export * from '../channels';
export * from '../errors';
export * from '../schemas/backup';
export * from '../schemas/pdf';
export * from '../schemas/expense';
export * from '../schemas/payment';
export * from '../schemas/report';
export * from '../schemas/draft';
export * from '../schemas/update';

export type DraftLineItem = z.infer<typeof import('../schemas/draft').DraftLineItemSchema>;
export type DraftInvoiceData = z.input<typeof import('../schemas/draft').DraftInvoiceDataSchema>;
export type SaveDraftSnapshotInput = z.input<typeof import('../schemas/draft').SaveDraftSnapshotSchema>;
export type NetworkStatus = z.infer<typeof import('../schemas/draft').NetworkStatusSchema>;

export type UpdateState = z.infer<typeof import('../schemas/update').UpdateStateSchema>;
export type UpdateProgress = z.infer<typeof import('../schemas/update').UpdateProgressSchema>;
export type UpdateInfo = z.infer<typeof import('../schemas/update').UpdateInfoSchema>;
export type UpdateStatusResponse = z.infer<typeof import('../schemas/update').UpdateStatusResponseSchema>;
export type CheckUpdateOptions = z.infer<typeof import('../schemas/update').CheckUpdateOptionsSchema>;

export interface RecoverableDraft {
  draftId: string;
  invoiceId?: string | null;
  savedAt: string;
  lastModified: string;
  data: DraftInvoiceData;
  reason: 'unsaved_new_invoice' | 'unsaved_edits_after_crash';
}

// Backup types
export type BackupType = z.infer<typeof BackupTypeSchema>;
export type BackupInfo = z.infer<typeof BackupInfoSchema>;
export type BackupConfig = z.infer<typeof BackupConfigSchema>;
export type RestorePreview = z.infer<typeof RestorePreviewSchema>;

// Client types
export type CreateClientInput = z.input<typeof CreateClientSchema>;
export type UpdateClientInput = z.input<typeof UpdateClientSchema>;
export type ClientFilter = z.input<typeof ClientFilterSchema>;

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxPin?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Invoice types
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type LineItemInput = z.input<typeof LineItemSchema>;
export type CreateInvoiceInput = z.input<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.input<typeof UpdateInvoiceSchema>;
export type InvoiceFilter = z.input<typeof InvoiceFilterSchema>;

export interface InvoiceLineItemCalculated extends LineItem {
  id: string;
  invoiceId: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  subtotalMinor: number;
  taxTotalMinor: number;
  discountTotalMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  notes?: string;
  terms?: string;
  lineItems: InvoiceLineItemCalculated[];
  createdAt: string;
  updatedAt: string;
}

// Expense types
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type CreateExpenseInput = z.input<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.input<typeof UpdateExpenseSchema>;
export type ExpenseFilter = z.input<typeof ExpenseFilterSchema>;

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  date: string;
  receiptHash?: string;
  receiptName?: string;
  receiptMime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type RecordPaymentInput = z.input<typeof RecordPaymentSchema>;

export interface Payment {
  id: string;
  invoiceId: string;
  amountMinor: number;
  currency: CurrencyCode;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

// Report & CSV types
export type ReportFilter = z.input<typeof ReportFilterSchema>;

export interface MonthlyRevenue {
  month: string; // YYYY-MM
  revenueMinor: number;
  paymentsCount: number;
}

export interface CategoryExpenseSummary {
  category: ExpenseCategory;
  totalMinor: number;
  count: number;
}

export interface FinancialSummary {
  totalInvoicedMinor: number;
  totalRevenueMinor: number;
  totalOutstandingMinor: number;
  totalExpensesMinor: number;
  estimatedProfitMinor: number;
  activeInvoicesCount: number;
  paidInvoicesCount: number;
}

export interface CsvExportResult {
  filePath: string;
  rowCount: number;
  bytes: number;
}

// PDF & Template types
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;

export interface PdfRenderOptions {
  invoiceId: string;
  templateId?: TemplateId;
  primaryColor?: string;
  accentColor?: string;
  showLogo?: boolean;
  customNotes?: string;
}

export interface ExportPdfOptions extends PdfRenderOptions {
  targetPath?: string;
}

export interface EmailInvoiceOptions extends PdfRenderOptions {
  clientEmail?: string;
}

export interface PdfExportResult {
  filePath: string;
  bytes: number;
}

export interface PrepareEmailResult {
  mailtoUrl: string;
  pdfPath: string;
  message: string;
}
