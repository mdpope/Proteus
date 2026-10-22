# Windows desktop

The Windows channel is live at https://downloads.proteus.example/downloads/proteus/windows/. All five public file
hashes and the manifest signature verify. Actual installed-client acceptance downloads the entire
393,649,640-byte final archive from the real WTB endpoint, verifies/extracts the package and cached
installer, and passes isolated renderer startup. Its owner also checks the live catalog. The
already installed current version is not redundantly reinstalled. Relay transport is online with
preserved identity/token; cross-device pairing remains separate and pending. Earlier pending
publication descriptions below record the pre-publication stage.

Windows shares Linux's frameless shell: upper-left Close, Minimize and Maximize/Restore controls,
plus the circled-dots application menu containing File, Edit, View and Window. F10 opens that menu;
native shortcuts remain registered. The top tab strip is draggable and its buttons are excluded
from dragging. Additional windows use the same controls, bound to their owning window.

Follow-up build `windows.2cf4ad5cdad6` passes 887 of 889 tests (two POSIX skips), static checks,
source and exact packaged chrome UI checks. The existing installed owner consumed its official
signed release, completed protocol-1 NSIS replacement and restarted with healthy renderer, exact
payload, stable identity and preserved runs/schedules. One verified recovery generation remains.
Prior build6e real-model continuation/rollback tests below were not repeated for this chrome-only
change. Drag-region styles are verified; physical window dragging is not claimed.

Windows x64 uses a conventional, per-user NSIS installer with a Start-menu entry and Apps uninstall registration. It includes Electron, runtime dependencies and the native PowerShell PTY; target PCs do not need Node, npm, Git or Python. The first release is deliberately unsigned under operator authorization. Windows may display an unknown publisher or SmartScreen warning. Signed release manifests authenticate update packages independently of Authenticode.

The installer registers `proteus:` chat links and `proteus-desktop:` sign-in callbacks for the current user, so links opened from a system browser reach this installation. It does not change the default web browser.

Application data uses `%LOCALAPPDATA%\Proteus`; Electron browser profiles use its separate user-data directory. `PROTEUS_HOME` remains an explicit override. New data and update directories receive owner/SYSTEM/Administrators ACLs. Existing directories with broader access fail closed and require inspection. Installation, update, compatible rollback and uninstall preserve application data. Installers refuse to replace a running target instead of terminating its work.

## Build and validate

Use Node 22.16 or newer and npm on Windows x64. Run `npm ci`, `npm test`, `npm run check`, then `npm run package:windows`. The package command emits a setup executable and an update tar archive under `dist/windows`, with source fingerprint and SHA-256 identities. It applies the pinned extension repair to the copied dependency. No credentials, test homes, local records or developer utilities belong in the runtime package.

Run `node test/windows-current.mjs <exact-packaged-executable>` for isolated UI, provider readiness, native PTY and restart acceptance with developer PATH entries unavailable. `node test/windows-installer.mjs <setup.exe> <unpacked-folder>` tests real registration, first-launch recovery setup, running-app refusal and uninstall/data preservation. The installer harness refuses an existing registered installation; use a disposable Windows account once a live installation exists. Synthetic fixtures never run production workflows.

Tests that exercise private files inspect Windows ACLs rather than meaningless POSIX permission bits. Enable Developer Mode for unprivileged symlink tests. PHP's symlink function does not request that Windows flag, so its Windows security fixture uses Node to create the link; the application still rejects it through PHP.

Windows state writers retry short sharing violations during atomic replacement, retaining the old document until replacement succeeds. Persistent denials fail without deleting the prior state. The persistence test includes an actual temporary Windows reader lock.

## Releases and updates

The operator's latest distribution choice is **downloads.proteus.example**. Windows uses a fixed HTTPS catalog at `/downloads/proteus/stable/win32-x64.json` (or the preview channel) and immutable files beneath `/downloads/proteus/releases/<release-id>/`. The Windows download page lives at `/downloads/proteus/windows/`. Requests omit credentials and reject redirects; Proteus account authentication remains separate. Catalog entries carry signed envelopes, and the signed metadata binds the distribution origin, exact filenames, target, version, expiry and hashes. The installed verification keys never come from the download channel.

The older authenticated proteus.example service implementation remains available for compatible clients. It is not the selected Windows distribution channel and has not been deployed by this work. Previously signed offline manifests remain accepted under the existing trust key; they cannot redirect the Windows network downloader to the old API or another origin.

