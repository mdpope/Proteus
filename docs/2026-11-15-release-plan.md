# Nov 15 release (renamed from Nov 11 on 2026-11-15; version 0.2.45 unchanged)

## November 16 continuation — implementation and targeted rollout authorized

The operator lifted the intake hold and requests all queued release changes, Linux fix integration
and build/verification, updates to the primary Mac and iPhone, and safe closeout of other branches.
This supersedes the intake hold; other device installation remains outside this targeted rollout. Keep the existing release identity and
version; `codex/nov11-continuation` is the sole integration branch. Preserve history and do
not push this branch to privacy-sanitized GitHub remotes. Private transfers require their
authorized channel and verified provenance; operational paths and receipts remain outside Git.

The operator explicitly excludes N11-41 camera QR pairing from this delivery and defers it to a
future Mnemosyne update. Application source is frozen at `958f769998f82e195cd4316ba4a21c96fc077305`;
later documentation commits record qualification and rollout without changing accepted packages.
The Linux rollout also needs a separately pinned source-owned maintenance helper with explicit
authenticated owner revalidation after normal restarts. That helper is tested and transferred
independently; it does not authorize rebuilding or substituting the accepted application package.

Current rollout targets are the primary Mac and iPhone. Linux builds and verifies the combined
source; the operator subsequently authorized installation of that accepted build on Linux desktop.
Installation on other devices waits for separate authorization. Any desktop change after the installed
desktop source requires a new package; mobile changes require a build number after 2611.15.2.
Use designated build coordinators and separate unassigned installation coordinators. Previously
installed artifacts and source test results do not establish acceptance of the combined source.

### N11-69 — Abandoned update chat dependency (queued)

Follow-up N11-69 is queued: archived or abandoned update chats must not block current authorized
updates. Reconciliation must preserve the historical journal and validate the current owner,
recovery generations and coordinator authority without reopening an abandoned conversation or
connecting its optional servers. The operator archived the original conversation; leave it archived.
This follow-up is not implemented in the frozen application source or accepted packages. The current rollout hold was cleared without rebuilding through the documented older-client adapter: a digest-bound supersession receipt preserves the original failure and verifies the later healthy installation and two recoveries. This does not add the missing ordinary coordinator/UI route.

### N11-70 — Settle local hydration before update preservation

The failed Linux rollout and disposable native reproduction exposed a checkpoint race with
canonical project-chat hydration. Require proven local-scope convergence before saving and
acknowledging each update checkpoint, including scopes created by hydration. Keep exact
preservation comparisons, pending operation receipts and ordinary retry guards. Backoff,
conflicts, unresolved writes and restoring windows must fail safely without shutdown. Remote
owners retain their own authority; an offline peer does not require a local update to mutate it.
Source correction and native two-window/restart/failure regression are implemented. Package
acceptance and deployment are separate; the accepted `958f7699` packages lack this correction.
The installed older owner cannot acquire the new checkpoint code merely by staging a candidate;
its bootstrap, settled baseline and unresolved attention receipt need explicit verification.

### N11-71 — Fox News Admiral prompt

Address the operator's homepage anti-adblock prompt with a scoped filter for the observed
Admiral loader. Preserve article scripts, detector bait and existing profile/site exceptions.
Source and synthetic Electron request-pipeline acceptance pass, including existing cached
filters and disabled blocking. The investigation profile loads the live homepage without the
prompt, so reported live-case acceptance remains outstanding until installation.

### N11-66 — Edit teams in Team Tools

Source adds an edit function to the Team Tools team list on desktop and iPhone. Desktop
revision-bound save, stable member/link preservation, reopening and Cancel acceptance pass. Acceptance must verify editing an existing team through the list and retaining
the saved changes after reopening, using existing authorization and identity boundaries.

### N11-67 — Feature destinations in the URL-click popup

Offer Team Tools, Reminders and Scratchpad as targets in the URL-click destination popup.
Source reuses existing tab/container conventions and permissions. Isolated Electron qualification
passes all three destinations, saved feature selection, existing project routing and cancellation.
This popup is macOS operating-system link integration; no mobile OS browser registration is added.

### N11-68 — Six-window event connection exhaustion and Linux acceptance

The designated Linux builder reports two local commits on `codex/fix-six-window-events`, based
on exact source `fbf058aa1e330b604c830a795991d22f097b360b`:

- `38bedf585b0a4d637fcd0fe28b675774edc13cb8`: share `/api/events` through a same-origin
  SharedWorker so six windows do not exhaust the browser's per-origin HTTP connections.
- `b86212451cbc095645ebe50efa0992de8cb4b83d`: update Linux acceptance for current New Chat
  and last-window behavior.

The original incremental bundle required that exact base. A subsequent full-history bundle was
uploaded privately, downloaded and verified with SHA-256
`cd5e451ca7532b9addeb797113f78c79ad1fb816aa6abfc6674a9e8ce224a6c4` and `git bundle verify`.
Both original commits are preserved by integration merge `d489be7f` on the sole release branch.
The older incremental bundle digest remains historical transfer evidence outside Git.

Latest reported evidence supersedes the older stale-selector status: the earlier base package
passed corrected live Linux and credential-free UI acceptance, but excludes the event fix.
Six disposable windows received all three event types, and the survivor continued after five
closed. The fix's source suite reports 1,910 passed, 10 skipped, with static checks passing.
These are builder-reported results, not local verification. Direct-stream fallback can still
hit the connection limit. A package containing the fix, cross-platform package acceptance, signing and deployment remain unverified. Designated builders
will test the same frozen combined source under the current authorization.

## N11-52 — iPhone navigation, Scratchpad editing and upload visibility

Keep the Scratchpad computer selector usable when its owner disconnects. Group filters and metadata; replace literal Markdown snippet buttons with selection-aware icon formatting, retaining Live Preview/Source/read-only Preview and canonical Markdown. Return reminder details to Items by an edge swipe without completing/deleting/closing it. Put upload progress inside the composer card with keyboard-visible height budgeting. Qualify on shared simulators before physical installation; preserve protected drafts and phone recovery.

## November 12 continuation scope

Build Mac and iPhone deployment is authorized; the other target holds remain.
N11-35 and N11-36 now have source implementations and targeted regression evidence recorded in
the implementation log; they are not yet installed. Extend the new-tab consistency work to all
native/web entry points. Investigate live-title oscillation, audio close-button clipping and
cross-window address focus. Improve iPhone tab-overview/browser performance without removing
features, permitting reduced cache-write and synchronization frequency. Enforce at most two
older retained versions per machine even during development, with one payload per generation,
compact audit records and no indefinite failed-attempt staging. The remaining earlier plan
items remain in scope; a first corrective deployment does not close the release.

# Nov 11 release plan

## N11-37 — Independent Incognito tabs (November 12 addition)

Each Incognito tab has an independent, memory-only browser session without adding a saved
profile. It may read ordinary shared-history suggestions but never records its own visits into
history or synchronization. Keep its back/forward stack only while the tab exists. Exclude its
URLs/titles, cookies, storage, cache, thumbnails and site-specific settings from disk, saved tab
state and cross-device descriptors. Closing discards its session; restarting never restores it.
Add the choice to New Tab in the existing slot, visibly mark the mode, and preserve independent
account isolation between tabs. Verify persistence boundaries, restart, close, popups and normal
history suggestions. Define explicit file-save/external-app behavior; do not imply anonymity from
websites or networks. Desktop and native mobile use their own nonpersistent browser stores.
Follow-up: show titles/URLs only in the originating device's local tab navigation and overview;
never transmit them over relay or expose them in remote inventories/Live Browser/resource lists.
Use generic privacy artwork, purge closed records, never restore after normal exit or crash.
Add Open Link in Incognito Tab below Background Tab and Duplicate as Incognito tab below Duplicate
tab on desktop/iOS; fix the desktop Mute tab icon. Source implemented; installed acceptance pending.

