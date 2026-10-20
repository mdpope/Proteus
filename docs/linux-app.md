Current cross-platform acceptance is recorded in [PR #20](https://github.com/mdpope/Proteus/pull/20).
The dated/source-specific checkpoints below retain their original verification scope; later
workflow results supersede their pending/failure status without changing the recorded artifacts.

# Linux build of the current Mac source

## October 19 implementation checkpoint `c41ffa5` — Linux preparation

This unfrozen implementation checkpoint on `codex/next-release-0.2.26` incorporates the earlier
`9439f24` signed-out startup correction. It still declares package version **0.2.25**; it is not
an installable final 0.2.26 release. Separate validation work belongs to `linux/c41ffa5-validation`.

**Source tested:** fresh `npm ci`, all **811 Node tests**, and static checks pass. The twelve
synthetic updater cases include Linux executable lookup, idle/continuation barriers, recovery
journals, compatible rollback and preservation of new records; they do not install an app.

**Packaged:** the exact Linux x64 package is **`linux.2b491477dc2d`**, with **253 runtime files**:

- Source fingerprint: `2b491477dc2d20069518b0e4ce78676f1a8c7fabb2f2c32ec1cb328b1d7aced7`.
- Archive SHA-256: `78c92d4e622b32b43e88275da9df01b3eb50e8e8dbc5b347dc72e4b630a0a7e3`.
- Whole-bundle tree hash used by the updater: `9498ea427734fc86a63809042678e016c6d80f5a3fc44e7f69bae93907f51258`.
- Exact-package UI acceptance passes runtime/provenance/private-file checks, signed-out startup,
  explicit synthetic chat feedback, packaged native PTY keyboard input and retained history after
  a full restart. Provider paths deliberately fail before credential discovery; no model is called.
- `desktop-file-validate` accepts `Exec=proteus %U` and both `proteus`/`proteus-desktop` MIME schemes.
  Initial argv opens the seeded chat; a second instance forwards another chat URL to the existing
  owner and exits. Unmatched desktop OAuth is rejected, while mobile/wrong-path/userinfo URLs
  remain ignored, with no token exchange or saved credential. A cold unmatched callback stays
  signed out. System registration and external-browser OAuth are not exercised or changed.
- The actual packaged updater inspector resolves lowercase `proteus`, its exact installation and
  source identity. Active journal lookup and foreign-pointer rejection pass with private fabricated
  fixtures. The packaged helper's exported `smoke()` passes fresh renderer/API startup against
  those exact bytes. The whole-bundle tree hash is unchanged afterward. No update prepare,
  handoff, replacement, rollback or provider continuation is invoked against a live installation.

The previously failing workspace-child-selection suite now passes its three real process cycles,
preserving stable identities, URL/history/selection/order and unrelated Team entries. Current
browser-home UI passes direct +, unified address/history, pagination retry, Team draft retention
and creation actions. The tab-stability fixture originally created uncommitted `restore:true`
views after alpha had seeded an authoritative owner; reconciliation correctly removed beta/gamma.
The corrected fixture seeds the complete saved session before launch, distinguishes canonical
owner IDs from native view IDs and retains every title/order/DOM-node/polling/second-client-title/
reorder-during-load assertion. Its full suite passes, with added unloaded-restoration assertions.

The strict multiwindow suite passes IPC/browser isolation, independent reading positions, all
geometry comparisons, Quit restoration and explicit Close persistence on private Xvfb/Openbox/X11.
The tracked harness accepts Linux-only `PROTEUS_TEST_OZONE_PLATFORM=x11` and waits for compositor
bounds to settle before comparing them. Mac launch defaults and all strict assertions remain.
The laptop's native Wayland run fails global-position equality, returning `(0,0)` after restore;
Electron explicitly does not support global window positioning on
[Wayland](https://www.electronjs.org/docs/latest/api/browser-window/). A host KWin/XWayland run also
shows position/decoration deltas. Neither result is waived into a full geometry pass; the private
X11 result does not establish matching placement on the operator's native desktop.

[Official Cua Driver **0.36.0**](https://github.com/trycua/cua/releases/tag/cua-driver-rs-v0.36.0)
is staged only in ignored test storage. Its Linux archive SHA-256
`05dae2160c86bdf4855c279d30898213d7a150edb1992b7470afdd69f0df4064` matches official published checksums
and the GitHub asset digest. Private Xvfb/Openbox, a separate D-Bus session and disposable homes
isolate discovery/capture/input attempts from production windows. Actual discovery and matching
process/window receipts pass through the unchanged Proteus broker, returning a real 640×440 PNG.
The Electron fixture's AT-SPI tree is degraded to window metadata; semantic controls are unverified.
A fresh capture-bound pixel click is explicitly refused by the vendor's `background_unavailable`
response for an unfocused Chromium/Electron renderer. Proteus does not enable its suggested
foreground path, replay input or bypass its target/observation guards. The independent counter
stays zero: Electron input acceptance fails, even though capture and permission discovery pass.
A separate native GTK counter on the same private X11 environment passes exact-process/window
observation, a background accessibility click, an independent counter of exactly one, a fresh
"Confirmed once" label and changed screenshot. The vendor labels the immediate click effect
`unverifiable`; independent state and fresh observation establish this fixture's result without
replaying it. Actual captured image bytes also pass the `desktopTools` model-result adapter and
MCP/Codex conversion checks. These are adapter checks, not delivery to a real model. The official
archive checksum and asset digest are verified; its preserved Sigstore bundle is not independently
verified because cosign is unavailable. Cursor animation, keyboard routes, arbitrary apps and
native Wayland control remain unverified. Peekaboo remains Mac-only; no guard or source backend
adapter is changed for these tests.

The checked-in `test/desktop-control-live-ui.mjs` still assumes the Mac Peekaboo fallback and
is not an unchanged Linux acceptance command. Linux's receipts use the separate disposable
GTK/Electron fixtures and real broker; its optional fallback section needs platform gating before
that common harness is advertised on Linux. This test-surface gap does not permit a non-Mac fallback.

**Installed/live verified:** no candidate replaces the installed 0.2.20 app. No production profile,
application data, handler registration, credential grants, relay identity or recovery generation
is changed, and build-only tests create no full live-data backup. Final installation, production
relay/device acceptance and real-provider continuation await the coordinator's frozen identity.
The historical embedded 0.2.20 upstream receipt remains import lineage; current payload identity
comes from this checkpoint and its current fingerprint above.

## October 19 preliminary combined-release validation

The release coordinator's unfrozen checkpoint `0a5a2f6` on
`codex/next-release-0.2.26` still declares package version **0.2.25**. It is not a frozen
0.2.26 installation candidate. A separate `linux/next-release-0226-validation` branch contains
only the startup correction and acceptance-harness follow-ups described below.

**Source tested:** `npm ci` succeeds; the checkpoint passes all 783 Node tests and static checks.
Actual source and packaged UI startup then fail without a Linux keyring: browser-profile identity
loading probes protected storage even though no Life session exists. The added regression fails
before the correction. After guarding the missing session before the protected-storage probe,
all **785 Node tests** and static checks pass. Existing encrypted sessions and new sign-in/writes
still require protected storage and reject `basic_text`; saved bytes are preserved on failure.
No protected-store reset or credential migration is part of this repair.

**Packaged:** the original checkpoint builds as `linux.8e4687d52125`, but fails actual startup.
The repaired package is **0.2.25 / `linux.593738b6cae6`**, with **247 runtime files**:

- Source fingerprint: `593738b6cae60d05065f0ba9fd3f0e215614059fd64fe84d4e026d197a6e46c1`.
- Linux x64 archive SHA-256: `309029f5c199ffe5f41733b44b912f03fe1950e0fb25176c7d6e4427eda79ff2`.
- `test/desktop-package-ui.mjs` passes against these exact repaired bytes: version/build identity,
  every runtime hash and manifest inventory, private-data exclusions, isolated startup and host
  platform metadata, unavailable real-provider catalogs, explicit synthetic rehearsal/feedback,
  actual packaged native PTY output and keyboard input through its canvas, and retained rehearsal
  history after a full app restart. No real model is called or provider usage invented.
- The acceptance harness now opens Terminal through the visible **New tab** action page after +,
  retaining every PTY/restart assertion. Its previous hidden-menu selector is obsolete.
- Current runtime/build-input hashes and the archive digest are rechecked after acceptance.
  The embedded `upstream` 0.2.20 receipt identifies the historical accepted Mac import base;
  it does not identify the current payload. Use the current fingerprint and checkpoint above.

Additional disposable Electron UI checks pass browser link navigation and tab placement across
main/chat/workspace/Team, including asynchronous origin capture, profile preservation, native
context menus and favicon fallbacks. Project overview passes after awaiting its ordinary active-page
thumbnail cache before opening the overlay; it retains real-image, selection, hidden-page, grouping,
reorder, close and top-level-scope assertions. Overview and sidebar screenshot outputs now use the
platform temporary directory instead of `/private/tmp`.
Sidebar's 13 checks also pass after moving keyboard focus out of the intentionally expanded
focused sidebar before asserting the compact idle rail. Settings/conflict handling, full app
restart, Markdown tab activation, background close and the visible rail icons remain asserted.
All four additional UI harnesses use disposable data and credentials; none runs a real provider.

Two broader harnesses remain **unverified/failing**: `browser-tab-stability-ui.mjs` cannot find its
restored beta browser in the main tab strip after synchronization; `workspace-child-selection-ui.mjs`
compares legacy history objects exactly and fails on added stable entry IDs/current-entry identity
although URL/title/index values match. These failures are not waived or evidence of a passing full
UI suite. Their fixture/contract relationship needs release-coordinator follow-up.

**Installed:** no new candidate is installed. Existing **0.2.20 / `linux.fda4ae896542`** remains healthy
with its existing completed chat and no scheduler/recovery errors. No live application data,
profiles, grants, receipts or installation files are replaced; no full live-data backup is created
for these build-only tests.

**Live verified:** no new real-provider, production-relay, phone-to-Linux, Mac-to-Linux or native
Apple acceptance is claimed. Existing historical live receipts do not transfer to this checkpoint.
Remaining release features belong to coordinator implementation; installation and final device
acceptance wait for its exact frozen identity. Widevine is shelved under the operator's later
instruction and is not a prerequisite for these Linux preparation checks.

## October 15 checkpoint — source `b73c655`

All 626 local Node tests and static checks pass. Hosted Linux/Mac desktop and web gates are
green; run [38693169853](https://github.com/mdpope/Proteus/actions/runs/38693169853) also passes
all 122 native units. Its 67 native UI cases finish with 58 passes and nine failures on the
correct families: 62 phone cases and five actual-iPad cases. The diagnosed interaction and
browser gesture corrections require complete native revalidation.

Installed `linux.fda4ae896542` remains the verified live-Codex checkpoint. The separate notes-only
candidate `linux.10e75103c337` passes isolated UI, native PTY and restart checks; it is not installed
and does not replace that live acceptance. Production Linux relay registration remains blocked
pending private distinct-host provisioning; website-to-Mac connectivity does not verify Linux.

## Historical accepted 0.2.20 integration checkpoint

Current source integrates the accepted Mac **0.2.20** companion from transfer **418a083**.
Native link/selection menus, source-workspace link drafts, convergent tab metadata and durable
retry identities/owner backoff are retained alongside the Linux/Mac compatibility changes.
Native version is **0.2.20 / 2610.14.3**, with upstream app/signing identity unchanged.
Merged-source **625 Node checks and static checks pass**. Linux package
`linux.fda4ae896542` (`fda4ae896542b11d4775b111970df57e571db83c2093e351197e27d51d97244d`)
passes all 231 runtime hashes, exact metadata/provenance/private-file checks, isolated desktop
UI, synthetic feedback, native PTY keyboard input and restart persistence. Live packaged Codex
acceptance passes approvals, file execution, cancellation, same-session continuation, encrypted
local mobile-compatible pairing, minimized continuation, reconnect and revocation. These use
disposable data. The exact package is now installed/running on this laptop; Codex is ready.
Existing chat files and protected configuration match the verified cold recovery snapshot; two
recovery generations are retained outside source. Mac/iOS installations were not replaced.

Hosted run [38688832212](https://github.com/mdpope/Proteus/actions/runs/38688832212) passes Mac
Node/static checks, unsigned packaging and actual packaged UI/native terminal/restart checks;
web production assets and PHP tests also pass. Linux CI still has a test failure under review;
iOS compilation/simulator acceptance is running after splitting the earlier Swift expression
that timed out during type checking. Signed production Mac identity acceptance and actual
mobile-to-Linux/shared-production-relay pairing remain separate gates. The existing public relay
requires a distinct Linux host registration through its private operations workflow; no Mac token
or pairing identity has been copied. Main's connection guide is merged; no private provisioning
route is available from it. See the draft cross-platform PR for current checks.

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

## October 19 combined-release portability follow-up

The coordinator fixes supervised package lookup to use the shipped lowercase `proteus` executable.
The desktop entry declares `proteus` and `proteus-desktop` scheme handlers and passes `%U` through
its launch command. Initial and second-instance URLs use the strict shared callback parser;
desktop OAuth never accepts the mobile callback scheme. Final Linux installation must verify its
desktop entry/handler registration and actual callback delivery. Mac-side unit checks are source
evidence; package/desktop/live validation remains on the authorized Linux chat and machine.

## 0.2.26 installed on the Linux laptop

Release main `9114970` is installed as `linux.34d37e887ee5` and independently live-verified after
two graceful launches. Fresh 815 runtime/static checks, exact-package UI/PTY/restart/native focus,
real synthetic Codex execution and protected history/receipt/cookie continuity pass. Two audited
same-owner full recovery generations and the supervised-update inventory are retained. User-local
launcher/protocol registration and official Cua discovery are configured; native Wayland desktop
control remains unavailable at default settings, with no Linux Peekaboo fallback. Existing remote
access stays disabled. See the [installation acceptance](2026-10-19-linux-026-install.md) for exact
artifact hashes, actual free-space change and evidence/limits. Earlier hold/preparation sections
above are historical checkpoints.

## Early-input/IPC follow-up `e350395` — tested, restart held

The [follow-up ledger](2026-10-19-linux-followup-e350395.md) records exact candidate
`linux.8e2611e6ef29`, 817 tests/static, private-X11 native early URL/Enter (main and Team), sidebar
color, package UI/PTY/restart and independent helper update/rollback acceptance. Current installed
`linux.34d37e887ee5` stays running because a non-tmux terminal is active. Preserve that work; a
passing candidate is not a completed installation. Recovery reuse/current-state requirements and
the separate host-session canvas timeout remain explicit in the ledger.
