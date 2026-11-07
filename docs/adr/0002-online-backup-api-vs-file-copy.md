<!-- path: docs/adr/0002-online-backup-api-vs-file-copy.md -->
# ADR 0002: Disaster Recovery — SQLite Online Backup API vs Raw File Copy

## Status
Accepted

## Context
In SQLite WAL (`Write-Ahead Logging`) mode, the database state is divided across three separate files on disk:
1. `app.sqlite` (Main database file)
2. `app.sqlite-wal` (Write-ahead log containing uncheckpointed transactions)
3. `app.sqlite-shm` (Shared-memory index for wal file)

Making a raw operating system file copy (`fs.copyFileSync`) while the database is actively opened causes severe concurrency hazards:
- If a write occurs during copying, the resulting copy contains torn pages or out-of-sync WAL references, rendering the backup file corrupted (`SQLITE_CORRUPT`).
- Windows file locking may lock `app.sqlite` or fail with `EBUSY` when attempted during active transactions.

## Decision
We implemented all backups using SQLite's native **Online Backup API** (`sqlite3_backup_*`), surfaced through `better-sqlite3`'s `db.backup(destination)` method.

## Justification
1. **Guaranteed Transactional Consistency**: The Online Backup API acquires a read lock on source pages and copies them incrementally to a brand new destination database file. Committed WAL changes are integrated automatically into the destination.
2. **Zero Concurrency Locks**: Readers and writers continue uninterrupted in the main application without blocking or pausing background jobs.
3. **Mandatory Verification**: Every generated backup file is immediately opened with `readonly: true` to execute `PRAGMA integrity_check`. If any verification check fails, the candidate backup is removed instantly and flagged before it can be considered valid.
4. **Automated Pre-Action Snapshots**:
   - Before applying SQLite DDL migrations (`pre-migration`).
   - Before restoring an older backup (`pre-restore`).
   - Before executing an application auto-update (`pre-update`).

## Consequences
- Requires the database connection to remain open when creating backups.
- Backups are written as standard, single-file SQLite databases (`backup-*.sqlite`) ready for instant opening, verification, or manual inspection in any SQLite GUI.

