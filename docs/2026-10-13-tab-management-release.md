## October 14 final follow-up scope — 0.2.19 / native 2610.14.2 candidate

The operator withdrew redirect pausing after Microsoft sign-in failures and explicitly requests full
URL chains on every platform in both navigation and history logs. Remove all countdown/interception
behavior and append each original/redirect/replacement URL, including queries/fragments, rather than
rewriting the selected entry. Native request bodies remain with the browser engine; restart/history
loads never replay POST bodies or serialized page state. The operator's complete-URL retention
choice supersedes earlier login/query redaction for browser history; explicit bookmark validation,
private profile settings and agent/tab sharing grants remain separate. Existing saved records are
preserved; missing historical redirect links cannot be reconstructed.

Workspace Tabs titles now select the existing chat/browser/terminal/viewer, restore hidden
navigation and reveal the selected tab. User Move also selects its destination workspace/chat and
reveals both navigation levels. Scheduled conversations accept only an explicit matching waiting
permission request for new conversation-only auto-approval; new folder trust is limited to the
currently offered folder. Context/revision checks and run-only storage remain, with no grants for
future schedule runs. Broader unrestricted guard removal was rejected by automatic approval review;
the narrower current-request implementation was accepted. No actual operator approval was changed.

604 Node checks, static checks, source desktop navigation/redirect/download rehearsals, 81 PHP
tests (724 assertions) and two-owner web UI pass. All 113 native unit checks plus the actual
SPA-history and Workspace Tabs title/navigation UI workflows pass. Final rebuilt signing and
installation are in progress. Earlier 0.2.19 fingerprint 1760b42c473f was
an uninstalled candidate before these additional requests; never install or transfer it as final.
Website cleanup verified/deleted 21 expired ordinary release sets (7.71 GiB), retains current plus
two previous generations and seven unique migration pins, leaves unknown files intact and preserves
the 15 GiB budget. Automatic expiry occurs only after a new release passes audit. Website deployment
remains pending final source freeze and fresh verified recovery/restore.

## October 14 canonical Move follow-up — 0.2.19 acceptance underway

The second desktop exposed a main-navigation chat descriptor that stayed outside its destination
workspace when browser synchronization was paused. Move now updates canonical owner placement
across main/workspace scopes, converges duplicate chat placements and preserves unrelated tabs and
metadata. A top-level Move selects the destination chat and reveals both workspace/root navigation
and chat/child navigation even when the root bar overflows or the workspace was hidden. Browser
conflict recovery now names the affected tab/URL and uses plain saved-history/pending-page labels.
602 Node tests, static checks and actual desktop UI pass. Signing and per-host installation remain
pending; do not confuse candidate checks with installed acceptance. The operator authorizes retaining
current plus two previous ordinary website recovery generations instead of increasing its 15 GiB
budget. Unique migration pins and unknown/failed files remain protected. The full standalone-chat
subtab retirement and SQLite metadata migration are still review/deferred work.

## October 14 current acceptance — primary desktop 0.2.18 verified

Signed `93697aff6338` contains 228 matched runtime files and passes 601 Node tests, static checks,
source and exact-signed UI acceptance, plus package/vendor/isolated-launch/provider checks.
The actual UI verifies pointer/keyboard column resizing, chat Move with membership and destination
list rendering, viewer/browser moves without extra visits or lost Forward entries, expanded compact
sidebar with a still-visible native page, and agent document insertion immediately after its
workspace chat without a duplicate main-nav chat. Two test fixture cleanups now wait for log-worker
shutdown before removing disposable homes; no production data workaround was used.

Primary 0.2.18 is installed/live-verified with existing signing retained, a durable cold APFS
snapshot and original rollback app. All 76 logical navigation entries retained exact order,
ownership/profiles and drafts through 12 samples. All providers are ready, relay online and no new
warnings/errors occurred in the observed startup window. All three SQLite stores passed integrity
and all 2,590 currently protected retry receipts retained. Earlier receipt totals are historical
24-hour windows, not cumulative retention promises. Low-space preflight stopped before replacement;
only redundant task-created transfer/build/browser-cache staging was removed.

The same exact signed artifact/source is being transferred privately to the second desktop;
installation/live acceptance remain pending its receipt. Its initial guard safely stopped before
quit because an interrupted run retains two dormant follow-up messages. A narrowly reviewed
seven-case guard correction distinguishes that non-running state without clearing/replaying
messages; cold/after-launch exact run/message checks remain mandatory. Shared website UI passes 81 PHP tests /
724 assertions, production build and the two-owner disposable UI rehearsal. Its 0.2.18 code release
is staged; production deployment stopped before mutation because protected central recovery storage
reached the configured 15 GiB budget. A 20 GiB budget decision is pending; no protected backups were
removed. Native Mac/iPhone/iPad retain their verified 0.2.15 / 2610.14.1 builds from this rollout.

