// path: scripts/dev.js
const { spawn } = require('child_process');

const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['electron-vite', 'dev'], {
  stdio: 'inherit',
  env: cleanEnv
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

