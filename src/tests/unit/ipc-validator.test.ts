// path: src/tests/unit/ipc-validator.test.ts
import { describe, it, expect } from 'vitest';
import { CreateClientSchema } from '../../shared/schemas/client';
import { CreateInvoiceSchema } from '../../shared/schemas/invoice';
import { serializeZodError } from '../../shared/errors';

describe('IPC Zod Schemas & Validation', () => {
  describe('CreateClientSchema', () => {
    it('accepts valid Kenyan client data', () => {
      const valid = {
        name: 'Nairobi Tech Solutions Ltd',
        email: 'info@nairobitech.co.ke',
        phone: '+254712345678',
        address: 'Westlands, Nairobi, Kenya',
        taxPin: 'P051234567A',
        notes: 'Preferred client'
      };

      const result = CreateClientSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Nairobi Tech Solutions Ltd');
        expect(result.data.phone).toBe('+254712345678');
      }
    });

    it('accepts valid 07... Kenyan phone format', () => {
      const valid = {
        name: 'M-Pesa Vendor',
        phone: '0712345678'
      };
      const result = CreateClientSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid Kenyan phone number', () => {
      const invalid = {
        name: 'Invalid Phone SME',
        phone: '+1234567890'
      };
      const result = CreateClientSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = serializeZodError(result.error);
        expect(error.success).toBe(false);
        if (!error.success) {
          expect(error.error.code).toBe('VALIDATION_ERROR');
          expect(error.error.fieldErrors?.phone).toBeDefined();
        }
      }
    });

    it('rejects invalid KRA PIN format', () => {
      const invalid = {
        name: 'Invalid PIN Client',
        taxPin: 'NOT_A_PIN'
      };
      const result = CreateClientSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = serializeZodError(result.error);
        if (!error.success) {
          expect(error.error.fieldErrors?.taxPin).toBeDefined();
        }
      }
    });

    it('rejects empty client name', () => {
      const invalid = {
        name: '   '
      };
      const result = CreateClientSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateInvoiceSchema', () => {
    it('accepts valid invoice with integer minor units', () => {
      const valid = {
        clientId: 'client-123',
        issueDate: '2026-11-07',
        dueDate: '2026-11-21',
        currency: 'KES',
        lineItems: [
          {
            description: 'Website Development',
            quantity: 1,
            unitPriceMinor: 15000000, // KES 150,000.00
            discountPercent: 0,
            taxRatePercent: 16
          }
        ]
      };

      const result = CreateInvoiceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invoice without any line items', () => {
      const invalid = {
        clientId: 'client-123',
        issueDate: '2026-11-07',
        dueDate: '2026-11-21',
        currency: 'KES',
        lineItems: []
      };

      const result = CreateInvoiceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const serialized = serializeZodError(result.error);
        if (!serialized.success) {
          expect(serialized.error.fieldErrors?.lineItems).toBeDefined();
        }
      }
    });

    it('rejects negative or fractional unit price in minor units', () => {
      const invalid = {
        clientId: 'client-123',
        issueDate: '2026-11-07',
        dueDate: '2026-11-21',
        currency: 'KES',
        lineItems: [
          {
            description: 'Bad Price Item',
            quantity: 1,
            unitPriceMinor: -500
          }
        ]
      };

      const result = CreateInvoiceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