Standalone chat-subtab retirement remains a [future design review](tab-navigation-review.md).
The earlier 0.2.17 and 0.2.18 in-progress sections below are historical checkpoints.

## October 14 agent document placement (0.2.18) — verification in progress

The operator reported that opening an agent-created document made a duplicate main-nav chat.
0.2.18 supersedes the uninstalled/unpublished 0.2.17 candidate, retaining its corrections and adding
workspace-aware viewer placement beside the existing chat. Source/file authorization remains tied
to its original chat, and reopen reuses the same descriptor. Standalone chat subtab retirement is
future design review, not an implemented redesign. Runtime/UI acceptance and rollout are in progress.

## October 14 follow-up (0.2.17) — verification in progress

The operator reported navigation operation-ID collisions during viewer movement, narrow title
columns, disabled chat Move menus, stale workspace chat-list membership and native browser overlap
with expanded compact navigation. Fixes are implemented; runtime/UI verification and the next
signed artifact are in progress. No 0.2.17 install is claimed. The affected-owner read-only diagnosis
found two saved retry queues with three colliding browser operations, including one closed tab;
the latest 400 retained log entries repeated that error. Private queues/receipts remain preserved.

# October 13 tab management and browser release

## October 14 signing and installation

**Desktop correction 0.2.16 is signed and primary-live-verified:** The destination operator resumed its update;
0.2.15 installed with retained data, but its final UI check found legacy chat-parent navigation
loss. The records, drafts and canonical browser/viewer data survived. A synthetic reproduction
identified the browser-only nonzero registry being treated as complete for newly managed types.
The correction imports those saved types before synchronization, records the completed import,
preserves browser authority and ordering, and keeps subsequent intentional closes closed.
All **594** Node tests and static checks pass; actual isolated desktop launches/restart verify
legacy chat/terminal/viewer membership, parent/child retention, order and intentional closure.
The exact signed correction passed package and restoration/restart UI acceptance. Primary desktop
**ea61a6f51465** is installed/live-verified: 20 automatically dropped logical surfaces were recovered
(seven chat parents, one terminal and 12 canonical child browsers), with latest drafts/other session
fields and current placements retained. All remain present through subsequent sync polls; the
restored navigation is visible. Provider catalogs/relay are ready, SQLite integrity and current
protected retry receipts verified. Low-space preflight stopped safely before replacement; only
superseded task staging/compiler intermediates were removed, with backups and source/artifact
receipts retained. The second desktop installed the identical signed correction, recovered 31 dropped entries while
retaining its current 41, and verified stable order through 60 sync samples. Current cold backup,
original signing, database integrity and 9,855 protected retry receipts passed. Drafts/settings/
profiles/pairings were retained; relay, both hosts and all three providers are healthy.
Native source/binaries are unchanged by this owner-service correction.

This section supersedes the earlier unsigned/locked checkpoint below. The operator unlocked
the build Mac. The signed **0.2.15** artifact retains the installed Apple certificate and
designated requirement, verified GitHub Copilot signatures and identical vendor bytes. Its
revision is **ec8b213d382e+dirty.535c75672ffd**, fingerprint **535c75672ffd…**, with **227**
runtime files and six build inputs matching the private source companion. The signed package
smoke test and browser visual/Playwright/developer-mode UI acceptance passed against this artifact.

The primary desktop is installed and live-verified. A fresh check found no active, queued or
waiting local turns; a graceful stop preceded durable complete app/data backups and replacement.
All 22 local run files and protected configuration survived; 6,363 protected retry receipts and
all three SQLite databases verified. The restored Workspace Tabs page, correct Extensions toolbar
placement, stable attention count across Configuration, read-only 73-tab inventory, external MCP
browser filtering/paging, all three provider catalogs and online relay were checked. These are
startup/read-only acceptance checks, not claims of a new production model turn.

The native Mac client is installed and launch-verified at **0.2.15 / 2610.14.1**, using its existing
profile, certificate and entitlements. Compiled executable sections and resources matched the
tested build, and the running translocated executable matched the installed app. Refreshing
the existing LaunchServices registration resolved the initial launch failure. No container or
Keychain data was edited; native AX UI inspection was unavailable, so its detailed UI acceptance
remains the simulator evidence below.

