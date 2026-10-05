# Content workspace release validation — 0.2.0 rollout

Version **0.2.0**, final Mac and native source `d24bd8a3904f3370044410b2fb4a306e24f269cd`,
with native build **2610.5.2**. The website subsequently added a web-only Activity classifier
correction at `2355d6bd004d3743bf79566937e1e32697e354bd`. The initial 0.2.0 Mac/iPhone/iPad
release used `74da6f78827de0145f2164b3a1d2d065202dea0e`; website release
`20261005T221822Z` and Home correction `20261005T224447Z` passed separate 14/14 audits.
The follow-up source adds larger guarded attachment batches, bounded Claude MCP status
settling and website chat-title persistence; **340/340** integrated Node tests and
`npm run check` passed. Build Mac and both physical iOS devices now run the final build,
installed in place with their data and signing preserved. Work Mac had the base 0.2.0 installed
and both desktop pairing directions authenticated; its final reinstall and live Claude
readiness check remain pending. Website release `20261005T232043Z` from `d24bd8a` preserved 9,212 files and protected
configuration, schema and nutrition state; a new 14/14 audit passed at 23:34:50 UTC.
The web-only Activity correction deployed as `20261005T234233Z` and passed 14/14 again
at 23:45:35 UTC. The actual HC chat had five grouped Activity entries with approval counts
and zero standalone Auto-approved entries. These are separate surface results, not blanket
cross-device acceptance.

Follow-up native validation passed 53/53 unit tests plus two iPhone and one iPad focused
viewer tests before physical reinstall. Historical receipts remain in `release-validation.md` and
`parity-release.md`; current private receipts are listed below.

## Source acceptance at the frozen commit

- Desktop/backend integrated Node suite at the installed base: **331/331 passed**, `npm run check` and `git diff --check`
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

## Additional source acceptance

Chat context menus, archive/unarchive, Show Archived filters and guarded delete were added before
freeze. Host persistence, remote authorization, cached/restored tabs and native long-press behavior
passed focused acceptance. The remote protocol suite passed 13 tests, peer-cache coverage passed
19 including stale in-flight deletion and restart, and Electron lifecycle passed 10 UI checks.
Active cleanup ownership blocks deletion; scheduler occurrence journals remain intact. Only
synthetic conversations were deleted during tests.

The installed Copilot mismatch was reproduced as a stale SDK-process quota snapshot. Independent
read-only probes on both Macs confirmed the same account and matching fresh quotas, without a
model turn or authentication change. Source now uses a separate short-lived quota client; eight
synthetic usage tests passed. In the installed Personal app, an explicit fresh read-only usage
request on October 5 at 22:30 UTC returned 75.1% remaining, nonstale and without error. Its
monthly reset is labeled expected rather than provider-reported. This is not a provider turn.

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

## Rollout checks and remaining gates

The installed base source passed 331/331 integrated Node tests, syntax/static checks, focused Electron
and native acceptance, and a signed packaged-app smoke. The final follow-up source passed
340/340 integrated Node tests and `npm run check`. Its signed Mac archive contained 119 verified
files; the isolated packaged different-cwd synthetic MCP launcher passed. A separate packaged
GUI smoke was inconclusive because the already-running installed singleton intercepted it;
actual installed Home launched and was observed after the guarded replacement. The packaged Electron-as-Node launcher
ran an isolated selected synthetic MCP server from a different captured working directory, with
no real MCP server or model turn. Build Mac installation used the approved signing identity,
verified graceful shutdown and a terminal guard, and preserved settings, run/schedule files,
Life state, content-tab order/history and three incoming pairings. The initial installed
Home/version, compact navigation, unloaded browser restoration, peer links and fresh Copilot allowance were checked in the actual app. The final `d24bd8a` guarded
Personal install preserved twelve then-current content descriptors/order, four pairings,
settings, runs/schedules, Life state and histories. Its Home visibly showed version 0.2.0 and
build `d24bd8a3904f`; five main browser rows remained unloaded and the Team child browser
stayed a saved descriptor. A later snapshot showed fourteen content tabs after continued app
use. At 23:32 UTC Personal's authenticated index had five local and fifteen HC chats,
`partial:false`, with both host rows online. Cached read-only Copilot, Codex and Claude usage
was available; no forced quota fetch or model turn was used.

Both physical iOS devices were updated in place again from `d24bd8a` with the original
team/profile and verified data/pairing preservation, installed build 2610.5.2 and independent
running-process checks. Build Mac saw both updated clients online at 23:23:28 UTC.
Both physical clients subsequently reached both authenticated Mac hosts independently (HC at 22:48:32 UTC; Personal at 22:49:00 UTC).
Physical notification taps, uploads and provider calls were not exercised. The base website
activation preserved configuration, schema and nutrition state and passed all 14 guarded health
checks; the subsequent Home-only correction preserved those stores and passed its separate 14/14
health audit at 22:49:33.926 UTC. Live Home shows a 12-character build ID with full-ID tooltip
inside its card at a 1280-pixel viewport.

