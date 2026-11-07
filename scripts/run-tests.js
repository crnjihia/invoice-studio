// path: scripts/run-tests.js
const { spawnSync } = require('child_process');
const electronPath = require('electron');

const vitestPath = require.resolve('vitest/vitest.mjs');
const args = process.argv.slice(2);

const result = spawnSync(electronPath, [vitestPath, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  }
});

process.exit(result.status ?? 0);
