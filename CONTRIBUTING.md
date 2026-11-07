# Contributing to Invoice Studio

Thank you for your interest in contributing to **Invoice Studio**! We welcome bug reports, documentation enhancements, design improvements, and feature contributions from the community.

---

## 🏛️ Guiding Architectural Principles

Before contributing code, please keep in mind our core non-negotiable architectural tenets:

1. **100% Offline-First by Default**: The core application must function completely without internet access. Features must never fail or block the UI due to lack of network connectivity.
2. **ACID Storage & Zero Data Loss**: We rely on embedded SQLite with WAL mode (`PRAGMA synchronous = NORMAL`). Every write to critical financial data must be committed safely. Unsaved drafts must be preserved with atomic journals.
3. **Integer Minor-Unit Money**: All financial values are handled as integer cents/minor units (e.g. `100000` = KES `1,000.00`). Floating-point numbers are strictly forbidden for currency storage and calculations.
4. **Hardened Electron Security**: `contextIsolation` and `sandbox` must remain enabled. Raw `ipcRenderer` must never be exposed to the window. Every IPC call must be validated with strict Zod schemas and sender frame origin checks.
5. **Kenyan Market Respect**: Maintain first-class support for KES formatting, 16% VAT, KRA PIN rules, and Safaricom M-Pesa settlement references.

---

## 🛠️ Development Workflow

### 1. Prerequisites
- **Node.js**: v20+ LTS
- **npm**: v10+
- **Git**

### 2. Setup
```bash
# Clone your fork
git clone https://github.com/<your-username>/invoice-studio.git
cd invoice-studio

# Install dependencies (configures native better-sqlite3 for Electron 31)
npm install
```

### 3. Running Locally
```bash
# Start Vite development server and Electron with hot reload
npm run dev

# Or test production build output
npm run build
npm start
```

### 4. Running Tests
All pull requests must pass the complete test suite:
```bash
# Run TypeScript typechecking across Node and Web targets
npm run typecheck

# Run ESLint analysis
npm run lint

# Run all unit and integration test suites
npm test

# Run 10,000 invoices performance benchmark
npm run test:perf
```

---

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new user-facing feature
- `fix:` A bug fix
- `docs:` Documentation updates
- `test:` Adding or updating tests
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `chore:` Maintenance, dependency updates, packaging scripts
- `perf:` Performance optimizations

---

## 🚀 Submitting a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages.
3. Verify that `npm run typecheck`, `npm run lint`, and `npm test` pass with zero errors.
4. Push your branch to GitHub and open a Pull Request using our [PR Template](.github/pull_request_template.md).
