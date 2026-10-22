# Windows desktop

Windows x64 uses a conventional, per-user NSIS installer with a Start-menu entry and Apps uninstall registration. It includes Electron, runtime dependencies and the native PowerShell PTY; target PCs do not need Node, npm, Git or Python. The first release is deliberately unsigned under operator authorization. Windows may display an unknown publisher or SmartScreen warning. Signed release manifests authenticate update packages independently of Authenticode.

Application data uses `%LOCALAPPDATA%\Proteus`; Electron browser profiles use its separate user-data directory. `PROTEUS_HOME` remains an explicit override. New data and update directories receive owner/SYSTEM/Administrators ACLs. Existing directories with broader access fail closed and require inspection. Installation, update, compatible rollback and uninstall preserve application data. Installers refuse to replace a running target instead of terminating its work.

## Build and validate

Use Node 22.16 or newer and npm on Windows x64. Run `npm ci`, `npm test`, `npm run check`, then `npm run package:windows`. The package command emits a setup executable and an update tar archive under `dist/windows`, with source fingerprint and SHA-256 identities. It applies the pinned extension repair to the copied dependency. No credentials, test homes, local records or developer utilities belong in the runtime package.

Run `node test/windows-current.mjs <exact-packaged-executable>` for isolated UI, provider readiness, native PTY and restart acceptance with developer PATH entries unavailable. `node test/windows-installer.mjs <setup.exe> <unpacked-folder>` tests real registration, first-launch recovery setup, running-app refusal and uninstall/data preservation. The installer harness refuses an existing registered installation; use a disposable Windows account once a live installation exists. Synthetic fixtures never run production workflows.

Tests that exercise private files inspect Windows ACLs rather than meaningless POSIX permission bits. Enable Developer Mode for unprivileged symlink tests. PHP's symlink function does not request that Windows flag, so its Windows security fixture uses Node to create the link; the application still rejects it through PHP.

Windows state writers retry short sharing violations during atomic replacement, retaining the old document until replacement succeeds. Persistent denials fail without deleting the prior state. The persistence test includes an actual temporary Windows reader lock.

## Releases and updates

Authenticated downloads come from the existing Proteus website at proteus.example. Website `/downloads` requires its existing strong browser sign-in. Desktop catalog/download routes use the existing OAuth `app:read` grant. Releases are stored outside the public web directory; there is no upload or publication endpoint. An operator publishes an immutable directory named for the release ID containing `release.json` and its exact installer/archive filenames. `PROTEUS_DESKTOP_RELEASE_ROOT` may select the private storage root. Website and desktop trust the same public Ed25519 key; the private signing key stays outside source and the web server.

Sign exact tested artifacts with `node scripts/sign-desktop-release.mjs --bundle <absolute-folder> --archive <absolute-tar.gz> --installer <absolute-setup.exe> --key <absolute-private-key> --channel stable --out <absolute-release.json>`. The tool refuses a key inside the source checkout, broad key permissions and an installer different from the bundle's cached installer. Never commit or upload the private key.

Engine Room → Updates can check releases, download and test a selected release, or import an offline manifest with its matching archive beside it. Downloading does not restart the app. The owner verifies publisher, product, target, channel, expiry, bounded archive size, paths, all payload hashes and an isolated UI smoke receipt. Failed/interrupted downloads are discarded; leftover disposable download staging is retired on retry. No arbitrary download origin or renderer bearer-token access is introduced.

After preparation, **Restart when active work finishes** authorizes the existing protocol-1 helper. A chat checkpoint is optional for Engine Room updates and required for same-chat continuation. The helper waits for active work, preserves one verified app/data generation, invokes the exact cached installer, checks registration and payload, verifies the restarted UI and resumes the original chat once when selected. Compatible failure recovery reinstalls the exact previous installer without overwriting current data. No scheduled or unattended installation is enabled.

A newly created data home in a registered Windows installation receives an empty recovery inventory only after checking the owned update roots. Existing homes, matching prior policies and unrecorded update directories require the all-root operator inventory described in [desktop updates](desktop-updates.md). Two-generation retention remains per installation/data home, including imported recovery generations.

## Acceptance status

The integrated 0.2.28 source passes 883 runtime tests with two existing POSIX skips, static checks and 27 website release/Life/native-auth tests. Exact packaged UI, native PTY, Codex metadata, concurrent-reader rehearsal persistence and restart checks pass. Real NSIS functional acceptance verifies payload equality, registration, fresh recovery setup, running-app refusal and uninstall/data preservation. Full packaged update/rollback, live provider continuation and relay/mobile pairing acceptance remain pending. Current Mac source is available in upstream commit `5b8b708`; private deployment records remain with their operator owner.
