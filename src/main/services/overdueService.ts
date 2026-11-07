// path: src/main/services/overdueService.ts
import Database from 'better-sqlite3';

export interface OverdueCheckResult {
  updatedCount: number;
  overdueInvoiceIds: string[];
}

/**
 * Checks for past-due invoices that are sent or partially paid and marks them overdue.
 *
 * @param db Active SQLite database
 * @param referenceDate Optional ISO date string (YYYY-MM-DD), defaults to today in UTC/local
 */
export function checkAndMarkOverdueInvoices(
  db: Database.Database,
  referenceDate?: string
): OverdueCheckResult {
  const today = referenceDate || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const overdueTx = db.transaction(() => {
    // Find matching invoice IDs
    const rows = db
      .prepare(`
        SELECT id FROM invoices
        WHERE due_date < ?
          AND status IN ('sent', 'partially_paid')
      `)
      .all(today) as { id: string }[];

    if (rows.length === 0) {
      return { updatedCount: 0, overdueInvoiceIds: [] };
    }

    const ids = rows.map(r => r.id);

    const updateStmt = db.prepare(`
      UPDATE invoices
      SET status = 'overdue', updated_at = ?
      WHERE id = ?
    `);

    for (const id of ids) {
      updateStmt.run(now, id);
    }

    return {
      updatedCount: ids.length,
      overdueInvoiceIds: ids
    };
  });

  return overdueTx();
}