Status: open; implementation in source on `codex/nov11-release`. This release was queued as
Nov 10 and renamed Nov 11 by the operator on 2026-11-11 before any version was reserved or any
package was built. The operator authorized implementation and a local build; deployment to
devices is held until the operator lifts that hold. The Nov 8 release is closed.

Source status (see `docs/releases/2026-11-15/implementation.md`): N11-17, N11-09 (desktop), N11-13,
N11-10 and N11-12 are implemented and verified in source/UI tests; N11-04 transport is implemented
with installed acceptance pending. The remaining items are not yet implemented. Nothing is deployed.

## N11-01 — Clickable links to Proteus resources

Chat messages currently display some Proteus links as plain text, preventing the operator from
opening the referenced approval or resource. Render supported links to chats, schedules, files
and file-browser items as actionable links across desktop, web, iPhone and iPad.

Resolve each link to its exact owning computer, workspace/project and stable resource identity.
Open the existing resource where possible, preserving drafts, history and tab placement. For a
current question or approval, reveal its actual review control; an expired request must show its
resolved state rather than imply an approval is still needed. File links retain source/share
authorization and stream from the owner as appropriate. A link grants no access by itself.

Test Markdown links, bare Proteus links and resource links produced by the file browser. Check
cross-device routing, unavailable owners, denied file sharing and stale/deleted targets. Preserve
ordinary website links, text selection and copy-link behavior.

## N11-02 — Investigate a better Chats list design

Review the Chats list across desktop, web, iPhone and iPad. Propose and validate a clearer layout
for titles, run status, provider/model/effort/speed, owner computer and recent activity. Preserve
search, editable/collapsible filters, progressive loading and one predictable scrolling surface.
Use dense and long-content examples; evaluate readability and touch/keyboard access before
settling the design.

## N11-03 — Denser headers across features

Audit headers, toolbars, tabs and filters across the application's features. Reduce excessive
height, padding and repeated headings so more useful content fits on screen, while keeping
primary actions discoverable and touch targets usable. Coordinate shared components across
desktop/web and phone/tablet layouts. Verify narrow widths, wrapping, accessibility text sizes,
keyboard display and safe-area spacing. Investigate the design before broad implementation.

## N11-04 — Reliable cross-device draft synchronization

The operator reports that Build Mac, iPhone and iPad share a chat draft, but Work Mac does not
load that text and its edits do not reach the other devices. The desktop peer transport allowlist
omits `draft.text.get` and `draft.text.save`; mobile and web use the working direct owner path.

Follow-up: opening this same chat on Work Mac still did not show text entered on Build Mac;
the iPhone had that text, while subsequent Work Mac typing diverged from all three other clients.
Treat the missing desktop transport operations as one confirmed defect, not proof that the
entire synchronization process is correct. Trace the chat's execution owner and draft identity
through local desktop, paired desktop, web, iPhone and iPad; verify all views of the same chat
read and write the same owner-bound draft rather than independent client or relay caches.

Restore those two desktop transport operations through the existing authenticated pairing and
owner draft service. Preserve revision conflicts, uncertain-write operation IDs, local retained
copies, connection pause/revocation and the human-only composer boundary. Do not overwrite either
operator draft to force convergence. Attachments, model choices and approvals remain separate.

Required behavior: a user can start a thought on one device, pause for approximately 30 seconds,
then continue it on another connected device without reopening the chat or manually refreshing.
Use debounced saves and a bounded periodic revision check; refresh on chat open, foreground and
reconnect as well. Avoid busy polling, overlapping saves and stale responses replacing newer
text. Report actual pending, synced, offline and conflict state instead of implying success.
An unchanged receiving draft adopts the latest owner revision automatically. Concurrent edits
retain both versions and offer a clear resolution; do not silently replace active typing or use
client wall-clock timestamps as the sole winner. Reuse stable operation IDs after uncertain
saves. Respect platform suspension: reconcile when a suspended mobile app returns rather than
promise continuous execution in the background.

The correction and encrypted two-owner regression are isolated on
`codex/nov11-release`. The regression reproduced the unsupported-command failure before
the fix and passes afterward, including conflict, owner-isolation, pause and agent-denial checks.
The full source suite passes 1,755 tests with four skipped using canonical short temporary paths;
static checks pass. The older desktop UI fixture stops at outdated chat-creation setup before
reaching the draft assertion; actual composer and installed cross-device acceptance remain open.

Before shipping, exercise owner-to-peer and peer-to-owner text updates in actual desktop
composers, retained conflicting edits, reconnect/restart, paused/revoked connections and separate
owners. Verify the existing mobile/web path still converges. No new package, deployment or live
draft mutation is part of this deferred work.

Acceptance must include sequential handoff in both directions between Build Mac, Work Mac,
iPhone and iPad with an approximately 30-second typing pause, plus a web client. Check fresh open,
already-open idle composers, reconnect, restart, concurrent typing, caret/selection retention and
send clearing only the accepted draft revision. Confirm owner revisions and actual visible text;
test automation that only reads a backend store is insufficient. Preserve existing divergent
operator drafts before any installed repair or reconciliation test.

## N11-05 — Workspace Files tabs stay where opened

Workspace Files should open as ordinary resource tabs in the navigation container where the
user invoked them, including workspace/project placement, rather than always creating a
top-level application tab. Apply this consistently across desktop, web, iPhone and iPad and
across entry points such as the new-tab page and feature navigation.

Preserve the folder being viewed, selection, preview, history and source authorization when
placing or moving the tab. Placement must not grant access to another workspace or change the
execution owner. Define reuse versus a new independent file-browser view explicitly, using the
same navigation conventions as other normal resource tabs. Test placement, close/reopen and
cross-device navigation without duplicating or relocating unrelated tabs.

## N11-06 — Analyze folder discovery, scope, grouping and duplicates

Investigate the current Workspace Files folder list before choosing a design. Trace which
registries and configured sources supply it: current workspace/project folders, additional
folders, previously added or removed folders, shared/universal sources and source-library
folders. Establish whether historical additions remain available and distinguish catalog
membership, selection and effective file access. Record findings and propose a usable design;
these questions remain open rather than being answered by this planning entry.

Evaluate a workspace-scoped default versus a broader picker grouped by workspace, with clear
workspace/folder names, predictable ordering and an explicit way to discover other authorized
locations if appropriate. Decide how project context affects the default, where source-library
folders belong, and how the user understands why each folder appears. Compare representative
small and large catalogs on desktop, web, iPhone and iPad before settling the interaction.

Define duplicate handling for the same authorized folder referenced by several workspaces or
projects, different folders with identical display names, aliases/canonical paths, nested roots,
and equivalent-looking paths on different computers. Any visual deduplication must preserve
owner identity, workspace/source associations and distinct read/edit grants; do not merge or
widen authority merely because names or paths look alike. Specify stale/removed-source and
unavailable-owner behavior. Validate the proposed grouping and labels with realistic duplicate
examples without copying private folder inventories into source or modifying live grants.

## N11-07 — Relevant iOS tab controls and Copy Proteus tab ID

