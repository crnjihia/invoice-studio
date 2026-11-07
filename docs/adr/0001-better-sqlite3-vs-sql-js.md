<!-- path: docs/adr/0001-better-sqlite3-vs-sql-js.md -->
# ADR 0001: Storage Engine — better-sqlite3 vs sql.js (Wasm)

## Status
Accepted

## Context
Invoice Studio is designed for freelancers and small businesses who work with unstable power and intermittent connectivity (e.g., in Nairobi, Kenya). The primary design constraint is **zero data loss**: if the desktop application is force-killed or the operating system loses power mid-edit, committed transactions must remain fully intact without corruption.

We evaluated two primary SQLite integration options for Electron:
1. **`sql.js`** (WebAssembly SQLite build running in memory / worker).
2. **`better-sqlite3`** (Native C++ SQLite3 binding executing exclusively in the Electron Main process).

## Decision
We chose **`better-sqlite3`** executing strictly in the Node.js Main process.

## Justification & Comparison

| Criteria | `better-sqlite3` (Selected) | `sql.js` (Rejected) |
| :--- | :--- | :--- |
| **Durability & Crash Safety** | **ACID guarantees with WAL mode**. Writes flush to the OS filesystem synchronously with transactional integrity. | **In-memory state**. Requires periodic serialization of the full binary buffer to disk. Power cuts risk discarding all changes since the last export. |
| **Write-Ahead Logging (WAL)** | Fully supported (`PRAGMA journal_mode = WAL`). Concurrent readers never block writers and writers never block readers. | Not supported in browser/Wasm virtual filesystem. |
| **Large Dataset Scale (10k+ rows)** | Sub-millisecond index queries (**2–8ms for 10k rows**). Minimal memory footprint. | High V8 heap memory overhead. Performance degrades exponentially on large datasets. |
| **Online Backup API** | Direct C++ access to `sqlite3_backup_*` via `db.backup(destination)`. Consistent snapshot without closing connection. | Not available. Requires manual byte copying of in-memory ArrayBuffer. |
| **Process Isolation & Security** | Executed strictly in the privileged Main process; never accessible from DOM windows. | Often run in renderer or worker, exposing SQL engine directly to frontend execution context. |

## Consequences
- **Build Step**: Requires native compilation against Electron's Node ABI via `@electron/rebuild`. A custom runner script (`scripts/run-tests.js`) sets `ELECTRON_RUN_AS_NODE: '1'` so Vitest and Electron share identical ABIs.
- **IPC Mediation**: All database queries must be requested via strongly typed, schema-validated IPC channels. This enforces architectural separation of concerns.

