<!-- path: docs/data-safety-guide.md -->
# User Guide: Data Safety, Backups & Disaster Recovery

**Invoice Studio** is engineered from the ground up to **never lose your data**. Whether your laptop battery cuts out mid-invoice in Nairobi or your operating system encounters an unexpected shutdown, your financial records, client history, and expense receipts remain safe.

This guide explains how Invoice Studio's data protection features work and how to configure them for maximum peace of mind.

---

## 1. How Your Data Is Stored

- **Local-First SQLite Storage**: All business records (clients, invoices, line items, payments, expenses) are stored in an ACID-compliant SQLite database directly on your computer's local drive:
  - **Windows**: `%APPDATA%\invoice-studio\data\app.sqlite`
  - **macOS**: `~/Library/Application Support/invoice-studio/data/app.sqlite`
  - **Linux**: `~/.config/invoice-studio/data/app.sqlite`
- **Write-Ahead Logging (WAL)**: The database operates in SQLite WAL mode with synchronous OS flushes. Every transaction is committed immediately to durable disk storage.
- **Integer Precision Accounting**: All currency amounts are stored in minor units (integer Kenyan cents: KES 1,500.50 is stored as `150050`). This prevents floating-point rounding errors common in ordinary spreadsheet applications.

---

## 2. Automatic Online Backups

Invoice Studio includes a built-in automated backup system powered by SQLite's native Online Backup API. Backups are point-in-time snapshots created while the app is running with zero downtime.

### Backup Schedules
1. **On Application Exit**: An automatic backup is created whenever you close Invoice Studio.
2. **Periodic Scheduled Backups**: A background timer runs every 6 hours of active use.
3. **Manual Backup**: Triggered anytime from **Settings $\to$ Backups $\to$ Create Backup Now**.

### Syncing with Cloud Storage (Dropbox / Google Drive / OneDrive)
To safeguard against hard drive failure or stolen laptops:
1. Open **Settings $\to$ Backups**.
2. Click **Select Backup Folder**.
3. Choose a folder inside your synced cloud directory (e.g., `C:\Users\Chris\Dropbox\InvoiceStudioBackups` or `~/Google Drive/My Drive/Backups`).
4. Invoice Studio will automatically write all future backups to that cloud-synced folder!

### Automatic Backup Rotation
To prevent backups from consuming excessive storage, Invoice Studio automatically maintains:
- **7 Daily Backups**: One per day for the last 7 days.
- **4 Weekly Backups**: One per week for the last month.
- Older backups are pruned automatically once newer verified snapshots exist.

---

## 3. One-Click Restore & Disaster Recovery

If you ever need to restore your database from a previous snapshot or migrate to a new machine:

1. Navigate to **Settings $\to$ Backups**.
2. Locate the backup snapshot in the list or click **Browse for Backup File (`.sqlite`)**.
3. Invoice Studio displays a **Restore Preview** showing:
   - Creation date and file size.
   - Database integrity check status.
   - Number of clients and invoices in the snapshot.
   - Date of the most recent invoice in the snapshot.
4. Click **Restore Database**.

> [!IMPORTANT]
> **Pre-Restore Safety Snapshot**: Before overwriting the active database, Invoice Studio automatically generates a safety snapshot (`backup-pre-restore-*.sqlite`). If you accidentally restore the wrong file, you can immediately roll back.

---

## 4. Crash-Safe Unsaved Draft Recovery

If your computer suddenly shuts down while you are actively drafting an invoice:

1. Invoice Studio's atomic draft journal writes snapshots of active draft changes to disk every few seconds using atomic temporary file renaming with SHA-256 checksums.
2. When you relaunch Invoice Studio, the application automatically detects that an uncommitted draft exists from an interrupted session.
3. A prominent banner appears:
   > **"Unsaved Draft Recovered: An unsaved invoice draft from [Timestamp] was detected. Would you like to restore or discard?"**
4. Click **Recover Draft** to resume editing exactly where you left off.

---

## 5. Receipt Storage & SHA-256 Deduplication

Receipts attached to expenses (JPEG, PNG, WebP, or PDF) are stored in your application data directory:
`<userData>/receipts/<sha256-hash>.<ext>`

- **Automatic Deduplication**: If you attach the same receipt image to multiple expense entries, only a single copy is stored on disk, saving storage.
- **Integrity Guarantee**: Receipt files are renamed to their SHA-256 content hashes, preventing filename collisions or overwrites.

