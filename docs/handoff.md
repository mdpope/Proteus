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

**October 14 latest acceptance:** Primary desktop 0.2.18 `93697aff6338` installed/live-verified:
601 tests/checks and exact signed UI/package acceptance pass, 76 logical tabs/drafts/order retained,
providers/relay healthy, no new startup warning/error. Second-desktop exact transfer/acceptance is
in progress. Website 0.2.18 is tested/staged but blocked before deployment by the existing protected
15 GiB recovery budget; operator decision requested, no protected backups removed. Native Mac,
iPhone/iPad retain verified 0.2.15 / 2610.14.1. Standalone subtab retirement is review only.
See release ledger; earlier candidate/paused/locked paragraphs are historical.

**October 14 agent-document follow-up:** The operator expects agent-opened viewers next to the
existing workspace chat, not a duplicate top-level chat container. 0.2.18 supersedes the uninstalled
0.2.17 candidate and adds workspace-aware document routing/reuse/authorization retention. Its
checks and rollout are in progress. Retiring standalone chat subtabs is review only.

**October 14 follow-up:** The operator reports tab-move operation-ID errors, narrow Workspace
Tabs titles, disabled chat Move menu, stale workspace chat membership and compact sidebar hidden
behind native browser content. 0.2.17 implementation/verification is underway; do not claim it
installed before per-target acceptance. Earlier 0.2.16 release is verified on both desktops.

**October 14 latest:** Primary desktop 0.2.16 `ea61a6f51465` is installed/live-verified with
legacy navigation recovered; second desktop is also installed/live-verified on the exact artifact.
Its 31 recovered entries and 41 existing entries retained stable order through 60 sync samples.
Native Mac, iPhone and iPad 0.2.15 / 2610.14.1 are installed/launch-verified with saved data and
destinations retained (iPad backup excludes only 12 unreadable OS launch-snapshot cache files).
Website 0.2.15 remains deployed/verified. The earlier paused/locked checkpoints below are historical.
See the [release ledger](2026-10-13-tab-management-release.md) for evidence and limitations.

**October 14 rollout:** Signed 0.2.15 `535c75672ffd` is installed/live-verified on the primary
desktop; native Mac 2610.14.1 is installed/launch-verified. The website is deployed with central
recovery, isolated restore, all 9,214 file hashes, 14 endpoint checks and eight served assets verified.
The second desktop has verified exact signed staging but its operator explicitly paused stopping
Proteus in the destination chat; 0.2.14 and both waiting chats remain untouched. Physical devices
remain staged until a fresh unlocked/reachable check passes; no physical replacement is claimed.
Follow the [release ledger](2026-10-13-tab-management-release.md) for target status and limits.
The earlier locked candidate checkpoint below is historical; SQLite metadata migration stays shelved.

**October 14 candidate ready; signing/install held by lock:** BF-04–20 excluding shelved BF-09
is implemented in 0.2.15 / native 2610.14.1. 592 Node checks, 81 PHP tests, web owner rehearsal,
66 native units and four native UI workflows pass. Unsigned desktop candidate `535c75672ffd`
contains 227 validated runtime files; bundle rehearsals run with disposable homes/mock Keychain.
The coordinator Mac is confirmed locked. Operator unlock is pending before Apple checks/signing
and installation; no production application/data was replaced. The destination chat is doing
read-only preparation, without interruption/rebuild/install. Follow the current
[release ledger](2026-10-13-tab-management-release.md); all older queue-only statements below
are historical. Keep SQLite metadata migration shelved and private evidence outside source.

**October 13 full intake implementation/build/install authorized:** The operator now authorizes
the active October 13 batch BF-04–20, excluding shelved BF-09 storage migration. The queue-only
notes below are historical. Implementation and validation are in progress; no new release is
installed yet. See [current release ledger](2026-10-13-tab-management-release.md). Preserve all
existing edits, private app data and active work; source checks alone do not establish UI acceptance.

**October 13 extension/response intake — historical queue scope:** BF-17 is now explicitly confirmed:
agents can be enabled on extension tabs. BF-18 moves extension controls into the address toolbar
between Go/Overview, replaces overlapping Install UI and resolves raw localization placeholders.
BF-19 fixes blank/fullscreen/undismissable popups with bounded host-owned dismissal/error handling.
BF-20 owner read-only diagnosis is complete: native Copilot events, saved JSON and API agree; the
first explanation was never emitted as a finalized reply, and the later explanation is preserved
inside the feedback question. Queue readable historical question context instead of collapsed
Activity and guidance to explain before dependent follow-up questions. Actual historical UI
rendering remains unverified; the affected chat was not selected. Evidence stays private. No
implementation/build, profile changes, feedback sent or running-chat interruption.
The operator also reports answered Copilot/Claude questions disappear while their replies remain.
BF-20 reopens BF-2026-10-07-07 visible-history acceptance: show complete question/context/choices
with its linked answer; durable system-event capture alone is insufficient. Queue only.

**October 13 developer integrations/profile policy — queued only:** BF-16 records the operator's
choice of default Playwright, optional on-demand Chrome DevTools MCP, and human built-in DevTools/
Inspect on the selected embedded browser tab. Reuse packages through one owner service boundary;
test Electron/private-bridge compatibility and debugger coexistence. BF-17 proposes a configurable
override of the current all-extension-profiles-private rule, retaining per-tab sharing and distinct
developer/Live Browser scopes. No packages installed, settings/grants changed or app build started.
See [build-list scope](planned-updates.md).

**October 13 visual Playwright control — build-list intake only:** BF-2026-10-13-15 extends
existing embedded-tab Playwright with model-visible screenshots and coordinate mouse/drag/keyboard
input for Zoho Assist/canvas interfaces. Text ARIA snapshots cannot expose drawn desktop controls;
browserTools and Codex tool results currently return text, so image transport is part of the change.
Reuse profile/tab permissions and scoped CDP; verify scale/crops/resize, stale observations and
actual remote input. No private session URL/contents recorded, live acceptance or app build.
The operator now authorizes the Zoho session already linked in this chat for future BF-15 tests;
reuse it for reversible visual/input checks and carry this consent forward. Keep session details
private, restore prior state and report expiry if encountered. This does not lift the build hold.
See [queued scope](planned-updates.md).

**October 13 browser downloads — queued only:** BF-2026-10-13-14 requests a Firefox-style
indicator/panel, progress/history/date, per-item Cancel, OS Downloads default, configurable folder
and Open folder in Engine Room Browser Preferences, plus right-click Save As. Existing helper-view
grants support explicit linked-file Save As but reject ordinary page downloads; extend the shared
lifecycle without losing request/profile protections. Native currently uses temporary-file export.
No implementation/build/install or live workflow verification; see [queued scope](planned-updates.md).

**October 13 Delete workspace intake — queued only:** BF-2026-10-13-13 deletes workspace
configuration/navigation and closes all affected tabs, while preserving chats as unhoused or
bulk-moving them to an existing/new same-owner workspace. Include archived/non-open chats;
preserve active turns, effective configuration/approvals and files. Default/final workspace and
schedule dependencies need explicit handling; current context requires a nonempty/default profile.
This is scope intake, not permission to delete data or build. See [queued scope](planned-updates.md).

**October 13 Workspace Tabs design — queued only:** BF-2026-10-13-12 adds Tabs between Chats/
Configuration: every open workspace-nav tab, icon/title/flexible URL/opened/interaction/actions,
hide/restore/reorder/close/move. Browser, terminal and viewer placement must share associations;
preserve PTY/session and document authorization origins independently of display parent. Existing
transfer dialog explicitly rejects non-browser types. Synthetic interactive context is saved in
docs/design/2026-10-13/workspace-tabs.html and workspace-tabs-preview.html. Preview-only actions;
no app implementation/build. See [queued scope](planned-updates.md).

**October 13 agent tab/chat management — queued only:** BF-2026-10-13-11 requests internal/
external agent inventory, filtering, metadata, close/move across chat/workspace/main/Team scopes,
plus chat move/close/archive/unarchive. SafariSelector MCP/report patterns reviewed locally.
Use one host service boundary, durable identities, honest timestamps, real nav moves and separate
management/content grants. AGENTS.md and .github/agents/proteus-tab-manager.agent.md now provide
project guidance; this does not register new tools. BF-04 covers future mandatory runtime guidance.
No runtime implementation/build/install; SQLite remains shelved. See [queued scope](planned-updates.md).

**October 13 attention badge intake — queued fix only:** BF-2026-10-13-10 records 103 versus 5
when switching workspace Configuration/Chats and reported Needs attention navigation. Code shows
full render counts combined chat/non-chat attention, but chat-index callbacks overwrite the badge
with chat-only totals. Unify the global calculation; navigation must not acknowledge/narrow it.
No live item breakdown, implementation or build; see [queued fix](planned-updates.md).

