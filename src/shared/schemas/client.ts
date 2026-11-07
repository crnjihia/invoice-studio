// path: src/shared/schemas/client.ts
import { z } from 'zod';
import { IdSchema, KenyanPhoneNumberSchema, KraPinSchema, PaginationSchema } from './common';

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(150),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: KenyanPhoneNumberSchema,
  address: z.string().trim().max(300).optional().or(z.literal('')),
  taxPin: KraPinSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const UpdateClientSchema = CreateClientSchema.partial().extend({
  id: IdSchema
});

export const ClientFilterSchema = PaginationSchema.extend({
  search: z.string().trim().optional()
});

export const GetClientSchema = z.object({
  id: IdSchema
});

export const DeleteClientSchema = z.object({
  id: IdSchema
});
