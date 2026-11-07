# Security Policy

**Invoice Studio** handles sensitive client financial ledgers, tax records, and contact details. We prioritize security, confidentiality, and data integrity above all else.

---

## 🛡️ Security Architecture & Defenses

Invoice Studio implements defense-in-depth across the entire application stack:

1. **Process Isolation & Sandboxing**:
   - The React renderer runs in a fully sandboxed process (`sandbox: true`, `contextIsolation: true`).
   - `nodeIntegration: false` is strictly enforced.
   - Raw Node.js APIs and Electron's `ipcRenderer` are never exposed to the DOM window context.
2. **Preload Boundary & ContextBridge**:
   - Only narrow, strictly-typed function signatures are exposed via `window.api`.
   - IPC channels use private symbol mapping.
3. **IPC Sender Frame Verification**:
   - Main process IPC handlers verify `event.senderFrame` origin on every call and reject nested iframes, popups, or untrusted protocol origins.
4. **Zod Runtime Schema Validation**:
   - Every input payload passed across IPC boundaries is validated using strict Zod schemas before any database operation or system call is made.
5. **Content Security Policy (CSP)**:
   - Restrictive CSP rules prevent `eval()`, inline scripts, and unapproved external resource loading:
     `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
6. **Electron Fuses**:
   - Hardened with Electron fuses to disable `ELECTRON_RUN_AS_NODE`, enforce ASAR integrity, and enable cookie encryption.

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability in Invoice Studio, please do **NOT** open a public issue.

Please report vulnerabilities privately via email:

📧 **crnjihia@gmail.com** / **chris@invoicestudio.local**

### What to Include:
- A detailed description of the vulnerability.
- Clear step-by-step reproduction instructions or a minimal proof of concept (PoC).
- The operating system and version of Invoice Studio tested.
- Your assessment of potential impact or exploitability.

### Our Commitment:
- We will acknowledge receipt of your security vulnerability report within **48 hours**.
- We will provide regular updates regarding our investigation and remediation timeline.
- We will notify you before any public release or security advisory is issued.
