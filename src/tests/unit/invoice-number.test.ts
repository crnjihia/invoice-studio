// path: src/tests/unit/invoice-number.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import {
  getNextInvoiceNumber,
  previewNextInvoiceNumber
} from '../../main/services/invoiceNumberService';

describe('Transactional Gap-Free Invoice Numbering', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    await runMigrations(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('generates sequential gap-free invoice numbers for a given year', () => {
    const num1 = getNextInvoiceNumber(db, 2026);
    const num2 = getNextInvoiceNumber(db, 2026);
    const num3 = getNextInvoiceNumber(db, 2026);

    expect(num1).toBe('INV-2026-0001');
    expect(num2).toBe('INV-2026-0002');
    expect(num3).toBe('INV-2026-0003');
  });

  it('resets sequence counter for a new calendar year', () => {
    const seq2026_1 = getNextInvoiceNumber(db, 2026);
    const seq2026_2 = getNextInvoiceNumber(db, 2026);
    const seq2027_1 = getNextInvoiceNumber(db, 2027);

    expect(seq2026_1).toBe('INV-2026-0001');
    expect(seq2026_2).toBe('INV-2026-0002');
    expect(seq2027_1).toBe('INV-2027-0001');
  });

  it('previews next sequence without incrementing the database counter', () => {
    const preview1 = previewNextInvoiceNumber(db, 2026);
    expect(preview1).toBe('INV-2026-0001');

    const preview2 = previewNextInvoiceNumber(db, 2026);
    expect(preview2).toBe('INV-2026-0001');

    const actual = getNextInvoiceNumber(db, 2026);
    expect(actual).toBe('INV-2026-0001');

    const nextPreview = previewNextInvoiceNumber(db, 2026);
    expect(nextPreview).toBe('INV-2026-0002');
  });
});
