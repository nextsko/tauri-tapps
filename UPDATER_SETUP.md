# Tauri Updater Setup Guide

## Current Status
✅ Updater plugin installed in Cargo.toml
✅ Updater initialized in lib.rs
✅ UpdateChecker component created
✅ Bundle configuration added (createUpdaterArtifacts: true)
⚠️ Public key needs to be generated and added

## Next Steps

### 1. Generate Signing Keys

Run this command to generate your signing keys:

```bash
# Windows (PowerShell)
bunx tauri signer generate -w $env:USERPROFILE\.tauri\myapp.key

# Or using npm
npm run tauri signer generate -- -w ~/.tauri/myapp.key
```

This will:
- Generate a private key at `~/.tauri/myapp.key`
- Display a public key in the terminal

### 2. Add Public Key to Config

Copy the public key from the terminal output and paste it into `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. Set Environment Variables for Building

Before building your app, set these environment variables:

**Windows (PowerShell):**
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $env:USERPROFILE\.tauri\myapp.key -Raw
# Optional: add password if you set one
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
```

**Mac/Linux:**
```bash
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/myapp.key)
# Optional: add password if you set one
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```

### 4. Build Your App

```bash
bun run tauri build
```

This will generate:
- Standard installer (e.g., `.exe`, `.msi`, `.AppImage`, `.app`)
- Update package with signature (e.g., `.exe.sig`, `.msi.sig`, `.AppImage.sig`, `.app.tar.gz.sig`)

### 5. Create Update JSON

Create a `latest.json` file with this format:

```json
{
  "version": "0.2.0",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-12-09T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "CONTENT_FROM_.sig_FILE",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_x64-setup.exe"
    },
    "linux-x86_64": {
      "signature": "CONTENT_FROM_.sig_FILE",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_amd64.AppImage"
    },
    "darwin-x86_64": {
      "signature": "CONTENT_FROM_.sig_FILE",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_x64.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "CONTENT_FROM_.sig_FILE",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_aarch64.app.tar.gz"
    }
  }
}
```

### 6. Upload to GitHub Releases

1. Create a new release on GitHub
2. Upload the installer files and their `.sig` files
3. Upload the `latest.json` file
4. The updater will automatically check this URL: `https://github.com/nextsko/tauri-tapps/releases/latest/download/latest.json`

## Using GitHub Actions (Recommended)

This project already has GitHub Actions configured! See `.github/workflows/README.md` for details.

### Quick Setup:

1. **Add your signing key to GitHub Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `TAURI_SIGNING_PRIVATE_KEY` with the content of your private key file
   - (Optional) Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if you set a password

2. **Publish a new version**:
   - Update version in `package.json` (e.g., from `0.1.2` to `0.1.3`)
   - Commit and push to `main` branch
   - GitHub Actions will automatically:
     - Create a git tag `v0.1.3`
     - Build for Windows, macOS, and Linux
     - Create a GitHub Release with installers
     - Generate `latest.json` for the updater

That's it! The updater will automatically check for new versions.

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your private key to git
- Keep your private key secure - if lost, you can't update existing installations
- The public key in the config is safe to commit
- Add `*.key` to your `.gitignore`

## Testing Updates

1. Build version 0.1.0 and install it
2. Update version in `package.json` and `tauri.conf.json` to 0.2.0
3. Build version 0.2.0
4. Create and upload `latest.json` with version 0.2.0
5. Run the 0.1.0 app - it should detect and offer the update