Audit the desktop tab menu and bring its applicable controls to iPhone and iPad, retaining
native-specific actions. Make controls relevant to the selected tab type and current state;
document any desktop action that cannot apply rather than silently omit otherwise useful
controls. Preserve the distinctions between hide, unload, close, move and restore, and their
existing authorization and session semantics.

Provide an explicit **Copy Proteus tab ID** action for every supported tab type, including
browser tabs. Copy the stable logical Proteus identity used to locate the tab, not its website
URL, a transient WebView identifier or a navigation index. Where local and owner identities
differ, make the diagnostic identity unambiguous and expose the owner separately if needed.
Keep identifiers available without granting browser/file access, copying credentials or
loading an unloaded page. Verify the copied identity resolves to the intended tab across
desktop/mobile views, including after reconnect and placement changes.

Acceptance includes phone/tablet menus for browser, chat, document and file-browser tabs,
loaded/unloaded and hidden states where applicable, clipboard feedback, and parity with relevant
desktop controls. Copying an identifier must not navigate, change tab state or close the menu's
target accidentally.

## N11-08 — Investigate unsolicited browser URL/history changes

Operator report: on iPad, the Instagram tab in Personal workspace / Social project repeatedly
changes URL automatically, possibly moving backward through history without an explicit action.
Treat this as a potentially app-wide browser navigation defect; Instagram-specific behavior and
an application-driven history replay are hypotheses, not established causes.

Reproduce and distinguish actual page navigation from an address-field-only change. Trace
explicit navigation intent, Back/Forward commands, redirects and same-document site navigation
against owner tab metadata, device caches, reconnect/reselection, delayed responses and history
restoration. Check whether stale owner updates or another device's tab state can navigate a live
local page unexpectedly. Use stable Proteus tab identity to correlate events and keep any
diagnostics bounded and free of credentials or unnecessary browsing content.

Required outcome: the page, displayed URL and selected history entry remain consistent; ordinary
metadata synchronization, polling, tab switching and restoration must not replay old navigation
or target another tab. Preserve intentional Back/Forward, site redirects, reading position and
history. Test Instagram and a controlled navigation fixture, multiple tabs/devices, rapid
navigation, late/out-of-order updates, idle periods and reconnect on iPad/iPhone and relevant
desktop/web paths. Preserve the operator's real tab/history while collecting reproduction
evidence; do not claim a site-specific cause or a fix from address-bar assertions alone.

## N11-09 — Fix Chats list scrolling and progressively load more chats

Operator report: scrolling while the pointer or touch gesture is inside the Chats list does
not scroll it; scrolling only works outside the list's borders. Investigate nested scroll
containers, frames, overflow sizing and wheel/touch event handling rather than assuming a
confirmed cause. Coordinate this fix with the Chats design investigation in N11-02.

Evaluate one page-level scrolling surface for the Chats view, with more chats progressively
loaded when the user reaches the bottom. Scrolling must work from anywhere over the list,
including its rows and empty space, without requiring the user to move outside its borders.
Preserve search, filters and row actions, and provide clear loading, retry and end-of-list states.
Prevent overlapping loads, duplicate rows and stale results after a filter or owner change.
Appending results must preserve the visible position and must not jump the page or repeatedly
load the entire history without user scrolling. Restore position when returning from a chat.

Verify mouse wheel, trackpad, touch and keyboard scrolling across desktop, web, iPhone and iPad,
with short and long lists, narrow layouts, slow responses and failed page loads. This is queued
for Nov 11; it does not authorize another Nov 8 build or deployment.

## N11-10 — Name the service and connection in approval requests

Operator approved a Jira connection request whose card displayed only “Allow app action?” and
“Server connection requires approval”, without the Jira or configured connection name. Replace
this ambiguous presentation with a brief description naming the service and exact configured
connection, such as “Connect Jira · hc-atlassian for this turn?”. Do not require interpreting a
generic app-action label or raw tool name to identify what is being approved.

Carry the same identity through desktop, web and iOS approval cards and their notifications.
Distinguish connecting the binding from permission to execute an individual tool, and explain
the actual approval duration. Where names collide, expose enough owner/workspace or account
context to distinguish them without displaying credentials, tokens or private issue content.
Check managed and ordinary server connections, unavailable display metadata, duplicate names
and narrow layouts; the named card and decision must remain bound to the same current request.
This is deferred Nov 11 work, with no new Nov 8 build or deployment.

## N11-11 — Guided installation for desktop-control options

November 12: implemented in source. Engine Room selects a computer and backend, opens/reuses its
guided setup chat, shows its status and retains reference instructions. Destination provider
metadata validates saved defaults; remote management grants, stable retry identities and ordinary
installer/OS approvals remain enforced. Synthetic API/relay and native Engine Room acceptance
pass. Physical installation and permission-flow acceptance remain separate.

Add an **Install** button beside each supported desktop-control option in Engine Room,
including Cua Driver and the Mac-only Peekaboo backup. Launch or resume a guided setup chat
on the selected destination computer using that application's configured default provider,
model and run options, validated against its current catalog rather than hard-coded choices.
Identify the destination and backend clearly and reuse an active setup chat to avoid duplicate
installations. Retain the installation and OS-permission instructions as a reference.

The guided workflow should inspect the platform, existing installation and prerequisites, then
use available built-in app tools or explicitly approved terminal access to install the backend
and required dependencies. Support established package-manager routes such as npm and Homebrew
where appropriate to the platform; install missing supporting tools when needed through the
normal approval flow. Choose trusted supported package sources and compatible versions, preserve
working installations, and explain any required privilege, restart or manual OS-permission step.
An Install click starts the guided task; command approvals and OS grants retain their normal
human review. Terminal access must remain explicitly shared and revocable.

Show setup progress, actionable failures and a way to return to the same chat. After installation,
refresh Engine Room and verify backend discovery, required permissions, desktop windows and a
real read-only observation through the destination's supported desktop-control boundary. Report
installed, permission-blocked and verified states separately; input requires a separately
authorized real task. Preserve Cua Driver as primary and Peekaboo as an on-demand Mac backup.
Test missing dependencies, already-installed backends, interrupted/retried setup, unavailable
default models, denied approvals and platform-specific support across macOS, Windows and Linux.
This is Nov 11 planning only; do not install dependencies or rebuild/deploy Nov 8 for this entry.

## N11-12 — Route Playwright attachment to the tab's owning window

Installed desktop testing reproduced an authorized browser tab being unavailable to Playwright
when it belongs to another application window. The standard browser tool could reach the same
tab with the owning window specified, while the Playwright tool schema offered no window
selector. This is a browser-tool routing limitation, separate from the tested site's workflow.

Trace backend attachment and tool routing for stable tab IDs across windows. Resolve the owning
window reliably or support an explicit validated window selector consistently through the
Playwright catalog/call boundary. Preserve tab/profile authorization, sharing and pause gates;
do not move or duplicate the tab, focus another window or broaden access merely to attach.
Report actual unavailable/denied states distinctly from a window-routing failure.

Verify list/catalog, attachment and read-only observation for authorized tabs in current and
other windows, including hidden/unloaded tabs where supported, moved tabs, closed windows and
denied sharing. Cross-window attachment must preserve tab identity, history and placement and
must not interact with unrelated tabs. Keep private site URLs and reproduction data outside
application source. Queue the correction for Nov 11 without rebuilding or deploying Nov 8.

## N11-13 — Interactive chats incorrectly labeled as scheduled tasks

