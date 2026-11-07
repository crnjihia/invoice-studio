// path: playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: /.*\.test\.ts/,
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1, // Run sequentially to avoid single-instance lock contention
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});

