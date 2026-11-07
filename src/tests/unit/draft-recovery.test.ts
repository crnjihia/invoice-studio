// path: src/tests/unit/draft-recovery.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runMigrations } from '../../main/db/migrator';
import {
  clearAllSnapshots,
  discardDraftSnapshot,
  getDraftsDirectory,
  listRecoverableDrafts,
  saveDraftSnapshot
} from '../../main/services/draftRecoveryService';
import { SaveDraftSnapshotInput } from '@shared/types';

describe('Crash-Safe Draft Storage & Recovery Unit Tests', () => {
  const TEST_DIR = join(process.cwd(), 'temp-test-draft-recovery');
  let db: Database.Database;

  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    await runMigrations(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    if (existsSync(TEST_DIR)) {
      try {
        rmSync(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  });

  it('saves active draft snapshot atomically with integrity checksum', () => {
    const draftId = 'draft-test-101';
    const snapshot: SaveDraftSnapshotInput = {
      draftId,
      invoiceId: null,
      data: {
        invoiceNumber: 'INV-2026-0042',
        clientId: 'client-1',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
        currency: 'KES',
        lineItems: [
          {
            description: 'Fiber Internet Backbone Consultation',
            quantity: 2,
            unitPriceMinor: 4500000,
            taxRatePercent: 16,
            discountPercent: 0
          }
        ],
        notes: 'Payable via Safaricom Paybill 522522'
      },
      lastModified: '2026-03-01T10:00:00.000Z'
    };

    const result = saveDraftSnapshot(snapshot, TEST_DIR);
    expect(result.success).toBe(true);
    expect(existsSync(result.filePath)).toBe(true);

    const recoverable = listRecoverableDrafts(db, TEST_DIR);
    expect(recoverable.length).toBe(1);
    expect(recoverable[0].draftId).toBe(draftId);
    expect(recoverable[0].reason).toBe('unsaved_new_invoice');
    expect(recoverable[0].data.invoiceNumber).toBe('INV-2026-0042');
    expect(recoverable[0].data.lineItems[0].unitPriceMinor).toBe(4500000);
  });

  it('detects unsaved edits to an existing invoice after a simulated sudden crash', () => {
    const invoiceId = 'inv-saved-in-db-001';
    const originalDate = '2026-02-01T08:00:00.000Z';

    // Insert an existing client & invoice into database
    db.prepare(`
      INSERT INTO clients (id, name, created_at, updated_at)
      VALUES ('client-1', 'Nairobi FinTech Ltd', '${originalDate}', '${originalDate}')
    `).run();

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date, currency,
        subtotal_minor, discount_total_minor, tax_total_minor, total_minor,
        amount_paid_minor, created_at, updated_at
      ) VALUES (
        '${invoiceId}', 'INV-2026-0001', 'client-1', 'draft', '2026-02-01', '2026-02-15', 'KES',
        1000000, 0, 160000, 1160000, 0, '${originalDate}', '${originalDate}'
      )
    `).run();

    // 1. Snapshot has timestamp NEWER than the DB record (user was editing when power failed)
    const crashTime = '2026-02-01T09:30:00.000Z';
    saveDraftSnapshot(
      {
        draftId: 'draft-editing-session',
        invoiceId,
        data: {
          invoiceNumber: 'INV-2026-0001',
          currency: 'KES',
          lineItems: [
            {
              description: 'Updated Line Item With High Value',
              quantity: 5,
              unitPriceMinor: 2000000,
              taxRatePercent: 16,
              discountPercent: 0
            }
          ]
        },
        lastModified: crashTime
      },
      TEST_DIR
    );

    const recoverable = listRecoverableDrafts(db, TEST_DIR);
    expect(recoverable.length).toBe(1);
    expect(recoverable[0].reason).toBe('unsaved_edits_after_crash');
    expect(recoverable[0].invoiceId).toBe(invoiceId);
    expect(recoverable[0].data.lineItems[0].quantity).toBe(5);

    // 2. If the DB is subsequently updated to a time newer than the snapshot (e.g. was saved),
    // then the snapshot is automatically treated as obsolete and pruned.
    const committedTime = '2026-02-01T10:00:00.000Z';
    db.prepare('UPDATE invoices SET updated_at = ? WHERE id = ?').run(committedTime, invoiceId);

    const postCommitRecoverable = listRecoverableDrafts(db, TEST_DIR);
    expect(postCommitRecoverable.length).toBe(0);
  });

  it('handles corrupted and truncated JSON snapshot files gracefully without throwing', () => {
    const draftsDir = getDraftsDirectory(TEST_DIR);

    // Write a corrupted partial JSON file simulating abrupt power cut mid-write
    writeFileSync(join(draftsDir, 'snapshot_corrupted_1.json'), '{"draftId": "corrupt", "data": {', 'utf8');

    // Write a file with invalid checksum (tampered content)
    writeFileSync(
      join(draftsDir, 'snapshot_tampered.json'),
      JSON.stringify({
        draftId: 'tampered',
        invoiceId: null,
        savedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        data: { currency: 'KES', lineItems: [] },
        checksum: 'invalid_sha256_hash_here'
      }),
      'utf8'
    );

    // listRecoverableDrafts should not throw and should isolate corrupted files
    const recoverable = listRecoverableDrafts(db, TEST_DIR);
    expect(recoverable.length).toBe(0);

    // Verify .corrupted markers exist
    expect(existsSync(join(draftsDir, 'snapshot_corrupted_1.json.corrupted'))).toBe(true);
    expect(existsSync(join(draftsDir, 'snapshot_tampered.json.corrupted'))).toBe(true);
  });

  it('discards snapshots cleanly when dismissed or saved', () => {
    const draftId = 'draft-to-discard';
    saveDraftSnapshot(
      {
        draftId,
        invoiceId: null,
        data: { currency: 'KES', lineItems: [] },
        lastModified: new Date().toISOString()
      },
      TEST_DIR
    );

    expect(listRecoverableDrafts(db, TEST_DIR).length).toBe(1);

    const discarded = discardDraftSnapshot(draftId, TEST_DIR);
    expect(discarded).toBe(true);
    expect(listRecoverableDrafts(db, TEST_DIR).length).toBe(0);

    // Clear all helper
    saveDraftSnapshot(
      {
        draftId: 'draft-bulk-1',
        invoiceId: null,
        data: { currency: 'KES', lineItems: [] },
        lastModified: new Date().toISOString()
      },
      TEST_DIR
    );
    clearAllSnapshots(TEST_DIR);
    expect(listRecoverableDrafts(db, TEST_DIR).length).toBe(0);
  });
});
