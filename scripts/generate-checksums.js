// path: scripts/generate-checksums.js
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateChecksums(distDir = path.resolve(__dirname, '../dist')) {
  if (!fs.existsSync(distDir)) {
    console.warn(`[generate-checksums] Dist directory does not exist: ${distDir}`);
    return;
  }

  const entries = fs.readdirSync(distDir);
  const files = entries.filter(file => {
    const fullPath = path.join(distDir, file);
    if (!fs.statSync(fullPath).isFile()) return false;
    if (file.startsWith('SHA256SUMS')) return false;
    // Only checksum installer artifacts and updater files
    return (
      file.endsWith('.exe') ||
      file.endsWith('.dmg') ||
      file.endsWith('.zip') ||
      file.endsWith('.AppImage') ||
      file.endsWith('.deb') ||
      file.endsWith('.rpm') ||
      file.endsWith('.yml') ||
      file.endsWith('.blockmap')
    );
  });

  if (files.length === 0) {
    console.log('[generate-checksums] No installer artifacts to hash.');
    return;
  }

  const lines = files.map(file => {
    const data = fs.readFileSync(path.join(distDir, file));
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `${hash}  ${file}`;
  });

  const content = lines.join('\n') + '\n';
  const platformName = process.platform;
  const platformChecksumPath = path.join(distDir, `SHA256SUMS-${platformName}.txt`);
  fs.writeFileSync(platformChecksumPath, content, 'utf8');

  // Also maintain root SHA256SUMS.txt
  const rootChecksumPath = path.join(distDir, 'SHA256SUMS.txt');
  fs.writeFileSync(rootChecksumPath, content, 'utf8');

  console.log(`[generate-checksums] Computed SHA-256 for ${files.length} release artifact(s):`);
  lines.forEach(line => console.log(`  ${line}`));
}

if (require.main === module) {
  generateChecksums();
}

module.exports = { generateChecksums };
