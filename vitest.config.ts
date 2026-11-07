// path: vitest.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    include: ['src/tests/**/*.test.ts'],
    exclude: ['src/tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src')
    }
  }
});
