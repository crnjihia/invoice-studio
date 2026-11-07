<!-- path: .github/pull_request_template.md -->
## Description

<!-- Describe the changes made in this PR and why they are necessary. -->

## Related Issues

<!-- Link any associated issues: Fixes #123 -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement / Refactoring

## Pre-Submission Verification Checklist

Please verify that all the following checks pass before submitting:

- [ ] `npm run typecheck` passes with zero TypeScript errors across Node and Web targets.
- [ ] `npm run lint` passes with zero ESLint errors or warnings.
- [ ] `npm test` passes all unit and integration test suites.
- [ ] Monetary arithmetic uses integer minor units (cents) — no raw floats for currency.
- [ ] Any new IPC channels are registered in `IPC_CHANNELS` and validated with strict Zod schemas.
- [ ] Offline functionality is preserved; no hard cloud or external network dependencies are introduced.
- [ ] Documentation (README, ADRs, comments) updated if necessary.

