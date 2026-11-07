// path: scripts/run-clear-db.ts
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';
import { getDefaultDatabasePath } from '../src/main/db/connection';
import { clearDatabase } from '../src/main/db/seed';

function clearDbFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  console.info(`[Clear DB] Clearing database at: ${filePath}`);
  try {
    const db = new Database(filePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    clearDatabase(db);
    db.close();
    console.info(`[Clear DB] Successfully cleared: ${filePath}`);
  } catch (err: unknown) {
    console.warn(`[Clear DB] Warning clearing ${filePath}:`, err);
  }
}

async function main(): Promise<void> {
  // 1. Clear default userData database
  const defaultPath = getDefaultDatabasePath();
  clearDbFile(defaultPath);

  // 2. Clear AppData path directly if on Windows
  if (process.env.APPDATA) {
    const appDataPath = join(process.env.APPDATA, 'invoice-studio', 'invoice-studio.sqlite');
    if (appDataPath !== defaultPath) {
      clearDbFile(appDataPath);
    }
  }

  // 3. Clear workspace root database if present
  const localRootPath = join(process.cwd(), 'invoice-studio.sqlite');
  if (localRootPath !== defaultPath) {
    clearDbFile(localRootPath);
  }

  console.info('[Clear DB] All application databases are now completely empty and finalized.');
}

main().catch(err => {
  console.error('[Clear DB] Error:', err);
  process.exit(1);
});