The second desktop has verified the identical signed artifact/source in private durable staging.
The operator specifically authorized interrupting its two current waiting chats, then explicitly
paused stopping Proteus in the destination chat. Its 0.2.14 remains running, neither waiting chat
was cancelled, and no replacement occurred. The physical native builds are signed against unchanged
existing device profiles. After a fresh operator unlock, both physical devices are installed and launch-verified
at **0.2.15 / 2610.14.1**: all **1,931** original file contents survived and saved destinations remained
unchanged after launch. iOS renamed four SplashBoard launch-snapshot paths during installation;
their bytes matched, with every other original path/hash identical. This is an OS cache-path
migration, not a saved-data exception. Complete durable before/after container copies and the
comparison receipt are retained. Earlier partial backups were preserved. The iPad's **3,565**
accessible original files matched byte-for-byte before launch; **12** OS-protected SplashBoard
snapshot-cache files could not be read and were omitted from the backup. No settings, history,
destinations or browser data was omitted. Its saved destinations remained unchanged after launch.
Physical interactive UI/gesture acceptance is separate from device version/process/retention checks.
The website code-only release **20261014T145118Z** (0.2.15) completed the established central
backup/isolated restore/activation procedure: all **9,214** deployed files, **14** endpoint checks
and **eight** served JS/CSS hashes verified; schema, runtime configuration and nutrition were preserved.
The website project structural validator passed. Authenticated production UI remains unobserved;
the two-owner disposable web workflow supplies the detailed interface acceptance. Do not describe dispatched
or prepared targets as installed. Private hashes, backups and receipts remain outside this checkout.

## Authorization and scope

The operator authorized applying all changes, building and installing after the October 13
intake. This supersedes the queue-only hold for BF-2026-10-13-04 through -20, excluding -09:
the JSON/SQLite metadata migration remains explicitly shelved. Existing logs and tab-stability
fixes are retained. Preserve current data, drafts, execution sessions, approvals and retry receipts.

Scope: required visible agent orientation; desktop redirect decision/native history handling;
chat move and workspace deletion; grouped recent destination picker; persistent browser tabs;
consistent attention counts; all-type tab service/agent management; Workspace Tabs interface;
downloads; visual Playwright input/image results; optional developer MCP and human DevTools;
extension-profile agent preference, extension toolbar/localization/popup fixes; readable question
and answer history. Desktop, web and native changes follow their actual backend capabilities.

## Status

Implementation in progress. No new build, installation or live workflow acceptance yet.
The existing modified checkout contains the prior tested releases and intake documents; retain it.
Do not interpret earlier queue-only statements as current authorization or earlier test results
as acceptance of this release. Each item needs implementation and relevant regression/UI checks.

## Validation and rollout

Run Node tests/static checks after execution/persistence changes, isolated desktop UI acceptance,
web checks and native simulator checks for their changed interfaces. Use synthetic fixtures and
separate app-data homes; never launch a second owner against production data. Package/sign once,
verify the signed bundle and corresponding source. Install with a fresh active-work check and
private consistent backups. Follow desktop-updates.md for the authorized second desktop; exact
artifact transfer and destination receipt are required before claiming it installed/live-verified.

Record implementation, test evidence, artifact identity and each target's installed/live status
here as work completes. Preserve private session and machine-specific receipts outside source.

## Implementation checkpoint — October 14

The active batch now has a shared all-type descriptor/service boundary, trusted local stdio
`proteus_tabs` MCP, required provider guidance and captured tool inventory. Chat membership is
separate from captured execution configuration. Workspace deletion keeps archived execution
profiles and a retry journal, preserving conversations while closing associated resources.
Workspace Tabs controls exist in desktop, web and native clients; mobile navigation excludes
hidden descriptors. Desktop viewers/terminals move through the service without recreating their
source/session. Browser persistence is excluded before normal retained-tab ranking.

Browser tools now include Playwright MCP 0.0.83 with Playwright 1.64.0, optional Chrome DevTools MCP
1.10.1 and selected-tab human DevTools/Inspect. Controller handoff releases the debugger; human
DevTools must close before agent automation resumes. The private CDP bridge exposes one assigned
embedded page, not a global browser/profile endpoint. Model-visible images use provider-native
image results. Coordinate input checks observation ID, age, URL, viewport, device scale and
navigation revision. Extension profiles can explicitly allow agents while retaining tab grants.

