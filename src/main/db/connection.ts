// path: src/main/db/connection.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { checkDatabaseIntegrity, IntegrityCheckResult } from './integrity';
import { runMigrations } from './migrator';
import { seedDatabase } from './seed';

let dbInstance: Database.Database | null = null;
let currentDbPath: string | null = null;

export interface InitDbOptions {
  customPath?: string;
  skipMigrations?: boolean;
  seedIfEmpty?: boolean;
}

/**
 * Resolves the default persistent database path inside the application userData directory.
 */
export function getDefaultDatabasePath(): string {
  try {
    const userData = app.getPath('userData');
    if (!existsSync(userData)) {
      mkdirSync(userData, { recursive: true });
    }
    return join(userData, 'invoice-studio.sqlite');
  } catch {
    // Fallback when electron app is not ready or in pure test mode
    return 'invoice-studio.sqlite';
  }
}

/**
 * Establishes and hardens a SQLite connection in WAL mode with foreign keys.
 * Runs startup integrity check and executes any pending schema migrations.
 */
export async function initializeDatabase(
  options: InitDbOptions = {}
): Promise<{ db: Database.Database; integrity: IntegrityCheckResult }> {
  if (dbInstance) {
    return {
      db: dbInstance,
      integrity: checkDatabaseIntegrity(dbInstance)
    };
  }

  const dbPath = options.customPath || getDefaultDatabasePath();
  currentDbPath = dbPath;

  const db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  });

  let integrity: IntegrityCheckResult;

  try {
    // Apply mission-critical safety pragmas
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');

    // Verify integrity on startup
    integrity = checkDatabaseIntegrity(db);
    if (!integrity.ok) {
      console.error('[CRITICAL] SQLite database integrity check failed on startup!');
    } else if (!options.skipMigrations) {
      // Execute migrations unless explicitly skipped
      await runMigrations(db, dbPath);

      // Automatically populate initial Kenyan demo data if requested and database is empty
      if (options.seedIfEmpty) {
        try {
          seedDatabase(db, false);
        } catch (seedErr: unknown) {
          console.warn('[Database] Optional seed failed:', seedErr);
        }
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[CRITICAL] SQLite database initialization failed:', errorMsg);
    integrity = {
      ok: false,
      errors: [errorMsg],
      guidance:
        'Database file is unreadable or corrupted. Restore from the most recent automatic backup in Settings -> Backups.'
    };
  }

  dbInstance = db;
  return { db, integrity };
}

/**
 * Retrieves the active database connection instance.
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Closes the active database connection cleanly.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err: unknown) {
      console.warn('[Database] Warning while closing database:', err);
    } finally {
      dbInstance = null;
      currentDbPath = null;
    }
  }
}

export function getCurrentDbPath(): string | null {
  return currentDbPath;
}
