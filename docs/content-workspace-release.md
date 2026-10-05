# Content workspace release validation — in progress

Version **0.2.0**, native build **2610.5.1**. All approved October 5 work is in scope.
Source acceptance is complete for the release candidate; artifacts must use the frozen commit. No physical install or website deployment receipt has been issued for
this candidate. Historical receipts remain in `release-validation.md` and `parity-release.md`.

## Current source acceptance

- Desktop/backend integrated Node suite: **331/331 passed**, `npm run check` and `git diff --check`
  passed. Core checks use synthetic files/providers and isolated application data.
- Electron acceptance passed content-only main/chat/Team tabs, reload restoration, unloaded browser
  descriptors, tab-strip scroll retention, shared menus/toolbars, icon rail and Home. Home README
  and changelog use safe rendered Markdown. The compact full-width top bar and tightened
  sidebar passed a 13-check UI run, including normalized icons and common SVG creation menus.
- Standup acceptance passed generated order and fixed member positions through Add/Edit link and
  undock/redock, with the Team Tools/Standup dividers visible. Existing-list editing and separate
  main/Team browser controls passed on iPad simulator.
- Real Electron quit/relaunch passed optional tmux and process fallback cases. The exact tagged
  tmux session survived app quit, emitted detached output and reattached; explicit End terminated
  only that managed session. Fallback restored saved output with no eager PTY, and first typed input
  started a fresh shell once without startup-command replay. Terminal controls passed 13 checks.
- Provider Sign in/Reconnect helper passed seven synthetic cases including cancellation during
  delayed verification, timeout, early completion and cleanup. The Engine holds only the affected
  provider while authentication completes; other providers continue. Safe auth URLs, inert hostile
  labels, cancellation UI and refreshed account/catalog checks passed. No live sign-in was tested.
- Website Vite build, shell (21 groups), Engine navigation (6), Home (5 tests / 38 assertions),
  Pint and synthetic remote-client acceptance passed. The corrected top-bar action alignment and shared creation icons passed focused
  acceptance. Grouped Activity includes recorded target, working directory and authorization rule;
  no fabricated tool targets or per-file billing are shown.
- Native iPhone unit suite passed **52/52**. Changed iPad PNG preview/Escape/X/backdrop and team
  configuration tests passed **2/2**. A separate 12-tab scroll test preserved the selected tab's
  screen position within 2 pixels through selection and sidebar navigation. Restored browser
  descriptors create no WKWebView until activation. These are simulator results, not installations.
- Native notification routing passed injected-handler UI cases for foreground/background, cold
  launch, named chat/schedule and safe unavailable targets on iPhone/iPad simulators. Startup
  restoration was corrected so pending targets override Home and restored browsers do not steal
  focus. A real OS local-notification tap reproduced a UIKit crash in the async notification delegate;
  changing to its completion-handler API then passed the same SpringBoard-to-chat test. New
  lifecycle cases and iPad archive-filter acceptance passed. Native Home also passed its bundled
  full changelog rendering test, with exact source/bundle hash equality. No physical-device crash
  acceptance or APNs entitlement is claimed.

## Additional active gates

Chat context menus, archive/unarchive, Show Archived filters and guarded delete were added before
freeze. Host persistence, remote authorization, cached/restored tabs and native long-press behavior
passed focused acceptance. The remote protocol suite passed 13 tests, peer-cache coverage passed
19 including stale in-flight deletion and restart, and Electron lifecycle passed 10 UI checks.
Active cleanup ownership blocks deletion; scheduler occurrence journals remain intact. Only
synthetic conversations were deleted during tests.

The installed Copilot mismatch was reproduced as a stale SDK-process quota snapshot. Independent
read-only probes on both Macs confirmed the same account and matching fresh quotas, without a
model turn or authentication change. Source now uses a separate short-lived quota client; eight
synthetic usage tests passed. Installed acceptance still requires the signed app update.

