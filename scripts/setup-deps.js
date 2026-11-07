// path: scripts/setup-deps.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const childProcess = require('child_process');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', reject);
  });
}

async function ensureDeps() {
  const electronPkgPath = path.resolve(__dirname, '../node_modules/electron/package.json');
  if (!fs.existsSync(electronPkgPath)) {
    console.log('[setup-deps] Electron not installed yet. Skipping.');
    return;
  }

  const betterSqliteBinary = path.resolve(
    __dirname,
    '../node_modules/better-sqlite3/build/Release/better_sqlite3.node'
  );

  if (fs.existsSync(betterSqliteBinary)) {
    console.log('[setup-deps] better-sqlite3 native binary is already present.');
    return;
  }

  console.log('[setup-deps] Ensuring better-sqlite3 native binary for Electron ABI 125...');
  const targetDir = path.resolve(__dirname, '../node_modules/better-sqlite3/build/Release');
  fs.mkdirSync(targetDir, { recursive: true });

  const tempTar = path.resolve(__dirname, '../better-sqlite3.tar.gz');
  const downloadUrl =
    'https://github.com/WiseLibs/better-sqlite3/releases/download/v11.10.0/better-sqlite3-v11.10.0-electron-v125-win32-x64.tar.gz';

  try {
    await download(downloadUrl, tempTar);
    childProcess.execSync(
      `tar -xzf "${tempTar}" -C "${path.resolve(__dirname, '../node_modules/better-sqlite3')}"`
    );
    if (fs.existsSync(tempTar)) {
      fs.unlinkSync(tempTar);
    }
    console.log('[setup-deps] better-sqlite3 native binary installed successfully.');
  } catch (err) {
    console.warn('[setup-deps] Warning during binary setup:', err.message);
  }
}

ensureDeps();
