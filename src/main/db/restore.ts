// path: src/main/db/restore.ts
import Database from 'better-sqlite3';
import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { z } from 'zod';
import { RestorePreviewSchema } from '@shared/schemas/backup';
import { verifyBackupFile, createOnlineBackup } from './backup';
import { closeDatabase, getDatabase, getCurrentDbPath, initializeDatabase } from './connection';

export type RestorePreview = z.infer<typeof RestorePreviewSchema>;

/**
 * Inspects a backup file and returns counts and verification status for UI preview
 * before the user confirms a restore operation.
 */
export function previewBackup(backupPath: string): RestorePreview {
  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}`);
  }

  const isValid = verifyBackupFile(backupPath);
  if (!isValid) {
    return {
      backupPath,
      createdAt: new Date().toISOString(),
      sizeBytes: 0,
      isValid: false,
      clientCount: 0,
      invoiceCount: 0,
      lastInvoiceDate: null
    };
  }

  let db: Database.Database | null = null;
  try {
    db = new Database(backupPath, { readonly: true });

    const clientRow = db.prepare('SELECT COUNT(*) as count FROM clients').get() as {
      count: number;
    };
    const invoiceRow = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as {
      count: number;
    };
    const lastInvoiceRow = db
      .prepare('SELECT issue_date FROM invoices ORDER BY issue_date DESC LIMIT 1')
      .get() as { issue_date: string } | undefined;

    return {
      backupPath,
      createdAt: new Date().toISOString(),
      sizeBytes: 0,
      isValid: true,
      clientCount: clientRow?.count ?? 0,
      invoiceCount: invoiceRow?.count ?? 0,
      lastInvoiceDate: lastInvoiceRow?.issue_date ?? null
    };
  } catch (err: unknown) {
    console.error('[Restore Preview Error]:', err);
    return {
      backupPath,
      createdAt: new Date().toISOString(),
      sizeBytes: 0,
      isValid: false,
      clientCount: 0,
      invoiceCount: 0,
      lastInvoiceDate: null
    };
  } finally {
    if (db && db.open) {
      db.close();
    }
  }
}

/**
 * Restores the active database from a verified backup file.
 * Automatically attempts a pre-restore safety snapshot of the active database beforehand if readable.
 */
export async function executeRestore(
  backupPath: string,
  targetDbPath?: string
): Promise<{ success: boolean; preRestoreSnapshotPath: string | null }> {
  if (!verifyBackupFile(backupPath)) {
    throw new Error('Cannot restore from corrupted or unverified backup file.');
  }

  const activeDbPath = targetDbPath || getCurrentDbPath();

  if (!activeDbPath || activeDbPath === ':memory:') {
    throw new Error('Cannot perform file restoration on an in-memory database.');
  }

  let preRestoreSnapshotPath: string | null = null;

  // 1. Attempt to take safety pre-restore backup if active DB is healthy
  try {
    const activeDb = getDatabase();
    if (activeDb && activeDb.open) {
      const preRestoreInfo = await createOnlineBackup(activeDb, 'pre-restore');
      preRestoreSnapshotPath = preRestoreInfo.fullPath;
    }
  } catch (err: unknown) {
    console.warn(
      '[Restore] Active database is unreadable or corrupted, skipping pre-restore online backup:',
      err
    );
  }

  // 2. Safely close active connection
  closeDatabase();

  // 3. Remove existing WAL and SHM journal files
  const walPath = `${activeDbPath}-wal`;
  const shmPath = `${activeDbPath}-shm`;
  if (existsSync(walPath)) {
    try {
      unlinkSync(walPath);
    } catch (_err) {
      // Ignored: journal file cleanup is best-effort
    }
  }
  if (existsSync(shmPath)) {
    try {
      unlinkSync(shmPath);
    } catch (_err) {
      // Ignored: journal file cleanup is best-effort
    }
  }

  // 4. Overwrite database with backup snapshot
  copyFileSync(backupPath, activeDbPath);

  // 5. Re-initialize database connection and verify integrity
  const { integrity } = await initializeDatabase({ customPath: activeDbPath });

  if (!integrity.ok) {
    console.error('[Restore Critical] Reopened database failed integrity verification!');
    throw new Error('Restored database failed integrity verification.');
  }

  console.info('[Restore] Restoration successfully completed from:', backupPath);

  return {
    success: true,
    preRestoreSnapshotPath
  };
}
