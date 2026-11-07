// path: src/tests/unit/money-rounding.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  calculateLineItemTotals,
  formatMoney,
  toMajorUnits,
  toMinorUnits
} from '../../shared/utils/money';

describe('Integer Minor Units Money & Rounding', () => {
  it('converts correctly between major and minor units', () => {
    expect(toMinorUnits(1500.5)).toBe(150050);
    expect(toMinorUnits(0.99)).toBe(99);
    expect(toMinorUnits(100)).toBe(10000);

    expect(toMajorUnits(150050)).toBe(1500.5);
    expect(toMajorUnits(99)).toBe(0.99);
  });

  it('formats minor units into Kenyan Shilling currency string', () => {
    const formatted = formatMoney(150050, 'KES');
    expect(formatted).toContain('1,500.50');
  });

  it('calculates line item total with standard 16% VAT', () => {
    // 2 units at KES 5,000.00 each = KES 10,000.00 (1000000 minor units)
    // 16% VAT = KES 1,600.00 (160000 minor units)
    // Total = KES 11,600.00 (1160000 minor units)
    const result = calculateLineItemTotals(2, 500000, 0, 16);

    expect(result.subtotalMinor).toBe(1000000);
    expect(result.discountMinor).toBe(0);
    expect(result.taxableMinor).toBe(1000000);
    expect(result.taxMinor).toBe(160000);
    expect(result.totalMinor).toBe(1160000);
  });

  it('applies discount before tax computation', () => {
    // 1 unit at KES 10,000.00 (1000000 minor units) with 10% discount
    // Subtotal = 1000000
    // Discount = 100000 (KES 1,000)
    // Taxable = 900000 (KES 9,000)
    // 16% VAT on 9000 = 144000 (KES 1,440)
    // Total = 1044000 (KES 10,440)
    const result = calculateLineItemTotals(1, 1000000, 10, 16);

    expect(result.subtotalMinor).toBe(1000000);
    expect(result.discountMinor).toBe(100000);
    expect(result.taxableMinor).toBe(900000);
    expect(result.taxMinor).toBe(144000);
    expect(result.totalMinor).toBe(1044000);
  });

  it('handles fractional cents deterministically with round-half-up', () => {
    // 3 items at KES 10.33 (1033 minor) = 3099 minor units
    // 16% tax on 3099 = 495.84 -> rounded to 496 minor units
    // Total = 3099 + 496 = 3595
    const result = calculateLineItemTotals(3, 1033, 0, 16);

    expect(result.subtotalMinor).toBe(3099);
    expect(result.taxMinor).toBe(496);
    expect(result.totalMinor).toBe(3595);
  });

  it('aggregates invoice totals and computes partial payment balance due', () => {
    const items = [
      { quantity: 2, unitPriceMinor: 500000, discountPercent: 0, taxRatePercent: 16 }, // total 1,160,000
      { quantity: 1, unitPriceMinor: 200000, discountPercent: 0, taxRatePercent: 0 } // total 200,000 (zero-rated)
    ];

    // Total = 1,360,000 minor units
    // Client made partial M-Pesa payment of KES 5,000 (500,000 minor units)
    const totals = calculateInvoiceTotals(items, 500000);

    expect(totals.subtotalMinor).toBe(1200000);
    expect(totals.taxTotalMinor).toBe(160000);
    expect(totals.totalMinor).toBe(1360000);
    expect(totals.balanceDueMinor).toBe(860000); // KES 8,600.00 remaining
  });
});
