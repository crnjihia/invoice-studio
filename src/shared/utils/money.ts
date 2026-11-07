// path: src/shared/utils/money.ts
export interface CalculatedLineItemTotals {
  subtotalMinor: number;
  discountMinor: number;
  taxableMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface CalculatedInvoiceTotals {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
  balanceDueMinor: number;
}

/**
 * Converts a standard decimal currency amount to minor integer units (cents).
 * E.g., 1500.50 -> 150050
 */
export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

/**
 * Converts minor integer units to a standard decimal float.
 * E.g., 150050 -> 1500.50
 */
export function toMajorUnits(minorAmount: number): number {
  return minorAmount / 100;
}

/**
 * Formats minor integer units into a localized currency string.
 * E.g., 150050, 'KES' -> "KES 1,500.50"
 */
export function formatMoney(minorAmount: number, currency = 'KES', locale = 'en-KE'): string {
  const major = toMajorUnits(minorAmount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(major);
}

/**
 * Calculates line item monetary values using integer arithmetic.
 * Ensures consistent, deterministic rounding at each financial step.
 */
export function calculateLineItemTotals(
  quantity: number,
  unitPriceMinor: number,
  discountPercent = 0,
  taxRatePercent = 16
): CalculatedLineItemTotals {
  const safeQty = Math.max(0, Math.floor(quantity));
  const safeUnitPrice = Math.max(0, Math.round(unitPriceMinor));
  const subtotalMinor = safeQty * safeUnitPrice;

  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  const discountMinor = Math.round(subtotalMinor * (safeDiscount / 100));

  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);
  const safeTaxRate = Math.max(0, taxRatePercent);
  const taxMinor = Math.round(taxableMinor * (safeTaxRate / 100));

  const totalMinor = taxableMinor + taxMinor;

  return {
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor
  };
}

/**
 * Aggregates all line items to compute invoice-level totals and balance due.
 */
export function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    unitPriceMinor: number;
    discountPercent?: number;
    taxRatePercent?: number;
  }>,
  amountPaidMinor = 0
): CalculatedInvoiceTotals {
  let subtotalMinor = 0;
  let discountTotalMinor = 0;
  let taxTotalMinor = 0;
  let totalMinor = 0;

  for (const item of items) {
    const calculated = calculateLineItemTotals(
      item.quantity,
      item.unitPriceMinor,
      item.discountPercent ?? 0,
      item.taxRatePercent ?? 16
    );

    subtotalMinor += calculated.subtotalMinor;
    discountTotalMinor += calculated.discountMinor;
    taxTotalMinor += calculated.taxMinor;
    totalMinor += calculated.totalMinor;
  }

  const safePaid = Math.max(0, Math.round(amountPaidMinor));
  const balanceDueMinor = Math.max(0, totalMinor - safePaid);

  return {
    subtotalMinor,
    discountTotalMinor,
    taxTotalMinor,
    totalMinor,
    balanceDueMinor
  };
}
