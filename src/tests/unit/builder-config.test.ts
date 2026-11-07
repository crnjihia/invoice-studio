// path: src/tests/unit/builder-config.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Electron Builder Configuration & Pipeline Unit Tests', () => {
  const ROOT_DIR = process.cwd();
  const BUILDER_CONFIG_PATH = join(ROOT_DIR, 'electron-builder.yml');
  const ENTITLEMENTS_MAC_PATH = join(ROOT_DIR, 'build', 'entitlements.mac.plist');
  const ENTITLEMENTS_INHERIT_PATH = join(ROOT_DIR, 'build', 'entitlements.mac.inherit.plist');
  const CI_RELEASE_PATH = join(ROOT_DIR, '.github', 'workflows', 'release.yml');

  it('provides a complete, well-structured electron-builder.yml', () => {
    expect(existsSync(BUILDER_CONFIG_PATH)).toBe(true);
    const configContent = readFileSync(BUILDER_CONFIG_PATH, 'utf8');

    // App identity
    expect(configContent).toContain('appId: com.invoicestudio.app');
    expect(configContent).toContain('productName: Invoice Studio');

    // ASAR security & native node modules unpacking
    expect(configContent).toContain('asar: true');
    expect(configContent).toContain('- \'**/*.node\'');

    // Windows NSIS configuration
    expect(configContent).toContain('target: nsis');
    expect(configContent).toContain('oneClick: false');
    expect(configContent).toContain('allowToChangeInstallationDirectory: true');

    // macOS Hardened Runtime & Notarisation
    expect(configContent).toContain('hardenedRuntime: true');
    expect(configContent).toContain('build/entitlements.mac.plist');
    expect(configContent).toContain('build/entitlements.mac.inherit.plist');

    // Linux Targets
    expect(configContent).toContain('target: AppImage');
    expect(configContent).toContain('target: deb');

    // GitHub Releases Publishing
    expect(configContent).toContain('provider: github');
    expect(configContent).toContain('releaseType: draft');
  });

  it('includes valid macOS hardened runtime entitlement plist files', () => {
    expect(existsSync(ENTITLEMENTS_MAC_PATH)).toBe(true);
    expect(existsSync(ENTITLEMENTS_INHERIT_PATH)).toBe(true);

    const macPlist = readFileSync(ENTITLEMENTS_MAC_PATH, 'utf8');
    expect(macPlist).toContain('com.apple.security.cs.allow-jit');
    expect(macPlist).toContain('com.apple.security.cs.allow-unsigned-executable-memory');
    expect(macPlist).toContain('com.apple.security.files.user-selected.read-write');

    const inheritPlist = readFileSync(ENTITLEMENTS_INHERIT_PATH, 'utf8');
    expect(inheritPlist).toContain('com.apple.security.inherit');
  });

  it('configures GitHub Actions release workflow matrix across all three target platforms', () => {
    expect(existsSync(CI_RELEASE_PATH)).toBe(true);
    const ciContent = readFileSync(CI_RELEASE_PATH, 'utf8');

    // 3 OS targets
    expect(ciContent).toContain('windows-latest');
    expect(ciContent).toContain('macos-latest');
    expect(ciContent).toContain('ubuntu-latest');

    // Secret environment variables for manual signing
    expect(ciContent).toContain('WIN_CSC_LINK');
    expect(ciContent).toContain('WIN_CSC_KEY_PASSWORD');
    expect(ciContent).toContain('CSC_LINK');
    expect(ciContent).toContain('CSC_KEY_PASSWORD');
    expect(ciContent).toContain('APPLE_ID');
    expect(ciContent).toContain('APPLE_APP_SPECIFIC_PASSWORD');
    expect(ciContent).toContain('APPLE_TEAM_ID');

    // Native module rebuild step
    expect(ciContent).toContain('npx @electron/rebuild -f -w better-sqlite3');
  });
});

