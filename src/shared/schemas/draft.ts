// path: src/shared/schemas/draft.ts
import { z } from 'zod';
import { CurrencyCodeSchema, IdSchema, IsoDateStringSchema, MinorUnitMoneySchema } from './common';

export const DraftLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().default(''),
  quantity: z.number().nonnegative().default(1),
  unitPriceMinor: MinorUnitMoneySchema.default(0),
  taxRatePercent: z.number().min(0).max(100).default(16),
  discountPercent: z.number().min(0).max(100).default(0)
});

export const DraftInvoiceDataSchema = z.object({
  invoiceNumber: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  issueDate: IsoDateStringSchema.optional(),
  dueDate: IsoDateStringSchema.optional(),
  currency: CurrencyCodeSchema.default('KES'),
  lineItems: z.array(DraftLineItemSchema).default([]),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discountTotalMinor: MinorUnitMoneySchema.default(0)
});

export const SaveDraftSnapshotSchema = z.object({
  draftId: IdSchema,
  invoiceId: z.string().nullable().optional(),
  data: DraftInvoiceDataSchema,
  lastModified: IsoDateStringSchema
});

export const DiscardDraftSnapshotSchema = z.object({
  draftId: IdSchema
});

export const NetworkStatusSchema = z.object({
  isOnline: z.boolean(),
  status: z.enum(['online', 'offline', 'degraded']),
  lastChecked: IsoDateStringSchema,
  probeHost: z.string().optional()
});