Work Mac 0.2.0 launched with its data preserved. Desktop pairing is authenticated in both
directions: HC read Personal's five chat metadata records and fifteen local records with
`partial:false` around 22:52 UTC; Personal independently refreshed HC's fifteen records at
22:54:20 UTC with `partial:false`. The new Build incoming identity, `Proteus on workstation.example.test`,
was online at 22:51:27 UTC with resource and document access off. No chat turn or mutation was
used for these checks. HC passed a normal macOS installed-app signature check without
Keychain or trust changes. The initial installed Claude MCP status probe sampled once
immediately after initialization, so Safari showed connected while ADO/Atlassian showed pending. This is a confirmed probe bug, not evidence
that those servers failed. A bounded settle fix is in the follow-up source; the final Mac reinstall
and live recheck remain pending. HC also read the saved shared-account identity through `/api/app`
at 23:09:32 UTC without a credential change or scope mutation. No Claude model turn was used.

The website Home-only build-ID width correction from `d9e3d96` was deployed as
`20261005T224447Z`; its independent 14/14 endpoint audit passed at 22:49:33.926 UTC.
The audit reported zero Laravel and relay-Apache errors, one expected `.env` denial, 17 PHP
lifecycle entries plus one unclassified entry, and 1,242 known MariaDB `column_stats` warnings
plus one unclassified entry in the bounded 22:48–22:49:34 UTC window.
Website `d24bd8a` then deployed as `20261005T232043Z` with verified file parity and
protected-state preservation;
its 23:34:50 UTC endpoint audit passed 14/14. The newer bounded log window contained one expected `.env` denial, 18 PHP lifecycle
entries (17 initially recognized plus one systemd monitor interval), 510 known MariaDB
`column_stats` warnings and one unrelated different-account login denial. All categories
were classified; none required corrective action for this release. The web-only Activity auto-approval grouping correction then deployed and passed live HC
chat acceptance: five grouped Activity entries with approval counts and no standalone
Auto-approved entry. Its final bounded audit logged one expected `.env` denial, 18 PHP
lifecycle entries, 552 known MariaDB `column_stats` warnings and one unrelated
different-account localhost connection abort. Laravel and relay Apache had zero recent
errors; all categories were classified, with no corrective action in scope.
The recovery capture had an ordinary isolated restore failure, then passed a user-approved
supplemental isolated restore at 23:17:03 UTC without production writes. A live backup-state
comparison was not performed. Detailed deployment receipt:
`/private/tmp/proteus-web-d24-final-verification.json`.
The live account timezone was changed from UTC to America/Denver and a 3:39 PM chat timestamp was
verified; an automatic/device-timezone option remains follow-up. MariaDB's known `column_stats`
warnings and the unrelated login denial preclude an all-clean logs claim.

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

| Surface | Verified state | Private evidence / remaining limit |
| --- | --- | --- |
| Build Mac | Final `d24bd8a` 0.2.0 installed and Home/build observed; then-current twelve content descriptors/order, histories, settings, schedules, Life state and four pairings preserved; five main browser rows unloaded, Team child saved | `/private/tmp/proteus-content-workspace-install-20261005T232900Z/receipt.json`, `/private/tmp/proteus-d24bd8a-personal-acceptance.json`; signed 119-file archive `/private/tmp/proteus-content-workspace-d24bd8a3904f/Proteus-d24bd8a3904f-macos-arm64.zip` SHA-256 `4a74e2a5c5d732b4f805f86657c0df06a9b29c4672b416708e0ffd0b55d0bdae`; 23:32 UTC read-only index: Personal 5/HC 15, `partial:false` |
| Work Mac | Installed 0.2.0 build `74da6f7`; normal macOS signature check passed; 15 runs, five schedules, open tabs and existing pairings preserved; HC → Personal read-only index returned five Personal and fifteen HC chat records, `partial:false` | Bidirectional desktop pairing verified. Initial installed Claude MCP status probe has a confirmed startup-settling bug; source fix ready, Mac reinstall and later readiness check pending; no live model turn |
| iPhone | Final `d24bd8a` 0.2.0 (2610.5.2) installed in place; five app-data files/preferences and both Mac destination identities/selection preserved; independent process check passed | `/private/tmp/proteus-iphone-attachment-batch-update-20261005T232240Z/receipt.json`; Personal saw updated client online 23:23:28 UTC; no physical notification/provider/upload test |
| iPad | Final `d24bd8a` 0.2.0 (2610.5.2) installed in place; four app-data files/preferences and both Mac destination identities/selection preserved; independent process check passed | `/private/tmp/proteus-ipad-attachment-batch-update-20261005T232123Z/receipt.json`; Personal saw updated client online 23:23:28 UTC; no physical notification/provider/upload test |
| Website | `d24bd8a` deployed as `20261005T232043Z`, then web-only `2355d6b` as `20261005T234233Z`; both preserved 9,212 files and protected state and passed 14/14 audits, latest at 23:45:35 UTC; HC chat Activity grouping verified | d24 receipt `/private/tmp/proteus-web-d24-final-verification.json`; earlier base/Home receipt `/private/tmp/proteus-web-live-acceptance-20261005.json`; d24 audit had one expected `.env` denial, 18 PHP lifecycle entries, 510 known MariaDB `column_stats` warnings and one unrelated different-account login denial. Web-only Activity grouping verified in the later release; latest logs had 18 PHP lifecycle entries, 552 known MariaDB warnings, one unrelated different-account connection abort and one expected `.env` denial, so no all-clean claim |

Native final attachment-batch detail: `/private/tmp/proteus-native-attachment-batch-final.md`;
build receipt: `/private/tmp/proteus-attachment-batch-native-release-20261005/build-receipt.json`.
Personal final installed acceptance: `/private/tmp/proteus-d24bd8a-personal-acceptance.json`.
The development iOS provisioning profile expires October 10, 2026 at 23:29:01 UTC and has no APNs entitlement.
