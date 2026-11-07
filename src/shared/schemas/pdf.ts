// path: src/shared/schemas/pdf.ts
import { z } from 'zod';
import { IdSchema } from './common';

export const TemplateIdSchema = z.enum(['classic', 'modern', 'minimal']).default('classic');

export const PdfRenderOptionsSchema = z.object({
  invoiceId: IdSchema,
  templateId: TemplateIdSchema.optional().default('classic'),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color').optional(),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color').optional(),
  showLogo: z.boolean().optional().default(true),
  customNotes: z.string().max(2000).optional()
});

export const ExportPdfSchema = PdfRenderOptionsSchema.extend({
  targetPath: z.string().optional()
});

export const EmailInvoiceSchema = PdfRenderOptionsSchema.extend({
  clientEmail: z.string().email().optional()
});

export const OpenPdfSchema = z.object({
  filePath: z.string().min(1, 'File path is required')
});

export const BusinessProfileSchema = z.object({
  name: z.string().min(1).default('Freelance Studio'),
  taxPin: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoPath: z.string().optional(),
  bankDetails: z.string().optional(),
  mpesaPaybill: z.string().optional(),
  mpesaAccount: z.string().optional(),
  mpesaTill: z.string().optional(),
  defaultCurrency: z.string().default('KES'),
  defaultTaxRate: z.number().default(16)
});

