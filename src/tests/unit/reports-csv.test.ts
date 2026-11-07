// path: src/tests/unit/reports-csv.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, rmSync } from 'fs';
import { runMigrations } from '../../main/db/migrator';
import { createClient } from '../../main/ipc/handlers/clientHandlers';
import { createInvoice, updateInvoice } from '../../main/ipc/handlers/invoiceHandlers';
import { createExpense } from '../../main/ipc/handlers/expenseHandlers';
import { recordPayment } from '../../main/services/paymentService';
import {
  getExpensesByCategory,
  getFinancialSummary,
  getRevenueByMonth
} from '../../main/services/reportService';
import {
  escapeCsvField,
  generateExpensesCsv,
  generateInvoicesCsv,
  saveCsvFile
} from '../../main/services/csvExportService';

const TEST_DIR = 'temp-test-reports-csv';

// Mock dialog and app for csv export test
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('temp-test-reports-csv')
  },
  dialog: {
    showSaveDialog: vi.fn().mockResolvedValue({
      canceled: false,
      filePath: 'temp-test-reports-csv/export.csv'
    })
  }
}));

describe('Financial Reports & CSV Export Unit Tests', () => {
  let db: Database.Database;
  let clientId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    const client = createClient(db, {
      name: 'Nairobi Silicon Savannah Ltd',
      phone: '+254700334455'
    });
    clientId = client.id;
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    if (existsSync(TEST_DIR)) {
      try {
        rmSync(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignored: cleanup error
      }
    }
  });

  it('computes financial summary, monthly revenue, and expense categorisation correctly', () => {
    // Invoice 1: 100k KES (10,000,000 cents) -> Paid in full
    const inv1 = createInvoice(db, {
      clientId,
      issueDate: '2026-01-10',
      dueDate: '2026-02-10',
      lineItems: [{ description: 'Backend Architecture', quantity: 1, unitPriceMinor: 10000000, taxRatePercent: 0 }]
    });
    updateInvoice(db, { id: inv1.id, status: 'sent' });
    recordPayment(db, {
      invoiceId: inv1.id,
      amountMinor: 10000000,
      paymentDate: '2026-01-20',
      method: 'bank'
    });

    // Invoice 2: 50k KES (5,000,000 cents) -> Partially paid (20k KES paid in Feb, 30k KES outstanding)
    const inv2 = createInvoice(db, {
      clientId,
      issueDate: '2026-02-05',
      dueDate: '2026-03-05',
      lineItems: [{ description: 'Cloud Migration', quantity: 1, unitPriceMinor: 5000000, taxRatePercent: 0 }]
    });
    updateInvoice(db, { id: inv2.id, status: 'sent' });
    recordPayment(db, {
      invoiceId: inv2.id,
      amountMinor: 2000000,
      paymentDate: '2026-02-15',
      method: 'mpesa'
    });

    // Expenses:
    // Expense 1: Software 15k KES (1,500,000 cents)
    createExpense(db, {
      category: 'software',
      description: 'JetBrains IDE & Cloud Hosting',
      amountMinor: 1500000,
      date: '2026-01-15'
    });

    // Expense 2: Equipment 25k KES (2,500,000 cents)
    createExpense(db, {
      category: 'equipment',
      description: 'Ergonomic Chair & Monitor Stand',
      amountMinor: 2500000,
      date: '2026-02-01'
    });

    // 1. Financial summary verification:
    // Total Invoiced: 100k + 50k = 150k KES (15,000,000 cents)
    // Total Revenue: 100k + 20k = 120k KES (12,000,000 cents)
    // Total Outstanding: 30k KES (3,000,000 cents)
    // Total Expenses: 15k + 25k = 40k KES (4,000,000 cents)
    // Profit: 120k - 40k = 80k KES (8,000,000 cents)
    const summary = getFinancialSummary(db);
    expect(summary.totalInvoicedMinor).toBe(15000000);
    expect(summary.totalRevenueMinor).toBe(12000000);
    expect(summary.totalOutstandingMinor).toBe(3000000);
    expect(summary.totalExpensesMinor).toBe(4000000);
    expect(summary.estimatedProfitMinor).toBe(8000000);
    expect(summary.paidInvoicesCount).toBe(1);
    expect(summary.activeInvoicesCount).toBe(1);

    // 2. Revenue by month:
    // Jan: 100k KES, 1 payment
    // Feb: 20k KES, 1 payment
    const monthlyRev = getRevenueByMonth(db);
    expect(monthlyRev.length).toBe(2);
    expect(monthlyRev[0].month).toBe('2026-01');
    expect(monthlyRev[0].revenueMinor).toBe(10000000);
    expect(monthlyRev[1].month).toBe('2026-02');
    expect(monthlyRev[1].revenueMinor).toBe(2000000);

    // 3. Expenses by category:
    const byCategory = getExpensesByCategory(db);
    expect(byCategory.length).toBe(2);
    expect(byCategory[0].category).toBe('equipment');
    expect(byCategory[0].totalMinor).toBe(2500000);
    expect(byCategory[1].category).toBe('software');
    expect(byCategory[1].totalMinor).toBe(1500000);
  });

  it('generates valid RFC 4180 CSV with escaped characters and decimal amounts', async () => {
    // Test field escaping
    expect(escapeCsvField('Simple text')).toBe('Simple text');
    expect(escapeCsvField('Text, with comma')).toBe('"Text, with comma"');
    expect(escapeCsvField('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeCsvField('Multi\nline')).toBe('"Multi\nline"');

    // Invoices CSV export
    createInvoice(db, {
      clientId,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      lineItems: [{ description: 'Project "Titan", Phase 1', quantity: 1, unitPriceMinor: 1050050 }]
    });

    const invCsv = generateInvoicesCsv(db);
    expect(invCsv.count).toBe(1);
    expect(invCsv.csv).toContain('Invoice Number,Client Name,Status');
    expect(invCsv.csv).toContain('10500.50');
    expect(invCsv.csv).toContain('Nairobi Silicon Savannah Ltd');

    // Expenses CSV export
    createExpense(db, {
      category: 'travel',
      description: 'SGR Train to Mombasa, Meeting with Client',
      amountMinor: 350000,
      date: '2026-03-02'
    });

    const expCsv = generateExpensesCsv(db);
    expect(expCsv.count).toBe(1);
    expect(expCsv.csv).toContain('Date,Category,Description');
    expect(expCsv.csv).toContain('"SGR Train to Mombasa, Meeting with Client"');
    expect(expCsv.csv).toContain('3500.00');

    // Save CSV to disk test
    const saveResult = await saveCsvFile(expCsv.csv, 'expenses.csv', `${TEST_DIR}/test-expenses.csv`);
    expect(saveResult).not.toBeNull();
    expect(saveResult?.rowCount).toBe(1);
    expect(existsSync(saveResult?.filePath || '')).toBe(true);
  });
});
