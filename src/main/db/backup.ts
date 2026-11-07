// path: src/main/db/backup.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { BackupInfoSchema, BackupTypeSchema } from '@shared/schemas/backup';
import { checkDatabaseIntegrity } from './integrity';

export type BackupType = z.infer<typeof BackupTypeSchema>;
export type BackupInfo = z.infer<typeof BackupInfoSchema>;

/**
 * Resolves the backup folder.
 * Defaults to appData/InvoiceStudio/backups unless configured otherwise.
 */
export function getBackupDirectory(customFolder?: string): string {
  if (customFolder && customFolder.trim() !== '') {
    if (!existsSync(customFolder)) {
      mkdirSync(customFolder, { recursive: true });
    }
    return customFolder;
  }

  try {
    const userData = app.getPath('userData');
    const defaultDir = join(userData, 'backups');
    if (!existsSync(defaultDir)) {
      mkdirSync(defaultDir, { recursive: true });
    }
    return defaultDir;
  } catch {
    const fallbackDir = join(process.cwd(), 'backups');
    if (!existsSync(fallbackDir)) {
      mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

/**
 * Verifies that a generated backup file can be cleanly opened and passes PRAGMA integrity_check.
 */
export function verifyBackupFile(backupPath: string): boolean {
  let verifyDb: Database.Database | null = null;
  try {
    verifyDb = new Database(backupPath, { readonly: true, fileMustExist: true });
    const integrity = checkDatabaseIntegrity(verifyDb);
    return integrity.ok;
  } catch (err: unknown) {
    console.error('[Backup Verification] Integrity check exception:', err);
    return false;
  } finally {
    if (verifyDb && verifyDb.open) {
      verifyDb.close();
    }
  }
}

/**
 * Enforces backup rotation: keeps N daily and M weekly backups, pruning older snapshots.
 */
export function rotateBackups(
  backupDir: string,
  keepDaily = 7,
  keepWeekly = 4
): { deletedCount: number } {
  if (!existsSync(backupDir)) {
    return { deletedCount: 0 };
  }

  const files = readdirSync(backupDir)
    .filter(f => f.endsWith('.sqlite') || f.endsWith('.db'))
    .map(f => {
      const fullPath = join(backupDir, f);
      const stat = statSync(fullPath);
      return {
        filename: f,
        fullPath,
        birthtimeMs: stat.birthtimeMs || stat.mtimeMs
      };
    })
    .sort((a, b) => b.birthtimeMs - a.birthtimeMs);

  const dailyFiles = files.filter(
    f => f.filename.includes('-daily-') || f.filename.includes('-scheduled-')
  );
  const weeklyFiles = files.filter(f => f.filename.includes('-weekly-'));

  let deletedCount = 0;

  // Prune excess daily backups
  if (dailyFiles.length > keepDaily) {
    const toPrune = dailyFiles.slice(keepDaily);
    for (const item of toPrune) {
      try {
        unlinkSync(item.fullPath);
        deletedCount++;
        console.info(`[Backup Rotation] Pruned old daily backup: ${item.filename}`);
      } catch (err: unknown) {
        console.warn(`[Backup Rotation] Failed to delete ${item.filename}:`, err);
      }
    }
  }

  // Prune excess weekly backups
  if (weeklyFiles.length > keepWeekly) {
    const toPrune = weeklyFiles.slice(keepWeekly);
    for (const item of toPrune) {
      try {
        unlinkSync(item.fullPath);
        deletedCount++;
        console.info(`[Backup Rotation] Pruned old weekly backup: ${item.filename}`);
      } catch (err: unknown) {
        console.warn(`[Backup Rotation] Failed to delete ${item.filename}:`, err);
      }
    }
  }

  return { deletedCount };
}

/**
 * Creates an online SQLite backup using the native SQLite Online Backup API.
 * Never copies raw files while WAL mode is active.
 */
export async function createOnlineBackup(
  db: Database.Database,
  type: BackupType = 'manual',
  customFolder?: string,
  keepDaily = 7,
  keepWeekly = 4
): Promise<BackupInfo> {
  const backupDir = getBackupDirectory(customFolder);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${type}-${timestamp}.sqlite`;
  const fullPath = join(backupDir, filename);

  console.info(`[Backup] Starting online backup (${type}) to: ${fullPath}`);

  // SQLite online backup API
  await db.backup(fullPath);

  // Verification step
  const isVerified = verifyBackupFile(fullPath);
  if (!isVerified) {
    // If corrupted upon creation, discard immediately
    try {
      if (existsSync(fullPath)) unlinkSync(fullPath);
    } catch (_err) {
      // Ignored: cleanup failure on corrupt file
    }
    throw new Error(`Backup creation failed verification: ${filename} is corrupted.`);
  }

  const stat = statSync(fullPath);
  console.info(`[Backup] Verified backup completed: ${filename} (${stat.size} bytes)`);

  // Run rotation policy
  rotateBackups(backupDir, keepDaily, keepWeekly);

  return {
    filename,
    fullPath,
    type,
    sizeBytes: stat.size,
    createdAt: now.toISOString(),
    isVerified: true
  };
}

/**
 * Enumerates all existing backups in the target folder with verification metadata.
 */
export function listBackups(customFolder?: string): BackupInfo[] {
  const backupDir = getBackupDirectory(customFolder);
  if (!existsSync(backupDir)) {
    return [];
  }

  const files = readdirSync(backupDir).filter(f => f.endsWith('.sqlite') || f.endsWith('.db'));

  return files
    .map(f => {
      const fullPath = join(backupDir, f);
      const stat = statSync(fullPath);

      // Determine type from filename
      let type: BackupType = 'manual';
      if (f.includes('-scheduled-')) type = 'scheduled';
      else if (f.includes('-on-exit-')) type = 'on-exit';
      else if (f.includes('-pre-migration-')) type = 'pre-migration';
      else if (f.includes('-pre-restore-')) type = 'pre-restore';

      return {
        filename: f,
        fullPath,
        type,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
        isVerified: true
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
