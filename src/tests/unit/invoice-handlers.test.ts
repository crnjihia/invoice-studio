// path: src/tests/unit/invoice-handlers.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import { createClient } from '../../main/ipc/handlers/clientHandlers';
import {
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice
} from '../../main/ipc/handlers/invoiceHandlers';

describe('Invoice IPC Handlers & Repository Unit Tests', () => {
  let db: Database.Database;
  let testClientId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    const client = createClient(db, {
      name: 'Nairobi Tech Hub',
      email: 'billing@techhub.co.ke',
      phone: '+254711002233',
      address: 'Ngong Road, Nairobi',
      taxPin: 'P051122334A'
    });
    testClientId = client.id;
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('creates an invoice with gap-free sequence and exact integer minor-unit totals', () => {
    const currentYear = new Date().getFullYear();

    const invoice = createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      currency: 'KES',
      lineItems: [
        {
          description: 'Custom React Web Application Development',
          quantity: 2,
          unitPriceMinor: 5000000, // KES 50,000.00 each
          discountPercent: 10, // 10% discount
          taxRatePercent: 16 // 16% standard VAT
        },
        {
          description: 'Cloud Domain Registration (.co.ke)',
          quantity: 1,
          unitPriceMinor: 150000, // KES 1,500.00
          discountPercent: 0,
          taxRatePercent: 0 // Zero-rated
        }
      ],
      notes: 'Payment via M-Pesa or Bank Transfer',
      terms: 'Net 30 days'
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.invoiceNumber).toBe(`INV-${currentYear}-0001`);
    expect(invoice.status).toBe('draft');
    expect(invoice.clientName).toBe('Nairobi Tech Hub');

    // Calculations check:
    // Item 1: Subtotal = 10,000,000 cents (100k KES)
    //         Discount = 1,000,000 cents (10% of 100k)
    //         Taxable = 9,000,000 cents
    //         Tax (16%) = 1,440,000 cents
    //         Total = 10,440,000 cents
    // Item 2: Subtotal = 150,000 cents (1.5k KES)
    //         Discount = 0
    //         Tax (0%) = 0
    //         Total = 150,000 cents
    // Invoice Totals:
    // Subtotal: 10,150,000 cents (KES 101,500.00)
    // Discount: 1,000,000 cents (KES 10,000.00)
    // Tax: 1,440,000 cents (KES 14,400.00)
    // Total: 10,590,000 cents (KES 105,900.00)
    expect(invoice.subtotalMinor).toBe(10150000);
    expect(invoice.discountTotalMinor).toBe(1000000);
    expect(invoice.taxTotalMinor).toBe(1440000);
    expect(invoice.totalMinor).toBe(10590000);
    expect(invoice.amountPaidMinor).toBe(0);
    expect(invoice.balanceDueMinor).toBe(10590000);

    expect(invoice.lineItems.length).toBe(2);
    expect(invoice.lineItems[0].subtotalMinor).toBe(10000000);
    expect(invoice.lineItems[0].taxMinor).toBe(1440000);
    expect(invoice.lineItems[1].totalMinor).toBe(150000);
  });

  it('retrieves an existing invoice with populated line items and client name', () => {
    const created = createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-04-10',
      dueDate: '2026-05-10',
      currency: 'KES',
      lineItems: [
        {
          description: 'Mobile App UI/UX Design',
          quantity: 1,
          unitPriceMinor: 8000000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ]
    });

    const retrieved = getInvoice(db, created.id);
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.invoiceNumber).toBe(created.invoiceNumber);
    expect(retrieved.clientName).toBe('Nairobi Tech Hub');
    expect(retrieved.lineItems.length).toBe(1);
    expect(retrieved.lineItems[0].description).toBe('Mobile App UI/UX Design');

    expect(() => getInvoice(db, 'non-existent-id')).toThrow('was not found');
  });

  it('lists and filters invoices by search, status, and client ID', () => {
    const currentYear = new Date().getFullYear();

    const secondClient = createClient(db, {
      name: 'Mombasa Logistics Corp',
      phone: '+254711998877'
    });

    // Invoice 1: Tech Hub, Draft
    createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-01-15',
      dueDate: '2026-02-15',
      currency: 'KES',
      lineItems: [{ description: 'Frontend Code Review', quantity: 1, unitPriceMinor: 2000000 }]
    });

    // Invoice 2: Mombasa Logistics, Draft -> updated to sent
    const inv2 = createInvoice(db, {
      clientId: secondClient.id,
      issueDate: '2026-02-01',
      dueDate: '2026-03-01',
      currency: 'KES',
      lineItems: [{ description: 'Backend API Integration', quantity: 1, unitPriceMinor: 4000000 }]
    });

    updateInvoice(db, { id: inv2.id, status: 'sent' });

    // Filter by status 'sent'
    const sentList = listInvoices(db, { status: 'sent' });
    expect(sentList.total).toBe(1);
    expect(sentList.items[0].clientName).toBe('Mombasa Logistics Corp');

    // Filter by client ID
    const clientList = listInvoices(db, { clientId: testClientId });
    expect(clientList.total).toBe(1);
    expect(clientList.items[0].clientName).toBe('Nairobi Tech Hub');

    // Search by invoice number prefix
    const searchNumber = listInvoices(db, { search: `INV-${currentYear}` });
    expect(searchNumber.total).toBe(2);

    // Search by client name
    const searchName = listInvoices(db, { search: 'Mombasa' });
    expect(searchName.total).toBe(1);
    expect(searchName.items[0].clientName).toBe('Mombasa Logistics Corp');
  });

  it('updates invoice line items and recalculates totals transactionally', () => {
    const invoice = createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      currency: 'KES',
      lineItems: [
        {
          description: 'Consultation Session',
          quantity: 1,
          unitPriceMinor: 1000000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ]
    });

    expect(invoice.totalMinor).toBe(1160000);

    // Update with 2 items and new status
    const updated = updateInvoice(db, {
      id: invoice.id,
      status: 'partially_paid',
      lineItems: [
        {
          description: 'Consultation Session (Extended)',
          quantity: 2,
          unitPriceMinor: 1000000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ],
      notes: 'Client made first partial payment'
    });

    expect(updated.status).toBe('partially_paid');
    expect(updated.notes).toBe('Client made first partial payment');
    expect(updated.totalMinor).toBe(2320000);
    expect(updated.lineItems.length).toBe(1);
    expect(updated.lineItems[0].description).toBe('Consultation Session (Extended)');
    expect(updated.lineItems[0].quantity).toBe(2);
  });

  it('duplicates an invoice with a new gap-free sequence and draft status', () => {
    const currentYear = new Date().getFullYear();

    const original = createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-01-01',
      dueDate: '2026-01-31',
      currency: 'KES',
      lineItems: [
        {
          description: 'Monthly Maintenance Retainer',
          quantity: 1,
          unitPriceMinor: 3000000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ],
      notes: 'Monthly Retainer SLA'
    });

    expect(original.invoiceNumber).toBe(`INV-${currentYear}-0001`);

    // Duplicate invoice
    const duplicate = duplicateInvoice(db, original.id);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.invoiceNumber).toBe(`INV-${currentYear}-0002`);
    expect(duplicate.status).toBe('draft');
    expect(duplicate.clientId).toBe(original.clientId);
    expect(duplicate.totalMinor).toBe(original.totalMinor);
    expect(duplicate.amountPaidMinor).toBe(0);
    expect(duplicate.balanceDueMinor).toBe(original.totalMinor);
    expect(duplicate.lineItems.length).toBe(1);
    expect(duplicate.lineItems[0].description).toBe('Monthly Maintenance Retainer');
  });

  it('deletes an invoice and cascades to line items', () => {
    const invoice = createInvoice(db, {
      clientId: testClientId,
      issueDate: '2026-06-01',
      dueDate: '2026-06-30',
      currency: 'KES',
      lineItems: [
        {
          description: 'One-off Security Audit',
          quantity: 1,
          unitPriceMinor: 5000000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ]
    });

    const deleted = deleteInvoice(db, invoice.id);
    expect(deleted).toBe(true);

    expect(() => getInvoice(db, invoice.id)).toThrow('was not found');

    // Confirm line items were also deleted
    const items = db
      .prepare('SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = ?')
      .get(invoice.id) as { count: number };
    expect(items.count).toBe(0);
  });
});

