<!-- path: docs/data-safety.md -->

# Data Safety & Backup Architecture in Invoice Studio

Invoice Studio is engineered for Kenyan freelancers and SMEs who operate in areas with fluctuating power and unreliable internet connectivity. The primary operational directive is: **Never Lose Data**.

## 1. Storage Architecture

### SQLite in WAL (Write-Ahead Logging) Mode

- **Concurrency & Non-Blocking Reads**: Read queries never block writes, and write queries never block reads.
- **Synchronous Write Guarantees**: `PRAGMA synchronous = NORMAL` provides full integrity across unexpected application terminations and OS crashes without the performance penalty of `FULL`.
- **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON` ensures relational integrity between clients, invoices, line items, and payments.

## 2. Automated Backups

### Native Online Backup API vs. Raw File Copy

- **Why Raw File Copy Fails**: In WAL mode, active transactions reside in the shared memory file (`-shm`) and write-ahead log (`-wal`). Copying the primary `.sqlite` file using standard filesystem utilities produces an inconsistent or torn database copy.
- **The SQLite Online Backup API**: Invoice Studio uses `better-sqlite3`'s native `.backup()` method (`sqlite3_backup_*` C API under the hood), taking a consistent point-in-time snapshot locklessly while the user continues working.

### Backup Rotation Policy

Backups are organized by frequency to conserve disk space while preserving historical recovery points:

- **Daily Retention**: Keeps the most recent **7 daily backups**.
- **Weekly Retention**: Keeps the most recent **4 weekly backups**.
- **Rotation Engine**: Automatically prunes older backups after each successful snapshot run.

### Backup Verification Step

Immediately after creating any backup file, Invoice Studio opens the newly generated snapshot in a readonly SQLite connection and executes:

```sql
PRAGMA integrity_check;
```

If the verification does not return `ok`, the file is immediately discarded and an alert is logged.

## 3. Verified One-Click Restore & Disaster Recovery

### Pre-Restore Safety Snapshot

Before any restore operation touches the active database:

1. The backup file selected for restore is verified for structural integrity.
2. An automatic safety snapshot of the **current active database** (`backup-pre-restore-*.sqlite`) is created.
3. The active database connection is safely closed, releasing locks.
4. Any lingering `-wal` and `-shm` files are removed.
5. The restored snapshot replaces the active database file.
6. The database is re-initialized and re-verified.

### Corrupted Database Recovery

If `PRAGMA integrity_check` fails on application startup:

1. The user is prompted with actionable recovery options.
2. Automatic restoration from the latest verified snapshot can be performed with one click.
3. For deep forensics, the native SQLite `.recover` CLI procedure is documented:
   ```bash
   sqlite3 corrupted.sqlite ".recover" | sqlite3 recovered.sqlite
   ```
