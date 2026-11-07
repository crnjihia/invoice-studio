// path: scripts/clear-db.js
const { spawnSync } = require('child_process');
const electronPath = require('electron');

const viteNodePath = require.resolve('vite-node/vite-node.mjs');
const targetScript = require.resolve('./run-clear-db.ts');

const result = spawnSync(electronPath, [viteNodePath, targetScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  }
});

process.exit(result.status ?? 0);

