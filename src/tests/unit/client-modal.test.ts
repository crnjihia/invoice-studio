// path: src/tests/unit/client-modal.test.ts
import { describe, it, expect } from 'vitest';
import { CreateClientSchema, UpdateClientSchema } from '../../shared/schemas/client';

describe('Client Modal & Form Validation Suite', () => {
  it('validates a complete Kenyan business client successfully', () => {
    const validData = {
      name: 'Nairobi Cloud Solutions Ltd',
      email: 'finance@nairobibiz.co.ke',
      phone: '+254712345678',
      taxPin: 'P051234567A',
      address: 'Delta Corner, Westlands, Nairobi',
      notes: 'Net-30 payment terms'
    };

    const parsed = CreateClientSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Nairobi Cloud Solutions Ltd');
      expect(parsed.data.phone).toBe('+254712345678');
      expect(parsed.data.taxPin).toBe('P051234567A');
    }
  });

  it('validates Kenyan phone numbers with different valid prefixes (+254, 07, 01)', () => {
    const validPhones = [
      '+254712345678', // Standard Safaricom international
      '+254722000000', // Safaricom 0722
      '+254110123456', // Safaricom / Airtel 0110
      '0712345678', // Standard local 07
      '0112345678' // Local 01
    ];

    for (const phone of validPhones) {
      const result = CreateClientSchema.safeParse({
        name: 'Test Client',
        phone
      });
      expect(result.success, `Phone ${phone} should be valid`).toBe(true);
    }
  });

  it('rejects invalid phone numbers (non-Kenyan or malformed)', () => {
    const invalidPhones = [
      '+12025550123', // US prefix
      '+254812345678', // Invalid carrier prefix 8
      '0712345', // Too short
      '071234567890', // Too long
      'abcdefghijk', // Non-numeric
      '+2540712345678' // Double zero prefix
    ];

    for (const phone of invalidPhones) {
      const result = CreateClientSchema.safeParse({
        name: 'Test Client',
        phone
      });
      expect(result.success, `Phone ${phone} should be invalid`).toBe(false);
    }
  });

  it('validates KRA PIN format (P followed by 9 digits and 1 letter)', () => {
    const validPins = [
      'P051234567A',
      'P000000000Z',
      'P999999999K'
    ];

    for (const taxPin of validPins) {
      const result = CreateClientSchema.safeParse({
        name: 'Test Client',
        taxPin
      });
      expect(result.success, `KRA PIN ${taxPin} should be valid`).toBe(true);
    }
  });

  it('rejects invalid KRA PIN formats', () => {
    const invalidPins = [
      'A051234567A', // Does not start with P
      'P05123456A', // Only 8 digits
      'P0512345678A', // 10 digits
      'P0512345678', // Missing trailing letter
      'P0512345671', // Trailing number instead of letter
      'INVALIDPIN'
    ];

    for (const taxPin of invalidPins) {
      const result = CreateClientSchema.safeParse({
        name: 'Test Client',
        taxPin
      });
      expect(result.success, `KRA PIN ${taxPin} should be invalid`).toBe(false);
    }
  });

  it('requires client name and trims whitespace', () => {
    const emptyResult = CreateClientSchema.safeParse({
      name: ''
    });
    expect(emptyResult.success).toBe(false);

    const whitespaceResult = CreateClientSchema.safeParse({
      name: '   '
    });
    expect(whitespaceResult.success).toBe(false);

    const validResult = CreateClientSchema.safeParse({
      name: '  Safaricom Partner Ltd  '
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.name).toBe('Safaricom Partner Ltd');
    }
  });

  it('allows optional fields to be empty strings or omitted', () => {
    const minimalData = {
      name: 'Solo Freelancer Client',
      email: '',
      phone: '',
      taxPin: '',
      address: '',
      notes: ''
    };

    const result = CreateClientSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
  });

  it('validates update schema requires valid id', () => {
    const updateResult = UpdateClientSchema.safeParse({
      id: 'cli-12345',
      name: 'Updated Name',
      phone: '+254799887766'
    });
    expect(updateResult.success).toBe(true);

    const missingId = UpdateClientSchema.safeParse({
      name: 'No ID'
    });
    expect(missingId.success).toBe(false);
  });
});