Desktop GET redirects pause for five seconds with Accept/Reject, timeout acceptance and Back
cancellation; native iOS reconciles server/replaceState history without a banner. Both retain safe
requested destinations. Non-GET redirects follow natively to preserve their request bodies; SPA
replaceState is reconciled because delaying it cannot safely pause a site's application state.
No claim is made yet about the particular live ADO navigation or expired/private Zoho session.
Desktop downloads have bounded history, progress/cancel, collision-safe OS Downloads destinations,
settings and Save As. Native ordinary WKDownload handling adds history, Files-folder selection,
progress/cancel and explicit file export; it uses the device's Files storage rather than a Mac path.

Validation so far: 588 Node tests and static checks passed at the earlier implementation checkpoint;
subsequent changes require final rerun. Actual isolated desktop UI checks pass answered-question
rendering, GET redirect decisions/Back/timeout/replaceState/provenance, completed and cancelled
downloads with collision-safe names, extension localization/API popup rendering/bounds/dismissal
and explicit profile-agent preference. Earlier scoped Playwright/developer/visual tests passed;
a later run correctly rejected an observation after a viewport change and is being repeated on
a selected settled view. Native simulator builds passed with workspace deletion and downloads;
expanded native regression/UI checks remain in progress. No package or installation of this
release has occurred. All evidence/test homes are private; existing production app data is intact.

Remaining before release: finish resource/nav move and restart acceptance, external MCP protocol,
mobile/web UI and required final tests; reconcile feature docs/planned status; bump versions;
package/sign and test the exact bundle; privately back up and install with fresh work checks;
transfer the identical artifact/source to the authorized destination and await its verified receipt.

## Release candidate and current hold

Version **0.2.15** (native **2610.14.1**) is implemented. The latest unsigned desktop staging
bundle has revision **ec8b213d382e+dirty.535c75672ffd**, fingerprint
**535c75672ffd1ecadaee73ce782725eea1205d2e7c8daee672cb81249a510b68**, with 227 runtime files.
Packaging preserves Copilot vendor bytes and validates source/file sets; Apple signatures and
account setup are deliberately unchecked while the coordinator Mac is locked. This is an unsigned
candidate, not an installed or distribution-signed release. No production app/data was replaced.

Final source checks pass **592 Node tests** and static validation. Web passes **81 PHP tests /
724 assertions**, Vite build and the isolated two-owner workspace/history interface rehearsal.
Native passes **66 unit tests**, workspace Tabs/type/navigation and download settings/history UI,
plus real WKDownload attachment completion and SPA push/replace/hash navigation UI on the phone
simulator. The native concurrency fixture now settles the real selection/interaction metadata
write before arranging its competing writer; actual revision-conflict/rebase coverage remains.
Unsigned bundle rehearsals exercise scoped Playwright/developer/visual tools, human inspector
handoff, original resource identities, document authorization, redirect decisions/downloads and
extension localization/popup/profile grants. Signed acceptance is still required after unlocking.
Observations/catalogs do not advance interaction dates; real content inputs do. Moves preserve
known dates and resource/source identities. Native unassigned legacy default-profile history
remains visible as local evidence without relabeling it as another computer's recorded history.

The operator-authorized Zoho link was opened read-only in an isolated profile. Model-visible image
transport captured the sign-in surface; it did not reach an authenticated remote desktop. No
remote desktop input, credential transfer or live-session acceptance is claimed. A synthetic
canvas independently verifies visual input and stale-observation rejection. Exact live ADO
behavior and physical gestures are not claimed as verified by these rehearsals.

The coordinator confirmed its Mac is locked and requested unlock under AGENTS.md. Signing,
installation, fresh active-work checks/backups and final signed/installed acceptance remain
pending. The authorized destination Codex chat is preparing a read-only readiness check only;
it has no permission to interrupt work, independently rebuild or install this unsigned candidate.
The previously installed releases remain intact. Proceed with the exact tested signed artifact
and source companion after unlocking; preserve any newly active work and report each target's
installed/live status separately.

Destination readiness confirms its Mac is also locked, with one awaiting-input chat, one runner
and an online relay. Its 0.2.14 app/data are unchanged. Resolve the lock before Apple checks;
a fresh check must match any carried-forward interruption authorization to the actual waiting
chat before stopping it. This read-only preparation is not destination installation.

The corresponding source companion includes the project tab-manager agent and matches every
one of the candidate's 227 runtime hashes and build inputs. Archive hashes and the verified manifest are kept with the private build receipt; documentation-only
updates regenerate the companion, so reverify its manifest and archive hash before transfer.
Final unsigned bundle rehearsals pass MCP/visual observations, redirect/download handling,
browser/PTY/viewer moves and extension localization/popup/profile preferences. Signing and
installation remain pending unlock on both Macs, with physical native/web rollout still separate.
