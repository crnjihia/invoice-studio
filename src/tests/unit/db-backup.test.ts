// path: src/tests/unit/db-backup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runMigrations } from '../../main/db/migrator';
import {
  createOnlineBackup,
  listBackups,
  rotateBackups,
  verifyBackupFile
} from '../../main/db/backup';

describe('SQLite Online Backups & Rotation Policy', () => {
  const testDir = join(process.cwd(), 'temp-test-backups-unit');
  const dbPath = join(testDir, 'active.sqlite');
  let db: Database.Database;

  beforeEach(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    await runMigrations(db, dbPath);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        // Ignored on transient Windows filesystem lock
      }
    }
  });

  it('creates an online backup and verifies its integrity', async () => {
    // Insert sample data
    db.prepare(
      `INSERT INTO clients (id, name, created_at, updated_at) VALUES ('c1', 'Test Client', '2026-11-07', '2026-11-07')`
    ).run();

    const backupInfo = await createOnlineBackup(db, 'manual', testDir);

    expect(backupInfo.isVerified).toBe(true);
    expect(existsSync(backupInfo.fullPath)).toBe(true);
    expect(backupInfo.sizeBytes).toBeGreaterThan(0);

    const isVerified = verifyBackupFile(backupInfo.fullPath);
    expect(isVerified).toBe(true);
  });

  it('correctly rotates excess daily and weekly backups', () => {
    // Generate 10 dummy daily backups with distinct timestamps
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, '0');
      const filename = join(testDir, `backup-daily-2026-11-${day}-120000.sqlite`);
      writeFileSync(filename, 'dummy-data');
    }

    // Generate 6 dummy weekly backups
    for (let i = 1; i <= 6; i++) {
      const week = String(i).padStart(2, '0');
      const filename = join(testDir, `backup-weekly-2026-W${week}.sqlite`);
      writeFileSync(filename, 'dummy-data');
    }

    const { deletedCount } = rotateBackups(testDir, 7, 4);

    // 10 - 7 = 3 daily pruned; 6 - 4 = 2 weekly pruned. Total 5 pruned.
    expect(deletedCount).toBe(5);

    const remaining = listBackups(testDir);
    const remainingDaily = remaining.filter(f => f.filename.includes('-daily-'));
    const remainingWeekly = remaining.filter(f => f.filename.includes('-weekly-'));

    expect(remainingDaily.length).toBe(7);
    expect(remainingWeekly.length).toBe(4);
  });
});