Sign exact tested artifacts with `node scripts/sign-desktop-release.mjs --bundle <absolute-folder> --archive <absolute-tar.gz> --installer <absolute-setup.exe> --key <absolute-private-key> --channel stable --out <absolute-release.json>`. The tool refuses a key inside the source checkout, broad key permissions and an installer different from the bundle's cached installer. Never commit or upload the private key.

Stage the scoped public files with `node scripts/stage-windows-release.mjs <absolute-release-folder> <new-absolute-staging-folder>`. Only the generated `downloads/proteus` files belong on WTB. Transfer the exact tested installer, archive and manifest without rebuilding; transfer the corresponding source companion privately. The deployment workspace owns server access, existing signed-in Webmin origin, recovery and publication receipts. Preserve unrelated website content, upload immutable release files first, verify their complete hashes and signature from the public URLs, then atomically replace the channel catalog/page. Check the actual installed consumer download/preparation separately from local/offline tests.

Keep the Ed25519 private key in durable owner-protected secret storage outside checkout, publication staging and the website. Existing verification keys are retained. For planned rotation, first ship an installer containing both the current and new public keys, authenticated by a manifest signed with the currently trusted key; verify rollout before using the new signing key and retire the old key only through a later reviewed app release. Never accept a downloaded replacement trust key. Compromised-key recovery requires a separately authenticated installer/trust distribution procedure. No key was rotated by this release.

Engine Room → Updates can check releases, download and test a selected release, or import an offline manifest with its matching archive beside it. Downloading does not restart the app. The owner verifies publisher, product, target, channel, expiry, bounded archive size, paths, all payload hashes and an isolated UI smoke receipt. Failed/interrupted downloads are discarded; leftover disposable download staging is retired on retry. No arbitrary download origin or renderer bearer-token access is introduced.

After preparation, **Restart when active work finishes** authorizes the existing protocol-1 helper. A chat checkpoint is optional for Engine Room updates and required for same-chat continuation. The helper waits for active work, preserves one verified app/data generation, invokes the exact cached installer, checks registration and payload, verifies the restarted UI and resumes the original chat once when selected. Compatible failure recovery reinstalls the exact previous installer without overwriting current data. No scheduled or unattended installation is enabled.

A newly created data home in a registered Windows installation receives an empty recovery inventory only after checking the owned update roots. Existing homes, matching prior policies and unrecorded update directories require the all-root operator inventory described in [desktop updates](desktop-updates.md). Two-generation retention remains per installation/data home, including imported recovery generations.

## Acceptance status

The integrated 0.2.28 source passes 886 of 888 runtime tests with two existing POSIX skips, static checks and 27 website release/Life/native-auth tests. Build `windows.6e46560c3ce5` passes exact packaged UI, native PTY, Codex metadata, concurrent-reader rehearsal persistence and restart checks. Real NSIS functional acceptance verifies payload equality, URI registration, fresh recovery setup, offline preparation/cancellation, running-app refusal and uninstall/data preservation. The final build passes an actual update and an injected-health-failure compatible rollback, each with its original real Codex session automatically continued once and prior events/history/operation receipts preserved.

The final conventional installer is installed locally with its exact payload, Start-menu shortcut and URI handlers verified. The actual renderer and a subsequent normal launch pass; the host identity stays stable, a second invocation uses the existing owner, and debugging is disabled. Codex metadata is available. The live home has no chats or enabled schedules; its rehearsal sample is disabled and its recovery inventory is empty. The newly created Electron browser profile inherited extra Windows ACL grants on this host; after verifying it contained only bootstrap caches, its permissions were restricted to the owner, SYSTEM and Administrators without changing contents. Existing broad profiles continue to require inspection.

The exact packaged feed client also downloads all 393,659,432 archive bytes through HTTP from a locally served copy of the five public publication files, verifies its embedded publisher key/signature and extracts the exact package and cached installer. This is a local publication fixture, not live downloads.proteus.example acceptance. The earlier pre-release updater baseline uses a private legacy-format compatibility envelope for the same final bytes; this envelope is excluded from publication and delivery. The official WTB manifest is verified independently by the actual packaged feed client. Earlier standalone Engine Room acceptance verifies that an update dispatches no chat.

WTB publication, public endpoint/consumer verification and existing relay/mobile pairing remain pending the private Mac deployment/registration workflow. The Windows host has no signed-in Webmin session or deployment workspace, and its thread tools cannot reach the coordinating Mac chat. The operator authorized sending the tested artifact/source handoff. Current Mac source is available in upstream commit `5b8b708`; private operational records remain with their operator owner.
