// path: src/shared/schemas/common.ts
import { z } from 'zod';

export const IdSchema = z.string().min(1, 'Identifier must not be empty');

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(50)
});

// Minor unit money (e.g. KES 1500.50 is 150050 cents)
export const MinorUnitMoneySchema = z.number().int().min(0, 'Amount must be non-negative');

export const CurrencyCodeSchema = z.enum(['KES', 'USD', 'EUR', 'GBP']).default('KES');

// Kenyan mobile phone format (+2547XXXXXXXX, +2541XXXXXXXX, 07XXXXXXXX, 01XXXXXXXX)
export const KenyanPhoneNumberSchema = z
  .string()
  .trim()
  .regex(
    /^(\+254|0)[17]\d{8}$/,
    'Must be a valid Kenyan mobile number (+2547..., +2541..., 07..., 01...)'
  )
  .optional()
  .or(z.literal(''));

// KRA PIN format: P followed by 9 digits and 1 letter (e.g., P051234567A)
export const KraPinSchema = z
  .string()
  .trim()
  .regex(/^P\d{9}[A-Z]$/, 'Must be a valid KRA PIN format (e.g., P051234567A)')
  .optional()
  .or(z.literal(''));

export const IsoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Must be an ISO 8601 date string (YYYY-MM-DD)');
