// path: src/main/fuses.ts
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

/**
 * Applies security fuses to the packaged Electron binary.
 * Disables RunAsNode, inspect flags, and requires ASAR packaging.
 */
export async function applySecurityFuses(executablePath: string): Promise<void> {
  await flipFuses(executablePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true
  });
}
