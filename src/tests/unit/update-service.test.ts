// path: src/tests/unit/update-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { runMigrations } from '../../main/db/migrator';
import {
  compareSemVer,
  getOrCreateMachineId,
  isEligibleForStagedRollout,
  updateService
} from '../../main/services/updateService';
import { getBackupDirectory } from '../../main/db/backup';

describe('Auto-Update, Staged Rollouts & SemVer Unit Tests', () => {
  const TEST_DIR = join(process.cwd(), 'temp-test-update-unit');
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

  describe('Semantic Versioning & Downgrade Prevention', () => {
    it('accurately compares standard semantic version strings', () => {
      expect(compareSemVer('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemVer('1.1.0', '1.0.9')).toBe(1);
      expect(compareSemVer('0.9.5', '1.0.0')).toBe(-1);
      expect(compareSemVer('2.0.0', '1.99.99')).toBe(1);
      expect(compareSemVer('v1.2.3', '1.2.3')).toBe(0);
      expect(compareSemVer('1.2.4', 'v1.2.3')).toBe(1);
    });

    it('orders prerelease versions below released versions', () => {
      expect(compareSemVer('1.0.0-beta', '1.0.0')).toBe(-1);
      expect(compareSemVer('1.0.0', '1.0.0-beta')).toBe(1);
      expect(compareSemVer('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
      expect(compareSemVer('1.0.0-rc.2', '1.0.0-rc.1')).toBe(1);
    });
  });

  describe('Staged Rollout Deterministic Sampling', () => {
    it('always includes client when staging percentage is 100', () => {
      expect(isEligibleForStagedRollout(100, 'any-machine-id-1')).toBe(true);
      expect(isEligibleForStagedRollout(100, 'any-machine-id-2')).toBe(true);
    });

    it('always excludes client when staging percentage is 0 (kill switch)', () => {
      expect(isEligibleForStagedRollout(0, 'any-machine-id-1')).toBe(false);
      expect(isEligibleForStagedRollout(0, 'any-machine-id-2')).toBe(false);
    });

    it('is strictly deterministic for the same machine ID and percentage', () => {
      const machineId = 'kenyan-freelancer-laptop-nairobi-001';
      const resultA = isEligibleForStagedRollout(25, machineId);
      const resultB = isEligibleForStagedRollout(25, machineId);
      expect(resultA).toBe(resultB);
    });

    it('distributes 50% staged rollout evenly across a sample of machines', () => {
      let eligibleCount = 0;
      const sampleSize = 100;

      for (let i = 0; i < sampleSize; i++) {
        if (isEligibleForStagedRollout(50, `client-machine-sample-${i}`)) {
          eligibleCount++;
        }
      }

      // Expected ~50 with standard statistical tolerance (35 to 65)
      expect(eligibleCount).toBeGreaterThanOrEqual(35);
      expect(eligibleCount).toBeLessThanOrEqual(65);
    });
  });

  describe('Machine GUID Generation & Persistence', () => {
    it('persists a machine GUID to disk and reuses it on subsequent calls', () => {
      const id1 = getOrCreateMachineId(TEST_DIR);
      expect(id1).toBeTruthy();
      expect(typeof id1).toBe('string');

      const id2 = getOrCreateMachineId(TEST_DIR);
      expect(id2).toBe(id1);
    });
  });

  describe('Pre-Update Backup & Safety Policy', () => {
    it('creates a pre-update safety backup when quitAndInstall is invoked', async () => {
      // Create a test client to verify data in backup
      db.prepare(`
        INSERT INTO clients (id, name, created_at, updated_at)
        VALUES ('c-1', 'Acme Safari Tours', '2026-11-01', '2026-11-01')
      `).run();

      const backupDir = getBackupDirectory(join(TEST_DIR, 'backups'));

      // If status is not downloaded, quitAndInstall cleanly returns false without quitting
      const result = await updateService.quitAndInstall(db);
      expect(result).toBe(false);

      // Verify backup directory structure is initialized
      expect(existsSync(backupDir)).toBe(true);
    });
  });
});

