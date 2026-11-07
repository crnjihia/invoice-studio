// path: src/tests/unit/invoice-editor-totals.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDraftStore } from '../../renderer/src/store/useDraftStore';
import { Invoice } from '../../shared/types';

describe('Invoice Editor State & Live Totals Suite', () => {
  beforeEach(() => {
    useDraftStore.getState().resetDraft();
  });

  it('initializes draft with default values, 16% VAT, and zero total', () => {
    const state = useDraftStore.getState();
    expect(state.currency).toBe('KES');
    expect(state.lineItems.length).toBe(1);
    expect(state.lineItems[0].taxRatePercent).toBe(16);
    expect(state.lineItems[0].quantity).toBe(1);
    expect(state.lineItems[0].unitPriceMinor).toBe(0);
    expect(state.subtotalMinor).toBe(0);
    expect(state.taxTotalMinor).toBe(0);
    expect(state.totalMinor).toBe(0);
    expect(state.isEditingExistingId).toBeNull();
  });

  it('calculates live totals when adding and updating line items with 16% VAT', () => {
    const store = useDraftStore.getState();
    const firstItemId = store.lineItems[0].id;

    // Update first item: 10 hours @ 5,000 KES/hr = 50,000 KES (5,000,000 cents)
    store.updateLineItem(firstItemId, {
      description: 'Senior Software Architecture Consulting',
      quantity: 10,
      unitPriceMinor: 500000, // 5,000 KES in cents
      taxRatePercent: 16,
      discountPercent: 0
    });

    const updated1 = useDraftStore.getState();
    expect(updated1.subtotalMinor).toBe(5000000); // 50,000 KES
    expect(updated1.taxTotalMinor).toBe(800000); // 16% VAT = 8,000 KES
    expect(updated1.totalMinor).toBe(5800000); // 58,000 KES
    expect(updated1.balanceDueMinor).toBe(5800000);

    // Add second line item: Cloud hosting setup: 20,000 KES (2,000,000 cents)
    store.addLineItem({
      description: 'DevOps & CI/CD Pipeline Setup',
      quantity: 1,
      unitPriceMinor: 2000000,
      taxRatePercent: 16,
      discountPercent: 0
    });

    const updated2 = useDraftStore.getState();
    expect(updated2.lineItems.length).toBe(2);
    expect(updated2.subtotalMinor).toBe(7000000); // 70,000 KES
    expect(updated2.taxTotalMinor).toBe(1120000); // 16% of 70,000 = 11,200 KES
    expect(updated2.totalMinor).toBe(8120000); // 81,200 KES
  });

  it('correctly calculates discounts and recalculates taxable base and VAT', () => {
    const store = useDraftStore.getState();
    const itemId = store.lineItems[0].id;

    // 100,000 KES subtotal (10,000,000 cents) with 10% discount
    store.updateLineItem(itemId, {
      description: 'Web Application Modernization',
      quantity: 1,
      unitPriceMinor: 10000000, // 100,000 KES
      taxRatePercent: 16,
      discountPercent: 10 // 10% discount
    });

    const state = useDraftStore.getState();
    expect(state.subtotalMinor).toBe(10000000); // 100,000 KES
    expect(state.discountTotalMinor).toBe(1000000); // 10,000 KES
    // Taxable base is 90,000 KES (9,000,000 cents)
    // 16% VAT of 90,000 KES is 14,400 KES (1,440,000 cents)
    expect(state.taxTotalMinor).toBe(1440000);
    // Total is 90,000 + 14,400 = 104,400 KES (10,440,000 cents)
    expect(state.totalMinor).toBe(10440000);
  });

  it('removes line items and recalculates totals, preserving at least 1 empty row', () => {
    const store = useDraftStore.getState();
    const firstId = store.lineItems[0].id;

    store.updateLineItem(firstId, {
      description: 'Item 1',
      quantity: 1,
      unitPriceMinor: 500000,
      taxRatePercent: 0
    });

    store.addLineItem({
      description: 'Item 2',
      quantity: 1,
      unitPriceMinor: 300000,
      taxRatePercent: 0
    });

    expect(useDraftStore.getState().lineItems.length).toBe(2);
    expect(useDraftStore.getState().subtotalMinor).toBe(800000);

    // Remove first item
    store.removeLineItem(firstId);
    const afterRemoval = useDraftStore.getState();
    expect(afterRemoval.lineItems.length).toBe(1);
    expect(afterRemoval.lineItems[0].description).toBe('Item 2');
    expect(afterRemoval.subtotalMinor).toBe(300000);

    // Remove the remaining item - should reset to single blank row instead of empty array
    store.removeLineItem(afterRemoval.lineItems[0].id);
    const afterSecondRemoval = useDraftStore.getState();
    expect(afterSecondRemoval.lineItems.length).toBe(1);
    expect(afterSecondRemoval.lineItems[0].description).toBe('');
    expect(afterSecondRemoval.subtotalMinor).toBe(0);
  });

  it('loads existing invoice into draft store with all metadata and recalculations', () => {
    const mockInvoice: Invoice = {
      id: 'inv-existing-001',
      invoiceNumber: 'INV-2026-0042',
      clientId: 'cli-kenya-01',
      clientName: 'M-Pesa Tech Labs',
      status: 'sent',
      issueDate: '2026-04-01',
      dueDate: '2026-04-30',
      currency: 'KES',
      subtotalMinor: 5000000,
      taxTotalMinor: 800000,
      discountTotalMinor: 0,
      totalMinor: 5800000,
      amountPaidMinor: 2000000, // partially paid
      balanceDueMinor: 3800000,
      notes: 'Payable to Till 555666',
      terms: 'Net 30 days',
      createdAt: '2026-04-01T08:00:00Z',
      updatedAt: '2026-04-01T08:00:00Z',
      lineItems: [
        {
          id: 'li-1',
          invoiceId: 'inv-existing-001',
          description: 'Custom API Gateway Microservice',
          quantity: 1,
          unitPriceMinor: 5000000,
          discountPercent: 0,
          taxRatePercent: 16,
          subtotalMinor: 5000000,
          discountMinor: 0,
          taxMinor: 800000,
          totalMinor: 5800000
        }
      ]
    };

    const store = useDraftStore.getState();
    store.loadFromInvoice(mockInvoice);

    const loaded = useDraftStore.getState();
    expect(loaded.isEditingExistingId).toBe('inv-existing-001');
    expect(loaded.clientId).toBe('cli-kenya-01');
    expect(loaded.issueDate).toBe('2026-04-01');
    expect(loaded.dueDate).toBe('2026-04-30');
    expect(loaded.currency).toBe('KES');
    expect(loaded.lineItems.length).toBe(1);
    expect(loaded.lineItems[0].description).toBe('Custom API Gateway Microservice');
    expect(loaded.subtotalMinor).toBe(5000000);
    expect(loaded.taxTotalMinor).toBe(800000);
    expect(loaded.totalMinor).toBe(5800000);
    expect(loaded.notes).toBe('Payable to Till 555666');
  });

  it('resets draft back to fresh blank invoice state', () => {
    const store = useDraftStore.getState();
    store.setField('clientId', 'some-client');
    store.setField('currency', 'USD');
    store.addLineItem({ description: 'Test', unitPriceMinor: 99900 });

    expect(useDraftStore.getState().clientId).toBe('some-client');
    expect(useDraftStore.getState().currency).toBe('USD');

    store.resetDraft();

    const resetState = useDraftStore.getState();
    expect(resetState.clientId).toBe('');
    expect(resetState.currency).toBe('KES');
    expect(resetState.isEditingExistingId).toBeNull();
    expect(resetState.lineItems.length).toBe(1);
    expect(resetState.subtotalMinor).toBe(0);
  });
});

