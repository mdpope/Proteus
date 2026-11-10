# Nov 10 release plan

Status: queued release; draft-sync correction isolated in source. Nov 8 release closeout continues
separately; no version is reserved here. The operator explicitly defers this correction rather
than building or redeploying the Nov 8 packages again.

## N10-01 — Clickable links to Proteus resources

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

## N10-02 — Investigate a better Chats list design

Review the Chats list across desktop, web, iPhone and iPad. Propose and validate a clearer layout
for titles, run status, provider/model/effort/speed, owner computer and recent activity. Preserve
search, editable/collapsible filters, progressive loading and one predictable scrolling surface.
Use dense and long-content examples; evaluate readability and touch/keyboard access before
settling the design.

## N10-03 — Denser headers across features

Audit headers, toolbars, tabs and filters across the application's features. Reduce excessive
height, padding and repeated headings so more useful content fits on screen, while keeping
primary actions discoverable and touch targets usable. Coordinate shared components across
desktop/web and phone/tablet layouts. Verify narrow widths, wrapping, accessibility text sizes,
keyboard display and safe-area spacing. Investigate the design before broad implementation.

## N10-04 — Reliable cross-device draft synchronization

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
`codex/nov10-desktop-draft-sync`. The regression reproduced the unsupported-command failure before
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

## N10-05 — Workspace Files tabs stay where opened

Workspace Files should open as ordinary resource tabs in the navigation container where the
user invoked them, including workspace/project placement, rather than always creating a
top-level application tab. Apply this consistently across desktop, web, iPhone and iPad and
across entry points such as the new-tab page and feature navigation.

Preserve the folder being viewed, selection, preview, history and source authorization when
placing or moving the tab. Placement must not grant access to another workspace or change the
execution owner. Define reuse versus a new independent file-browser view explicitly, using the
same navigation conventions as other normal resource tabs. Test placement, close/reopen and
cross-device navigation without duplicating or relocating unrelated tabs.

## N10-06 — Analyze folder discovery, scope, grouping and duplicates

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

## N10-07 — Relevant iOS tab controls and Copy Proteus tab ID

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

## N10-08 — Investigate unsolicited browser URL/history changes

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

## N10-09 — Fix Chats list scrolling and progressively load more chats

Operator report: scrolling while the pointer or touch gesture is inside the Chats list does
not scroll it; scrolling only works outside the list's borders. Investigate nested scroll
containers, frames, overflow sizing and wheel/touch event handling rather than assuming a
confirmed cause. Coordinate this fix with the Chats design investigation in N10-02.

Evaluate one page-level scrolling surface for the Chats view, with more chats progressively
loaded when the user reaches the bottom. Scrolling must work from anywhere over the list,
including its rows and empty space, without requiring the user to move outside its borders.
Preserve search, filters and row actions, and provide clear loading, retry and end-of-list states.
Prevent overlapping loads, duplicate rows and stale results after a filter or owner change.
Appending results must preserve the visible position and must not jump the page or repeatedly
load the entire history without user scrolling. Restore position when returning from a chat.

Verify mouse wheel, trackpad, touch and keyboard scrolling across desktop, web, iPhone and iPad,
with short and long lists, narrow layouts, slow responses and failed page loads. This is queued
for Nov 10; it does not authorize another Nov 8 build or deployment.

## N10-10 — Name the service and connection in approval requests

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
This is deferred Nov 10 work, with no new Nov 8 build or deployment.

## N10-11 — Guided installation for desktop-control options

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
This is Nov 10 planning only; do not install dependencies or rebuild/deploy Nov 8 for this entry.
