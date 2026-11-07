// path: src/tests/unit/overdue-detection.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import { createClient } from '../../main/ipc/handlers/clientHandlers';
import { createInvoice, getInvoice, updateInvoice } from '../../main/ipc/handlers/invoiceHandlers';
import { checkAndMarkOverdueInvoices } from '../../main/services/overdueService';

describe('Overdue Invoices Detection Unit Tests', () => {
  let db: Database.Database;
  let clientId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    const client = createClient(db, {
      name: 'Karen Estates Hub',
      phone: '+254700889911'
    });
    clientId = client.id;
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('marks past-due sent and partially paid invoices as overdue, ignoring drafts, paid, and void', () => {
    // 1. Sent invoice past due -> should become overdue
    const invSentOverdue = createInvoice(db, {
      clientId,
      issueDate: '2026-01-01',
      dueDate: '2026-01-31',
      lineItems: [{ description: 'Web Dev', quantity: 1, unitPriceMinor: 5000000 }]
    });
    updateInvoice(db, { id: invSentOverdue.id, status: 'sent' });

    // 2. Partially paid invoice past due -> should become overdue
    const invPartialOverdue = createInvoice(db, {
      clientId,
      issueDate: '2026-01-10',
      dueDate: '2026-02-10',
      lineItems: [{ description: 'Maintenance', quantity: 1, unitPriceMinor: 2000000 }]
    });
    updateInvoice(db, { id: invPartialOverdue.id, status: 'partially_paid' });

    // 3. Draft invoice past due -> should REMAIN draft (not sent yet)
    const invDraft = createInvoice(db, {
      clientId,
      issueDate: '2026-01-01',
      dueDate: '2026-01-31',
      lineItems: [{ description: 'Draft Proposal', quantity: 1, unitPriceMinor: 1000000 }]
    });

    // 4. Paid invoice past due -> should REMAIN paid
    const invPaid = createInvoice(db, {
      clientId,
      issueDate: '2026-01-01',
      dueDate: '2026-01-31',
      lineItems: [{ description: 'Settled Bill', quantity: 1, unitPriceMinor: 3000000 }]
    });
    updateInvoice(db, { id: invPaid.id, status: 'paid' });

    // 5. Future sent invoice -> should REMAIN sent
    const invFuture = createInvoice(db, {
      clientId,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      lineItems: [{ description: 'Future Work', quantity: 1, unitPriceMinor: 4000000 }]
    });
    updateInvoice(db, { id: invFuture.id, status: 'sent' });

    // Run overdue check with reference date '2026-02-20'
    const result = checkAndMarkOverdueInvoices(db, '2026-02-20');

    expect(result.updatedCount).toBe(2);
    expect(result.overdueInvoiceIds).toContain(invSentOverdue.id);
    expect(result.overdueInvoiceIds).toContain(invPartialOverdue.id);

    // Verify statuses
    expect(getInvoice(db, invSentOverdue.id).status).toBe('overdue');
    expect(getInvoice(db, invPartialOverdue.id).status).toBe('overdue');
    expect(getInvoice(db, invDraft.id).status).toBe('draft');
    expect(getInvoice(db, invPaid.id).status).toBe('paid');
    expect(getInvoice(db, invFuture.id).status).toBe('sent');
  });
});