Operator report from an interactive chat shows a “scheduled task” marker despite no configured
trigger. Its record carries a synthetic `chat-<timestamp>-<hash>` scheduleId and
`chatControls.scheduledRecovery=true`. A schedule list in that reporting context returned zero
entries and reading that ID as a schedule failed. The release coordinator reportedly has the
same metadata pattern. Retain exact reproduction identities in private records. Catalog scope
and actual schedule provenance still need verification before concluding which records exist.

Trace interactive chat creation, persisted execution identity, the badge's condition and recovery
capability metadata. Presence of a synthetic scheduleId or scheduledRecovery may be driving the
badge, but that cause is unconfirmed. Determine whether the recovery flag denotes shared recovery
support or actually enables scheduled-run behavior for interactive chats. Preserve legitimate
interactive session recovery and real scheduled-run recovery when correcting provenance handling.

Display the scheduled-task marker only from authoritative scheduled-origin information. Evaluate
an explicit origin/type against resolving a real schedule, including deleted schedules and partial,
offline or permission-limited catalogs. Avoid assigning user-visible scheduling meaning to an
internal execution identifier. Keep persisted legacy interactive records compatible with the fix.

Add regression coverage for interactive chats carrying synthetic IDs and scheduledRecovery,
actual scheduled runs, missing/deleted schedules, restricted catalogs, restart and restored old
records. Verify labels and recovery behavior through normal desktop/web/iOS entry points. Schedule
this with the Chats list work in N11-02/N11-09 and inspect recovery semantics before changing the
identifier or capability contract. This entry requests planning only.

## N11-14 — Life capture recovery and saved-entry editing

Investigate the observed Nov 10 fuel capture failure: the first submission returned HTTP 429
and replaced the completed form with a generic error; a later submission succeeded. Establish
the actual limiter and cause before changing limits. Preserve entered fields and selected files
through rate limits and other recoverable failures, explain when to retry, and prevent duplicate
records after an uncertain response. Exercise ordinary browser and agent-assisted flows.

Allow authorized users to edit saved Life entries, including fuel and mileage, across the web
and supported native clients. Inventory other entry types and existing correction paths first.
Preserve original evidence, record identity, ownership and audit history; validate changes and
recalculate affected mileage and fuel reports. Handle concurrent edits and retry safely. Test
editing, permissions, historical corrections, evidence preservation and report updates.

## N11-15 — Hosted Life MCP connection in Proteus

Provide a robust local Proteus configuration and discovery path for the hosted Life MCP server,
including a clear way to add, select and use it in a chat. Qualify streamable HTTP, OAuth/PKCE,
credential custody and renewal, actual connection health, provider support, per-chat selection,
approvals, clear failure recovery and reconnect across resumed sessions. Folder access alone must
not imply a connection or grant. Verify vehicle discovery, fuel capture, evidence attachments,
idempotent retries and saved versus review status against a controlled test account, then verify
the real authorized workflow without duplicate writes. Keep deployment addresses and secrets out
of source; do not assume a catalog entry proves a working connection.

## N11-16 — Clarify Proteus and Mnemosyne ownership

Life and the hosted Proteus website are Proteus responsibilities; Mnemosyne is now primarily the
transcription product and its iPhone app/process. Inventory the old Mnemosyne repository, hosted
deployment configuration, MCP packaging and transcription dependencies against Proteus's existing
`web/` Life routes, controllers, MCP server and configuration. Identify the authoritative source
for each piece and move any remaining reusable Life/site configuration into Proteus where needed.
Retire obsolete copies from Mnemosyne only after their consumers, deployment and migration paths
are verified; preserve transcription functionality, live data, OAuth clients, URLs and private
deployment configuration. Do not move credentials or machine-specific settings into the repository.
Document ownership and compatibility and test both products before removing anything. This is an
audit and migration task, not a claim that every old file is still deployed or needs moving.

## N11-17 — Smooth scrolling in desktop chats and browser tabs

Operator report: scrolling stutters in chat transcripts and in browser tabs on desktop. The
operator's priority for this release is a smooth user experience. Profile actual scroll frames
in the desktop renderer rather than assuming a cause. Identify work that runs on scroll events,
forced synchronous layout, unbounded transcript rendering, repeated Markdown/code highlighting,
expensive paint (shadows, backdrop filters, blur) and main-process/renderer messages triggered
while scrolling or while the embedded browser view is visible.

Required outcome: wheel, trackpad and keyboard scrolling in long chats and ordinary websites stay
smooth at the display's refresh rate on representative hardware, including while a turn streams.
Preserve history anchoring, reading position, auto-follow at the bottom, find-in-page, text
selection and copy. Browser scrolling remains handled by the page; Proteus must not intercept it.
Verify with long transcripts, code-heavy messages, streaming output and heavy websites.

## N11-18 — No attachment type or size limits

Operator: Internet Search rejected a file with "Choose a file between 1 byte and 8 MB." Remove
arbitrary file type and size limits across desktop, web, iPhone and iPad. The owning computer's
free disk space (with a reserve) is the only size constraint; files stream in chunks, are verified
by streaming, and those a provider cannot take inline (type or size) reach the model as paged
references through `proteus_attachments`. The four-file, image/text-only question-reply path is a
remaining follow-up.

## N11-19 — Human-readable times in the user's time zone

All dates shown to people are human readable in the user's time zone. Owner-written messages use
the configured time zone; client labels use the device zone; rendered messages show saved ISO
instants readably, with the exact value in the tooltip. Code spans and blocks are unchanged.

## N11-20 — Long URLs scroll; editing them must not freeze

The iPhone address bar showed a truncated URL and, when editing, a wrapping multi-line editor
that grew with very long URLs; the operator saw a frozen screen and then a crash. The editor is a
single-line field that scrolls horizontally; an overflowing idle URL scrolls (a URL that fits keeps
the tab-switch swipe).

## N11-21 — iPhone/iPad lag, tab load errors and crashes

Evidence collected remotely (iPhone off the local network): the connected iPad's Proteus 0.2.44
CPU-resource reports (55% CPU for ~3 minutes on a background queue through JSON/Foundation work;
no Proteus Jetsam kills) and 387 owner `state.display-failed` (STATE_CHANGED) warnings today.
Fixes: coalesced iOS shared tab/history cache writes (N11-21) and state-neutral POSTs no longer
invalidate state projections (N11-23). iPhone crash logs are held until it is on the local network.

## N11-22 — Readable Internet Search provider choices on iPhone

Provider buttons wrapped mid-word in one row; they now use an adaptive grid with product names.

## N11-23 — Owner state loads stay available while busy

Every non-GET request advanced the state stamp, so frequent follow/draft/preview/file/attachment
requests made large state projections fail with 503. Those state-neutral routes are exempt;
other mutations invalidate as before.

## N11-24 — iPhone watchdog kills when leaving the foreground

iPhone crash reports (0.2.44 builds 2611.8.1–2611.9.1, Nov 8–9) are all watchdog terminations
(0x8BADF00D: scene-update exceeded 10 s, or graceful exit exceeded 5 s). The main thread was in
`SharedAppStore.flushCachedState()` waiting on queued tab/history writes, or in
`RemoteStore.flushCache()` encoding/encrypting the whole cached owner state (JSONWriter frames).
Lifecycle saves now snapshot on the main thread and finish on their serial queues under a
background task; explicit synchronous flushes remain for tests and computer switches.

## N11-25 — Reopen quickly to the last page

Operator: the app unloads too quickly in the background; reopening should be quick and show the
last page immediately. No Proteus crash or memory-kill report exists on the iPhone after Nov 9.
When the app enters the background it snapshots the visible page and releases hidden ordinary
pages beyond the two most recent (Persist pages stay), lowering the chance iOS discards the app.
A page whose web content process iOS reclaims reopens from its snapshot or reloads at its
reading position instead of staying blank. Memory warnings no longer block the main thread.

