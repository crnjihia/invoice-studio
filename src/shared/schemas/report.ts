// path: src/shared/schemas/report.ts
import { z } from 'zod';
import { IsoDateStringSchema } from './common';
import { ExpenseFilterSchema } from './expense';
import { InvoiceFilterSchema } from './invoice';

export const ReportFilterSchema = z.object({
  startDate: IsoDateStringSchema.optional(),
  endDate: IsoDateStringSchema.optional()
});

export const ExportInvoicesCsvSchema = z.object({
  filter: InvoiceFilterSchema.optional(),
  targetPath: z.string().optional()
});

export const ExportExpensesCsvSchema = z.object({
  filter: ExpenseFilterSchema.optional(),
  targetPath: z.string().optional()
});

