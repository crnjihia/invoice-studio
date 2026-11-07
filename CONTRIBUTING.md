<!-- path: CONTRIBUTING.md -->
# Contributing to Invoice Studio

Thank you for your interest in contributing to **Invoice Studio**! This project is crafted with high standards for security, data integrity, and offline reliability for Kenyan freelancers and SMEs.

---

## 1. Development Principles

1. **Zero Data Loss**: Every data write, migration, and backup must guarantee crash safety. Never compromise transactional ACID guarantees.
2. **Strict Process Isolation**: The renderer process is strictly sandboxed with `nodeIntegration: false`, `contextIsolation: true`, and an active Content Security Policy (CSP). Never expose raw `ipcRenderer`.
3. **Integer Minor Units**: All monetary values are integer cents (`amountMinor`). Floating-point money arithmetic is prohibited.
4. **Honest Scope**: Do not claim statutory tax compliance (such as KRA eTIMS) unless genuine API integration is implemented.

---

## 2. Local Setup & Workflow

```bash
# Clone the repository
git clone https://github.com/crnjis/invoice-studio.git
cd invoice-studio

# Install dependencies (runs prebuild setup for Electron ABI)
npm install

# Start Electron in development mode with HMR
npm run dev
```

---

## 3. Quality Standards & Pre-Commit Verification

Before submitting a Pull Request, ensure that all verification gates pass:

```bash
# 1. Format code with Prettier
npm run format

# 2. Run ESLint with zero errors/warnings
npm run lint

# 3. Verify TypeScript strict typecheck across Node and Web
npm run typecheck

# 4. Run Vitest test suite (unit, integration & scale tests)
npm test

# 5. Run Playwright Electron E2E integration test
npm run test:e2e
```

### Commit Conventions
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(scope): ...`
- `fix(scope): ...`
- `test(scope): ...`
- `docs(scope): ...`
- `refactor(scope): ...`