## N11-26–32 — iPhone chat, tab and file-browser follow-ups (Nov 12 operator report)

- N11-26: compact circular down-arrow centred at the bottom of a chat while reading history;
  tapping returns to the newest message and resumes following.
- N11-27: the growing composer keeps the caret's line visible after every resize instead of
  leaving typed text below the visible edge.
- N11-28: streaming chat pushes are buffered for 250 ms and applied in one render; the full
  cached-state re-encode waits for 10 s of quiet (at most every 60 s) and is still flushed when
  leaving the foreground. Typing lag while a chat streams and background CPU were the targets.
- N11-29: tab overview covers the bottom safe area (no toolbar showing through) and a
  thumbnail is shown only for the page it was captured from.
- N11-30: one browser-tab menu (load/reload, unload, persist, copy link, copy Proteus tab ID,
  send, close) in the tab strip, navigation and overview; overview cards have a corner close
  button and a long-press menu; project chat/document cards close from navigation only.
- N11-31: pinch to the tab overview also works on an unloaded page.
- N11-32: Files (streamed from the owning computer) is a Chats/Tabs/Files option in projects
  and a labelled entry on workspace pages; the browser itself already existed but was hidden
  behind an unlabeled button.

Open: the large gap under "Chat details & loaded context" needs on-device layout inspection;
no cause is confirmed. Typing/scroll smoothness and battery effect require physical acceptance.

## N11-33 — Visible, resilient attachment submissions on iPhone/iPad

Operator: sending photos showed nothing and seemed locked up. Chat replies and new chats now show
"Uploading N of M files · %" then "Sending message…" at the top of the composer/form. A submission
holds its connection and an iOS background task, so switching apps or locking the phone does not
cut the upload; the socket disconnects once it settles. Behaviour on a physical device and over
slow links still needs acceptance.

## N11-35 — New-tab choice must keep the tab's position (desktop source implemented)

