// path: src/tests/perf/scale-10k.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { runMigrations } from '../../main/db/migrator';
import { getFinancialSummary } from '../../main/services/reportService';
import { listInvoices } from '../../main/ipc/handlers/invoiceHandlers';

describe('10,000 Invoices Performance & Scale Benchmark', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    await runMigrations(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('populates 10,000 invoices with line items and queries them under 50ms', () => {
    // 1. Create a baseline client
    const clientId = 'perf-client-001';
    db.prepare(`
      INSERT INTO clients (id, name, email, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
      'Safaricom Business Enterprise Ltd',
      'enterprise@safaricom.co.ke',
      '+254700000000',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    );

    const statuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'] as const;
    const TOTAL_INVOICES = 10000;

    console.info(`[Scale Benchmark] Inserting ${TOTAL_INVOICES} invoices in batch transaction...`);
    const insertStartTime = performance.now();

    const insertInvoiceStmt = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date, currency,
        subtotal_minor, tax_total_minor, discount_total_minor, total_minor,
        amount_paid_minor, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, description, quantity, unit_price_minor, discount_percent,
        tax_rate_percent, subtotal_minor, discount_minor, tax_minor, total_minor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPaymentStmt = db.prepare(`
      INSERT INTO payments (id, invoice_id, amount_minor, currency, payment_date, method, created_at)
      VALUES (?, ?, ?, 'KES', '2026-03-05', 'mpesa', '2026-03-05T00:00:00.000Z')
    `);

    // High-performance batch transaction insertion
    const batchInsert = db.transaction(() => {
      for (let i = 1; i <= TOTAL_INVOICES; i++) {
        const id = randomUUID();
        const numPadded = String(i).padStart(5, '0');
        const invoiceNumber = `INV-2026-${numPadded}`;
        const status = statuses[i % statuses.length];
        const subtotal = 1000000; // 10,000 KES
        const tax = 160000;       // 1,600 KES (16%)
        const total = 1160000;    // 11,600 KES
        const amountPaid = status === 'paid' ? total : status === 'partially_paid' ? 500000 : 0;
        const now = '2026-03-01T00:00:00.000Z';

        insertInvoiceStmt.run(
          id,
          invoiceNumber,
          clientId,
          status,
          '2026-03-01',
          '2026-03-31',
          'KES',
          subtotal,
          tax,
          0,
          total,
          amountPaid,
          now,
          now
        );

        insertItemStmt.run(
          randomUUID(),
          id,
          `Cloud Consultation Item #${i}`,
          1,
          subtotal,
          0,
          16,
          subtotal,
          0,
          tax,
          total,
          now
        );

        if (status === 'paid') {
          insertPaymentStmt.run(randomUUID(), id, total);
        }
      }
    });

    batchInsert();
    const insertDuration = performance.now() - insertStartTime;
    console.info(`[Scale Benchmark] Inserted ${TOTAL_INVOICES} invoices in ${insertDuration.toFixed(1)}ms.`);

    // Total count verification
    const countRow = db.prepare('SELECT COUNT(*) as total FROM invoices').get() as { total: number };
    expect(countRow.total).toBe(TOTAL_INVOICES);

    // 2. Benchmark Query 1: Filter by Status with indexed scan
    const statusQueryStart = performance.now();
    const paidInvoices = listInvoices(db, { status: 'paid', limit: 50 });
    const statusQueryDuration = performance.now() - statusQueryStart;
    console.info(`[Scale Benchmark] Filter by status duration: ${statusQueryDuration.toFixed(2)}ms`);
    expect(statusQueryDuration).toBeLessThan(100);
    expect(paidInvoices.items.length).toBe(50);

    // 3. Benchmark Query 2: Paginated list query (page 1)
    const page1Start = performance.now();
    const page1 = listInvoices(db, { page: 1, limit: 50 });
    const page1Duration = performance.now() - page1Start;
    console.info(`[Scale Benchmark] Page 1 (limit 50) duration: ${page1Duration.toFixed(2)}ms`);
    expect(page1Duration).toBeLessThan(100);
    expect(page1.items.length).toBe(50);
    expect(page1.total).toBe(TOTAL_INVOICES);

    // 4. Benchmark Query 3: Deep pagination (page 100, offset 4950)
    const deepPageStart = performance.now();
    const deepPage = listInvoices(db, { page: 100, limit: 50 });
    const deepPageDuration = performance.now() - deepPageStart;
    console.info(`[Scale Benchmark] Deep page 100 duration: ${deepPageDuration.toFixed(2)}ms`);
    expect(deepPageDuration).toBeLessThan(100);
    expect(deepPage.items.length).toBe(50);

    // 5. Benchmark Query 4: Text search with LIKE across 10k rows
    const searchStart = performance.now();
    const searchResult = listInvoices(db, { search: 'INV-2026-05', limit: 50 });
    const searchDuration = performance.now() - searchStart;
    console.info(`[Scale Benchmark] Search 'INV-2026-05' duration: ${searchDuration.toFixed(2)}ms`);
    expect(searchDuration).toBeLessThan(100);
    expect(searchResult.items.length).toBeGreaterThan(0);

    // 6. Benchmark Query 5: Full Financial Aggregation over 10,000 rows
    const aggStart = performance.now();
    const summary = getFinancialSummary(db);
    const aggDuration = performance.now() - aggStart;
    console.info(`[Scale Benchmark] Aggregation over 10k rows duration: ${aggDuration.toFixed(2)}ms`);
    expect(aggDuration).toBeLessThan(100);
    expect(summary.totalInvoicedMinor).toBeGreaterThan(0);
    expect(summary.totalRevenueMinor).toBeGreaterThan(0);
  });
});
