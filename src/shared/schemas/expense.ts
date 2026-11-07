// path: src/shared/schemas/expense.ts
import { z } from 'zod';
import { CurrencyCodeSchema, IdSchema, IsoDateStringSchema, MinorUnitMoneySchema, PaginationSchema } from './common';

export const ExpenseCategorySchema = z.enum([
  'office',
  'travel',
  'equipment',
  'software',
  'utilities',
  'subcontractor',
  'marketing',
  'other'
]);

export const CreateExpenseSchema = z.object({
  category: ExpenseCategorySchema,
  description: z.string().trim().min(1, 'Description is required').max(300),
  amountMinor: MinorUnitMoneySchema,
  currency: CurrencyCodeSchema.optional().default('KES'),
  date: IsoDateStringSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  receiptHash: z.string().optional(),
  receiptName: z.string().optional(),
  receiptMime: z.string().optional()
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial().extend({
  id: IdSchema
});

export const ExpenseFilterSchema = PaginationSchema.extend({
  category: ExpenseCategorySchema.optional(),
  startDate: IsoDateStringSchema.optional(),
  endDate: IsoDateStringSchema.optional(),
  search: z.string().trim().optional()
});

export const GetExpenseSchema = z.object({
  id: IdSchema
});

export const DeleteExpenseSchema = z.object({
  id: IdSchema
});

export const SaveReceiptInputSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1)
});