Operator report: opening a new tab to the right of an existing tab and then choosing a tab type
(for example **Terminal**) makes the chosen tab reappear at the end of the navigation bar. Once
the user picks the type, the resulting tab must replace the new-tab placeholder in place: same
position, parent/project placement and selection, without a duplicate or reorder. Check every
type offered on the new-tab page (browser profiles, terminal, Markdown/document, Files, new chat,
Internet Search) on desktop, web, iPhone and iPad, in top-level and project/workspace containers,
including when the new tab was opened beside a non-final tab. Investigate where the replacement
tab is created (likely appended rather than inserted after the placeholder's predecessor) before
changing behaviour. The November 12 desktop correction shares one replacement path across choices;
Files/Terminal non-final application/project positions and chat setup pass isolated UI acceptance.
Cross-platform acceptance and installed verification remain open.

## N11-36 — Retire superseded rolled-back update attempts (source implemented)

On 2026-11-12 the original chat of each of the seven Build Mac `attention` jobs was asked to
reconcile its job (Oct 24–Nov 9, versions 0.2.29–0.2.44). The installed 0.2.45 owner rejected
every request: "Only a reviewed post-install recovery-checksum attention job with verified
health can be reconciled." `desktop/updates/attention-reconciliation.cjs` accepts only
`outcome:'updated'` jobs that failed a recovery checksum. Rolled-back, barrier-timeout and
failed-before-replacement attempts have no supported resolution. They therefore block
`maintain` permanently (`canApply:false`) and keep about 5.2 GB of candidate staging and 15 GB
of unregistered recovery folders on a 99%-full disk.

Add an owner-supported reconciliation for superseded rolled-back attempts. It should require
all of the following:

- A later completed update with verified health on the same installation and data home.
- The current owner's identity matching that later job.
- Two registered, verified recovery generations remaining.
- The failed job's journal, failure and preservation receipts retained as compact evidence.

The plan should be previewed with a digest, applied with `expectedRevision`, and run from the
original chat. Then let `maintain` retire the candidate staging and unregistered recovery
payloads. Tests should cover each attention kind and the refusal cases: no later healthy job,
fewer than two verified generations, a mismatched home or installation, and an unsupported
file type in the recovery folder. Implemented in the November 12 source continuation, including
legacy pre-replacement failures and damaged historical recovery rotation when two intact copies
verify. Installed cleanup remains pending. Do not delete these folders by hand.

## N11-37 — Desktop browser cannot reach local-network hosts (regression, queued)

Operator report on 2026-11-12: Proteus browser tabs on Build Mac cannot open
`http://automation.example.test:8123`, though other browsers on the same Mac can. Reproduced in a hidden
agent tab. Both the hostname and the IP (`http://192.0.2.21:8123/`) fail with
`ERR_ADDRESS_UNREACHABLE`, so DNS is not the cause. Shell `curl` reaches the host (HTTP 200),
and the router's search domain `home` resolves the name.

Evidence from the macOS Local Network records (`/Library/Preferences/com.apple.networkextension.plist`,
read-only):

- `org.proteusapp.proteus.desktop` (main app): allowed (`MulticastPreferenceSet:true`,
  `DenyMulticast:false`).
- `org.proteusapp.proteus.desktop.helper`: never decided or denied (`MulticastPreferenceSet:false`,
  `DenyMulticast:true`). Chromium's network service runs in that helper (`Proteus Helper
  --utility-sub-type=network.mojom.NetworkService`, a child of the main process).
- The plist was last modified 2026-11-12 21:34 local time.

The installed 0.2.45 app and the 0.2.44 recovery app bundle match: same team TEAMID0000, helper
identifiers, entitlements, Electron 44.10.2 and `NSLocalNetworkUsageDescription`. The running
owner was started at 09:30 by the update helper, which uses `spawn` on the executable
(`desktop/updates/update-helper.cjs` `launch()`) rather than LaunchServices. That launch path
has been unchanged since Oct 23.

Investigate:

- Whether macOS now attributes helper network access to the helper's own identifier, and how
  that changes when the owner is launched by LaunchServices rather than by a spawned updater.
- Whether quitting Proteus and reopening it from the Dock restores access.
- Whether toggling Local Network for Proteus restores access.
- Whether Proteus should relaunch through LaunchServices (`open -n`) after an update, and should
  detect and explain a Local Network denial (`ERR_ADDRESS_UNREACHABLE` on a private address)
  instead of showing a generic load error.

Test on a fresh install and after an updater relaunch. Not implemented.

## N11-38 — Life Ask: Mnemosyne requests answered as Proteus Life chats (in progress)

November 13: the first physical paired pendant → relay → Mac answer → iPhone notification →
exact answer-chat flow passed, with matching phone/host receipts and explicit operator confirmation.
Capture-end → answer 6.676 seconds; APNs acceptance 7.399 seconds; phone display/tap latency
not measured. Follow-up attachments, task/memory filing and background/offline acceptance remain
untested. See the latest [rollout entry](releases/2026-11-15/rollout.md); implementation notes below
describe earlier stages. All app updates remain held, and N11-41 remains planning-only.

Operator direction (Omi Integration chat, 2026-11-12): pendant double-tap requests travel straight
to Build Mac through the relay and are answered as persistent Life chats on desktop, web and
iPhone, with a Proteus push notification. The contract, file ownership and status are in
[life-ask.md](life-ask.md). The Mnemosyne side is owned by the Omi Integration chat. Corrected
ingress passed joint Swift qualification; native helper, cloud fallback/mirror and serial execution
are connected to the host/engine. Desktop Ask and scoped pairing UI pass native rehearsal; a live
synthetic Codex turn confirmed the restricted policy and structured answer. Full source regression
is 1,825 pass/four skip. Native/web views, canonical project placement, immediate push and full
acceptance remain open. Not installed or deployed.

## N11-39 — Denied MCP prompt plus automatic continuation loops a chat (bug, queued)

On 2026-11-13 the "Oct 23 release" chat (9d3c7d1e) kept restarting by itself. Each turn asked
"Connect selected safari server for this Codex turn?". Denying it ("Permission denied. Selected
MCP server declined: safari") ended the turn as interrupted. Within seconds, an automatic
"Continue this conversation from where the interrupted turn left off" started a new turn, which
asked again. The operator's "just stop" was overtaken by the next continuation.

Stopping it took an explicit agent `cancel` followed by Archive. The chat has stayed cancelled
since 18:35:44Z.

Expected behavior:
- Declining an MCP connection is a final answer for that turn and must not count as an
  interruption that recovery resumes.
- A human stop or cancel must suppress pending automatic continuations.
- Repeated continuations that make no progress must back off and then stop with an explanation.
- Chats need a reachable permanent Delete. Agents have no delete tool.

Not implemented.

## N11-40 — Closing a workspace unloads its browser tabs (source implemented)

Operator report (2026-11-13): a video kept playing after its workspace was closed. A workspace
close only hid the tab (`navigationClosed`), and the ordinary unload path refuses audible pages,
so there was no way to stop the video short of reopening the workspace.

Closing a workspace tab now unloads every loaded browser tab beneath it in that window (including
chat sub-tabs) with `reason: 'workspace-closed'`. That explicit intent also releases audible
pages, which are muted while they close.

- **Kept loaded:** Persisted tabs.
- **Muted and kept loaded, with one notice:** pages with an active agent turn, a download, a
  video pop-out, or an unsaved-page prompt.
- **Unchanged:** other windows' views of the same workspace.

Logical tabs, history and placement are preserved; reopening the workspace loads a page when it
is selected.

Verification: `test/workspace-close-unload-ui.mjs` uses real WebAudio. It fails on the previous
code and passes now. `browser-audio-ui` and `browser-background-preview-ui` pass, and
`npm run check` passes. `browser-actions-ui` also fails on the unchanged code, so that failure
is pre-existing.

### N11-09 follow-up — global Chats scrolling

The November 13 report reproduces on the direct global Chats page. Its leftover overflow-hidden rule disabled wheel scrolling, while the workspace list passed. Restore page overflow and exercise the global mount in the existing progressive-loading regression; retain workspace coverage through PROTEUS_TEST_CHAT_SCOPE=workspace. Both global and workspace UI checks pass (260 unique chats, wheel input, progressive loading, refresh position and filtering); static checks pass. New package acceptance is pending.

### Command ledger capacity follow-up

Operator authorized raising the limit and repairing tab-sync growth. SQLite WAL updates individual receipts in a worker; it does not rewrite the whole ledger. Set the compressed receipt budget to 512 MiB with 32 MiB and 256 slots reserved for owner-classified update starts, cancellation, recovery and revocation. All existing receipts remain intact, uncertain claims never expire, and duplicate operations return their exact saved result. Tab mutations use the same default 32-entry navigation window as reads (explicit requests capped at 200), with full history retained and pageable. SQLite allocation/WAL can exceed the logical receipt budget. Validation passes: 27 focused tests, 1,831 full-suite tests (4 skipped), and static checks. Installed qualification remains pending.


## N11-41 — Mnemosyne camera QR pairing (deferred to a future Mnemosyne update)

Operator decision, November 16: exclude this item from the current Proteus delivery and defer it
to a future Mnemosyne update. Omi Integration retains ownership. The earlier requested scope is
preserved below for that future intake; no implementation or separate Mnemosyne release is opened.

- Reuse the existing scoped invitation parser and pairing flow.
- Request camera permission only when the user explicitly chooses Scan.
- Keep the existing paste-link fallback.
- Validate invitation expiry, version and Life Ask purpose before pairing; preserve single-use behavior.
- Never log, export or retain invitation/device keys in diagnostics or chat.

Acceptance will cover camera consent/denial, valid pairing, expired and wrong-purpose QR codes, and paste fallback. No implementation, build or installation has been performed for this item. The current live test uses the installed paste-link flow.
# N11-42 — Life Reminders and typed action confirmations

### Latest Life and Smart Home navigation/control correction

Use one canonical Life order in sidebars, menus and tabs: Overview, Ask, Smart Home, Nutrition,
Garage, Fuel & mileage, capture features, Account, Connections. Overview is first. Keep stable
route IDs while normalizing display/accessibility names; Reminders and Scratchpad are top-level.

The operator explicitly superseded the Smart Home checkbox allowlist and limited on/off domains:
support all devices and services exposed by the configured Home Assistant, discovering additions
dynamically. Remove the checkbox selection page. Keep captured-account/host authentication,
ordinary tool/device permissions, precise target/service validation, idempotency/uncertain-action
reconciliation and clarification for ambiguous requests. Do not broaden the pendant's ingress
scope or perform real device actions while implementing this change.

Smart Home has its own navigation scope with persistent Smart Home and Home Assistant tabs and
the existing add-tab menu for browser/chat/document/terminal resources. A third navigation layer
is explicitly accepted. Use the actual embedded browser for Home Assistant rather than weakening
its framing/login protections. Preserve stable tab IDs, placement, credentials, drafts and owner
authorization; moving into this navigation scope does not grant filesystem or terminal access.
The native summary page should show connection state, searchable devices/services, favorites,
scenes and recent command results without reproducing Home Assistant configuration screens.

### Scratchpad — operator-authorized addition, implementation in progress

Add a main-sidebar Scratchpad entry immediately below Reminders, using the shared project/chat
navigation and existing Markdown editor/formatting tools. Provide a master list, categories,
filters and stable-ID scratch tabs, with create/name/rename/delete/project association. A new
Scratchpad tab in each project lists that project's scratches. Support Markdown, text and code
content without inventing a separate document theme.

The operator chooses the storage directory during setup; offer configured memory locations as
defaults, without silently selecting a vault. Store files under Scratchpad/workspace/project,
with portable Obsidian-compatible frontmatter, stable IDs, names, associations and relevant
timestamps/type. Include a root management warning. SQLite indexes metadata for responsive lists
and filters. Debounce local edits, flush on page exit and preserve unsaved/conflicting edits.

Filesystem reconciliation is explicit via the main-page button or a scoped agent tool, never an
automatic filesystem watcher. Compare files and index in both directions: ingest manually added
files, normalize missing frontmatter, reconcile edits, and remove index entries for deleted files.
Detect concurrent edits/renames/deletions before writing; do not silently overwrite changed files
or recreate a deleted file from a stale index. Preserve unknown frontmatter and Markdown content.

Chats have automatic tool access to scratches in their captured project. Reading another
project's scratch requires user permission; association changes must not bypass that boundary.
Use ordinary user-selected storage grants and stable operation/revision identities for writes.
Remote web/iOS/desktop access is available only through the separate **Read and edit Scratchpad**
Connections option, off by default. Fetch files on demand and save edits on leave or at a bounded periodic interval, with
conflict/offline feedback. A link, index row or project move grants no new file access.

Validate ownership, cross-project approvals, manual-file reconciliation, missing/duplicate IDs,
frontmatter normalization, symlink/path containment, rename/move/conflict handling, coalesced saves,
and remote read/write revocation before qualified builds and rollout. Storage setup and sharing
are explicit user choices; this scope does not authorize automatic vault selection or new grants.

Source checkpoint: the worker-backed file/index service, captured-project chat grants, explicit
remote switch, desktop sidebar/project editor and website view pass focused qualification.
Native views/drafts are implemented and under simulator qualification. See `docs/scratchpad.md`.
No real vault or device permission was changed; installed/physical acceptance remains open.

### Terminal sharing indicator — additional operator bug

The terminal robot's `aria-pressed` state already tracked the owner, but the lit CSS selector was
limited to browser toolbars and palette hover styling could override it. Share the robot rules
between browser and terminal toolbars and exclude them from generic palette hover overrides.
The actual Electron/PTY regression failed before the fix and now passes enabled/disabled colors,
agent access, stable input retries and revocation. Installation remains part of this candidate.

### Follow-up scope — partial physical acceptance and shared navigation

The first physical reminder displayed correctly but disappeared from the default list after
opening it again. Canonical read-only inspection found the same record at revision 2, completed
and not deleted; date-only due date and Inbox remained intact. Preserve that record unchanged.
Reproduce the native multi-button List-row interaction before assigning the completion's cause.
First display is partial acceptance, not persistence or reload acceptance.

Build the requested Life redesign using existing Proteus theme and shared controls: persistent
global header/sidebar access; no lifecycle-driven Overview redirect after phone back/swipe;
project-style secondary navigation on desktop/web/iPad and compact phone tabs; Overview first;
rename displayed Home to Smart Home while preserving stable route IDs. Promote Reminders above
Mnemosyne using existing Life account/connection visibility predicates. Retain Life configuration.
Reminders has a persistent master tab with lists, filters and sort, plus one stable-ID tab per
opened reminder. Reopening focuses the existing tab; closing never deletes a reminder. Preserve
drafts, filters, selection, revisions/conflicts, tombstones and account boundaries. Polish loading,
empty and error states with the existing palette, typography, spacing and control styles.

Qualify refresh/reopen/history/background/cold-launch persistence; light/dark themes; global
header access; no Overview loop; and exact typed-notification tab reuse in all launch states.
Run native, owner and website regression/UI checks, build and coordinate the phone window before
installation. General rollout remains authorized; QR N11-41 stays held. No Stairs Light test yet.

Authorized November 13: implement, test, build and deploy server-canonical, account-owned
Reminders across desktop, web and native iPhone/iPad. All reminders plus user lists/default Inbox;
title/notes, date-only or timed due dates, timezone, completed filter and due/created/list/title
sorting. UUID identity, expected revisions, stable operation receipts, account-isolated sync and
recoverable tombstones; deleting a list preserves its items in Inbox. No historical task migration.
One Life API serves UI and scoped agent CRUD/list management. Life Ask interprets actionable
requests into that API with request-derived retry identity, using capture time and Life timezone.
Memories continue to the configured private notes helper; reminders never invoke its file verb.

Each durable action gets one confirmation separate from due alerts. Typed reminder/document/chat
destinations carry only scoped IDs. Memory viewing reuses existing source roots and device workspace
file viewing; no automatic sharing/grant changes. Existing Mnemosyne v1 mirrors remain compatible;
reminders have savedPath null. QR N11-41 remains queued for separate implementation.

Current source checks: server account/retry/revision/tombstone/date and confirmation/due cancellation
tests pass; host date/timezone/replay tests pass; iPhone simulator build passes. Omi qualified the
unchanged installed client's exact synthetic reminder mirror. UI, full regressions, signed artifacts,
server migration/deployment, physical pendant/reminder/sync/push acceptance remain open.


## N11-43 — Sensitive Life Ask actions

Source implemented: immutable action proposal and protected human permission card, followed by one ordinary-permission tool-assisted turn. Only selected MCP sources are captured; no voiceprint authorization. Denial, Stop and account changes prevent execution. Four real-engine synthetic tests pass. Live MCP/chat execution and physical approval acceptance remain open.

## N11-44 — Native Home Assistant in Life

The original installed implementation used an explicit entity allowlist and On/Off policy. The operator superseded those limits: current source discovers all Home Assistant entities/services dynamically, including parameterized services and required-response endpoints. Desktop has persistent Smart Home/Home Assistant navigation plus ordinary additional tabs. Native and web navigation qualification is in progress. Account binding, encrypted credentials, command receipts and uncertain-delivery protection remain. Fourteen fake-HA tests and desktop Home/tab UI tests pass; no real device command or new installation has occurred. See life-home.md.

## N11-45 — Continue automatically after folder approval

Source implemented: save one pending continuation with the approved exact grant; start only after normal provider completion. Coalesce existing queued input; no repeat for status/retry; no restart after Stop, denial, revocation or failure. Eight focused tests pass. Installed acceptance remains open.

## N11-47 — Scratchpad storage and shared feature workspaces


The operator requests a separate review demo and local iPhone/iPad simulator qualification before
another mobile push. Source Library additions must refresh Scratchpad's storage choices. Configured
Scratchpad uses a settings gear; changing location warns that existing files stay in place and a
background index rebuild may take time, with items appearing progressively. File/index work remains
on the worker; synchronization still requires an explicit request, with no filesystem watcher.

Reminders and Scratchpad share a flush, nested content-tab strip, close controls, overview and add
menu. Their persistent master and stable record tabs sit beside ordinary browser, profile/private,
file and desktop terminal resources, without chat creation or new permissions. Native/web clients
retain their existing capability limits: remote file views revalidate ordinary file grants; terminal
sessions remain desktop-only and website frames cannot create an isolated incognito session.

Reminders adopts a desktop/tablet Lists column with All Items first, a compact phone Lists menu,
semantic icons, restrained list accents and clear completion controls/cards. Reviewed references:
[Apple Reminders](https://support.apple.com/en-us/102484), [Todoist](https://www.todoist.com/features),
[Things](https://culturedcode.com/things/), [TickTick](https://ticktick.com/features) and
[Microsoft To Do](https://www.microsoft.com/en-us/microsoft-365/microsoft-to-do-list-app).
These inform hierarchy and readability; Proteus's existing palette and typography remain canonical.

`npm run desktop:demo` reuses the protected, isolated Design Preview home with synthetic Life data
and real synthetic Scratchpad files. Renderer changes reload this demo without restarting the
installed owner. No real Life account, Home action, phone pairing or operational session is imported.
Source and simulator checks precede package/physical rollout. The original physical reminder test
and its canonical baseline remain separate; no replay or replacement is permitted. QR N11-41 stays held.

Source qualification: 1,897 Node tests pass, four skipped; static checks, seven Reminders API tests,
built website UI checks and focused desktop/iPhone/iPad simulator flows pass. Reload coverage also
fixes feature master pages being converted to Home by session validation and newer user selections
being overwritten during restoration. The isolated demo is running; production remains on the
previously installed source. Physical acceptance and release closeout remain open.

## N11-49 — shared tab chrome and Reminders workbench (active review)

The operator rejected the feature-specific dropdown and spacing. Root/project/chat/Team Tools and
feature tabs now use the same add/close vector glyphs. Reminders and Scratchpad use the project
strip metrics, flush placement, overview and empty-strip double click. Plus opens the universal
New Tab page directly; Scratch and Reminders are choices, with chat creation excluded from feature
workspaces. Delegated hover hints display the full tab title and an available URL locally, without
fetching the destination or recording a page preview.

The persistent Reminders master is an overview of open/completed totals, lists and upcoming
items. Each work tab has Lists → Items → Details on wide screens. A universal Reminders tab starts
in All Items; choosing a record updates its own details column. New reminder uses that column and
prefills the current list; a confirmed save stays in the ordinary editor. Selected resource IDs are
separate from view IDs. Reopening an already selected ID focuses its view; closing never mutates
the reminder. Account-bound session references contain no record body or credentials. Frozen retry
identities and unsaved drafts survive account-bound desktop/web renderer reload, including an
acknowledgement lost after commit. Revisions, date-only semantics and explicit completion remain intact.

Scratch file switching is serialized against late reads and flushes the departing note before
selection changes. Cached editors reattach without being recreated; the current title and tree
highlight follow the selected file. Theme-colored CodeMirror carets fix the invisible cursor.
Compact file controls use the Workspace Files refresh icon, readable filter text and smaller
rows; Scratchpad metadata/filter controls have reduced spacing. Storage-root changes dispose old
tree/editor listeners while retaining root-bound draft recovery.

Native feature tabs now use New Tab instead of a Menu, plus the overview/workbench. Wide tablet
layouts use three columns; narrower tablet windows put Lists in a menu beside Items/Details,
and phones use one active pane. A screenshot review found and fixed a crushed portrait item
column; the UI check now enforces readable item-title width. The simulator can retain its
portrait-sized application window after a device orientation request; record the observed frame
instead of labeling that capture as wide-layout acceptance. A delayed browser-close selection could override a chosen record;
native selection now ignores that stale callback. General native/cross-owner Scratch resource-tab
parity from N11-48 remains open. QR and physical workflow acceptance retain their existing gates.

Qualification is recorded in the continuation implementation/rollout records. Disposable desktop,
web and iPhone/iPad simulator checks pass; no production package/deployment is implied by demo
refresh. The demo's prior note body hash and revision were verified unchanged after its restart.

## N11-48 — Markdown scratch workbench (active review)

The operator selected CodeMirror 6 for Obsidian-style live/source Markdown editing, retaining the
existing read-only renderer. Scratches are Markdown; code belongs in fenced blocks. Desktop source
adds independent scratch view identities in main/workspace/project/chat/feature/Team Tools strips,
context defaults, separate workspace/project selectors, category filters, newest-created ordering
and indexed filename/custom frontmatter search. Each desktop editor uses a compact instance of the
shared Workspace Files browser and shared attachment viewers under its Scratchpad root grant.

The first demo exposed an unfinished flat path list and an editor CSP failure. The affected saved
file and editor text agreed; folding hid its contents. Files, index and serializable undo state were
preserved privately. The replacement uses shared file controls, scoped style nonces and no folding
controls. Regression coverage checks actual computed editor styles, master navigation, formatting,
Undo and exact saved Markdown. An active editor now defers automatic design reloads.

CodeMirror native save/cold-reopen checks pass on shared phone/tablet simulators. Native folder-tree,
attachment and general Scratch-tab parity, broader remote placement, final visual review and physical
acceptance remain open. No new production rollout is implied. This section supersedes the earlier
demo's readiness claim; the redesign remains active work.

## N11-46 — iOS history reading position

Source implemented: preserve activity-group boundaries when older history is prepended and reject geometry from a prior presentation. Both focused real-simulator UI tests and nine Life native tests pass. Actual phone reading-position acceptance remains open.


### Nov 14 iOS question chat links

The phone report uses a Markdown-labelled chat reference. Source now links the label itself in question cards, answer history and the question queue; raw chat URLs stay linked. Invalid pairing/credential-bearing references remain literal. Both focused native link regressions pass on the shared iPhone simulator. Signed physical rollout and real question-card tapping remain pending.

### Nov 14 source qualification follow-up

Terminal sharing now visibly uses the enabled accent, including themed hover; the real PTY sharing, input and revocation regression passes. Scratchpad has shared owner storage, scoped agent access, opt-in remote editing, desktop/web/project views and a native editor. Interrupted saves retain their original identity across encrypted native draft restoration; pre-intent rejection permits correction without an uncertain retry. The full Node suite passes 1,894 tests with four skipped; 17 focused website tests pass with 254 assertions. Web build and focused desktop Scratchpad/Reminders flows pass. Reminders now uses stable record tabs and account-validated top-level destinations. Native cold-launch saving/reopening passes after fixing the connection-ready refresh race. Final physical release acceptance remains open. No new installation is implied.


## N11-50 — Account reminder replicas and remote Scratchpad owners

Reminders remain canonical in the Life server, with account-scoped SQLite replicas on desktop,
browser (SQLite WASM worker) and iOS (protected background actor). Sync the existing revisioned
change feed/cursor and tombstones; preserve server revision/idempotency checks for every write.
Network failures may show a read-only local snapshot; revoked or switched accounts fail closed.
Do not label account reminders with a computer.

Scratchpad exposes a sidebar computer selector and overview owner buttons. Local comes first and
is the desktop default; native/web default to the selected connected computer. The selected owner
supplies its configured folder, workspace/project catalog and file bodies through the existing
permission-checked relay. Stable tabs and pending edits retain their original owner/root when
another computer is selected. Successful clean phone files remain in memory; only unsent drafts,
retry identities and recent metadata use protected recovery, removed after acknowledgement.

Source validation and signed Build Mac/iPhone/web rollout are distinct gates. Omi capture and
pairings stay unchanged; camera QR N11-41 remains held. No Smart Home device action is part of this
acceptance. Retain at most two verified recoveries per installation/device and preserve unresolved
historical updater evidence through supported owner flows.

### N11-50 corrective follow-up — historical workspace associations

The installed folder browser failed when either of two historical project rows referenced an unavailable workspace. Skip unavailable virtual destinations using one catalog snapshot; retain real files and reject explicit writes into unavailable workspaces. Focused owner-worker regression passes. Corrective signed Mac rollout remains pending; iOS/web read the owning host and need no client rebuild for this fix.

## N11-51 — Shared feature tabs, overview groups and previews

Return to the last selected Reminders/Scratchpad tab from the sidebar; explicit master selection
remains selected. Workspace Files, Scratch and Reminders are ordinary resource tab types in
applicable containers, including Team Tools. Tabs stay where opened; type does not infer a new
parent, machine or permission scope. Global overview groups feature-owned resources once,
and feature overview reuses the screenshot-card UI. Match website favicons and title/close
insets to existing project/root navigation; retain the selected reminder card highlight.

Default new-type integration is codified in feature-navigation.md: placement, universal New Tab,
close/reopen, screenshot previews, overview grouping, responsive/theme behavior and ownership
qualification are required together. Incognito remains excluded from every capture/cache path.
Owner-hosted Scratchpad screenshots on iOS stay memory-only alongside transient clean content.

The urgent historical-workspace host fix is separately installed as source79f70177. The broader
N11-51 source passes 1,908 Node tests (four skips), static checks, the real-favicon/spacing/selected-card
Electron check and the shared website UI check. Thirteen native projection tests, iPhone root-resource
cold restoration, iPhone/iPad Team Tools and iPad Reminders workbench/overview checks pass. The
paired Scratchpad save/readback/cold-launch rehearsal also passes after the UI helper was updated
for the current Add computer form. Signed builds, combined deployment and physical acceptance
remain open. The operator explicitly approved pinned MIT html-to-image 1.11.13. Website ordinary
resource previews now use bounded session-only captures and shared screenshot cards. Cross-origin
browser embeds retain an icon. File previews clear on access revalidation; captures never grant
access, enter local storage, or travel over the relay. Actual screenshot/revocation UI checks pass.
