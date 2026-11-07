// path: src/tests/unit/db-seed.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import {
  seedDatabase,
  SEED_CLIENTS,
  SEED_INVOICES,
  SEED_EXPENSES,
  SEED_BUSINESS_PROFILE
} from '../../main/db/seed';

describe('Database Seed Data Suite (Kenyan Freelance & SME)', () => {
  let db: Database.Database;

  beforeEach(async () => {
    // In-memory SQLite with full schema migrations
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    await runMigrations(db, ':memory:');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('successfully seeds 8 Kenyan clients, 9 invoices across Q1/Q2 2026, and 8 expenses', () => {
    const result = seedDatabase(db, false);
    expect(result.clientCount).toBe(8);
    expect(result.invoiceCount).toBe(9);
    expect(result.expenseCount).toBe(8);

    // Verify Business Profile
    const biz = db.prepare('SELECT * FROM business_profile WHERE id = ?').get('biz-profile-main') as {
      name: string;
      tax_pin: string;
      default_currency: string;
      default_tax_rate: number;
    };
    expect(biz).toBeDefined();
    expect(biz.name).toBe(SEED_BUSINESS_PROFILE.name);
    expect(biz.tax_pin).toBe('P051999888K');
    expect(biz.default_currency).toBe('KES');
    expect(biz.default_tax_rate).toBe(16);

    // Verify Clients
    const clientRows = db.prepare('SELECT * FROM clients ORDER BY name ASC').all() as Array<{
      id: string;
      name: string;
      tax_pin: string;
      phone: string;
    }>;
    expect(clientRows.length).toBe(SEED_CLIENTS.length);
    for (const client of SEED_CLIENTS) {
      const found = clientRows.find(c => c.id === client.id);
      expect(found).toBeDefined();
      expect(found?.tax_pin).toMatch(/^P\d{9}[A-Z]$/);
      expect(found?.phone).toMatch(/^(\+254|0)[17]\d{8}$/);
    }

    // Verify Invoices
    const invoiceRows = db.prepare('SELECT * FROM invoices ORDER BY invoice_number ASC').all() as Array<{
      id: string;
      invoice_number: string;
      status: string;
      total_minor: number;
      amount_paid_minor: number;
      issue_date: string;
    }>;
    expect(invoiceRows.length).toBe(SEED_INVOICES.length);

    // Check statuses representation
    const statuses = invoiceRows.map(i => i.status);
    expect(statuses).toContain('paid');
    expect(statuses).toContain('partially_paid');
    expect(statuses).toContain('sent');
    expect(statuses).toContain('overdue');
    expect(statuses).toContain('draft');

    // Check sequence numbers
    expect(invoiceRows[0].invoice_number).toBe('INV-2026-0001');
    expect(invoiceRows[8].invoice_number).toBe('INV-2026-0009');

    // Verify 2026 sequence tracker
    const seqRow = db.prepare('SELECT last_sequence FROM invoice_sequences WHERE year = 2026').get() as {
      last_sequence: number;
    };
    expect(seqRow.last_sequence).toBe(9);

    // Verify Line Items
    const itemCount = (db.prepare('SELECT COUNT(*) as count FROM invoice_items').get() as { count: number }).count;
    expect(itemCount).toBeGreaterThanOrEqual(18); // At least 2 items per invoice

    // Verify Payments
    const payments = db.prepare('SELECT * FROM payments').all() as Array<{
      method: string;
      amount_minor: number;
      reference: string;
    }>;
    expect(payments.length).toBeGreaterThanOrEqual(4);
    const mpesaPayment = payments.find(p => p.method === 'mpesa');
    expect(mpesaPayment).toBeDefined();
    expect(mpesaPayment?.reference).toBeDefined();

    // Verify Expenses
    const expenseRows = db.prepare('SELECT * FROM expenses').all() as Array<{
      category: string;
      amount_minor: number;
    }>;
    expect(expenseRows.length).toBe(SEED_EXPENSES.length);
    const categories = expenseRows.map(e => e.category);
    expect(categories).toContain('software');
    expect(categories).toContain('office');
    expect(categories).toContain('utilities');
    expect(categories).toContain('equipment');
    expect(categories).toContain('travel');
    expect(categories).toContain('subcontractor');
    expect(categories).toContain('marketing');
    expect(categories).toContain('other');
  });

  it('does not duplicate data on subsequent non-force seed calls', () => {
    seedDatabase(db, false);
    const firstClientCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count;
    const firstInvoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number }).count;

    // Second call without forceReset
    seedDatabase(db, false);
    const secondClientCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count;
    const secondInvoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number }).count;

    expect(secondClientCount).toBe(firstClientCount);
    expect(secondInvoiceCount).toBe(firstInvoiceCount);
  });

  it('safely refreshes records when forceReset is true', () => {
    seedDatabase(db, false);

    // Add a custom transient record
    db.prepare(`
      INSERT INTO clients (id, name, email, phone, address, tax_pin, notes, created_at, updated_at)
      VALUES ('cli-temp', 'Temporary Client', 'temp@example.com', '+254700000000', '', 'P051000000A', '', '2026-01-01', '2026-01-01')
    `).run();

    expect((db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count).toBe(9);

    // Force reset
    const result = seedDatabase(db, true);
    expect(result.clientCount).toBe(8);

    const tempClient = db.prepare('SELECT * FROM clients WHERE id = ?').get('cli-temp');
    expect(tempClient).toBeUndefined();
  });
});
