<!-- path: docs/staged-rollouts.md -->
# Auto-Update & Staged Rollouts Policy

This document describes how Invoice Studio releases new desktop updates safely, implements phased Canary rollouts via `stagingPercentage`, handles emergency halts, and guarantees database integrity across software updates.

---

## 1. Release Architecture & GitHub Releases

Invoice Studio uses `electron-updater` configured against GitHub Releases. When an installer is built by GitHub Actions CI, `electron-builder` publishes platform installers alongside YAML release manifests:

| Platform | Installer Format | Metadata Manifest |
| :--- | :--- | :--- |
| **Windows** | NSIS (`.exe`) | `latest.yml` |
| **macOS** | DMG / ZIP | `latest-mac.yml` |
| **Linux** | AppImage / deb | `latest-linux.yml` |

### Explicit User Consent for Downloads
To respect Kenyan mobile data bundles and variable bandwidth in Nairobi, **`autoUpdater.autoDownload = false`**. The app notifies the user when an update is available and only begins downloading once explicitly approved, displaying real-time transferred bytes and progress.

---

## 2. Phased Rollouts via `stagingPercentage`

Staged rollouts mitigate the blast radius of unforeseen regressions by exposing new versions to a deterministic subset of installations before full general availability.

### How `stagingPercentage` Works
In `latest.yml` (and platform counterparts), specify `stagingPercentage`:

```yaml
version: 1.2.0
files:
  - url: InvoiceStudio-Setup-1.2.0.exe
    sha512: <checksum>
    size: 78560240
path: InvoiceStudio-Setup-1.2.0.exe
sha512: <checksum>
releaseDate: '2026-11-15T09:00:00.000Z'
stagingPercentage: 10
```

### Deterministic Machine Hashing
Each installation computes a deterministic machine hash:
$$\text{bucket} = (\text{SHA-256}(\text{machineId})[0..8] \pmod{100})$$

- If $\text{bucket} < \text{stagingPercentage}$, the machine is eligible and the update is offered.
- If $\text{bucket} \ge \text{stagingPercentage}$, the update is suppressed and marked as `isStagedRollout: true`.
- **Result:** The same machine remains in the canary cohort across all increments (10% $\to$ 25% $\to$ 50% $\to$ 100%), ensuring predictable canary telemetry.

### Recommended 7-Day Rollout Schedule

```
Day 1:  10% (Internal + Early Adopter Canary)
Day 3:  25% (Monitor error reports, integrity logs, crash rates)
Day 5:  50% (General freelancer population)
Day 7: 100% (Full General Availability)
```

To advance a release, edit `stagingPercentage` in the release asset YAML directly on GitHub Releases or via automated CI dispatch.

---

## 3. Emergency Halting & Incident Response

If a critical flaw is discovered during a rollout:

1. **Immediate Halt (Soft Kill-Switch)**:
   Update `stagingPercentage: 0` in `latest.yml` on GitHub Releases. Clients checking for updates will immediately report `update-not-available`.
2. **Hard Kill-Switch (Asset Yank)**:
   Delete or unpublish the GitHub Release draft/tag so `electron-updater` fails closed to `not-available` without interrupting user workflows.
3. **Hotfix Dispatch**:
   Bump patch version (`v1.2.1`), run CI, and publish with `stagingPercentage: 100` once verified.

---

## 4. Downgrade & Rollback Policy

### Schema Version Monotonicity
Downgrading desktop software that interacts with an evolving SQLite database is hazardous because older versions lack migrations to interpret newer schema structures.

1. **Downgrade Rejection**:
   Invoice Studio checks version strings using semantic versioning (`compareSemVer`). If an available version is strictly less than the currently running version, the update is rejected to prevent silent schema breakage.
2. **Pre-Update Safety Backup**:
   Before `autoUpdater.quitAndInstall()` restarts the application, Invoice Studio executes a mandatory online SQLite backup:
   $$\text{<userData>}\text{/backups/pre-update/backup-pre-update-YYYY-MM-DDTHH-mm-ss.sqlite}$$
   This backup is verified using `PRAGMA integrity_check` before the installer is allowed to proceed.
3. **Pre-Migration Safety Backup**:
   When the newly installed version boots and `runMigrations()` executes, a secondary pre-migration backup is automatically generated before any SQL `ALTER TABLE` or DDL statement runs.
4. **Disaster Recovery**:
   If an update introduces a schema failure, the user can restore their pre-update snapshot with one click via **Settings $\to$ Backups $\to$ Restore Snapshot**.

