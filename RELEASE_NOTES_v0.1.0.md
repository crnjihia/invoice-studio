# Invoice Studio v0.1.0 — Initial Desktop Release

**Invoice Studio** is a hardened, offline-first desktop invoicing and financial management application built with Electron 31, React 18, TypeScript, and SQLite (WAL mode). Tailored specifically for Kenyan freelancers, consultants, and SMEs in Nairobi, it operates with zero reliance on cloud connections, eliminates subscription lock-in, and guarantees zero data loss.

---

## 🚀 Key Highlights & Capabilities

### 🇰🇪 Kenyan SME & Freelance Specialization
- **KES Integer Arithmetic**: All monetary calculations are performed in integer minor units (cents) to completely eliminate floating-point rounding errors.
- **Kenyan Tax & Compliance Ready**: Default 16% standard VAT calculations with editable line-item tax overrides and strict KRA PIN validation (`P...`).
- **Safaricom M-Pesa Integration**: Native support for Kenyan settlement rails including M-Pesa Paybill, Till (Buy Goods) numbers, and customer mobile numbers with transaction receipt tracking (`QBK...`, `RTGS...`).
- **Transparent Disclaimer**: Explicit disclaimer regarding KRA eTIMS compliance with no misleading automation claims.

### 🛡️ Mission-Critical Offline & Zero Data Loss Architecture
- **Embedded SQLite in WAL Mode**: Native `better-sqlite3` embedded database running in Write-Ahead Logging mode with `PRAGMA synchronous = NORMAL` and foreign key enforcement.
- **Automated Online Backups**: Non-blocking SQLite online backups with automatic retention rotation (7 daily + 4 weekly snapshots) and startup `PRAGMA integrity_check`.
- **Pre-Restore Immutable Snapshots**: Restoring any backup creates a safety snapshot of the active database first, ensuring uncommitted work cannot be accidentally overwritten.
- **Crash-Resilient Draft Autosave**: Active invoice drafts are continuously snapshotted to disk with SHA-256 integrity checksums. If the machine crashes or loses power, an interactive draft recovery banner restores your edits upon relaunch.

### 📄 Invoicing, Clients & PDF Engine
- **Transactional Sequential Numbering**: Gap-free invoice number generation (`INV-YYYY-XXXX`) managed in transactional SQLite tables with calendar year resets.
- **3 Professional PDF Templates**:
  - **Classic**: Traditional corporate design with detailed contact headers, notes, and payment instructions.
  - **Modern**: Contemporary design featuring custom accent colors and bold financial badge highlights.
  - **Minimal**: Swiss typographical layout with clean horizontal divider rules.
- **Instant Export & Emailing**: Direct one-click PDF generation, system file reveal, and `mailto:` launcher with prefilled invoice summaries.
- **RFC 4180 CSV Financial Exports**: One-click accounting data export compatible with spreadsheet editors and tax accounting workflows.

### 🖥️ Native Desktop Experience
- **Responsive Dual Theme**: Elegant dark mode (Slate 950) and crisp light mode (Slate 50) with seamless switching.
- **Global Keyboard Accelerators**: Native shortcuts (`Ctrl+N` / `Cmd+N` for new invoice, `Ctrl+B` for backups).
- **Hardened Security Sandbox**: Context isolation enabled, `nodeIntegration: false`, sandboxed renderer, and strict Zod runtime schema validation on every IPC channel.

---

## 📦 Release Assets & Installers

| File | Platform | Architecture | Description |
|---|---|---|---|
| `Invoice-Studio-Setup-0.1.0-x64.exe` | Windows | x64 (64-bit) | Full NSIS Windows Installer with Desktop & Start Menu shortcuts |
| `Invoice-Studio-0.1.0-arm64.dmg` | macOS | arm64 (Apple Silicon) | macOS Disk Image for M1/M2/M3/M4 Macs |
| `Invoice-Studio-0.1.0-x64.dmg` | macOS | x64 (Intel) | macOS Disk Image for Intel Macs |
| `Invoice-Studio-0.1.0-x86_64.AppImage` | Linux | x64 | Portable standalone Linux AppImage executable |
| `Invoice-Studio-0.1.0-amd64.deb` | Linux | x64 | Debian / Ubuntu / Mint package |
| `latest.yml`, `latest-mac.yml`, `latest-linux.yml` | All | N/A | Electron-updater release manifests with SHA-512 hashes |
| `SHA256SUMS.txt` | All | N/A | Cryptographic SHA-256 verification checksums |

---

## 🔐 Checksums & Verification

To verify the integrity of downloaded release assets, compare their SHA-256 hash:

```text
631879c54b18fb05ab159461d5fbb80dc03a8a95e796dbe59ca939eb28cc78f4  Invoice-Studio-Setup-0.1.0-x64.exe
```

### Windows (PowerShell):
```powershell
Get-FileHash -Algorithm SHA256 "Invoice Studio-Setup-0.1.0-x64.exe"
```

### Linux / macOS:
```bash
shasum -a 256 "Invoice Studio-Setup-0.1.0-x64.exe"
```

---

## 🛠️ GitHub Actions Multi-Platform Workflow
Multi-platform installers for Windows (`.exe`), macOS (`.dmg`, `.zip`), and Linux (`.AppImage`, `.deb`) are automated via [.github/workflows/release.yml](file:///.github/workflows/release.yml) upon pushing a git tag:
```bash
git tag v0.1.0
git push origin v0.1.0
```

