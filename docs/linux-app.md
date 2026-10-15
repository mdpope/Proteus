# Linux build of the current Mac source

## Accepted 0.2.20 refresh

Current source integrates the accepted Mac **0.2.20** companion from transfer **418a083**.
Native link/selection menus, source-workspace link drafts, convergent tab metadata and durable
retry identities/owner backoff are retained alongside the Linux/Mac compatibility changes.
Native version is **0.2.20 / 2610.14.3**, with upstream app/signing identity unchanged.
Merged-source **623 Node checks and static checks passed**; fresh web/Linux packaging/UI
acceptance remains pending. The earlier 0.2.19 results below are historical; no current artifact
or installation is certified by those checks. Hosted iOS job **116268129325**, run
**38688298486**, failed before tests while compiling the 0.2.19 `TeamBrowserView` task expression.
The same expression remains upstream; a local view/task-identity decomposition now needs a fresh
hosted recompile/rerun. Real mobile-to-Linux relay and signed Mac acceptance remain separate gates.

## Earlier October 14 compatibility checkpoint — 0.2.19

Linux/macOS desktop, website and iOS source now share platform-neutral host controls. Optional
authenticated `hostPlatform` (`linux`, `darwin`, `win32` or `unknown`), canonical
`hostPlatformLabel` and `hostArchitecture` accompany `hostName` and `host.platform.v1`.
Protocol 1 and existing host/device IDs, keys, pairing files, approvals and retry receipts stay
unchanged. Clients show neutral defaults for older hosts; platform fields never authorize actions.
Legacy website `defaultMacId` and native `paired-mac` storage keys remain for compatibility.
Linux and Mac execution hosts register independently with distinct host IDs/tokens and are paired
separately; a shared relay does not share provider credentials or conversations.

Local validation passed 619 Node checks and static checks,
plus website 81 PHP tests / 724 assertions, Pint and Vite. Disposable actual Linux UI checks
cover responsive attachments (1440/850), chat design (1200/580), composer (1440/390), slow MCP
sign-in with bounded retry/no overlapping login, and 2,507 events over 25 history pages. Linux
stage `6f16217c6a6f` passed all 231 runtime hashes, complete metadata/provenance and private-file
checks, isolated startup/platform metadata, synthetic rehearsal/feedback with unobserved usage,
actual PTY keyboard input through the canvas and restart history. It predates these bundled
documentation edits, so final current-source rebuilding/acceptance remains pending. No installed
app was replaced.

The added hosted workflow targets Linux/Mac desktop tests and package UI/native terminals,
website tests/assets and an iPhone simulator with a disposable host. It has not executed yet.
Mac desktop CI is unsigned; no production signing, certificates, device installs or Apple account
checks occur there. Native compilation/simulator checks, signed Mac acceptance and a real
iPhone/iPad-to-Linux relay session remain pending. A local mixed-host native fixture verifies
metadata/cache behavior only when run on a Mac; it is not a remote Linux execution test.
Other provider authentication, live Life/Secret Service access, ARM64 and wider distributions
remain separate acceptance. Earlier Linux/Codex package results describe their tested snapshot.

## Source lineage

The Linux branch now uses the exact accepted Mac **0.2.20** source companion on
`codex/signed-proteus-0220-20261015`, transfer commit `418a083`, verified against all **879**
source manifest hashes. Archive SHA-256:
`beb273dca6e161cb52bf8d6b6d55eb692fcb31e679c25ac9269cea90adae07e5`.
Accepted Mac fingerprint:
`3f2196de3586915fc72f8d0cdebb645c109992306c3735514d0786b0acaf4985`.
`linux-upstream-source.json` records this immutable identity separately from the Linux runtime
fingerprint. The previous 0.2.19 import (`82cd923`, 877 files) and the initial Linux port on
`linux-initial-build` remain historical; neither is the current accepted source.

## Build and run

Requires Node.js 22.16+, npm, a graphical Linux session and a signed-in Codex executable on PATH
or selected with `PROTEUS_CODEX_PATH`. This laptop's npm bootstrap is under ignored `.runtime/bin`:

