// path: src/tests/integration/backup-restore-corruption.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { closeDatabase, getDatabase, initializeDatabase } from '../../main/db/connection';
import { checkDatabaseIntegrity } from '../../main/db/integrity';
import { createOnlineBackup } from '../../main/db/backup';
import { executeRestore, previewBackup } from '../../main/db/restore';

describe('Disaster Recovery & Corrupted DB Scenario', () => {
  const testDir = join(process.cwd(), 'temp-test-corruption-scenario');
  const dbPath = join(testDir, 'live-app.sqlite');
  const backupDir = join(testDir, 'backups');

  beforeEach(async () => {
    closeDatabase();
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch (_err) {
        // Ignored: cleanup of temporary test directory
      }
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(backupDir, { recursive: true });

    // Initialize clean database
    await initializeDatabase({ customPath: dbPath });
  });

  afterEach(() => {
    closeDatabase();
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch (_err) {
        // Ignored: cleanup of temporary test directory
      }
    }
  });

  it('detects database corruption and restores cleanly from a verified backup', async () => {
    const db = getDatabase();

    // 1. Seed initial data
    db.prepare(
      `
      INSERT INTO clients (id, name, email, phone, created_at, updated_at)
      VALUES ('c-1', 'Safaricom Merchant Nairobi', 'merchant@safaricom.co.ke', '+254700000000', '2026-11-07', '2026-11-07')
    `
    ).run();

    db.prepare(
      `
      INSERT INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date, currency, total_minor, created_at, updated_at
      ) VALUES (
        'inv-1', 'INV-2026-0001', 'c-1', 'sent', '2026-11-07', '2026-11-21', 'KES', 580000, '2026-11-07', '2026-11-07'
      )
    `
    ).run();

    // 2. Create a verified point-in-time online backup
    const backupInfo = await createOnlineBackup(db, 'manual', backupDir);
    expect(backupInfo.isVerified).toBe(true);
    expect(existsSync(backupInfo.fullPath)).toBe(true);

    // 3. Inspect backup preview metadata
    const preview = previewBackup(backupInfo.fullPath);
    expect(preview.isValid).toBe(true);
    expect(preview.clientCount).toBe(1);
    expect(preview.invoiceCount).toBe(1);
    expect(preview.lastInvoiceDate).toBe('2026-11-07');

    // 4. Intentionally simulate fatal disk corruption
    closeDatabase();
    writeFileSync(dbPath, 'CORRUPTED_HEADER_DATA_SQLITE_INVALID_SECTOR');

    // 5. Verify integrity check detects failure on corrupted file
    const { integrity } = await initializeDatabase({ customPath: dbPath, skipMigrations: true });
    expect(integrity.ok).toBe(false);
    expect(integrity.guidance).toBeDefined();

    // 6. Execute one-click restore from verified backup
    const restoreResult = await executeRestore(backupInfo.fullPath, dbPath);
    expect(restoreResult.success).toBe(true);

    // 7. Verify restored database is 100% healthy and original records are recovered
    const restoredDb = getDatabase();
    const restoredIntegrity = checkDatabaseIntegrity(restoredDb);
    expect(restoredIntegrity.ok).toBe(true);

    const client = restoredDb.prepare('SELECT name FROM clients WHERE id = ?').get('c-1') as {
      name: string;
    };
    expect(client.name).toBe('Safaricom Merchant Nairobi');

    const invoice = restoredDb
      .prepare('SELECT invoice_number, total_minor FROM invoices WHERE id = ?')
      .get('inv-1') as {
      invoice_number: string;
      total_minor: number;
    };
    expect(invoice.invoice_number).toBe('INV-2026-0001');
    expect(invoice.total_minor).toBe(580000);
  });
});