Claude selected-MCP integration passed 35 focused adapter tests: private configuration permissions,
strict selected-server isolation, captured working directories and relative commands through a
non-shell launcher, wildcard versus restricted filters, tool permissions, connection
and authentication failures, status/turn serialization and cleanup. The picker uses runtime-reported
resolved model IDs alongside aliases. Local UI passed four focused status-only capability checks.
Claude scoped MCP login is not advertised; authentication guidance points to the owning Mac. No
live workplace tool action or paid provider turn was used.

## Attachment and document boundary

The operator explicitly approved guarded attachment delivery after reviewing exact-file,
destination-Mac/chat and named-provider confirmation. Uploading alone does not authorize a send.
One-use consent binds ordered file metadata/hashes, peer, chat/draft, provider and message. Accepted
queued proof is revalidated against actual file bytes and run identity, and initial chats cannot
execute before proof is committed. Synthetic tests covered first/follow-up delivery, preview,
Escape, history tags, duplicate prevention and changed-payload rejection. No existing user files
or paid/live provider requests were used.

Adapters accept their capability-reported raster images and bounded UTF-8 text. Copilot also
accepts PDF; Codex and Claude reject PDF explicitly. Unsupported bytes must not silently disappear.
Client previews are retained in memory; reopened history can show metadata without implying that
image bytes were retained. Native restored drafts require reattachment before sending.

Remote documents require a separate default-off View chat documents connection grant and trusted
host approval of the exact document/asset version for the requesting device, with short expiry.
Every read checks current chat identity, grant, canonical path/root and version. Markdown/HTML
bodies are bounded to 1 MiB; up to eight referenced raster assets are bounded to 512 KiB each and
2 MiB total. Relative child documents need their own approval. Changed assets and retargeted paths
are rejected. Paired synthetic tests verified denial before approval, exact bytes, separate child
approval, changed-asset denial and path-retarget rejection across clients.

Static previews disable scripts. Trusted Enable/Stop controls authorize isolated browser JavaScript
for the exact loaded version/session only. Desktop, website and native malicious fixtures observed
zero blocked-network/navigation escapes in scripts-off and enabled modes. No Node, filesystem,
app API, credentials or network authority is granted. CJS remains source. Website previews have
no hard CPU/memory guarantee: synchronous code can block an in-page Stop control and may require
closing the browser tab. Restored descriptors never inherit document/script approvals.

## Build and rollout gates

1. Source checks passed: compact sidebar/tabs, rapid unload/reselect, notification routing,
   quota refresh, chat lifecycle and selected Claude MCP. The packaged Electron MCP launcher still
   requires its isolated synthetic smoke before installation.
2. Update source acceptance, freeze a clean commit and build all artifacts from that exact revision.
3. Preserve valid existing Apple signing, native team/profile and GitHub vendor signatures.
4. Fresh Mac active/waiting/terminal guard, graceful quit, private app/data backup, in-place install;
   preserve histories, schedules, credentials, pairings, browser profiles and content descriptors.
5. Native Wi-Fi install with fresh unlocked-device checks and private app-data/preferences backup;
   never uninstall the existing app or regenerate signing settings.
6. Website fresh verified recovery capture, off-server download and isolated restore before guarded
   code deployment. Verify manifest, protected schema/state, HTTPS, auth boundaries, logs and UI.
7. Verify each installed version and connections to both authenticated Mac identities, preserving
   least-privilege grants. HC Keychain recovery uses normal sign-in/re-pair only where needed.
8. Record exact artifacts and actual device observations separately from source/simulator evidence.

## Known platform limits

- Both Macs already have tmux (3.6a / 3.6b); no package installation was needed. Proteus manages a
  private socket and tagged sessions, leaving unrelated sessions/configuration untouched. Terminal
  output stays on the owning Mac; no new remote-shell capability is included.
- The operator has no paid Apple Developer membership. Native remote APNs push stays pending an
  entitled team/profile and server credentials. Local notifications and tap handling remain in scope.
- Web Push worker/configuration exist from the prior release; real delivery is separate acceptance.
- Automatic updater distribution is not configured; Home must state that honestly.
- Multi-provider orchestration and future Safari-like tab groups remain deferred.

## Installation receipts

Pending: Build Mac, Work Mac, iPhone, iPad and website.
