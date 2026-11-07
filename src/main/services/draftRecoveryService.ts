// path: src/main/services/draftRecoveryService.ts
import { app } from 'electron';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import { join } from 'path';
import { RecoverableDraft, SaveDraftSnapshotInput } from '@shared/types';

interface StoredSnapshotEnvelope {
  draftId: string;
  invoiceId?: string | null;
  savedAt: string;
  lastModified: string;
  data: SaveDraftSnapshotInput['data'];
  checksum: string;
}

export function getDraftsDirectory(customBaseDir?: string): string {
  const base = customBaseDir || (app ? app.getPath('userData') : process.cwd());
  const draftsDir = join(base, 'drafts');
  if (!existsSync(draftsDir)) {
    mkdirSync(draftsDir, { recursive: true });
  }
  return draftsDir;
}

/**
 * Computes SHA-256 checksum of stringified payload for tamper and corruption detection.
 */
function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Saves an active invoice draft snapshot to disk atomically.
 * Prevents corruption by writing to a temporary file first, then atomically renaming.
 */
export function saveDraftSnapshot(
  snapshot: SaveDraftSnapshotInput,
  customBaseDir?: string
): { success: boolean; filePath: string } {
  const draftsDir = getDraftsDirectory(customBaseDir);
  const finalPath = join(draftsDir, `snapshot_${snapshot.draftId}.json`);
  const tmpPath = join(draftsDir, `snapshot_${snapshot.draftId}.json.tmp`);

  const now = new Date().toISOString();
  const rawPayload = JSON.stringify(snapshot.data);
  const checksum = computeChecksum(rawPayload);

  const envelope: StoredSnapshotEnvelope = {
    draftId: snapshot.draftId,
    invoiceId: snapshot.invoiceId || null,
    savedAt: now,
    lastModified: snapshot.lastModified,
    data: snapshot.data,
    checksum
  };

  const serialized = JSON.stringify(envelope, null, 2);

  // Write to temp file then rename atomically
  writeFileSync(tmpPath, serialized, 'utf8');
  renameSync(tmpPath, finalPath);

  return { success: true, filePath: finalPath };
}

/**
 * Discards an existing draft snapshot and any residual temp file.
 */
export function discardDraftSnapshot(draftId: string, customBaseDir?: string): boolean {
  const draftsDir = getDraftsDirectory(customBaseDir);
  const finalPath = join(draftsDir, `snapshot_${draftId}.json`);
  const tmpPath = join(draftsDir, `snapshot_${draftId}.json.tmp`);

  let removed = false;
  if (existsSync(finalPath)) {
    unlinkSync(finalPath);
    removed = true;
  }
  if (existsSync(tmpPath)) {
    unlinkSync(tmpPath);
  }
  return removed;
}

/**
 * Scans the crash-safe drafts directory and returns all recoverable drafts.
 * Differentiates between new unsaved invoices and unsaved edits made to existing invoices before an abrupt exit.
 */
export function listRecoverableDrafts(
  db: Database.Database | null,
  customBaseDir?: string
): RecoverableDraft[] {
  const draftsDir = getDraftsDirectory(customBaseDir);
  const files = readdirSync(draftsDir);
  const recoverable: RecoverableDraft[] = [];

  for (const file of files) {
    if (!file.startsWith('snapshot_') || !file.endsWith('.json')) {
      continue;
    }

    const filePath = join(draftsDir, file);
    try {
      const content = readFileSync(filePath, 'utf8');
      const envelope = JSON.parse(content) as StoredSnapshotEnvelope;

      // Integrity verification
      const expectedChecksum = computeChecksum(JSON.stringify(envelope.data));
      if (envelope.checksum && envelope.checksum !== expectedChecksum) {
        // Corrupted file: rename to .corrupted to preserve for debugging without blocking startup
        renameSync(filePath, `${filePath}.corrupted`);
        continue;
      }

      if (!envelope.invoiceId) {
        // Draft for a new invoice that was never persisted to SQLite
        recoverable.push({
          draftId: envelope.draftId,
          invoiceId: null,
          savedAt: envelope.savedAt,
          lastModified: envelope.lastModified,
          data: envelope.data,
          reason: 'unsaved_new_invoice'
        });
      } else if (db && db.open) {
        // Check if invoice exists in DB and whether the snapshot has newer uncommitted edits
        const row = db
          .prepare('SELECT updated_at FROM invoices WHERE id = ?')
          .get(envelope.invoiceId) as { updated_at: string } | undefined;

        if (!row) {
          recoverable.push({
            draftId: envelope.draftId,
            invoiceId: envelope.invoiceId,
            savedAt: envelope.savedAt,
            lastModified: envelope.lastModified,
            data: envelope.data,
            reason: 'unsaved_new_invoice'
          });
        } else {
          const dbUpdatedTime = new Date(row.updated_at).getTime();
          const snapshotModifiedTime = new Date(envelope.lastModified).getTime();

          // If snapshot was modified after the last DB commit, we have unsaved work
          if (snapshotModifiedTime > dbUpdatedTime) {
            recoverable.push({
              draftId: envelope.draftId,
              invoiceId: envelope.invoiceId,
              savedAt: envelope.savedAt,
              lastModified: envelope.lastModified,
              data: envelope.data,
              reason: 'unsaved_edits_after_crash'
            });
          } else {
            // Snapshot is obsolete; clean it up automatically
            try {
              unlinkSync(filePath);
            } catch {
              // Ignored
            }
          }
        }
      }
    } catch {
      // Malformed or truncated JSON from a sudden power failure mid-file flush
      try {
        renameSync(filePath, `${filePath}.corrupted`);
      } catch {
        // Ignored
      }
    }
  }

  // Sort newest first
  return recoverable.sort(
    (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

/**
 * Removes all snapshot files in the directory.
 */
export function clearAllSnapshots(customBaseDir?: string): void {
  const draftsDir = getDraftsDirectory(customBaseDir);
  const files = readdirSync(draftsDir);
  for (const file of files) {
    if (file.startsWith('snapshot_')) {
      try {
        unlinkSync(join(draftsDir, file));
      } catch {
        // Ignored
      }
    }
  }
}

