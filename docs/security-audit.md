<!-- path: docs/security-audit.md -->
# Dependency Audit & Supply Chain Security Policy

This document defines the dependency hygiene, vulnerability management, and CI audit policy for **Invoice Studio**.

---

## 1. Automated Dependency Scanning in CI

Invoice Studio enforces an automated supply-chain security gate in the Continuous Integration pipeline (`.github/workflows/ci.yml`).

Every pull request and push to `main` executes:
```bash
npm audit --audit-level=high
```

### Policy Rules
- **Zero High or Critical CVEs**: Any dependency containing an unpatched vulnerability evaluated at `High` or `Critical` severity automatically fails the CI build and blocks deployment.
- **Strict Version Pinning**: Direct dependencies in `package.json` are pinned to conservative, verified versions without loose range specifiers (`^` or `~`) for critical security and database components.
- **Deterministic Lockfile**: `package-lock.json` must be committed and verified using `npm ci` across all CI runners.

---

## 2. Minimal Dependency Philosophy

To minimize the external attack surface:
1. **No Clever Utility Libraries**: Where simple vanilla TypeScript or standard library primitives suffice (e.g. SemVer parsing, CSV escaping, atomic file renames, SHA-256 checksums), Invoice Studio implements audited internal utilities rather than pulling in external micro-packages.
2. **Hardened Preload Surface**: The renderer process has zero access to Node.js modules or raw IPC channels (`ipcRenderer.send`/`on`). All interactions are mediated through strictly typed, schema-validated contextBridge methods.
3. **Native Module Isolation**: `better-sqlite3` runs strictly in the main process and is never exposed directly to DOM windows.

---

## 3. Vulnerability Response SLA

When an advisory is published for a transitive or direct dependency:

| Severity | CVSS Score | Remediation SLA | Action |
| :--- | :--- | :--- | :--- |
| **Critical** | 9.0 – 10.0 | $\le 24$ hours | Immediate hotfix release (`vX.Y.Z+1`) with 100% rollout |
| **High** | 7.0 – 8.9 | $\le 48$ hours | Patch version release |
| **Moderate** | 4.0 – 6.9 | Next release cycle | Bump version in standard maintenance |
| **Low** | 0.1 – 3.9 | Routine review | Monitored during scheduled dependency maintenance |

---

## 4. Local Audit Verification

To inspect the project locally before submitting code:

```bash
# Run security vulnerability audit
npm audit

# Check for outdated packages
npm outdated
```

