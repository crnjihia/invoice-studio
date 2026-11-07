// path: src/shared/schemas/payment.ts
import { z } from 'zod';
import { CurrencyCodeSchema, IdSchema, IsoDateStringSchema, MinorUnitMoneySchema } from './common';

export const PaymentMethodSchema = z.enum([
  'mpesa',
  'bank',
  'cash',
  'card',
  'cheque',
  'other'
]);

export const RecordPaymentSchema = z.object({
  invoiceId: IdSchema,
  amountMinor: MinorUnitMoneySchema.refine(val => val > 0, {
    message: 'Payment amount must be greater than 0'
  }),
  currency: CurrencyCodeSchema.optional().default('KES'),
  paymentDate: IsoDateStringSchema,
  method: PaymentMethodSchema.default('mpesa'),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal(''))
});

export const DeletePaymentSchema = z.object({
  id: IdSchema
});

export const ListPaymentsSchema = z.object({
  invoiceId: IdSchema
});