**October 13 storage options — shelved future idea:** BF-2026-10-13-09 compares current JSON
workspace/chat/tab persistence with SQLite. Recommend considering a hybrid: editable configuration/
schedules/export stay JSON; mutable organizational metadata and tab placement may use a separate
worker-owned app-state database. Define field authority and captured execution/approval boundaries
before claiming atomic Move chat; a database transaction cannot atomically update run JSON too.
Full transcript migration is a separate option. The operator shelved this outside the active
update batch. No benchmark, migration decision, implementation or build is authorized.
See [future ideas](planned-updates.md#future-ideas--shelved-outside-the-active-update-batch).

**October 13 Persist browser tab intake — queue only:** BF-2026-10-13-08 requests a Persist tab
toggle: prevent automatic unloading and exclude those tabs before normal retained-set/quota
selection. Desktop currently protects six newest records plus active/agent/audio/download work
and retires older eligible views after an hour. Remember persistence through restore/move,
retain truthful loaded-resource totals and review manual/native/owner-host lifecycle scope.
See [queued scope](planned-updates.md). No implementation/build/rollout authorized.

**October 13 Send tab picker intake — queue only:** BF-2026-10-13-07 requests labelled Workspaces
and Chats sections in the destination picker, each most-recent first, while retaining Application
tabs/Team Tools choices and existing transfer rules. The screenshot/current implementation use
a mixed flat list in tab order. Do not reorder actual tabs or confuse this presentation change
with Move chat membership. See [queued scope](planned-updates.md). No build/runtime changes.

**October 13 Move chat intake — queue only:** BF-2026-10-13-06 requests a Move button immediately
left of Archive, styled like existing lifecycle buttons, with a workspace picker and real chat
membership/tab relocation into the target workspace nav. Desktop/web/mobile parity is required.
Keep effective per-chat run options/configuration; current workspace inheritance and approval
identity mean this is not a tab-parent/ID-only change. Existing Send to workspace only opens the
current workspace. Same-owner destinations by default; no silent execution-host transfer or turn
interruption. See [queued scope](planned-updates.md). No implementation/build/rollout authorized.

**October 13 redirect-history intake — queue only:** BF-2026-10-13-05 records Back/swipe returning
to the same page after ADO adds `view=results`. Current direction is platform-specific: Electron
desktops use the proposed five-second Accept/Reject redirect banner (timeout follows; Back
cancels), while iOS/iPadOS uses history reconciliation without a banner. Native redirects and
replaceState update their existing entry/final URL; real push/filter navigations stay traversable.
Both retain original requested destinations as recoverable provenance, including login deep links.
The old identical native-banner proposal is superseded, not an implementation requirement.
Exact ADO behavior remains unverified. Scope/references/acceptance are in [future intake](planned-updates.md).
No runtime/build/rollout is authorized.

**October 13 future-update intake — queue only:** BF-2026-10-13-04 proposes required, visible
Proteus feature awareness for chat agents, with a compact core/capability index and optional
on-demand feature/tool loading. Review options within the existing context/details interface;
no full redesign or runtime implementation/build/rollout is authorized. Read-only inspection
confirms provider-injected app guidance and partial browser/document/integration tools already
exist independently of workspace files, with provider/runtime differences. The full requested
chat/workspace/approval/log/notification surface is not yet supplied. See [queued scope](planned-updates.md).

**October 13 browser tab stability authorized:** The operator reports title/size flicker,
flashing tab strips and changing order on both Mac desktops. 0.2.14 preserves restored titles,
reconciles unloaded title snapshots, avoids unchanged strip reconstruction and protects a user
reorder during awaited navigation. Mutable navigation snapshots are detached and overlapping
scope applications remain guarded. See [current ledger](2026-10-13-tab-stability.md) for tests
and per-Mac status; both desktops are installed/live-verified on signed `dfad6e187477`. The second Mac’s single
waiting chat was interrupted only after explicit operator approval, with history retained. 580 tests,
checks and signed tab/Team/package acceptance pass. Current data/order/retry receipts survive.

**October 13 logs/browser correction authorized:** The operator approved building the fresh list
with a separate rotating log database and added broken browsing/link clicks. Implemented in
0.2.13: worker-owned SQLite logs (up to 2,000 entries), expandable details/cursor pages and
protection of page-initiated navigation from stale history polling. Primary desktop signed
`61555b94efec` is installed/live-verified, retaining all 17 run files and 5,933 protected retry
receipts with private consistent backups. 579 Node tests/checks, 81 isolated PHP tests, 108 native
unit tests and both native log UI rehearsals pass; final signed log/link/package acceptance passes.
Second desktop rollout completed with 0.2.14; production web and physical-device rollout remain pending. See [current ledger](2026-10-13-logs-browser.md).

**Historical October 13 fresh intake — superseded by approval above:** The operator started a new bug fix / feature list
and instructed **do not build until told to do so**. BF-2026-10-13-01 queues compact log headers,
expandable full diagnostic details and storage/API/UI pagination. Read-only inspection confirms
local activity is currently bounded JSON with 1,000-character messages; a dedicated worker-owned
SQLite activity/log store is proposed, not implemented or approved. See [planned updates](planned-updates.md).
Historical release authorizations below do not authorize implementation/build/rollout of this batch.

**Latest popup correction:** Local desktop `68095bceb17e` includes the Internet Search input-fill fix and prior Team/startup corrections. Signed-package and three-size popup UI checks pass; current data and retry receipts are preserved. HC newest exact transfer dispatched for staging; its work is idle, but destination resume confirmation remains pending after cross-chat evidence lookup failed. See [release ledger](2026-10-12-unified-browser.md).

**October 12 unified browser release — installed acceptance in progress:** The approved design and queued fixes are implemented. Corrected local desktop `88eb46f0db39` is installed and restored-chat UI verified, including the duplicate restored-browser-view startup correction and Team Tools browser preservation. Web release `20261013T063152Z` is live with recovery and parity checks. Physical iPad/iPhone 2610.12.4 are installed and launched; computer-native launch and live owner-history controls are verified. The user resumed HC installation after investigating Team Tools browser flashing on its current build; the old-build observation is saved and final `88eb46f0db39` is fully staged/hash/signature verified there. HC replacement waits on a live Copilot permission turn and destination confirmation after cross-chat authorization lookup failed. Preserve all data and retry protections. The corrected signed desktop/source pair is retained privately; do not install superseded `d2eacd78cf87`. See the [release ledger](2026-10-12-unified-browser.md) for tests and per-target limits. This supersedes historical design holds below.

**Historical October 12 direction — superseded by approval above:** Further fixes, builds and deployments are paused
pending the [unified browser synchronization proposal](browser-sync-design.md). New cross-device
history/unload, physical gesture and account/profile failures are recorded there. The subsequent
website-account-connected reply resolves an earlier sign-in question only; it neither lifts the
hold nor verifies history. Historical authorizations below do not override this direction.

**Historical chat interface intake — now implemented; rollout below:** Add Copy chat link to desktop/web tab
context menus and native long-press menus. Introduce a separate Run files & folders box below
authorization, ordered run record, provider session folder, starting folder, additional folders;
preserve actions and platform parity. See [planned updates](planned-updates.md). Included in the approved unified browser release.

**Historical agent browser placement intake — now implemented:** Workspace chats should open agent-created
browser tabs in their workspace automatically, with discoverable explicit application/workspace/
chat destination support. Inspection confirms the tool has no destination argument and desktop
agent creation defaults to the run ID without workspace resolution. Workspace placement and explicit application placement now pass live Chromium rehearsal. Details and acceptance are in planned updates.

**Historical workspace evidence — corrected in the unified browser release:** Read-only inspection of the operator-specified private
run accounts for four unexpected top-level research tabs; browser results use a run parent ID
despite saved workspace association. Accessibility snapshots read live pages. Separate confirmed
code defect: desktop peer index drops workspaceId required by the workspace chat-list filter,
explaining empty remote lists while workspace tabs synchronize. Preserve these as two linked
issues in planned updates; the approval above authorizes their implementation and rollout.

**October 12 assembly/UI correction — desktops installed:** The user authorized remote-state optimization,
BF-2026-10-12-01–04 and updates on both desktops. The collection-only queue hold is lifted.
Native tab icons plus browser history/gesture follow-up are included. Both desktops are live-verified
on signed `dcb5e9040a88`, with data/retry continuity preserved. HC mean remote-state assembly
improved from 121 to 16 ms; no >1-second stalls appeared in its 140-second sample. Native
2610.12.3 passed 92 unit cases plus focused UI acceptance and is installed on the primary
computer with launch, restored tabs and view navigation verified after operator confirmation.
Foreground acceptance now verifies HC chat connectivity, website navigation, Back/Forward and
unload/reload history. Both physical devices are installed/launch/preservation-verified on .3.
Shared history awaits website-account sign-in; physical gesture acceptance remains with the operator.
Production web is verified on `0.2.12-20261012T210124Z`. The restricted SSH update route is
installed and live read-only/retry/refusal checks pass; use [web updates](web-updates.md). Source changes, tests and rollout status
are tracked in [current ledger](2026-10-12-state-assembly.md). The full periodic
spinning-cursor pause is not yet causally resolved; retain that limitation.

**Scheduler correction installed on both desktops:** Signed 0.2.12 `ec8b213d382e+dirty.b1dd22a19b42` is installed/live-verified on both computers after Codex reconnect restored HC delivery. 502 tests, static checks and signed-package acceptance pass; data/retry continuity and online relay/peers are verified. Scheduler worker failures were zero. Timing instrumentation exposed remaining HC remote-state assembly stalls (~121 ms average slow phase; event-loop delay up to 381 ms during active work), so responsiveness is not declared fully resolved. See [scheduler ledger](2026-10-12-scheduler-performance.md). Separate feature intake remains held.

**Performance follow-up under investigation:** The operator reports periodic spinning-cursor hangs and choppy scrolling on the second desktop despite the journal correction. Read-only tracing found main-process load and subsecond delays, without capturing the full hang. See the [follow-up](2026-10-12-remote-performance.md#follow-up-periodic-desktop-stall-remains-under-investigation); earlier acceptance does not mean all stalls are resolved.

**Desktop update procedure:** Follow [desktop-updates.md](desktop-updates.md) for authorized updates through an existing destination Codex chat: exact signed artifact/source, private transfer, fresh local preflight, durable backups and verified completion.

**October 12 performance correction installed and verified:** Both desktop computers run signed 0.2.12 `ec8b213d382e+dirty.ef08cda12e87`. Worker-owned incremental SQLite receipts retain retry protections and original JSON; normalized tab sync suppresses redundant mutations. History persistence and process polling no longer block the main loop. All 482 Node tests, static checks, desktop/web integration and signed-package migration/restart acceptance pass. Both restored interfaces/relays and saved data passed checks; each idle sample recorded zero journal writes. See [performance ledger](2026-10-12-remote-performance.md) for evidence and recovery boundaries. The separate activity-card design hold is unchanged.

**October 12 missing-folder chat correction:** Missing supplemental folders no longer abort context capture/chat creation; omissions appear as system warnings and configured paths remain intact. Remote starting-folder validation also tolerates missing siblings. 442 Node tests/check, isolated desktop missing-folder rehearsal and signed-package smoke pass. Both computers installed/connected on **bbf0630ac8a7**, with app data and current workspace mappings preserved. See [missing-folder ledger](2026-10-12-missing-folders.md). Web/mobile benefit through the owner host. Starting folder and explicit main-agent checks remain strict.

**October 12 native browser correction:** Build **2610.12.2** is installed on the primary computer. Empty shared-tab placeholders no longer erase local navigation. Both simulators pass 80 native tests and the browser UI regression; 440 Node tests and static checks pass. Installed launch/version and chat browsing verified after macOS approval. Live-host sync acceptance remains limited by a host-confirmation timeout; repeated empty-response sync is covered by simulator UI tests. Desktop/web rollout below remains current. See the [browser correction ledger](2026-10-12-native-browser-sync.md).

**October 12 interface polish — latest desktop/web rollout:** Both computers now run signed
0.2.12 `ec8b213d382e+dirty.f03d25e4cdc1`, with live folder/menu/name/count checks and preserved
configuration, chat data, tabs and pairings. Production web is updated to
`0.2.12-20261012T071849Z`: recovery/restore verified, 14 endpoint checks passed and served assets
match the tested release. Tests: 440 Node, 80 Laravel, 78 native tests on each simulator plus
focused desktop/web/native UI tests. Proteus iPad on the primary computer is installed and
responsive-launch verified on 0.2.12 / 2610.12.1 after restarting a suspended first launch.
Physical devices retain 2610.11.1. Full status is tracked in the
[interface polish ledger](2026-10-12-interface-polish.md). Earlier status notes below are historical.

**October 12 rollout follow-up:** Build Mac now has the corrected 0.2.12 build
`ec8b213d382e+dirty.b0a14294e2c1`: clear expandable folder groups, category buttons above the filter,
scan-count separator and shared 2px navigation underline. Signed package and live UI verified;
65,480 app-data files preserved through replacement. Physical iPad and iPhone **0.2.12 /
2610.11.1** are installed/launch-verified; seven protected files and saved destinations retained
on each device. iPhone connectivity recovered on retry without resetting pairing.
HC upgraded through the existing Codex chat to the same verified build after explicit private-GitHub
transfer approval: both workspaces, 53 tabs, five pairings and approval rules retained; relay online. See the [release ledger](2026-10-11-workspaces-release.md) for current status.

**0.2.12 installed and verified on this Mac (October 12):** The approved Workspaces/backlog
batch is implemented. Proteus iPad was updated first, then desktop Proteus; both are launch-verified.
Node 435, Laravel 80 and native 76 tests per simulator passed, along with UI and signed-package
checks. This initial acceptance preceded the physical-device rollout recorded above; production
web remains unchanged. See the
[current release ledger](2026-10-11-workspaces-release.md) for evidence and limits. Historical
queued/held statements below describe earlier planning and are superseded for this batch.

**October 11 full batch authorized:** The operator approved implementation and tests for the entire
BF-2026-10-10-01–17 backlog, with Workspaces superseding Projects. Preserve existing styling/features.
Add fully configured local workspace Copy and consistent Starting folder labels. Test this Mac,
web and mobile simulators; update Proteus iPad on this Mac first. Physical iPad/iPhone updates
wait for the next instruction. [Current release ledger](2026-10-11-workspaces-release.md) supersedes
historical design/build holds below; distinguish implementation, verification and installation.

# Agent handoff

**October 12 intake item 04 — queued only:** BF-2026-10-12-04 records Proteus alert-banner
**View logs** doing nothing. Expected: open the appropriate Logs page and reveal the related
entry when available; fall back to the page if no exact entry exists. Alert type/client coverage
and cause are unverified. The fresh-release collection-only/build hold remains active.

**October 12 intake item 03 — queued only:** BF-2026-10-12-03 requests **Open in new Proteus
tab** insert the browser tab immediately to the right of its initiating tab, in that tab's
navigation container, instead of at the end. Preserve other tabs' order and existing routing,
profile/session and selection behavior. New-release collection-only/build hold remains active.

**October 12 intake item 02 — queued only:** Remote desktop chats reportedly omit the local
Working spinner/message despite recognizing active work. BF-2026-10-12-02 requests matching
status and queue/steer guidance driven by owner-host turn state, with existing action availability.
Screenshot confirms the local reference; remote reproduction/cause remain unverified. The new
release's collection-only/build hold continues; no application changes.

**October 12 fresh release intake — hold:** The operator started a new bug/feature list and
explicitly withheld builds until further instruction. BF-2026-10-12-01 queues shared desktop/
iPad/iPhone activity presentation: desktop's contained tool/approval entries, linked original
requests, tool-call references and per-tool completion timestamps/durations; native's contiguous
tools/system/approvals grouping between user/model messages, with distinct darker system boxes.
Requested proposed desktop/iPad comparison uses synthetic events. Collection/design only;
the operator clarified message-detail/relationship parity within each platform's existing design,
especially iPhone's different native layout. No full visual redesign or identical styling requested.
No runtime implementation, build, install or deployment. Earlier release approvals do not
authorize this fresh batch. See [new intake](planned-updates.md#october-12-new-release-intake--collection-only).

**October 11 revised Workspaces design — current direction:** The operator rejected the first
preview. Workspaces is a feature page with seven recent sidebar entries and no feature tab.
Opening a workspace creates its named main tab; its pinned Workspace child contains Chats /
Configuration button pages, with expandable configuration sections. Master Chats opens chat tabs
in main navigation; workspace Chats opens them inside the workspace. Same chat identity in both;
right-click Send to workspace deduplicates the workspace representation. Each workspace belongs
to one machine, synced for access elsewhere; another machine gets its own configuration copy.
Preserve existing configuration labels/modes/controls and BF-12 alphabetical folder sections/master
filter. Add per-root Refresh. All normal tools remain available; remove feature enable switches.
See [current design](workspaces-design.md), BF-17, and the current release ledger for implementation/verification.

**October 11 native iPad client on Mac:** The unchanged .5 iPad release is installed as
**Proteus iPad**, alongside the existing desktop app. The operator authorized its first launch
in macOS Security settings and confirmed it running; both processes were independently verified.
The Mac-compatible profile expires October 18 at 16:38 MDT and uses the existing Omi certificate.
No source implementation or certificate change. See `apple-build.md`; relay/account acceptance
is separate, and the feature hold below remains in effect.

**October 11 iPad recovery completed:** The same validated 0.2.11 / 2610.10.5 release is now
installed in place and launch/process-verified on iPad. Seven protected files were byte-identical
before launch and destinations retained afterward. The iPad profile expires October 18 at
16:24 MDT, using the existing Omi certificate. No certificate or Omi/iPhone change. Private
backups/receipts remain outside Git; see `apple-build.md`. The feature batch below remains held.

**October 11 iPhone signing recovery:** Re-signed the validated native 0.2.11 / 2610.10.5 artifact
and installed it in place on iPhone. Launch/process checks passed; seven protected files were
unchanged before launch and destinations retained afterward. Renewed profile expires October 18
at 00:47 MDT, using the same existing certificate as the recent Omi deployment. Omi and iPad
were not changed. Account checks now require Mac unlock first; after unlock, inspect the existing
Xcode account/device before treating CLI “No Accounts” as missing setup. See `apple-build.md`.
This recovery does not authorize the held feature batch below.

**October 10 new planning batch — hold:** The operator started a new issue/feature plan and
explicitly withheld implementation/build authorization. BF-2026-10-10-01–17 cover Ghostery
Browser Preferences opening Resources, Update Ghostery filters appearing to do nothing,
Chrome Web Store installation without manual folder handling, new tabs from menus/links retaining
the source navigation area (same chat, top application navigation, Team as applicable), and choppy
browser scrolling, plus a screenshot-confirmed gap beneath the website chat composer instead of
bottom docking, and an Internet Search dialog 30% wider / 40% taller with added space assigned
to its message box. BF-08 adds recurring main-process exceptions when moving a browser tab to an
Internet Search chat: both `onBeforeRequest` (line 82) and `onHeadersReceived` (line 78) dereference
`tab.view?.webContents.id`. Screenshot/source match is confirmed; lifecycle trigger remains unverified.
The blocking preload wheel listener is a performance lead, not a confirmed scrolling cause.
BF-09 limits link-hover status popups to one line, allowing the full browser width within edge
margins and truncating long addresses with an ellipsis.
BF-10 confirms Claude input accounting drops cache-read/cache-creation fields while labeling
uncached input as total Input tokens. The affected record has nonzero cached metadata; differing
summary scopes require reconciliation before historical backfill. No usage values saved here.
BF-11 records desktop history rapidly shifting up/down while typing; inspect composer sizing and
transcript resize/scroll-following interactions. Cause remains unconfirmed; coordinate with BF-06.
BF-12's operator-selected design is **Folder sections**, with folders/items alphabetical and
the master filter searching all Instructions/Skills/Agents/MCPs sections. The operator explicitly
reaffirmed do not build yet. [The preview](design/2026-10-10/artifact-folders.html) uses synthetic
sources; Folder sidebar remains unselected review history. Browser rehearsal covers filtering,
collapse/type/scope/narrow layouts. Production implementation remains held; no source files
or real loading rules reorganized. Design approval is not implementation/build authorization.
BF-13 adds address-bar filtering of recent history as typed, multiword-query **Search with…**
engine options and Enter using the configured default engine. Search chooser/default persistence
remain queued; preserve the current profile and source container. No application changes authorized.
BF-14 revisits Projects with a [design proposal](projects-design.md) and synthetic desktop/phone
[interactive preview](design/2026-10-10/projects.html). Projects own chats/tabs and inherited setup;
existing Workspaces remain reusable presets. Browser context stays in the project, and cross-device
sync distinguishes portable descriptors/configuration from host-local sessions/permissions.
Design review only; proposal acceptance and all production work remain pending.
The operator has now paused Projects here to continue it separately. BF-15 independently queues
whole-folder trust for one chat. Current pending-request folder trust saves workspace-wide grants;
chat-only auto-approval adds no folder access, and chat details lacks a folder grant editor.
Plan recursive read/read-write grants with continuation/restart persistence and revocation, without
affecting other chats/workspaces. Historical removal is unconfirmed. No permission changes authorized.
BF-16 (October 11) confirms a global discovery counter exhausted by an earlier root immediately
rejects later roots with a misleading 60,000-folder warning. Installed scanner matches source;
isolated scanning of the affected later root succeeds. Dependency/cache/generated copies inflate
earlier traversal. Plan per-root fairness, accurate partial status, configurable exclusions and
background/cached scans; separate mode saves from rescans. Starting-folder choices come from
workspace/chat roots, not the source library or recursive discovery. All runtime changes remain held.
October 11 follow-up: operator accepted BF-16's configurable exclusions and discovery recommendations
but immediately said **wait to build**. Work remains queued; no source implementation/build started.
Drop the proposed Use in this chat feature. Add Set as starting folder to BF-12 source-folder headers,
with an explicit chat/workspace target and unchanged trust/loading modes. Projects remains paused.
Intake, source leads,
feasibility references and acceptance criteria are in [planned updates](planned-updates.md).
Documentation and the explicitly requested standalone design preview only; no production runtime
changes, builds, installs or deployments. Historical release
approvals below do not authorize this batch. Extension-store feasibility is distinct from
verified compatibility of each extension.

**October 10 long-chat follow-up:** Adaptive meaningful-row pagination, ahead-of-scroll cache loading, lazy activity bodies, native composer-inset bottom restoration, one green directional expander, taller desktop/web New chat and stacked dark runtime/token values are implemented. Build Mac, web, iPhone and iPad have verified installations; HC has the latest signed artifact and retains its pending-run hold. See [current evidence](2026-10-10-mobile-history.md). Native .5 is installed on both devices with earlier history preparation; desktop/web paging remains unchanged after favorable operator feedback. Browser errors use a verified transient notification/Logs implementation. The repeated Build Mac command-limit report remains unexplained by the inspected 771-entry receipt log. The 40% size reduction was withdrawn; original sizes remain.

> **Acceptance reopened — October 6 evening:** The operator rejected the delivered UI.
> Read [the complete acceptance audit](2026-10-07-acceptance-audit.md) before relying on
> the historical completion claims below. It reviews all 22 + 28 build items and current reports;
> working-tree corrections are not installed release acceptance.

## October 9 follow-up issue queue

**0.2.11 production integration:** All BF-04–39 changes are included in the current source and fresh packages, including approved composer/details designs and automatic preview bundling. Historical paragraphs saying queued-only are intake evidence, superseded by [the full release ledger](2026-10-10-full-chat-release.md). Verify each actual installation separately.

**Corrected release scope — October 10:** The operator rejected the partial installation and
explicitly required **all changes queued in this whole chat**, including BF-25–37 and BF-39.
The earlier assumption that only BF-04–24 plus typing belonged in the rollout was wrong. The
approved prototypes are now integrated into production desktop/remote/web and native clients;
automatic preview bundling is also included. Track implementation, verification and deployment
separately in [the full-chat release ledger](2026-10-10-full-chat-release.md). Do not treat the
previous 0.2.10 installation receipt as completion of this release.

**Current rollout authorization — October 10:** The operator lifted the build hold and explicitly
approved building/installing on Work Mac, Build Mac, iPad and iPhone if available. The referenced
Codex build thread was read: it confirms 0.2.10 signed/staged and not deployed. Native typing
postdates that build. Current preparation covers BF-04–39, including the approved production designs and automatic previews. Preserve
signing, app data and pairing; install Build Mac last with an external handoff because this
chat's runner is hosted by the app being replaced. Record installed evidence separately from
build receipts. The previous hold and old deployment-separate notes below are historical.

October 10 full release evidence: [current ledger](2026-10-10-full-chat-release.md). Fresh 0.2.11
Mac and native 2610.10.2 packages are signed with the original certificates. Node 404, native 69,
Laravel 80 / 717 assertions and isolated desktop/web/phone/tablet acceptance checks passed.
The historical 0.2.10 physical installations lack this full scope. Build Mac, iPhone and iPad
now have verified 0.2.11 installations. Web release `20261010T160437Z` is deployed with 9,214
file hashes and 14 endpoint checks passed. HC has verified its signed installer but remains on
0.2.9 pending the operator’s choice about one awaiting-input chat and three queued runs.
Native development signing still expires October 10 at 17:29 MDT.

BF-2026-10-09-39 queues automatic sharing of chat-linked localhost previews through the encrypted
relay, including previews opened by a locally originated Mac chat. Proteus owns asset bundling,
versioning and updates; agents should not need custom packaging. See the acceptance contract in
`planned-updates.md`. Production 0.2.11 automatically bundles these previews; the older shared
HTML copies remain design-review history. Static snapshot delivery does not forward host APIs or HMR.

BF-2026-10-09-38 is separately authorized for implementation: native typing lag. `NativeReplyDraft`
and its observing composer child isolate text edits from `ChatView`/loaded-event scans. Quiet
text-draft writes preserve immediate in-memory save; other draft actions still notify. Automatic
cache encoding/encryption now runs on a serial utility queue; lifecycle flush/delete retain order.
Native long-chat typing and persistence verification passed; no physical install claimed.
The final iPhone simulator run passed 33 native unit tests, keyboard Send and both long-history
typing cases. Final iPad testing passed with those same compiled binaries using
`test-without-building`; no new build was started under the hold. 402 Node tests and static checks
passed. Full verification/limits: `2026-10-09-native-typing.md`.

Remote design review: `docs/design/2026-10-09/shared-previews.md` links the self-contained
desktop/web and adaptive mobile HTML documents. The existing encrypted document transport can
carry them without a localhost HTTP proxy; CSS and attachment-picker scripts are bundled into
`desktop-web-composer.shared.html`. Rebuild after design changes with the sibling
`build-shared-preview.mjs`. HTML client support is source-confirmed; installed/physical remote
delivery remains unverified. No relay or application behavior changed.

BF-2026-10-09-25 records the operator's iPad **Choose photos** attachment action doing nothing.
Queued for investigation only; no fix/build/deployment. Both native attachment menus embed
`PhotosPicker` inside `Menu`, a presentation lead rather than a confirmed cause. See
`planned-updates.md` for reproduction gaps and acceptance criteria. This follow-up is separate
from the authorized BF-04–24 combined batch.

BF-2026-10-09-26 queues moving iPhone/iPad chat-level **Working** text and spinner from the top
to the bottom, after current content and above the composer. Source confirms the status row is
currently first in the conversation stack. Preserve reading position and correct run-state changes;
retain tool-specific progress. No implementation/build/deployment for this follow-up.

BF-2026-10-09-27 queues putting the iPhone/iPad attach icon on the model-selection row and
closer to the composer corner to free space. Source confirms separate rows today. Preserve
touch targets, narrow layouts and composer actions; coordinate with BF-25 photo-picker checks.
No implementation/build/deployment for this follow-up.

BF-2026-10-09-28 records the selected Send design on every platform: up-arrow icon inside a
circular button, retaining the current green color. Preserve accessibility, disabled states and
send behavior; coordinate native composer layout with BF-27. Queued only, no build/deployment.

The BF-27 adaptive composer design preview is at `docs/design/2026-10-09/adaptive-composer.html`.
The operator approved iPhone combined options, wide iPad separate Model/Level/Speed controls and narrow
iPad fallback, all in one bottom row. Idle/working toggles and options are interactive; browser
layout rehearsal passes. The latest direction keeps Attach as the old plain + with no circular
background or border, makes Steer, Send/Queue and Stop circular, and preserves existing
composer/text-box colors. Native implementation remains queued.

BF-2026-10-09-29 extends the approved adaptive layout to desktop/web: keep + at the left,
labels over Model/Level/Speed and supported Context, smaller circular actions and local desktop's
text-box colors across all three views. `docs/design/2026-10-09/desktop-web-composer.html` is a full interactive HTML
prototype using production styles and the existing attachment picker, with rendered markup
available for review. Browser rehearsal passes; application integration/build/deployment queued.

BF-30–31 extend that review model with matching local/remote/web Run details, expanded selector
hover areas, centered + hover without moving the glyph, collapsed Explanation paragraphs,
larger runtime/smaller input-output tokens directly beneath it, visible/copyable paths and disabled
remote/web local-file Open. The editor grows upward and scrolls at a measured 60% chat-area cap.
Rehearsal checks pass; production integration remains queued.

BF-32–36 queue the native follow-ups: headings against the nav border, missing Live Browser
divider, unavailable/unreliable reorder, duplicate desktop-origin tabs on refresh, and repeated
native website sign-ins. Source already has reorder and persistent profile stores; affected-device
behavior remains unverified. Same-device/profile session sharing is distinct from cookie sync
across devices. See `planned-updates.md`; no native application edits or device changes here.

BF-2026-10-09-37 queues using the web Home, Workspaces and Internet Searches SVGs on desktop.
The review page includes the exact current web artwork; use the Blade SVGs, not Unicode section
fallbacks. Application integration/build/deployment remains queued.

## October 9 combined update — implementation/build authorized

Current implementation, verification and build status: [October 9 combined ledger](2026-10-09-combined-update.md).
The individual intake notes below are historical and are superseded by that ledger. Deployment remains separate.

Browser design side-chat handoff adds BF-2026-10-09-21–24: authenticated profile definitions,
persistent desktop/native stores, Ghostery, Chrome-extension adapters/GPL-3, Bitwarden extension primary
with preserved CLI fallback, and native AutoFill with custom native extensions/filtering deferred.
The operator directly confirmed **Begin implementation and builds**, lifting the queue-only hold for
BF-04–24. Deployment remains separate. The staged 0.2.10 batch includes isolated per-session execution;
intake notes below are historical diagnostics, not completion claims. Preserve existing dirty changes
and installed 0.2.9 data/signing. See `planned-updates.md` for scope and validation gates.

BF-2026-10-09-20 queues automatic older-message loading on desktop local/remote, web, iPhone and iPad:
fill the viewport plus headroom, prefetch near the top and preserve reading position. Existing partial
auto-load paths need parity; remove normal load-more buttons while retaining error Retry. No build.

BF-2026-10-09-19 queues website sign-ins lost on full restart on Work Mac. The operator explicitly
ruled out disk space for this incident. A persistent Electron partition already exists and no explicit
wipe was found; investigate session-cookie policy, storage-path/flush behavior and actual restart mode.
Cause unconfirmed; no live session inspection.

BF-2026-10-09-18 records the corrected screenshot: Instructions changed / Refresh context refers to
stale source-catalog hashes, not unsaved schedule edits. Existing Refresh sources is inside the
collapsed Instructions, skills, agents & MCPs picker; queue a direct recovery action preserving drafts.
Keep BF-2026-10-09-17 as the earlier separate report. No source refresh or schedule run performed.

BF-2026-10-09-17 queues Run now rejecting a reportedly saved schedule as unsaved. The message is
the frontend dirty-state guard; save/refresh/global-draft races remain leads, not a confirmed cause.
Also reconcile draft JSON versus status badge. No actual schedule was changed or run.

BF-2026-10-09-16 queues directional Pause/Resume in Mac Connections: hide a paused host's remote
content on this Mac and suspend outgoing traffic, while retaining pairing/drafts and the reverse
connection. Existing disconnect suppresses recovery in memory but still exposes cached rows; no live
connection has been changed.

BF-2026-10-09-04 queues the browsing-history disk-full uncaught exception for the next combined
bug/feature update. The operator explicitly deferred building. Investigation confirmed `ENOSPC`
and an unguarded history-save callback; exploratory application edits were removed. Installed
0.2.9 remains unchanged. BF-2026-10-09-05 adds direct document access when the device toggle is on
and one-time desktop approval when off; BF-2026-10-09-06 is the approved 15-second top-center
notification design. BF-2026-10-09-07 adds Needs attention Chats/Notifications tabs, rich actions and
seven mixed recent unresolved sidebar items. Navigation opens lists/details, never replays banners.
Document Details shows the full disk path. BF-2026-10-09-08 reproduces clipboard image rejection
before provider selection and a bottom toast obscured by the modal top layer. BF-2026-10-09-09
queues duplicated Copilot model choices: duplicate IDs pass through current adapter/rendering, while
the affected-host raw catalog/native popup cause remains unconfirmed. BF-2026-10-09-10 queues
Internet Search defaults repeatedly loading/disappearing: source and a synthetic deferred-response
harness support a background-rerender/detached-container race, pending affected-host confirmation.
BF-2026-10-09-11 adds parallel independent chats across all providers/devices without an arbitrary Proteus cap and visible queue reasons. Current
host-wide AI serialization (including input waits) is source/test-confirmed; parallel behavior is not
implemented. Preserve one turn per session and the single runner lock. These remain queued;
BF-2026-10-09-12 queues the pinned-Chat gutter, removal of the top-nav Find icon, working browser
find dismissal and matching chat/top-strip + icons. The find X shares a selector overwritten by
document-wide tab-close binding; CSS gap and font rules also identified. No runtime changes.
BF-2026-10-09-13 queues website notification grants and alerts using the shared notification system;
the operator approved Browser Preferences for site permissions and Notifications for shared delivery/history.
Electron permission hooks are available; actual page/worker alert bridging still needs validation.
BF-2026-10-09-14 queues revealing newly opened tabs in their owning strip without resetting to the
start, preserving pinned Chat, manual scroll during refresh and page focus/drafts.
Design and diagnostic examples use synthetic data. See
`planned-updates.md` for diagnostics and acceptance criteria.

BF-2026-10-09-15 queues a persistent agent browser pointer with smooth position transitions. Current
code clears it 1.2 seconds after each operation and recreates its overlay per point; retain visibility
across tool-call gaps while tying cleanup to actual agent use. No implementation/build.

## October 9 follow-ups — 0.2.9 rollout authorized

The operator likes the native green preview and added content-edge swipes on iPhone/iPad,
desktop two-finger tab close/reopen, and web setup expansion retention. Native swipe and web
setup checks pass; desktop gestures are verified with trusted wheel input. HC's Claude upgrade completed through
its supported updater after execution became idle, without restarting Proteus. Follow-up model
picker discrepancy was stale metadata: the operator confirmed Providers refresh fixes it and declined extra new-chat refresh logic. Both Macs and physical iPhone/iPad updates are authorized, preserving data and signing. Source version is 0.2.9, native build 2610.9.1. Continue from the
[batch ledger](2026-10-08-live-browser-release.md). Build Mac, iPad and iPhone have verified 0.2.9 installations. HC also has a verified 0.2.9 installation from approved artifact commit `a4d6c0ae4417134cb63e918d17cd0f75a44724dc`. Original signer and saved state are preserved; window, relay and all three providers pass readiness checks. Both Macs, iPad and iPhone are now updated.

## October 8 live browser and native design — implementation authorized

The operator authorized implementation/build of BF-2026-10-08-07–16, including the prior queued
fixes, Live Browser viewing, native green styling, iPad navigation, categorized recents/running
indicators and Claude catalog investigation. Preview native styling in simulators before full
integration/device updates. Read [the current ledger](2026-10-08-live-browser-release.md).
Prior 0.2.8 working-tree edits are preserved; installed acceptance remains separate. Source work,
395 Node tests, desktop/web synthetic checks and native previews now exist; consult the ledger
for exact coverage and review gates. Nothing from this batch is installed.

## October 8 account health and chat release

The earlier release request authorized implementation, build and deployment and superseded its
preceding queue-only hold; the newer implementation batch above is now current. Read [the current release ledger](2026-10-08-account-chat-release.md)
for implemented, verified and installed boundaries. Source is 0.2.8; native build is 2610.8.1.
Queue editing, focused Enter-answer dismissal, complete approval options, connection notices and
browser refresh corrections are implemented. Accounts & Integrations now owns MCP consumer
health and context metadata; Providers owns model sign-in, Mac Connections owns device transport,
and Proteus Account & Security owns website identity. Website profiles are read-only, with checks
and supported automatic recovery delegated to the owning Mac.

The account design is only partially implemented: isolated multi-identity credential selection,
independent resource/identity probes, expiry-driven renewal and grouped notifications still need
adapter support. No current adapter advertises isolated switching. Agents can list their chat's
selected consumers and explicit resource metadata and request verification. Do not claim browser
SSO, CLI login and MCP credentials are interchangeable. Native simulator validation is now working;
Build Mac and website are deployed at 0.2.8. The signed native artifact and three focused
simulator flows pass; physical iPhone/iPad 0.2.8 (2610.8.1) installation and launch are verified,
with data/preferences preserved. Work Mac is also installed and running 0.2.8, with original signing,
app-data continuity and all three model-provider readiness checks verified. HC's initial stale
loading/blank display cleared after one idle-guarded restart of the unchanged signed app; the
normal window and original chat are restored. The initial display cause remains undiagnosed.
Actual Jira flicker remains a live check.

## October 7 desktop tab-layout correction

0.2.7 moves the child-tab strip outside view-specific padding and scrolling. Build Mac has a verified 0.2.7 installation; HC has verified staging but awaits an idle terminal and direct approval in its installer chat. Both Mac installations are authorized; [the tab-layout release ledger](2026-10-07-tab-layout-release.md) tracks validation and deployment. HC has now completed its verified 0.2.6 installation.

## October 7 search and chat release

The operator superseded the post-0.2.5 deployment hold with “build it, deploy it, validate it”,
then added approval details, document tabs, rename persistence, Enter-to-send and queued steering.
These changes are implemented in source `cb1d0225`. Build Mac, website, iPhone and iPad
have verified 0.2.6 installations. HC subsequently completed its approved, verified 0.2.6 installation. Start with
[the search release ledger](2026-10-07-search-release.md) for validation and per-target installation
status. Source completion is separate from deployment and live-provider acceptance.

## October 7 follow-up implementation

The operator authorized build and installation of BF-2026-10-07-18–28, including browser resource
cleanup/resumption, incremental history, inactive-tab throttling, remote disconnect layout and
overview selection. Read [the follow-up release ledger](2026-10-07-followup-release.md) for current
validation/install status. Build Mac has a verified 0.2.5 app/data-continuity receipt;
iPhone/iPad are installed at 0.2.5 (2610.7.2), and website release `20261008T003911Z` is live.
HC has independently verified the signed update but still requires confirmation in its own chat
because it cannot access the originating approval. Two live warning observations remain open in the ledger.

## October 7 implementation work

The 0.2.4 source work is tracked in [the implementation ledger](2026-10-07-implementation.md).
Use its verification and deployment columns. Both Macs, website, iPhone and iPad now have
verified 0.2.4 installations (native 2610.7.1). The historical 0.2.3 receipts below describe earlier
baselines. Projects are explicitly deferred by the operator.

## October 7 next-version intake

The operator requested a planning PR containing 17 new queued items and the approved new-chat
design. Start with [the October 7 build handoff](2026-10-07-build-handoff.md) and BF-2026-10-07-01
through BF-2026-10-07-17 in `planned-updates.md`. This checkpoint changes documentation and the
design sample only. Reconcile the installed/current implementation branches before building;
none of these requested fixes is certified implemented or verified by this planning PR.


## October 7 morning verification

The physical iPad installed and launched signed **0.2.3 (2610.6.4)** at 13:30 UTC. Fresh
checks preserved six data files, preferences, both paired Mac identities and selected destination;
installed version and running process were independently confirmed. Private receipt and backups
are retained with `Native-Stability-2610.6.4`. The iPhone remains on 2610.6.3 pending its update.

Build Mac live checks verified the unified Home/version/guide, active sidebar, Standup
name/URL/action table, Resources summary cards, Notifications panels, Copilot popup and actual
Refresh, main/chat browser address autofocus, dated/device-labelled recents, main close-left
and chat-child close back to its chat. Temporary verification tabs were closed without sending
a chat message. HC also passed allowance popup/Refresh, main address autofocus, 20 dated/device
recents and existing Standup table checks. Its remaining UI checks and Claude allowance are open.
The operator asked the HC chat to help with CLI sign-in; that flow is waiting on the remote
chat’s approval gate. Unlock alone does not restore subscription authentication.

## Late native correction — 2610.6.4

Source `684e1cb` fixes the reproduced desktop-sync `New tab` title overwrite; adds the full mobile
Home guide popup; insets iPad Home; highlights active sidebar pages; and reveals newly opened
main/chat/Team tabs while preserving ordinary strip selection offsets. Seven distinct iPad cases,
two iPhone cases, 368 Node tests and static checks pass. The signed 0.2.3 (2610.6.4) artifact
preserves the original signer, profile and entitlements, with 43 source inputs and 18 signed
bundle files verified. The first attempt stopped at the device lock before backup or app
termination. The subsequent successful iPad installation is recorded above; iPhone remains pending.

The immutable app/source, build receipt, guarded installer and simulator screenshots are retained
in the private release-recovery folder `Native-Stability-2610.6.4`, outside Git. Use its installer
after unlock; it checks ancestry plus every packaged source/bundle hash, current profile validity,
paired device, lock state and existing app before replacement, then verifies data and pairing.
Do not rebuild or reset pairing to work around a lock. The Mac checks/HC Claude reminder below
remains deferred to tomorrow. Latest details are in the acceptance audit's late-native section.

## Current October 7 correction rollout

Source `56a074d` (0.2.3) is installed on both Macs; signed runtime and continuity checks passed.
Both physical iPad/iPhone installed and launched native 2610.6.3 with data/preferences/pairing
preserved. Website release 20261007T043636Z passed 14/14 endpoint checks and public asset hashes.
368 Node tests plus static, package and focused desktop/web/native UI checks passed.

The operator deferred locked-Mac hands-on checks to tomorrow. HC Claude remains signed out;
its sign-in and allowance verification are also deferred. Include both in the end-of-session
reminder. Detailed current status, test boundaries and remaining live gates are in the
[acceptance audit](2026-10-07-acceptance-audit.md). Deployment/recovery receipts are private and
outside this repository. Historical 0.2.2/0.2.1 rollout sections below are not the current build.

## October 6 build and deployment

The prior handoff recorded the closed intake and BF-22 as implemented for 0.2.2; the new audit
identifies omissions and regressions in that claim. Read
[October 6 release](2026-10-06-release.md) for verified source checks and actual installation status,
then [the build handoff](2026-10-06-build-handoff.md) for original acceptance and design examples.
Website, both Macs, iPad and iPhone have verified 0.2.2 installations. Both Macs run the final
signed remembered-child correction; populated HC child selection survived restart, and visiting
desktop browser children synchronized live. Read the release record's remaining device/workflow
limits separately from successful installation and source validation.
The earlier 0.2.1 release records below are historical baselines.

Proteus is a local AI scheduler and resumable conversation client. The Mac owns execution,
authorization, files, sessions and browser profiles. iOS is a remote client. A relay transports
encrypted traffic and cannot execute work. organization workflows and other workflow repositories own their policy
and manifests; this repository owns the generic app and provider adapters.

## October 5 next changes implementation and rollout

Current rollout checkpoint: website release **20261006T053613Z** is live with
14/14 endpoint checks passed. Build Mac has the final signed **0.2.1** toolbar
and held-history update, revision `a65d8df542a2+dirty.803bbc240e31`, full fingerprint
`803bbc240e3186e3be7ffd7e935e6a8b2ffb7b4750952b23cd9849f2990a83da`.
Strict/deep signature and embedded source-manifest checks passed. Protected
settings, credentials, pairing, six runs and six schedules remained byte-identical;
all 12 ordered tabs, selected children and the active browser were preserved.
The integrated Node suite passed 343/343 before the final selection/redraw fixes;
those passed focused quit/relaunch (13 checks), toolbar/history and syntax checks.
Native real-gesture long-message reopen/prepend, 100-event responsiveness smoke,
and focused iPhone/iPad counts/composer/browser-history checks pass. The operator
reports iPhone unlocked; its signed **0.2.1 (2610.5.3)** update is now installed
and launched with app data/preferences/two destination identities preserved. The
operator lifted the iPad hold on October 6; iPad is now also installed and running
**0.2.1 (2610.5.3)**. Its six app-data files and preferences were preserved across
installation; both destination identities and the selected destination survived
launch. Signing, profile validity and installed version were freshly verified.
The final app-only signed delta is uploaded to the private artifact branch after
completion of the conditional Mac follow-up. Work Mac’s Codex chat verified it
and completed the in-place replacement, signature and continuity checks. HC→Personal
is online; Personal→HC remains unverified after an offline observation because
Personal is locked. A metadata-sync fallback was rejected by automatic approval
review and not retried; an unlock/status-check question is pending.
Earlier bundles/deltas are superseded. The chronological records below are
historical baselines; `next-changes-release.md` records rollout and limitations.


The operator has lifted the general queue/build hold and authorized implementation
of all 26 next-change items using GPT-6 Sol subagents at medium effort, with updates
installed as ready. Website backups/uploads are approved; iPad, Work Mac and Personal
Mac were reported unlocked. Recheck current state before installation and preserve
app data, pairing, credentials and signing. The separate More actions concept and
unrelated historical deferred scope remain deferred. See `next-changes-release.md`
for current ownership, acceptance and deployment receipts. The installed release
state below remains the baseline until new receipts establish updates.

Before the hold, item 19 produced uncommitted source edits in `public/app.js`,
`public/team-tools.js`, `public/style.css`, new `public/browser-toolbar.js` and a
new `test/browser-toolbar-ui.mjs`. Main/chat/Team toolbars now share an icon-only
Agent access control inside a lighter address field. Off has no box; on uses an
accent fill and dark icon. Team access state follows browser updates; clicking an
owned but unshared tab's lit control is intended to revoke rather than share it.
No live browser permission was changed by this work.

`npm run check` and 340/340 Node tests passed. Disposable Electron testing used a
mock Keychain, synthetic pages and a separate app-data directory. Main/chat checks
passed before the script failed in Team testing due to elements being replaced
while reading styles/taking screenshots. Final run failed during Team screenshot
capture; full Team toggle/ownership and minimum-width checks remain unverified.
The isolated process has exited. Preserve these edits for the combined change set;
do not describe the partial source work as installed or fully UI-verified.

## Latest release state

The final **0.2.0** Mac/native follow-up build uses
`d24bd8a3904f3370044410b2fb4a306e24f269cd`. It includes 256-file/32-MiB guarded
attachment batches, bounded Claude MCP status settling and website chat-title persistence.
The integrated Node suite passed 340/340, `npm run check` passed, and native follow-up
validation passed 53/53 unit tests plus three focused iPhone/iPad viewer tests. Build Mac
and both physical iOS devices are installed in place from this commit, preserving signing,
app data and destination identities. The original 0.2.0 website release
`20261005T221822Z` and Home correction `20261005T224447Z` passed their separate 14/14
audits. Website release `20261005T232043Z` from `d24bd8a` verified 9,212 files and preserved
configuration, schema and nutrition state; its 23:34:50 UTC audit passed 14/14 checks. The web-only
Activity classifier correction `2355d6bd004d3743bf79566937e1e32697e354bd` then
deployed as `20261005T234233Z`, preserved the same 9,212 files and protected state,
and passed 14/14 health checks at 23:45:35 UTC. The actual HC chat showed five grouped
Activity entries with approval counts and no standalone Auto-approved entry. Work Mac final
reinstall/live Claude readiness check remains pending. Its installer Codex-app task showed
Thinking for roughly twenty minutes; the operator asked to Stop it, with completion not yet
confirmed. The earlier installed 0.2.0/pairing receipts remain valid but do not establish
follow-up acceptance. Read
`content-workspace-release.md` for receipts and remaining gates. Multi-provider orchestration
and Safari-style browser tab groups remain deferred.

The operator approved attachment delivery after reviewing the exact-file/destination/provider
Confirm Send workflow. Uploading is not authorization to execute or send. Durable accepted proof
binds the actual chat, peer, provider, message and file hashes; first-message execution remains
ineligible until that proof is committed. Only synthetic attachments and fake providers are used
in validation. Supported formats are capability-reported, with explicit unsupported-format errors.

Remote documents use host/chat-bound IDs, a separate default-off View chat documents grant and
short-lived trusted-host approval of the exact version for the requesting device. Approval covers
bounded referenced raster assets; relative document links request their own approval. Recheck the
current path/root/grant/content version on every read. Persist descriptors, not content or preview
grants. HTML is static by default; explicit per-version Enable/Stop controls run browser JavaScript
inside isolation without network, app, Node or filesystem authority. Browser previews have no hard
CPU/memory guarantee; a runaway synchronous script may require closing its browser tab.

Cold start opens Home. Main/chat/Team content descriptors and ordering restore; browsers remain
unloaded until explicitly selected. Feature pages are sidebar destinations, not content tabs.
The six most recently touched browser tabs plus all used within one hour supersede immediate
Team unloading. Protect active/unsaved/audible/download/agent work. Optional tmux uses a private
Proteus socket, preserves unrelated sessions and stores bounded terminal output locally. Reattach
on activation or start a fresh shell when typing, never replaying previous/startup commands.
Both Macs already have tmux; no installation was necessary.

The HC login Keychain was reset after a crash. HC 0.2.0 has since launched with app data
preserved. Both desktop pairing directions passed read-only authenticated chat-index checks;
its normal macOS installed-app signature check passed without Keychain or trust changes. The
installed Claude MCP status probe sampled immediately after initialization: Safari showed
connected, while ADO/Atlassian remained pending. The bounded startup-settling source fix is in the final Mac build, but the HC reinstall and
live recheck remain pending; the earlier pending values do not establish server failure.
Separately, a Proteus Codex chat reported `Codex thread/start timed out.` Proteus gives each
Codex app-server RPC, including `thread/start`, a 45-second timeout. Selected MCP configuration
is passed to that request, so slow startup handling is plausible but unproven; the unrelated
Codex-app installer Thinking state must not be treated as the same failure. Build Mac
reported a healthy cached Codex catalog at 23:49 UTC, which says nothing conclusive about
HC. On HC resume, inspect only the failed run's event time/session assignment, selected
server names, cached provider status and app-server process/log state before any retry. No
Claude model turn was used. HC read the saved shared-account identity through `/api/app` at
23:09:32 UTC without changing credentials or scopes. Preserve existing credentials and
unreadable encrypted stores; use supported sign-in/pairing only where needed. Do not reset/delete Keychain items, weaken access controls or
introduce plaintext storage. Existing app data backups and deployment receipts remain private.

The initial Build Mac 0.2.0 install from `74da6f7` preserved ten ordered content tabs,
browser histories, settings, run/schedule files, Life account/session bytes and three incoming
pairings. Its installed UI showed Home and compact navigation, with five main and one Team
browser descriptors unloaded. The final `d24bd8a` Personal reinstall passed the guarded
idle/terminal check and preserved the then-current twelve content descriptors and order,
histories, settings, runs/schedules, Life bytes and four pairings; a later read-only snapshot
showed fourteen tabs after continued app use, not an install-preservation mismatch. Installed
Home displayed version 0.2.0/build `d24bd8a3904f`, rendered release notes and compact chrome.
The five instantiated main browser rows remained unloaded; the Team child browser descriptor
was saved without an eager BrowserView. At 23:32 UTC the authenticated chat index was
`partial:false`: five Personal and fifteen HC records, both host rows online with fresh sync.
Cached read-only allowance showed Copilot 75.1%, Codex 59%, Claude 97% five-hour/100% weekly;
no model turn or forced usage refresh occurred. Incoming-device online indicators varied by
instantaneous connection, while resource/document grants remained off. The signed package,
install and UI receipt are in `content-workspace-release.md`.

Both physical iOS devices were updated in place again from `d24bd8a` as build 2610.5.2,
with original team/profile, protected app data/preferences and both Mac destination identities
preserved. Independent installed-app and running-process checks passed. Build Mac observed
both updated clients online at 23:23:28 UTC. The earlier independent cross-Mac links were
observed at HC 22:48:32 UTC and Personal 22:49:00 UTC; no physical-device chat, upload,
notification tap or provider call was used for the final build.

Website base activation matched 9,212 files and 14/14 health checks while preserving
configuration, schema and nutrition state. The account timezone is now America/Denver, with a live 3:39 PM chat timestamp observed; automatic/device-timezone selection
remains follow-up. The later Home build-ID width correction passed its separate 14/14
post-deploy health audit at 22:49:33.926 UTC. The `d24bd8a` website deployment passed a new
14/14 audit at 23:34:50 UTC. Web-only `2355d6b` then passed 14/14 at 23:45:35 UTC, with
9,212 deploy files and protected state preserved.
The `d24bd8a` archive and live result are recorded in
`/private/tmp/proteus-web-d24-final-verification.json`; final web-only receipt is
pending its private summary. A prior ordinary isolated restore
attempt failed; a user-approved supplemental isolated restore passed, without production writes.
No live backup-state comparison is claimed.
Live Home shows a 12-character build ID with a full-ID tooltip inside the card at a
1280-pixel viewport. The d24 bounded log window had one expected `.env` denial, 18 PHP lifecycle entries,
510 known MariaDB `column_stats` warnings and one unrelated different-account login denial.
The later web-only audit had 18 PHP lifecycle entries, 552 known `column_stats` warnings,
one unrelated different-account localhost connection abort and one expected `.env` denial;
Laravel and relay Apache had no recent errors. All categories are classified, but this is
not an all-clean logs claim.

HC read five Personal and fifteen HC chat metadata records with `partial:false` around 22:52 UTC; Personal refreshed fifteen HC records at 22:54:20 UTC, also `partial:false`. Personal's
new incoming `Proteus on workstation.example.test` identity was online at 22:51:27 UTC with resource and
document grants off. No chat turn or mutation was used. See private receipts in
`content-workspace-release.md`.

## Historical installed baseline (before 0.2.0)

Before 0.2.0, Build Mac and HC ran `17719ea`, including the empty-peer startup fix, message actions,
and visiting-device history metadata. Personal verified all 104 runtime hashes, signing,
13 tabs, three incoming pairings and existing account/data preservation. HC independently
verified 104 hashes, three tabs, three incoming pairings, five disabled schedules and nine local
chats; its relay and all three providers are healthy, with no startup Keychain prompt at that
preflight. Personal → HC is now paired and saved; the desktop shows `workstation.example.test` online and
its Chats count increased from five to fifteen. HC → Personal remains blocked by Keychain
access. The operator approved both final pairing clicks, but that does not establish completion
in the blocked direction. A valid Apple Development-signed artifact of exact runtime `17719ea`
was prepared and privately transferred. At that earlier checkpoint, HC's control check became unreachable again and
no signed-install receipt had been issued. The install hold protected an active digest job; its
later outcome must be read from the subsequent receipt, not inferred from this historical note. Read `release-validation.md`
for receipts and `chat-rendering.md` for speech behavior.

Before 0.2.0, physical iPhone (05:20 UTC) and iPad (05:21 UTC) ran the native build from `1101c3c`,
installed in place with the original signer/team/profile, all 25 native inputs and six Markdown
resources verified. The update includes device-local chat timestamps, authenticated Mac-name
refresh, localized history with visiting-device metadata, and the native browser tab/toolbar
improvements. Four app-data files and preferences stayed byte-identical before launch on each
device; both destination identities and selection survived, and launch/process checks passed.
Both physical clients subsequently refreshed saved Mac names from authenticated host metadata.
At 05:22 UTC, Personal's API observed both phone and iPad online; the closed website client was
offline. Physical iPad shared-Team account consent remains unverified. The operator already
authorized the normal same-account consent flow at Proteus → Team → Connect shared Team tools;
installation and relay connectivity do not establish that acceptance.

Previously, website release `20261005T060541Z` went live, including navigation fix `7975f77`. All 9,209
manifest files matched; schema, runtime configuration and nutrition counts/hashes are unchanged.
The 06:40 UTC audit passed all 14 endpoints. Activation used the existing authenticated in-app
File Manager upload and guarded updater with the approved supplemental recovery gate; SSH key
unlock remained unavailable locally, and no authentication settings changed. The verified
`050326` recovery and previous `051822` code release remain retained. Supplemental verification
matched all 18 protected tables to exact captured SQL without production writes or a live-state
stability claim. Private receipts remain in the deployment workspace.

Live Chats now verifies All Macs with both authorized hosts, authenticated names and records,
all search/destination/provider/status/workspace/schedule/date filters, no inner chat navigation,
and the main New Chat control. The eight-member Standup list was also verified; private names
stay outside Git. Default Mac is now saved as Build Mac through the existing authorized
account API with an identity guard; a readback verified every other preference unchanged.
Website reload confirmed the selection and live Copilot/Codex/Claude allowance. Both host chat
indexes retain authenticated names. At that earlier website audit, Build Mac's screen was locked, so no native UI acceptance was
claimed from it. The later 0.2.0 installed UI receipt is listed above.

The earlier 05:39–05:41 UTC MariaDB window is fully classified: all 664 entries concern the
known `mysql.column_stats` histogram-definition mismatch. The final 06:38–06:40 window contains
7,138 messages for that same definition issue and seven other warning-word entries still
unclassified, from a complete 7,145-entry window under the 15,000-entry cap. Its sole Apache
error is the expected `.env` denial; Laravel remained empty. Server-maintenance work remains
open, and no all-clean log claim is made. Personal shared
scopes and same-account endpoints are healthy; its legacy roster was empty. Historical uploads
before visit-metadata activation are not claimed to have retained those optional fields.

The HC startup fix avoids unnecessary protected-storage access when no encrypted outgoing
state exists. The underlying Keychain item authorization/ACL problem was never modified or
proven repaired: the password unlocked login Keychain, but item authorization previously failed
even with physical input. No Keychain item, password or access rule was changed. App-only
rollback was prepared but not performed after recovery. See `credentials.md` for the boundary.

Disposable Mac tests now use a mock Keychain, isolated from real credentials; production launches
do not. Website account-persistent Mac enrollment still needs the recorded trust/custody review.
Web Push is configured with an active worker; APNs and real push delivery remain pending.
Multi-provider work is deferred. Workflow owners and schedule enablement remain unchanged.

## Read first

1. `AGENTS.md`: invariants and validation expectations.
2. `README.md`: setup, configuration locations and operating behavior.
3. `docs/architecture.md` and `docs/decisions.md`: boundaries and why they exist.
4. `CHANGELOG.md`: recent changes; `docs/planned-updates.md`: the remaining backlog.
5. The feature document relevant to your change: `providers.md`, `schedules.md`, `permissions.md`,
   `context-loading.md`, `workspaces.md`, `browser.md`, `credentials.md`, `chat-rendering.md`,
   `remote.md`, `web-remote.md`, `mobile-destinations.md`, `transcription.md`, `omi.md`,
   `terminals.md`, `markdown-picker.md`, `life.md`, or `apple-build.md`.

Git and merged PRs are the implementation history. These documents explain behavior and decisions;
they do not replace reading the relevant module. Update them when behavior changes. Never assume
that a previous conversation is available to the next agent.

## Code map

| Area | Entry points |
| --- | --- |
| Authenticated loopback API and lifecycle | `src/server.js` |
| Schedule validation, disk reads, revision conflicts | `src/schedules.js`, `schemas/schedule.schema.json`, `src/cli.js` |
| Serialized AI turns, independent native job lanes, snapshots and journal | `src/engine.js`, `src/turn-waiter.js` |
| Provider execution, model capabilities and refresh | `src/copilot.js`, `src/codex.js`, `src/claude.js`, `src/model-catalog.js`, `src/usage.js` |
| Workspace context, source delivery and tool scopes | `src/context.js`, `src/agent-tools.js`, `public/context-plan.js` |
| Live tool grants and workspace authorization | `src/permissions.js` |
| Mac forms, tabs, chat and shared controls | `public/app.js`, `public/features.js`, `public/conversation.js` |
| Tool event normalization and rendering | `src/tool-activity.js`, `public/tool-presentation.js`, `ios/Proteus/ToolActivityView.swift` |
| Shared Markdown | `src/markdown-renderer.js`, `public/markdown/`, `ios/Proteus/MarkdownView.swift` |
| Electron lifecycle, menu bar and browser bridge | `desktop/main.cjs`, `desktop/browser.cjs`, `src/browser-tools.js` |
| Credential fill | `src/credentials.js` (desktop-only boundary) |
| Encrypted remote protocol and relay | `src/remote.js`, `src/remote-crypto.js`, `relay/` |
| Native UI and remote store | `ios/Proteus/`, `ios/project.yml`, `ios/Proteus.xcodeproj` |
| VS Code companion | `extensions/vscode/` |
| Local Mac package | `scripts/package-mac.mjs` |
| Transcription, Omi and native process execution | `src/transcription.js`, `src/omi.js`, `src/local-process.js`, `public/omi.js` |
| Configured-root Markdown picker | `src/workspace-files.js`, `public/markdown-picker.js` |
| Ghostty VT terminal profiles and local PTYs | `src/terminals.js`, `public/terminals.js`, desktop IPC |
| Durable desktop tab descriptors | `desktop/workspace-session.cjs`, `public/app.js` |
| Life and full website application | `src/life.js`, `public/life.js`, `web/` |
| Reproducible Apple simulator builds/tests | `scripts/apple-build.mjs` |

## Safe development and validation

- Inspect branch/status and preserve unrelated edits. Keep changes reviewable; do not overwrite an
  operator's configuration or run an operational schedule as a generic smoke test.
- Use a fresh temporary `PROTEUS_HOME`, `PORT=0`, and a separate Electron `--user-data-dir` for UI
  tests. Packaged Mac smoke tests must also use their test-only mock Keychain switch; temporary
  profiles alone still access the production Safe Storage item. See `apple-build.md`. One process must own each data directory. `npm start` and `npm run desktop` must not both
  run against the same directory.
- Run `npm ci`, `npm test`, `npm run check`. Node integration tests bind localhost and need that
  permission in a restricted execution environment.
- Model settings: `node test/models-ui.mjs`; chat presentation: `node test/chat-ui.mjs`;
  permissions: `node test/permissions-ui.mjs`; context: `node test/context-controls-ui.mjs`.
  These use disposable data and synthetic content; do not substitute the real application home.
- Sidebar visibility/collapse and whole-tab activation: `node test/sidebar-tabs-ui.mjs` uses
  disposable app data and a real isolated restart. `appearance.showProviderUsage` is the Setup
  feature flag; `appearance.providerUsageCollapsed` independently retains the compact sidebar.
  Both save immediately. Existing hidden preferences are preserved; do not globally migrate them.
- Native UI: start `node test/mobile-host.mjs`, then use the checked-in Xcode project and an
  available simulator (`xcrun simctl list devices available`). Run the relevant `ProteusTests`
  and `ProteusUITests`; fixture ports 4328/4329 must be free. Stop the fixture afterward.
- If Markdown sources change, run `npm run markdown:build` and commit the generated bundle.
  If Xcode file/target membership changes, run `npm run ios:generate` and commit the project.
- Build the local Mac bundle with `npm run package:mac`. See `docs/mac-app.md` before installation.
- Before restarting the operator's Mac host, check for active or waiting runs. Stopping an active
  host interrupts those runs. Verify the app and remote connection after restart.
- Describe exactly what was tested, with simulator versus physical-device results distinguished.
  An iOS simulator build does not install the update on an iPhone or iPad.

## Durable state and known limits

App data lives outside Git. Inspect the configured home rather than assuming paths from another
machine. `connection.json` contains a local API bearer token: never print or commit it. Browser
profiles, pairing secrets, provider credentials, private instructions, and real run records also
stay out of commits and test fixtures.

The host serializes AI turns. Each of the three managed Omi native jobs has its own serial lane,
so native control work is not blocked behind transcription or an AI chat. It stays alive after window closure, but quitting the
app or sleeping/shutting down the Mac stops execution. There is no detached always-running daemon.
Existing chats retain schedule snapshots; editing a schedule affects future runs. The composer can
change next-turn model settings in that same chat, retaining the initial snapshot and change history. Updating
a chat's context is explicit; authorization changes apply during active turns. A completed AI
turn does not certify completion of the external workflow.

An organization workflows source manifest is not the same format as the exported Proteus schedule. Export/reconcile
through that repository's supported client workflow; see `docs/schedules.md`. Do not bake organization workflows
paths, ownership or private prompts into this app.

Native signing is machine/account configuration, not repository configuration. Use an appropriate
Apple team on the installation Mac. Do not revoke or recreate certificates as an automatic fix;
coordinate signing across machines. Remote pairing is separate from Apple signing.

See `chat-controls.md` for queue/steer semantics, `mcp-auth.md` for sign-in recovery, and `providers.md` for Codex/Claude compatibility limits. Physical iOS installation remains an explicit operation on the operator’s designated signing Mac; simulator verification does not update devices.


## October 4 — cross-client parity implemented; release acceptance in progress

The operator authorized building the queued scope, accepted Engine Room, removed the tagline,
confirmed roster/URL storage is permitted, and explicitly deferred multi-provider implementation.
Read `parity-release.md` and `ios/PARITY-VALIDATION.md` for code/tests/deployment distinctions.
The current signed native build preserves original signing and requires an unlocked-device update.
Its existing profile lacks APNs entitlement. Native shared tools require new app-scope consent;
old Life credentials are preserved until successful same-account reconsent.

No Omi owner, schedule execution gate, provider configuration, or live workflow was changed by
implementation. Source tests are not evidence of production push, actual account Team interaction,
or installed-device acceptance. Keep those pending until receipts below establish otherwise.

## October 4 daytime continuation — API-only Life and account destinations

The website account-destination release `20261004T175555Z` is deployed with one additive
migration, fresh verified restore point, exact manifest parity and unchanged nutrition hashes.
The operator's Safari profile loads the new account persistence UI. Live enrollment of both Macs
remains pending explicit confirmation of encrypted connection-key custody on the website server;
do not copy nonexportable browser keys or claim an empty browser's connection is fixed.

Build Mac now runs API-only desktop Life and the operator completed website sign-in. The app
reports ready website-api mode; native food pages show 25 items, 219 total, and next-page reads.
The legacy database configuration is archived exactly and never opened by runtime Life. All seven
tabs, three pairings, settings and disabled processing gates were preserved/restored. A migration
visibility bug and idle HTTP shutdown hang were found during acceptance and fixed with regressions.
The Transcription sidebar now uses Omi iCloud's waveform convention. Connected Setup spacing and
pending-auth feedback are installed; final restart verified the same ready API account, seven tabs,
three pairings and graceful shutdown. Native screen capture was unavailable for the final spacing
screenshot; narrow/wide source UI checks passed. See `release-validation.md` for exact evidence.

The authorized HC coordination chat has also installed runtime `68463db` and verified exact
parity, clean restart, shared relay, three pairings and unchanged tabs/settings/five schedules.
Life stays disabled there; no account keys or peer grants were created.

The iPhone was updated in place with the original identity. Its two destinations are correctly
named Work Mac and Build Mac, and its selected Build Mac authenticated connection
was observed online. Life sign-in on that physical device remains unverified. The latest iPad
build is still deferred. No Omi app, recording or processing owner changed.

Final software coverage: 232 Node tests, static checks, 68 Laravel tests/574 assertions, ten
API-backed Life UI groups, 20 web remote groups, seven account/protocol groups and focused real
restart checks. Signed-package launch/catalog passed. These results supersede earlier locked
Build Mac/iPhone installation holds, not the deferred iPad or account-enrollment acceptance.

## October 4 continuation: shared web shell, native mobile Life and desktop peers

This is the current status and supersedes the deployment/pairing statements below. The website
release is live; new Mac and mobile source is implemented and validated. At this checkpoint the
new native builds are prepared, but their in-place installation is pending the unlocked-device
acceptance step. Do not infer installation from a build or simulator test.

- Website uses shared desktop dark theme tokens, responsive sidebar and persistent section tabs.
  Existing account-scoped browser pairings to both Macs survived and each connected after release.
  Website provider meters request quota from the selected host and obey its visibility flag;
  older hosts correctly show unavailable until their provider-usage bridge is updated.
- Production release `20261004T083033Z` matched 9,193 manifest files. A freshly captured recovery
  set was restored into an independent database and verified before deployment. Existing native
  schema-v2 ledgers were checked read-only, and the reviewed additive Laravel migration registered
  them without altering original schemas or nutrition records. All three nutrition pre/post hashes
  and counts matched. A public native PKCE client is configured; it grants no account access alone.
  HTTPS/redirect/authentication/relay checks passed. The only new Apache error was the expected
  protected `.env` denial from the security smoke test. Private receipts/backup details belong to
  the separate domain operations project. Two earlier preflight file-access failures retained the
  old active site and changed no database; the canonical helper now runs a private verified copy.
- Desktop Life has richer Garage/fuel/oil cards and fixed complete-day nutrition periods alongside
  custom date filters. Original food-version references and scoped evidence remain intact. Mobile
  has native views and typed forms for the same Life account, direct website PKCE/MFA sign-in,
  Keychain credentials and retry-safe mutations. Life defaults hidden on mobile until **App setup
  → Show Life**; its account is independent of the selected Mac. Real per-device Life consent and
  production record interaction remain unverified until normal operator sign-in.
- Mobile usage comes from the connected Mac. Exact legacy **My Mac** labels hydrate from that
  authenticated host; custom names stay unchanged. The operator corrected both existing mobile
  relay addresses and confirmed connectivity. Both physical devices were then independently paired
  to Build Mac, with their previous Example Organization destination retained. The two-entry indices
  were read back and verified. Pairing keys were not extracted.
- Desktop can separately pair as a client of other Macs. New Chat defaults to This Mac every time;
  remote selection reloads that Mac's workspaces, folders, agents, skills, instructions and provider
  metadata, clearing prior selections and blocking Start while unavailable. Remote commands never
  fall back locally. History tabs put This Mac first; replies, approvals and pending-answer drafts
  are scoped to host/run/request. Peer keys stay in native safeStorage. Fresh desktop control
  pairing was distinct from already-approved website/mobile pairings and was pending operator
  confirmation at that checkpoint. The verified 0.2.0 desktop pairing outcome is recorded above.
- Browser history now persists URL/title entries and index across actual restart; form/POST state,
  agent grants and common authentication callback URLs are excluded. Hold or right-click Back/
  Forward for a native history list; stale menu selections cannot jump an unrelated entry.
- Independent review reproduced and fixed cross-host pending-answer draft transfer and invalid
  cross-provider model/default inheritance before packaging. Final destination UI tests include
  both cases. Mobile's first Markdown layout now explicitly reports its height so rich content
  appears without relying on a deferred ResizeObserver; subsequent height updates still work.

The independently managed work Mac subsequently installed runtime `14b9819` through its owning
chat and verified actual restart. All 91 runtime files matched; shared relay is online with no
errors. Its host identity, three pairings, two tabs and five schedule files were preserved. Life
remains off, no desktop peer was created, the primary checkout was untouched, and the old relay
and an app rollback remain available. The local Build Mac and physical mobile installation
holds above are still in effect; do not apply the work Mac result to them.

Validation: 212 Node tests and static checks; 59 Laravel tests / 409 assertions; 15 desktop-peer
UI groups plus three peer backend/persistence tests; 17 website remote groups; 12 website shell
checks; 13 actual-restart/history-menu groups; 15 native desktop Life groups. Native mobile has
17 focused iPhone tests (9 destinations, 5 Life, 2 usage, 1 Markdown), 16 core iPad tests, Life and
usage UI on both layouts, mobile opt-in and final pairing/start/reply/rich-code UI regressions.
All test records are disposable. Signed universal mobile build uses the existing identity/profile
and expires October 10, 2026; distribution renewal remains separate. Mac package verification
checks the overall signature, Copilot vendor identities, launch and live catalog.

Current devices became passcode-locked before deployment. Automatic approval review rejected the
physical iPhone/iPad update while locked; do not bypass it. Both signed packages passed final verification; runtime source is frozen at the reviewed feature
commit. Resume only after unlocking, privately
copy and compare each app's destination index/encrypted caches, install in place without uninstall,
then independently verify process/reconnection. The Mac was also locked at the UI check; no active
or waiting runs or terminal shells were observed. Automatic approval review separately rejected
the prepared Mac in-place update while locked as well; do not retry until the operator unlocks it. Preserve its six existing tabs and active
selection during the eventual graceful update. Source and signed packages do not certify actual
installed UI acceptance. Update this checkpoint with precise receipts after deployment.

Projects remain explicitly on hold. Multi-provider delegation remains a design proposal, not an
executor. Original Omi services and Codex schedules remain the processing owners; all five Proteus
replacements remain paused and both execution gates off. The earlier native policy repair timed
out without changing configuration and must not be retried automatically.

## October 4 continuation: Transcription, terminals and remote clients

This section supersedes earlier deployment/timeout statements below. Desktop and physical mobile
updates are installed. Life is active and verified through the installed app; processing ownership
handoff remains held as noted.

- Transcription now separates **Omi** from **private notes & MacWhisper**, with independent execution
  gates and ordinary schedules. Existing five IDs/history remain compatible. Both general schedules
  verify their installed Codex definition against canonical operator workflows manifests, attach explicit policy
  paths, and reject changed/replayed source snapshots. Policy remains in operator workflows; organization workflows is unchanged.
- Fresh observation found all three native LaunchAgents loaded and both source Codex automations
  ACTIVE with canonical parity. Native/general gates and takeover confirmations remain false;
  all five installed replacement schedules remain paused. No processing owner was changed and no
  live transcription workflow ran through Proteus. Existing native semantic retries were traced to
  missing files in the configured independent organization workflows policy checkout; personal policies are present.
  An independent canonical policy checkout is now prepared and verified. A path-only repair was
  attempted under native maintenance locks, but the 300-second drain timed out while original
  audio/MacWhisper work was active. No configuration changed and no worker was interrupted.
  Retry the reviewed repair after a safe idle window; native cutover remains held. Installed replacements were
  refreshed while disabled, with canonical fingerprints on both general jobs and a private rollback
  snapshot. See `transcription.md` for scope and cutover.
- Installed-host Codex is now healthy. A forced catalog refresh returned seven models, including
  both transcript workflow models. Two bounded synthetic turns through the already installed signed
  host verified exact selected instructions, no echo of an unselected disposable AGENTS marker,
  no tool calls, native continuation, and observed usage. A subsequent single-file disposable check
  also verified a real native write approval, one-time approval reply, and exact written content.
  Neither test selected operational vault content. This does not certify transcript filing,
  permissions for real workflow tools, or exclusion of every global instruction source. No runtime,
  security, global AGENTS, source automation or operational vault change was needed to recover it.
- Markdown browsing includes every configured workspace main/additional root, shared repository
  and every-chat folder, with **All folders** navigation. Revoked/retargeted roots are checked again
  on every operation. Folder creation and filenames remain relative to the selected nested folder.
- Interactive terminal tabs use Ghostty VT WebAssembly and local PTYs. Profiles support shell,
  command, starting folder, font and theme; a read-only native Ghostty import maps supported keys.
  Trusted main-frame desktop IPC is the only terminal control path. Tabs retain live shells across
  navigation; process restart restores descriptors with explicit **Resume new shell**, suppressing
  saved startup commands. Renderer failures offer **Reconnect view** without launching a second shell.
- Desktop session restoration now covers tab order/active selection, chats, schedules, feature tabs,
  Markdown and private browser views. Browser native horizontal gestures navigate history while
  preserving horizontal content scrolling; pinch updates bounded zoom. See `browser.md`.
- Website code has been deployed with Proteus remote views. The relay is an independent encrypted
  transport service; live TLS, two-host packet routing and host-isolation checks passed. No nutrition
  migration or production database schema mutation was part of that code deployment. Real paired
  browser/mobile end-to-end usage remains distinct from transport and synthetic client validation.
- Native Life backup restoration verification and the separately approved additive version-2 upgrade
  have completed. Core table schemas/row hashes and the nutrition digest remained unchanged; only
  two native audit ledgers were added. All seven database-referenced original evidence files were
  read and hash-verified through approved SFTP. Keychain access approval is complete. The installed
  app reviewed schema v2 with no migrations, enabled Life, and read all seven sections through its
  actual Keychain resolver and SSH route; activation changed no database records. No production
  evidence upload/test record was created. The four new deployment credentials were explicitly
  approved, saved to the authoritative vault, and verified by exact-content retrieval after sync;
  private item references remain in the website operations project. Personal and work hosts retain
  independent pairing keys, caches and permissions. Both Mac relay hosts are online. The signed-in web client is paired with the personal host and
  has read its schedules; the work host’s separate browser invitation requires its local approval.
  Existing work-host mobile authorizations and its previous container remain available for rollback.

- Live installed Claude allowance now resolves through the authenticated bundled Claude Code
  `/usage` path. Both five-hour and weekly percentages and the available weekly reset were verified
  in the installed UI; missing reset timestamps remain explicitly unavailable. Usage observations
  stay outside Git. Provider metadata still governs available models/effort/speed.
- Both Mac hosts now run the tested usage/tab/relay-editor source revision. The local signed app
  matches all 75 runtime assets, restored five tabs including its terminal descriptor, and retained
  Life and relay connectivity. Collapsed green meters and the Setup feature flag persist separately.
  The work host’s owning chat confirmed its in-place update, restored tabs, unchanged identity,
  both pairings and schedule files, intact Copilot vendor signatures, and online shared relay. Its
  Life feature remains off. The separate work-host browser pairing still awaits local approval.
- Native Manage Macs now offers **Edit relay**, preserving the Mac identity, pairing credentials,
  history and drafts. Eight destination tests plus edit/restart UI checks passed on both iPhone and
  iPad simulators; a synthetic relay verified same-key reconnect.
- The development-signed Mac update restored the existing four tabs and active private browser tab.
  Both physical iPhone and iPad were updated in place and independently observed running. Pairings
  and encrypted cache migration were preserved; real relay commands were not dispatched from them.
  Omi capture applications and their recordings/bookmarks were untouched. See `apple-build.md`.
- Codex Trusted/Autopilot now use exact currently granted canonical workspace roots with no network
  or implicit temporary-directory writes; Ask/Custom remain read-only. Revocation interrupts the
  native turn. Shell approvals remain separate, so this does not establish unattended transcript
  execution. No permission mode or saved operational command rule was changed.

Validation: 199 Node tests and static checks passed. The sidebar/tab regression check passed ten
groups including settings persistence across actual restart, compact meters, and whole-tab selection. The native Codex sandbox smoke test verified
writes to two selected roots, denial of sibling/symlink escapes and network access, and native
approval settings. The full desktop shell passed 21 groups; the signed Ghostty terminal check
passed eight groups including reconnecting a failed renderer to the same PTY. Eleven browser/tab
checks cover restart, transition lifetime and bounded pinch behavior; physical trackpad feel remains
unverified. Signed packaging preserved Copilot vendor bytes/signatures. The production website's
49 Laravel tests (276 assertions), 17 remote protocol checks and 11 browser checks passed before
deployment. Native Life has 19 backend and 14 renderer checks; actual database reads and original
attachment hashes and installed Keychain-backed Life access were separately verified. Real mobile use through the new relay and processing cutover remain outstanding. The work-host
relay cutover is confirmed by its owning chat; its browser pairing is still awaiting local approval. The earlier credential-approval blockers are resolved.

## October 3: Omi, native Life and Claude expansion (earlier snapshot)

- Synced the Source checkout to upstream `1f61b9b`; work is on `codex/omi-life-claude`.
  The separate Mnemosyne checkout is unchanged. Its full 263-file Laravel application is
  incorporated under `web/` with Proteus branding, retaining original migration contents.
- Omi has Overview, Schedules, Runs, Logs and Settings in a persistent tab. Three native
  schedules and two imported Codex transcript schedules use the normal scheduler. All five
  are paused in this Mac's private app data and the global execution gate is disabled.
  No Omi processing was run through Proteus. Three original LaunchAgents and two original
  Codex automations retain ownership. Native capture/mobile review remain separate.
- Life is now native local UI, not a website tab or iframe. Setup explicitly enables the
  feature and installs a local SQLite database or validates a private existing connection.
  Life is absent from navigation until enabled and configured. Versioned, reviewed upgrades
  preserve food versions and nutrition records; existing remote connections default read-only.
  See `life.md` for data scope, schema handling, evidence storage and server-only limitations.
- Live database preflight authenticated SSH but found forwarding to MariaDB administratively
  prohibited. No production SQL was executed. A dedicated read-only access route is awaiting
  operator approval. No production website, nutrition record, schema, relay or server access
  configuration was changed. Do not activate an unverified profile or infer principal IDs.
- Life/Omi tabs survive navigation and reload. New tab actions are icons in the tab strip.
  AI allowance uses hideable green meters with centered percentages and detailed resets.
  Markdown supports configured workspace roots, subfolders and new folders without requiring
  a full path; modal dialogs hide native browser views and reopening a file refreshes it.
- Claude subscription authorization completed. The installed app's bundled runtime returned
  12 models and completed two synthetic turns with native session continuation and observed
  token usage. Runtime speed metadata reported fast mode unavailable. Rate-limit events
  supplied a reset/status but no utilization; the allowance percentage remains unavailable.
  This is distinct from successful model execution and per-turn token accounting.
- The Claude `kill EPERM` crash is fixed: cleanup catches denied group/child termination,
  reports unconfirmed termination and prevents overlapping discovery/turns. Desktop quit
  catches asynchronous cleanup rejection. Regression checks exercised both failures.
- The Mac bundle now uses the existing Apple Development identity, keeping its designated
  requirement stable across updates while preserving GitHub's vendor signatures/bytes.
  Installed-host Codex still timed out during startup file access after earlier macOS iCloud
  approval; direct runtime/node-mode catalog and usage probes succeeded. A new signed-app
  permission prompt, if shown, must be granted by the operator. Global AGENTS exclusion from
  the actual model prompt remains unverified. Do not claim all providers are live on this host.
- Validation before the latest native-Life refinement: 140 Node tests, static checks, isolated
  Electron integration, shutdown regression and package checks passed. All 45 Laravel tests
  passed (251 assertions), Vite/Pint passed, and synthetic desktop/mobile web checks exercised
  nine protected routes. The latest full regression and package result is recorded below.
- iPhone and iPad simulator builds passed. Four native unit tests, all six iPhone UI cases
  (one corrected and rerun), and three targeted iPad UI cases passed. Proteus was installed
  in place on the unlocked iPhone and launched, independently confirmed by process inventory.
  Its encrypted cache remained byte-identical, pairing was retained, and remote reconnection
  was not newly verified. Signing reused the existing certificate with a command-line team
  override; no project-signing setting changed. Profile expires October 10 at 17:29 MDT.
  Physical iPad installation is deferred at the operator's request. See `apple-build.md`.

Final native-Life validation: 164 Node tests and static checks passed; the full Electron shell
passed 20 check groups and the native Life renderer passed 13 checks against disposable SQLite.
The cleanup-failure shutdown regression passed. The development-signed Mac bundle passed its
isolated launch, identity, vendor-signature and byte-preservation checks. All 64 runtime source
files matched the bundle. Installed and launched the final app in place with a rollback copy;
authenticated health confirms zero active runs, Life off/unconfigured, all five Omi schedules
paused, and all three native Omi owners loaded. Copilot reports 19 live models and Claude 12;
Codex still reports its startup timeout. This does not certify live MariaDB or Omi cutover.

At that earlier validation point, live Life access and website/relay deployment were pending. See
the October 4 continuation above for their newer status. Keep the encrypted relay as an independent
supervised service; Docker is optional packaging, not a protocol requirement.

## Previously validated update: chat controls and second provider

- 99 Node regression tests and static checks passed.
- Mac compact-composer, rich-chat, model-picker, browser/control, and packaged launch/signature checks passed using
  disposable data. Draft preservation, queue removal, scrolling, per-provider options and privacy
  toggle behavior were exercised.
- Live Codex synthetic tests verified selected instructions, unselected AGENTS exclusion, native
  continuation with model changes, runtime usage, dynamic browser-tool dispatch and steering during a tool call.
- iPhone simulator: four native tests plus five UI tests passed. iPad simulator: expanded tool
  output and model-capability UI tests passed. No physical-device install or signing changes.
- Copilot OAuth API/command tests verify native delegation and no authorization URL in transcripts.
  Real corporate consent/sign-in is an operator step; report its actual status rather than equating
  browser opening with authenticated tool access.

## Authentication and live-control regression checks

- `node test/mcp-auth-ui.mjs`: synthetic pending sign-in, persistent feedback, automatic connected
  state, sign-in during a slow background check, stable controls, connected-button removal and
  polling cleanup after closing the dialog.
- `node test/chat-ui.mjs`: streaming with a focused permission selector, stable composer/detail DOM,
  queued drafts and independent scroll positions. `node test/composer-ui.mjs` covers next-turn choices.
- `test/packaged-mac.mjs` must validate both Copilot vendor signatures and unchanged binary bytes.
  An app-level ad-hoc signature alone does not prove that provider Keychain identity was preserved.
- iOS `testMCPConnectionRefresh` uses the synthetic mobile host; it never performs real OAuth.
  A live provider status check after installation verifies whether prior authorization survived restart.

Validation for the signing/status/scrolling update: 99 Node tests and static checks passed; Mac
authentication-feedback, chat interaction, composer and packaged-app tests passed. The native MCP
status UI test passed on both iPhone and iPad simulators. The installed Mac build restored existing
selected MCP connections after a cold restart, with no new Keychain prompt observed during the
check. Physical-device installation remains separate.

## Proposed next capability: multi-provider workflows

The operator requested a design for schedules/chats coordinating agents across provider accounts,
with provider-specific company-system access and allowance-aware routing. Read
`multi-provider-workflows.md`. No orchestration, account policy, cross-host delegation pairing or
connector grant has been enabled. The current engine still serializes AI runs; changing that safely
requires explicit parent/child capacity, adapter isolation, data-transfer policy and recovery work.
