// path: src/main/db/migrator.ts
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Migration, MIGRATIONS } from './migrations';

export interface MigrationResult {
  appliedCount: number;
  appliedMigrations: string[];
  preMigrationBackupPath?: string;
}

/**
 * Initializes the migrations tracker table if not present.
 */
function ensureMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * Creates an automatic pre-migration backup using SQLite's online backup API
 * before any pending DDL statements execute against a persistent database.
 */
export async function createPreMigrationBackup(
  db: Database.Database,
  dbPath: string,
  targetVersion: number
): Promise<string> {
  const baseDir = dirname(dbPath);
  const backupDir = join(baseDir, 'backups', 'pre-migration');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `pre-migration-v${targetVersion}-${timestamp}.sqlite`;
  const fullBackupPath = join(backupDir, backupFilename);

  console.info(`[Migrator] Creating pre-migration safety backup at: ${fullBackupPath}`);
  await db.backup(fullBackupPath);
  console.info('[Migrator] Pre-migration backup successfully created.');

  return fullBackupPath;
}

/**
 * Runs all pending migrations sequentially inside transactions.
 * Triggers an online backup beforehand if changes are detected on a file-backed DB.
 */
export async function runMigrations(
  db: Database.Database,
  dbPath?: string,
  migrations: Migration[] = MIGRATIONS
): Promise<MigrationResult> {
  ensureMigrationTable(db);

  const appliedRows = db.prepare('SELECT id FROM _migrations ORDER BY id ASC').all() as Array<{
    id: number;
  }>;
  const appliedIds = new Set(appliedRows.map(r => r.id));

  const pending = migrations.filter(m => !appliedIds.has(m.id));

  if (pending.length === 0) {
    return {
      appliedCount: 0,
      appliedMigrations: []
    };
  }

  let backupPath: string | undefined;

  // Perform automatic pre-migration backup if running against a disk-backed database
  if (dbPath && dbPath !== ':memory:') {
    const nextVersion = pending[0].id;
    backupPath = await createPreMigrationBackup(db, dbPath, nextVersion);
  }

  const appliedNames: string[] = [];

  const runAll = db.transaction((toApply: Migration[]) => {
    for (const migration of toApply) {
      console.info(`[Migrator] Applying migration: ${migration.name} (#${migration.id})`);
      db.exec(migration.up);

      db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        new Date().toISOString()
      );

      appliedNames.push(migration.name);
    }
  });

  runAll(pending);

  return {
    appliedCount: pending.length,
    appliedMigrations: appliedNames,
    preMigrationBackupPath: backupPath
  };
}
