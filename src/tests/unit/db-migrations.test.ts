// path: src/tests/unit/db-migrations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import { checkDatabaseIntegrity } from '../../main/db/integrity';

describe('Database Migrations and Safety', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('runs initial migrations and creates all required tables', async () => {
    const result = await runMigrations(db);

    expect(result.appliedCount).toBe(2);
    expect(result.appliedMigrations).toContain('001_initial_schema');
    expect(result.appliedMigrations).toContain('002_expenses_and_payments');

    // Verify tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('_migrations');
    expect(tableNames).toContain('clients');
    expect(tableNames).toContain('invoices');
    expect(tableNames).toContain('invoice_items');
    expect(tableNames).toContain('invoice_sequences');
    expect(tableNames).toContain('business_profile');
    expect(tableNames).toContain('expenses');
    expect(tableNames).toContain('payments');
  });

  it('is idempotent on subsequent runs with no pending migrations', async () => {
    await runMigrations(db);
    const secondRun = await runMigrations(db);

    expect(secondRun.appliedCount).toBe(0);
    expect(secondRun.appliedMigrations).toHaveLength(0);
  });

  it('enforces foreign key constraints', async () => {
    await runMigrations(db);

    // Attempting to insert an invoice with a nonexistent client_id should fail
    expect(() => {
      db.prepare(
        `
        INSERT INTO invoices (
          id, invoice_number, client_id, status, issue_date, due_date, currency, created_at, updated_at
        ) VALUES (
          'inv-1', 'INV-2026-0001', 'non-existent-client', 'draft', '2026-11-07', '2026-11-21', 'KES',
          '2026-11-07T12:00:00Z', '2026-11-07T12:00:00Z'
        )
      `
      ).run();
    }).toThrow(/FOREIGN KEY/i);
  });

  it('passes PRAGMA integrity_check on clean database', async () => {
    await runMigrations(db);
    const integrity = checkDatabaseIntegrity(db);

    expect(integrity.ok).toBe(true);
    expect(integrity.errors).toHaveLength(0);
  });
});
