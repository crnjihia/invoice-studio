// path: src/main/db/integrity.ts
import Database from 'better-sqlite3';

export interface IntegrityCheckResult {
  ok: boolean;
  errors: string[];
  guidance?: string;
}

/**
 * Executes SQLite PRAGMA integrity_check and returns actionable recovery guidance
 * if any database corruption is detected.
 */
export function checkDatabaseIntegrity(db: Database.Database): IntegrityCheckResult {
  try {
    const rows = db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>;

    const errors = rows.map(r => r.integrity_check).filter(msg => msg.toLowerCase() !== 'ok');

    if (errors.length === 0) {
      return { ok: true, errors: [] };
    }

    const guidance =
      'Database corruption detected. Recommended recovery actions:\n' +
      '1. Close Invoice Studio immediately.\n' +
      '2. Restore from the most recent automatic backup in Settings -> Backups.\n' +
      '3. Alternatively, export data via the SQLite CLI dump tool:\n' +
      '   sqlite3 corrupted.db ".recover" | sqlite3 recovered.db';

    console.error('[Database Integrity Error]:', errors);
    console.warn('[Database Recovery Guidance]:', guidance);

    return {
      ok: false,
      errors,
      guidance
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      errors: [message],
      guidance: 'Failed to complete integrity check. Database file may be locked or unreadable.'
    };
  }
}
