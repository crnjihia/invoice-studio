// path: src/shared/schemas/invoice.ts
import { z } from 'zod';
import {
  CurrencyCodeSchema,
  IdSchema,
  IsoDateStringSchema,
  MinorUnitMoneySchema,
  PaginationSchema
} from './common';

export const InvoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'void'
]);

export const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, 'Line item description is required').max(250),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPriceMinor: MinorUnitMoneySchema,
  discountPercent: z.number().min(0).max(100).default(0),
  taxRatePercent: z.number().min(0).max(100).default(16) // Default 16% VAT
});

export const CreateInvoiceSchema = z.object({
  clientId: IdSchema,
  issueDate: IsoDateStringSchema,
  dueDate: IsoDateStringSchema,
  currency: CurrencyCodeSchema,
  lineItems: z.array(LineItemSchema).min(1, 'Invoice must have at least one line item'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  terms: z.string().trim().max(2000).optional().or(z.literal(''))
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  id: IdSchema,
  status: InvoiceStatusSchema.optional()
});

export const InvoiceFilterSchema = PaginationSchema.extend({
  clientId: z.string().optional(),
  status: InvoiceStatusSchema.optional(),
  search: z.string().trim().optional()
});

export const GetInvoiceSchema = z.object({
  id: IdSchema
});

export const DeleteInvoiceSchema = z.object({
  id: IdSchema
});

export const DuplicateInvoiceSchema = z.object({
  id: IdSchema
});
