// path: src/tests/unit/payment-logic.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import { createClient } from '../../main/ipc/handlers/clientHandlers';
import { createInvoice, getInvoice, updateInvoice } from '../../main/ipc/handlers/invoiceHandlers';
import {
  deletePayment,
  listPaymentsByInvoice,
  recordPayment
} from '../../main/services/paymentService';

describe('Payments & Partial Payment Logic Unit Tests', () => {
  let db: Database.Database;
  let clientId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    const client = createClient(db, {
      name: 'Westlands Retailers Ltd',
      email: 'finance@westlandsretail.ke',
      phone: '+254711445566'
    });
    clientId = client.id;
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('records a partial payment via M-Pesa and transitions invoice status to partially_paid', () => {
    // Total: KES 100,000.00 (10,000,000 cents)
    const invoice = createInvoice(db, {
      clientId,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      currency: 'KES',
      lineItems: [
        {
          description: 'E-commerce POS Setup',
          quantity: 1,
          unitPriceMinor: 10000000,
          discountPercent: 0,
          taxRatePercent: 0
        }
      ]
    });

    // Mark as sent
    updateInvoice(db, { id: invoice.id, status: 'sent' });

    // Record 1st installment: KES 40,000.00 (4,000,000 cents) via M-Pesa
    const payment1 = recordPayment(db, {
      invoiceId: invoice.id,
      amountMinor: 4000000,
      currency: 'KES',
      paymentDate: '2026-03-05',
      method: 'mpesa',
      reference: 'RKD45892MN',
      notes: 'Initial M-Pesa deposit'
    });

    expect(payment1.id).toBeDefined();
    expect(payment1.method).toBe('mpesa');
    expect(payment1.reference).toBe('RKD45892MN');

    const updatedInv1 = getInvoice(db, invoice.id);
    expect(updatedInv1.status).toBe('partially_paid');
    expect(updatedInv1.amountPaidMinor).toBe(4000000);
    expect(updatedInv1.balanceDueMinor).toBe(6000000);

    // Record 2nd installment: KES 60,000.00 (6,000,000 cents) via Bank Transfer
    recordPayment(db, {
      invoiceId: invoice.id,
      amountMinor: 6000000,
      currency: 'KES',
      paymentDate: '2026-03-10',
      method: 'bank',
      reference: 'STANBIC-TX-9012'
    });

    const updatedInv2 = getInvoice(db, invoice.id);
    expect(updatedInv2.status).toBe('paid');
    expect(updatedInv2.amountPaidMinor).toBe(10000000);
    expect(updatedInv2.balanceDueMinor).toBe(0);

    // Check payment history
    const history = listPaymentsByInvoice(db, invoice.id);
    expect(history.length).toBe(2);
    expect(history[0].method).toBe('bank');
    expect(history[1].method).toBe('mpesa');
  });

  it('reverts invoice status when a payment is deleted', () => {
    const invoice = createInvoice(db, {
      clientId,
      issueDate: '2026-02-01',
      dueDate: '2026-02-28',
      currency: 'KES',
      lineItems: [
        {
          description: 'Consultancy Service',
          quantity: 1,
          unitPriceMinor: 5000000,
          discountPercent: 0,
          taxRatePercent: 0
        }
      ]
    });

    updateInvoice(db, { id: invoice.id, status: 'sent' });

    const p1 = recordPayment(db, {
      invoiceId: invoice.id,
      amountMinor: 2000000,
      paymentDate: '2026-02-10',
      method: 'mpesa',
      reference: 'MPESA-001'
    });

    const p2 = recordPayment(db, {
      invoiceId: invoice.id,
      amountMinor: 3000000,
      paymentDate: '2026-02-15',
      method: 'cash'
    });

    expect(getInvoice(db, invoice.id).status).toBe('paid');

    // Delete 2nd payment (30k)
    deletePayment(db, p2.id);

    const afterDeleteP2 = getInvoice(db, invoice.id);
    expect(afterDeleteP2.status).toBe('partially_paid');
    expect(afterDeleteP2.amountPaidMinor).toBe(2000000);
    expect(afterDeleteP2.balanceDueMinor).toBe(3000000);

    // Delete 1st payment (20k)
    deletePayment(db, p1.id);

    const afterDeleteAll = getInvoice(db, invoice.id);
    expect(afterDeleteAll.status).toBe('sent');
    expect(afterDeleteAll.amountPaidMinor).toBe(0);
    expect(afterDeleteAll.balanceDueMinor).toBe(5000000);
  });
});

