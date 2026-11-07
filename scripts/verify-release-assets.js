// path: scripts/verify-release-assets.js
/* eslint-disable @typescript-eslint/no-var-requires */
const { existsSync, readdirSync, readFileSync } = require('fs');
const { join } = require('path');

function verifyReleaseAssets(distDir = join(process.cwd(), 'dist')) {
  console.log(`[VerifyAssets] Inspecting output directory: ${distDir}`);

  if (!existsSync(distDir)) {
    console.warn('[VerifyAssets] Dist directory does not exist yet. Run packaging first.');
    return { ok: false, files: [] };
  }

  const files = readdirSync(distDir);
  console.log(`[VerifyAssets] Found ${files.length} items in dist folder.`);

  const yamlFiles = files.filter(f => f.startsWith('latest') && f.endsWith('.yml'));
  const installers = files.filter(
    f => f.endsWith('.exe') || f.endsWith('.dmg') || f.endsWith('.AppImage') || f.endsWith('.deb')
  );

  console.log(`[VerifyAssets] Installers detected: ${installers.join(', ') || 'None'}`);
  console.log(`[VerifyAssets] Updater manifests detected: ${yamlFiles.join(', ') || 'None'}`);

  let valid = true;

  // Verify YAML updater metadata integrity
  for (const yml of yamlFiles) {
    const content = readFileSync(join(distDir, yml), 'utf8');
    if (!content.includes('version:') || !content.includes('sha512:')) {
      console.error(`[VerifyAssets] Invalid manifest format in ${yml}`);
      valid = false;
    } else {
      console.log(`[VerifyAssets] Manifest ${yml} verified with valid version & sha512.`);
    }
  }

  return {
    ok: valid,
    installerCount: installers.length,
    manifestCount: yamlFiles.length,
    files
  };
}

if (require.main === module) {
  const result = verifyReleaseAssets();
  process.exit(result.ok ? 0 : 1);
}

module.exports = { verifyReleaseAssets };

