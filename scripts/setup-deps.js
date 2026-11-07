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
          return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
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

  const force = process.argv.includes('--force');

  if (!force && fs.existsSync(betterSqliteBinary)) {
    console.log('[setup-deps] better-sqlite3 native binary is already present.');
    return;
  }

  console.log('[setup-deps] Ensuring better-sqlite3 native binary for Electron ABI 125...');
  const targetDir = path.resolve(__dirname, '../node_modules/better-sqlite3/build/Release');
  fs.mkdirSync(targetDir, { recursive: true });

  const platform = process.platform;
  const arch = process.arch;

  const validPlatforms = ['win32', 'linux', 'darwin'];
  if (!validPlatforms.includes(platform)) {
    console.log(`[setup-deps] Platform ${platform} not in prebuilt matrix. Skipping.`);
    return;
  }

  if (platform === 'darwin') {
    try {
      console.log('[setup-deps] Creating universal macOS binary (x64 + arm64)...');
      const tempDir = path.resolve(__dirname, '../temp-sqlite-darwin');
      fs.mkdirSync(tempDir, { recursive: true });

      const x64Tar = path.join(tempDir, 'x64.tar.gz');
      const arm64Tar = path.join(tempDir, 'arm64.tar.gz');
      const x64Extract = path.join(tempDir, 'x64');
      const arm64Extract = path.join(tempDir, 'arm64');
      fs.mkdirSync(x64Extract, { recursive: true });
      fs.mkdirSync(arm64Extract, { recursive: true });

      await download(
        'https://github.com/WiseLibs/better-sqlite3/releases/download/v11.10.0/better-sqlite3-v11.10.0-electron-v125-darwin-x64.tar.gz',
        x64Tar
      );
      await download(
        'https://github.com/WiseLibs/better-sqlite3/releases/download/v11.10.0/better-sqlite3-v11.10.0-electron-v125-darwin-arm64.tar.gz',
        arm64Tar
      );

      childProcess.execSync(`tar -xzf "${x64Tar}" -C "${x64Extract}"`);
      childProcess.execSync(`tar -xzf "${arm64Tar}" -C "${arm64Extract}"`);

      childProcess.execSync(
        `lipo -create "${path.join(x64Extract, 'build/Release/better_sqlite3.node')}" "${path.join(arm64Extract, 'build/Release/better_sqlite3.node')}" -output "${betterSqliteBinary}"`
      );

      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('[setup-deps] macOS universal binary successfully built and installed.');
      return;
    } catch (err) {
      console.warn('[setup-deps] Universal lipo build failed, falling back to architecture-specific download:', err.message);
    }
  }

  const tempTar = path.resolve(__dirname, `../better-sqlite3-${platform}-${arch}.tar.gz`);
  const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v11.10.0/better-sqlite3-v11.10.0-electron-v125-${platform}-${arch}.tar.gz`;

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
