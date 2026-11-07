// path: src/main/services/updateService.ts
import { app } from 'electron';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import { UpdateProgress, UpdateStatusResponse } from '@shared/types';
import { createOnlineBackup } from '../db/backup';
import { checkNetworkStatus } from './networkService';

export interface ExtendedUpdateInfo extends ElectronUpdateInfo {
  stagingPercentage?: number;
}

/**
 * Parses and compares two Semantic Versioning strings (e.g., '1.2.3' vs '1.2.4').
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if v1 == v2.
 */
export function compareSemVer(v1: string, v2: string): -1 | 0 | 1 {
  const cleanV1 = v1.replace(/^v/, '').trim();
  const cleanV2 = v2.replace(/^v/, '').trim();

  const [parts1, pre1 = ''] = cleanV1.split('-');
  const [parts2, pre2 = ''] = cleanV2.split('-');

  const nums1 = parts1.split('.').map(n => parseInt(n, 10) || 0);
  const nums2 = parts2.split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(nums1.length, nums2.length); i++) {
    const num1 = nums1[i] ?? 0;
    const num2 = nums2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  // Handle prereleases (e.g. 1.0.0-beta < 1.0.0)
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    if (pre1 > pre2) return 1;
    if (pre1 < pre2) return -1;
  }

  return 0;
}

/**
 * Deterministically computes whether a specific machine is included in a staged rollout percentile.
 * Uses a uniform hash modulo 100 so the user consistently receives or waits for an update.
 */
export function isEligibleForStagedRollout(
  stagingPercentage: number,
  machineIdentifier: string
): boolean {
  if (stagingPercentage >= 100) return true;
  if (stagingPercentage <= 0) return false;

  const hash = createHash('sha256').update(machineIdentifier, 'utf8').digest('hex');
  // First 8 hex characters as 32-bit unsigned integer modulo 100
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;

  return bucket < stagingPercentage;
}

/**
 * Gets or initializes a persistent anonymous machine identifier for rollout sampling.
 */
export function getOrCreateMachineId(customBaseDir?: string): string {
  try {
    const baseDir = customBaseDir || (app ? app.getPath('userData') : process.cwd());
    const idPath = join(baseDir, '.machine_guid');

    if (existsSync(idPath)) {
      const existing = readFileSync(idPath, 'utf8').trim();
      if (existing) return existing;
    }

    const generated = randomUUID();
    writeFileSync(idPath, generated, 'utf8');
    return generated;
  } catch {
    return 'fallback-machine-id-anonymous';
  }
}

class UpdateService {
  private status: UpdateStatusResponse = {
    state: 'idle',
    currentVersion: app ? app.getVersion() : '0.1.0',
    availableVersion: null,
    progress: null,
    releaseNotes: null,
    releaseDate: null,
    error: null,
    isStagedRollout: false,
    stagingPercentage: null
  };

  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Never auto-download on metered or unreliable mobile internet
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.status.state = 'checking';
      this.status.error = null;
    });

    autoUpdater.on('update-available', (info: ExtendedUpdateInfo) => {
      const currentVer = app ? app.getVersion() : '0.1.0';
      const versionComparison = compareSemVer(info.version, currentVer);

      // Block unintended downgrades unless rollback is explicitly verified
      if (versionComparison <= 0) {
        console.warn(
          `[AutoUpdater] Ignoring update ${info.version} <= current version ${currentVer}.`
        );
        this.status.state = 'not-available';
        return;
      }

      // Staged rollout percentile check
      const stagingPercent = info.stagingPercentage;
      if (typeof stagingPercent === 'number' && stagingPercent < 100) {
        const machineId = getOrCreateMachineId();
        const isEligible = isEligibleForStagedRollout(stagingPercent, machineId);

        if (!isEligible) {
          console.info(
            `[AutoUpdater] Update ${info.version} is at ${stagingPercent}% rollout; machine not selected.`
          );
          this.status.state = 'not-available';
          this.status.isStagedRollout = true;
          this.status.stagingPercentage = stagingPercent;
          return;
        }
      }

      this.status.state = 'available';
      this.status.availableVersion = info.version;
      this.status.releaseDate = info.releaseDate;
      this.status.releaseNotes = typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes.map(n => n?.note || '').join('\n')
          : null;
      this.status.stagingPercentage = info.stagingPercentage ?? null;
      this.status.isStagedRollout = typeof info.stagingPercentage === 'number';
    });

    autoUpdater.on('update-not-available', () => {
      this.status.state = 'not-available';
      this.status.error = null;
    });

    autoUpdater.on('error', (err: Error) => {
      this.status.state = 'error';
      this.status.error = err.message || 'Auto-update error occurred.';
      console.warn('[AutoUpdater Error]:', this.status.error);
    });

    autoUpdater.on('download-progress', (progressObj: UpdateProgress) => {
      this.status.state = 'downloading';
      this.status.progress = {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: Math.round(progressObj.percent),
        total: progressObj.total,
        transferred: progressObj.transferred
      };
    });

    autoUpdater.on('update-downloaded', (info: ExtendedUpdateInfo) => {
      this.status.state = 'downloaded';
      this.status.availableVersion = info.version;
    });
  }

  public async checkForUpdates(forceCheck = false): Promise<UpdateStatusResponse> {
    this.initialize();

    // Respect offline-first rule: don't error out if disconnected
    const network = await checkNetworkStatus();
    if (!network.isOnline && !forceCheck) {
      this.status.state = 'idle';
      this.status.error = 'Offline: Auto-update check skipped while offline.';
      return this.getStatus();
    }

    try {
      this.status.state = 'checking';
      this.status.error = null;
      await autoUpdater.checkForUpdates();
    } catch (err: unknown) {
      this.status.state = 'error';
      this.status.error = err instanceof Error ? err.message : String(err);
    }

    return this.getStatus();
  }

  public async startDownload(): Promise<UpdateStatusResponse> {
    if (this.status.state !== 'available') {
      return this.getStatus();
    }

    try {
      this.status.state = 'downloading';
      await autoUpdater.downloadUpdate();
    } catch (err: unknown) {
      this.status.state = 'error';
      this.status.error = err instanceof Error ? err.message : String(err);
    }

    return this.getStatus();
  }

  /**
   * Prepares and executes update installation with a mandatory pre-update safety backup.
   * Guarantees zero data loss before Electron restarts or applies SQLite migrations.
   */
  public async quitAndInstall(db: Database.Database | null): Promise<boolean> {
    if (this.status.state !== 'downloaded') {
      return false;
    }

    // MANDATORY STEP: Create pre-update backup of database before quit
    if (db && db.open) {
      try {
        console.info('[AutoUpdater] Creating mandatory pre-update safety backup...');
        await createOnlineBackup(db, 'pre-update');
        console.info('[AutoUpdater] Pre-update backup verified.');
      } catch (err) {
        console.error('[AutoUpdater] Pre-update safety backup failed:', err);
        // Do not abort install if db is locked, but log critical warning
      }
    }

    autoUpdater.quitAndInstall(false, true);
    return true;
  }

  public getStatus(): UpdateStatusResponse {
    return {
      ...this.status,
      currentVersion: app ? app.getVersion() : '0.1.0'
    };
  }
}

export const updateService = new UpdateService();

