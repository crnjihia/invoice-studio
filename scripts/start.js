// path: scripts/start.js
const { spawn } = require('child_process');
const electronPath = require('electron');

const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: cleanEnv
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