```sh
export PATH="$PWD/.runtime/bin:$PATH"
npm ci
npm run package:linux
./dist/Proteus-linux-x64/proteus
```

The Linux entry point builds the terminal renderer and rebuilds only the copied node-pty
module for Electron, leaving the source checkout's Node ABI intact. It produces a runnable
directory, a versioned `Proteus-0.2.20-linux-x64.tar.gz` archive, checksum and bundled
`build-source.json`. The latter fingerprints the Linux runtime/build inputs and names the
accepted Mac source. Both desktop entry points use `scripts/desktop-build.mjs` to freeze exact
runtime file names and SHA-256 hashes, reject added/removed/changed source and unexpected copied
runtime files, verify copied `package.json` before adding the revision, then compare complete
final package metadata and `build-source.json` provenance. Private configuration and source-only
trees stay excluded. Mac signing and vendor-signature/byte checks remain in its own entry point;
the Linux artifact has its own fingerprint and is not the signed Mac binary. Native app identity
and pinned dependencies remain unchanged.

Select Codex and a model from its current catalog in New Chat. Other provider implementations
remain present; Linux authentication for those providers has not been accepted in this work.
The current workspace/tab/browser interface and terminal are included, along with the current
relay protocol. No operational schedule is used as a smoke test.

Linux data uses `$XDG_DATA_HOME/proteus`, falling back to `~/.local/share/proteus` for missing or
relative XDG_DATA_HOME. `PROTEUS_HOME` overrides it. Existing Mac storage is unchanged. Browser
profiles remain in Electron's user-data directory. Isolate both locations in tests using a
temporary PROTEUS_HOME and `--user-data-dir`. Do not copy Mac secrets/pairings into the laptop.

Closing the Linux window minimizes it so the host remains reachable without tray support.
`PROTEUS_CLOSE_TO_TRAY=1` opts into hiding. The color tray icon uses Linux activation; the File
menu includes explicit Quit / Ctrl+Q. macOS retains its existing hide/template-icon behavior.
The default Linux terminal uses the user's shell or bash; Mac still defaults to zsh. Sleep,
logout and shutdown stop the host; no daemon/startup integration is installed.

Protected desktop pairing and Life tokens require Electron secure storage; `basic_text` plaintext
fallback remains rejected. Explicit legacy database-administration profiles can now resolve a
`service`/`account` reference through Linux Secret Service (`secret-tool`) or the unchanged Mac
Keychain command. Linux needs the `secret-tool` utility and an unlocked, available Secret Service.
The resolver reads an existing entry, never puts the password in arguments, and suppresses
secret-bearing process errors. Normal Life still uses the authenticated website API and never
opens legacy SQL profiles automatically. No live keyring, database or Life sign-in is verified
by synthetic resolver tests; see [administrator scope](life-database-admin.md).

## Validation and updates

```sh
npm test
npm run check
PROTEUS_TEST_EXECUTABLE="$PWD/dist/Proteus-linux-x64/proteus" node test/tab-followup-ui.mjs
PROTEUS_TEST_APP="$PWD/dist/Proteus-linux-x64/proteus" node test/terminals-ui.mjs
node test/linux-current.mjs dist/Proteus-linux-x64/proteus
node test/desktop-package-ui.mjs /absolute/path/to/staged/proteus
```

`linux-current.mjs` consumes real Codex allowance with synthetic prompts, temporary files and isolated
profiles. It covers the actual New Chat UI, shell/file approvals, native terminal input/output,
restart/session retention, cancellation/continuation, built-in encrypted relay pairing,
continuation while minimized, reconnect and revocation. It does not pair or alter a real phone.
The tab acceptance test exercises the current canonical placement/move/history/sidebar behavior.
`desktop-package-ui.mjs` uses a synthetic provider with disposable data and browser profiles to
check package identity/provenance, host UI, protected-state isolation and native terminal I/O.
It consumes no provider allowance and does not replace the installed application.

Before replacing an existing local installation, follow `desktop-updates.md`: inspect active work,
back up app/data/browser state outside the repository, then launch and verify exact version/build
and continuity. Leave current Mac/iOS installations untouched. Shared changes still require Mac
regression/package acceptance before merging upstream.
