<!-- path: docs/code-signing.md -->
# Code Signing & Installer Pipeline Guide

This guide details code-signing certificate configuration, notarisation pipelines, secret provisioning, and signature verification for Windows, macOS, and Linux releases of **Invoice Studio**.

---

## 1. Local Development & Unsigned Builds

> [!NOTE]
> **Code-signing secrets are strictly optional for development and pull request CI builds.**
> If secrets are absent, `electron-builder` automatically falls back to generating unsigned binaries (`.exe`, `.dmg`, `.AppImage`). Unsigned dev builds remain fully operational for local testing and feature verification.

To produce local unsigned installers on your workstation:
```bash
# Windows NSIS Installer (.exe)
npm run package:win

# macOS DMG & Zip (.dmg, .zip)
npm run package:mac

# Linux AppImage & Debian (.AppImage, .deb)
npm run package:linux
```

---

## 2. Production Code Signing Secrets (MANUAL STEP)

To publish production releases that bypass SmartScreen on Windows and Gatekeeper on macOS, configure the following secrets under **GitHub Repository $\to$ Settings $\to$ Secrets and variables $\to$ Actions**:

### Windows Signing Secrets
For EV / OV code signing or software publisher certificates:

| Secret Name | Required | Description |
| :--- | :--- | :--- |
| `WIN_CSC_LINK` | Yes (for signing) | Base64-encoded string of your PKCS#12 (`.pfx`) certificate or HTTPS URL |
| `WIN_CSC_KEY_PASSWORD` | Yes (for signing) | Decryption password for the `.pfx` certificate |

> [!TIP]
> To convert a local `.pfx` certificate to base64 for GitHub Secrets:
> ```bash
> # Linux / macOS:
> base64 -w 0 my-cert.pfx > cert-base64.txt
>
> # Windows PowerShell:
> [Convert]::ToBase64String([IO.File]::ReadAllBytes("my-cert.pfx")) | Out-File -Encoding ascii cert-base64.txt
> ```

### macOS Signing & Notarisation Secrets
For Apple Developer ID signing and Apple Notary Service stapling:

| Secret Name | Required | Description |
| :--- | :--- | :--- |
| `CSC_LINK` | Yes (for signing) | Base64-encoded Apple Developer ID Application certificate (`.p12`) |
| `CSC_KEY_PASSWORD` | Yes (for signing) | Password protecting the `.p12` file |
| `APPLE_ID` | Yes (for notarisation) | Apple ID email associated with your Apple Developer account |
| `APPLE_APP_SPECIFIC_PASSWORD` | Yes (for notarisation) | App-specific password generated via `appleid.apple.com` |
| `APPLE_TEAM_ID` | Yes (for notarisation) | 10-character Apple Developer Team ID (found in Developer Account membership) |

---

## 3. Post-Build Verification Checklist

Before public distribution, verify that binaries pass platform gatekeepers and updater manifests are intact:

### A. Windows Verification (SmartScreen & Authenticode)
Using Microsoft Windows SDK `signtool.exe`:

```cmd
signtool verify /pa /v "dist\Invoice Studio-Setup-0.1.0-x64.exe"
```
**Expected Output:**
```text
Verifying: dist\Invoice Studio-Setup-0.1.0-x64.exe
Hash of file (sha256): ...
Signing Certificate Chain:
    Issued to: Chris / Invoice Studio
    Issued by: Sectigo / DigiCert Trusted G4 Code Signing RSA4096
Successfully verified: dist\Invoice Studio-Setup-0.1.0-x64.exe
```

### B. macOS Verification (Gatekeeper & Notarisation Stapling)
Run codesign and Gatekeeper evaluation on macOS:

```bash
# 1. Verify deep code signature
codesign --verify --deep --strict --verbose=4 "dist/mac/Invoice Studio.app"
# Expected: "valid on disk", "satisfies its Designated Requirement"

# 2. Verify Gatekeeper assessment
spctl -a -vvv -t install "dist/mac/Invoice Studio.app"
# Expected: "source=Notarized Developer ID"

# 3. Verify ticket stapling on DMG
xcrun stapler validate "dist/Invoice Studio-0.1.0-arm64.dmg"
# Expected: "The validate action worked!"
```

### C. Auto-Updater Metadata Integrity Check
Verify that `latest.yml` (Windows), `latest-mac.yml` (macOS), and `latest-linux.yml` (Linux) are generated in `dist/`:

1. Check that `sha512` in `latest.yml` matches the actual SHA-512 checksum of the `.exe` installer.
2. Confirm `releaseDate` is formatted in ISO 8601.
3. If using canary releases, confirm `stagingPercentage` is present (e.g., `stagingPercentage: 10`).

