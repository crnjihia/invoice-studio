// path: src/main/services/invoiceNumberService.ts
import Database from 'better-sqlite3';

export interface InvoiceSequenceRecord {
  year: number;
  last_sequence: number;
  updated_at: string;
}

/**
 * Generates the next gap-free invoice sequence number within an immediate SQLite transaction.
 * Format: INV-{YYYY}-{0001}
 *
 * @param db Active SQLite database connection
 * @param targetYear Optional year override (defaults to current calendar year)
 */
export function getNextInvoiceNumber(db: Database.Database, targetYear?: number): string {
  const year = targetYear || new Date().getFullYear();

  const getNextTx = db.transaction(() => {
    // Acquire sequence row or insert 0 if first invoice of the year
    const existing = db
      .prepare('SELECT last_sequence FROM invoice_sequences WHERE year = ?')
      .get(year) as { last_sequence: number } | undefined;

    const nextSeq = (existing ? existing.last_sequence : 0) + 1;
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(
        'UPDATE invoice_sequences SET last_sequence = ?, updated_at = ? WHERE year = ?'
      ).run(nextSeq, now, year);
    } else {
      db.prepare(
        'INSERT INTO invoice_sequences (year, last_sequence, updated_at) VALUES (?, ?, ?)'
      ).run(year, nextSeq, now);
    }

    const paddedNumber = String(nextSeq).padStart(4, '0');
    return `INV-${year}-${paddedNumber}`;
  });

  return getNextTx();
}

/**
 * Previews the next invoice number without incrementing the sequence.
 */
export function previewNextInvoiceNumber(db: Database.Database, targetYear?: number): string {
  const year = targetYear || new Date().getFullYear();
  const existing = db
    .prepare('SELECT last_sequence FROM invoice_sequences WHERE year = ?')
    .get(year) as { last_sequence: number } | undefined;

  const nextSeq = (existing ? existing.last_sequence : 0) + 1;
  const paddedNumber = String(nextSeq).padStart(4, '0');
  return `INV-${year}-${paddedNumber}`;
}
