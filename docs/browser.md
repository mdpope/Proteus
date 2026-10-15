## October 15 native content-edge correction

Native browsers use Proteus’s single content-relative gesture handler: a drag starts within
56 points of the content edge and travels at least 80 points, predominantly horizontally.
Center, short, vertical and two-finger gestures retain their existing behavior. Back/Forward
use the same saved-history service as toolbar actions; when the complete native history path
matches, that service still traverses the existing WebKit item and preserves page instances.
WebKit’s separate interactive navigation recognizer is disabled to prevent it from suppressing
or duplicating the app handler. Its interactive swipe preview/cancel animation is consequently
unavailable. Restored-history fallback, zoom, owner scope and tab placement remain unchanged.
Hosted run 38696071427 passes the three-page edge workflow and all 122 native units, including
native page-instance/history-state checks. Full-suite and physical acceptance are tracked in
[PR #20](https://github.com/mdpope/Proteus/pull/20).

## 0.2.20 native link menu candidate

Native WebKit views observe actual pressed anchors in an isolated content world, including
linked images and frame-relative links. Both element and editing-menu paths offer Open in New
Tab, Copy Link, configured-folder download, Download As and Share while retaining native actions.
A connected source owner additionally offers a link chat draft; source workspace/profile/owner
and adjacent tab placement are retained. View lookup and shared-state application do not update
interaction timestamps. Simulator and installation acceptance are tracked in the handoff.

**Historical October 14 queue-only intake — BF-2026-10-14-01:** Native iPad/iPhone long-press and pointer link menus,
including the native app on Mac, should provide Open in new tab, Copy link, Start chat with link,
Download and appropriate native selection actions. Keep placement/download/access rules and
omit unsupported desktop actions. See [next release queue](planned-updates.md). No build or
implementation is authorized for this queued item yet.

**Historical October 14 implementation checkpoint (later release behavior supersedes it):**

The current authorized batch implements persistent tabs, downloads, GET redirect decisions,
visual Playwright tools, default Playwright MCP and optional Chrome DevTools MCP, human DevTools,
extension profile grants, localized toolbar controls and bounded popups. Desktop GET redirects
wait five seconds; Back cancels, Reject preserves the requested entry, and timeout accepts.
Non-GET redirects preserve native request bodies; SPA replacement reconciles its existing entry.
iOS uses history reconciliation and retains safe deep-link provenance, including login redirects.
Downloads use the owner's OS Downloads folder; native uses Files and configurable folder access.
Web pages use their browser's own download manager. Protected profile/tab/developer scopes remain
independent. A human inspector releases agent debugging until it closes. See the current ledger
for actual verification and installation; queue-only notes below describe the historical intake.

See [release status](2026-10-13-tab-management-release.md).

# Shared embedded browser

**Queued extension fixes — October 13:** BF-17 agent access on extension-enabled tabs is now
explicitly confirmed. BF-18 puts Extensions/actions between Go and Overview in the address toolbar,
replaces the overlapping Install control and resolves manifest-localized names before review.
BF-19 makes popups bounded, rendered or visibly failed, and dismissible through host-owned Close/
Escape; options/onboarding requests retain appropriate presentation. Placement/localization source
findings are confirmed; fullscreen/blank popup cause is not. See [scope](planned-updates.md).
No implementation/build, live extension install or current profile changes.

**Queued developer tools/profile access — October 13:** BF-16 selects Playwright as default and
Chrome DevTools MCP as optional on-demand developer access. Add built-in human DevTools/Inspect
for the selected embedded tab and integrate agent MCP packages via the owner service; test actual
Electron/private-bridge compatibility, tool overlap and debugger coexistence. BF-17 proposes a
saved profile option allowing shared/run-owned tabs with extensions, overriding the current
blanket block. Normal tab sharing, developer grants and Live Browser scopes remain distinct.
No packages installed, settings/grants changed, implementation or build; see [scope](planned-updates.md).

**Queued visual Playwright control — October 13:** BF-2026-10-13-15 in
[planned updates](planned-updates.md) extends the existing embedded-tab integration with image
screenshots, coordinate click/double-click/right-click/drag/scroll and keyboard input. Intended
for Zoho Assist and other pixel-only browser interfaces. Update provider/MCP image responses as
well as capture; current snapshots are ARIA text and Codex tool results are text-only. Preserve
semantic locators, tab permissions and single-WebContents scope. Scale/crop/resize/stale-image
handling and live remote input require acceptance. No implementation, live verification or build.
The operator authorized the Zoho session linked in this chat as the live test target once the
feature is implemented; preserve that consent, keep its details private and use reversible tests.

**Queued Downloads — October 13:** BF-2026-10-13-14 in [planned updates](planned-updates.md)
adds a Firefox-style download indicator/panel, progress, actual download date, Cancel per item,
OS Downloads default and folder configuration/Open folder under Engine Room → Browser Preferences.
Right-click Save As selects a custom location for one download. Existing explicit linked-file Save
As does not provide ordinary page-download handling or a manager: its helper-grant handler rejects
unmatched ordinary requests. Extend it through one profile-bound lifecycle, with honest restart/
failure/cancellation state and platform-specific native export behavior. No implementation/build.

**Queued Workspace Tabs — October 13:** BF-2026-10-13-12 adds an open-tab manager between Chats/
Configuration: favicon/title/flexible URL/opened/interaction/actions and hide/restore/reorder/
close/move. These placement options extend to terminals/viewers. Hide and browser Persist are
independent states. See [preview](design/2026-10-13/workspace-tabs-preview.html) and
[queued scope](planned-updates.md). No application implementation/build.

**Queued October 13 — agent tab management:** BF-2026-10-13-11 proposes an all-tab management
service/MCP for internal and external agents: complete filtered inventories with identity, opened/
touched dates, URL/favicon, placement and loaded/persisted metadata, plus real moves/close across
chat/workspace/main/Team navigation. Current proteus_browser remains limited to shared/run-owned
browser views. Management access is separate from page automation; moves preserve profile/history
and do not grant page access. Project agent guidance exists; service implementation/build is held.
See [future intake](planned-updates.md).

**Queued October 13 — Persist tab:** BF-2026-10-13-08 proposes a reversible browser-tab
persistence toggle, preventing automatic unload and excluding the tab from the ordinary retained
allowance before quota ranking. Keep real loaded/process resource totals, restore/move the flag
and respect profile access. Manual/native/owner-host lifecycle parity is part of the queued review;
no runtime implementation or build is authorized. See [future intake](planned-updates.md).

**October 13 queued redirect/history review:** BF-2026-10-13-05 now has platform-specific
behavior. Electron desktops retain the five-second Accept/Reject redirect banner proposal.
iOS/iPadOS (including the native iPad app on Mac) instead reconciles redirect/replacement URLs
into the existing logical entry without phantom Back stops or a banner. Both preserve the
original requested destination separately for recovery, including login deep links. Keep real
query/filter/push navigation and Forward history; do not ignore query strings globally. Exact
ADO behavior and native reconciliation need verification when implementation is authorized.
See [future intake](planned-updates.md). No runtime change, build or installation is authorized.

October 12 fresh intake: BF-2026-10-12-04 in [planned updates](planned-updates.md) records
Proteus alert-banner **View logs** doing nothing. Open Logs and reveal the related entry when
available, falling back to the Logs page otherwise. The report does not identify a specific alert
type; browser-load alerts are one existing consumer, not a confirmed exclusive scope or cause.
Collection only under the new release's explicit build hold.

October 12 fresh intake: BF-2026-10-12-03 in [planned updates](planned-updates.md) requests
**Open in new Proteus tab** insert immediately to the right of its initiating tab rather than
at the navigation's end. Keep the same navigation container and existing profile/session,
URL and selection behavior. Collection only under the new release's explicit build hold.

October 10 new planning batch: BF-2026-10-10-01–05 in [planned updates](planned-updates.md)
record the Ghostery menu opening Resources instead of Browser Preferences, a filter update
with no apparent effect, a requested Chrome Web Store install button with managed updates,
new tabs from menus and links retaining the source navigation area and exact chat parent where
applicable, and reported choppy scrolling. Profile the blocking preload wheel listener and other
browser workloads before assigning the scrolling cause; no performance diagnosis is confirmed.
Store installation has a plausible Electron integration path, but compatibility remains unverified.
These items are planning only; implementation/build/install/deployment await explicit authorization.

BF-2026-10-10-08 adds repeated main-process exceptions during browser-tab moves to an Internet
Search chat. Two screenshot traces point to `webContents.id` lookups in `onBeforeRequest` and
`onHeadersReceived`. Both guard the view but not missing contents; investigate lifecycle and
in-flight requests across the registry. This stability issue is queued under the same hold.

BF-2026-10-10-09 queues a single-line link-hover status popup: long URLs can use the available
browser width within edge margins, with end ellipsis instead of wrapping over page content.
Presentation only; preserve the underlying link destination. No implementation under the hold.

BF-2026-10-10-13 queues address-bar history filtering by typed title/URL text, search-engine
options for multiword queries and Enter using the configured default search engine. Filter before
the suggestion cap and preserve profile/container placement. Search chooser/default-setting
integration remains planning only; the current recent-list input handler does not filter rows.

October 9 staged implementation: [combined ledger](2026-10-09-combined-update.md). Browser Preferences
owns persistent profiles, Ghostery settings, origin-scoped notification grants and extension management.
Default retains the original partition. Extra profiles require account verification and opt-in; only
definitions/settings sync. Device-encrypted session-cookie continuation preserves restart sign-ins.
Extension-enabled profiles are private from all agent and Live Browser access. Official Bitwarden
installation/popup was tested; authenticated vault/AutoFill flows and worker push delivery remain unverified.

Queued visual regression: BF-2026-10-07-23 in [planned updates](planned-updates.md) requests
restoring the separator before × close controls and the closing right border of the last chat
child tab. Implementation and desktop visual verification remain pending.

October 7 follow-up: BF-2026-10-07-19 in [planned updates](planned-updates.md) queues
end-to-end verification and completion of named chat-child discovery. The agent list already
filters by sharing/current-run ownership across the tab registry; installed natural-language
selection and provider/remote coverage remain unverified by this intake.

October 7 planning: BF-2026-10-07-08 through BF-2026-10-07-14 in
[planned updates](planned-updates.md) queue chat-owned routing, clicked-link preferences,
pinch overview, standup ordering, tab insertion/transfers, and a movement audit. These are
requested changes, not additions to the implemented behavior described below.

Website notification support is queued as BF-2026-10-09-13, not implemented. Browser permissions
currently default to deny. The proposal adds per-origin permission management in Browser Preferences,
shared permission banners and website alert presentation; service-worker/background delivery needs
separate validation. See `planned-updates.md` for scope and acceptance boundaries.

Electron owns the visible WebContentsView tabs, their persistent sign-in session, page titles,
address bar, navigation history, and lifecycle. Proteus supplies the tab strip and browser controls.
BF-2026-10-09-19 tracks reported sign-in loss after full restart despite the persistent partition;
restart authentication continuity is not verified for the affected sites. Session-only cookies and
site-enforced expiry must be distinguished from storage failures or profile changes.
Enter navigates; Command/Ctrl+L focuses the address; links opening new windows create new tabs.
New browser tabs focus the address immediately on desktop, website and native clients. Focusing or
clicking the address shows up to 20 distinct recent sites, newest visit first, with URL, date/time and
the device recorded for that visit. Desktop merges retained local and authorized account history;
web/native use authorized account history. Missing device names remain Unknown device. Arrow keys
and Enter select desktop/web suggestions; Escape or clicking elsewhere dismisses them. The mobile
list scrolls below the field and Done dismisses it. No external system-browser history is imported.
Hold Back or Forward for 450 milliseconds to open that direction’s native history menu; right-click,
Arrow Down and Shift+F10 also open it. A short click navigates one entry. Entries are nearest first.
Selecting an entry jumps through Chromium history; if navigation changed while the menu was open,
the stale choice does nothing. The native menu remains visible above the embedded browser view.
Tabs retain their page and history when switching between chats, schedules, and browser tabs.

Playwright controls those same pages through a private CDP bridge attached to one WebContents.
The bridge uses Electron's debugger API, a random single-use WebSocket path on loopback, and
rejects browser-wide target creation/enumeration. Production does not enable Electron's global
remote-debugging port. The app window is never registered as an automation target. The bridge is
an intentionally limited adapter, tested against the pinned Electron/Playwright versions; it is
not a full Chromium CDP server. Cross-origin frame behavior on complex sites needs further testing.

The certificate observer and Playwright bridge share an explicitly owned debugger attachment.
Bridge setup failures release listeners, sockets and their own lease; later reads reopen a closed
bridge. Proteus does not detach or reuse a debugger attached by another owner. That case returns
an actionable close-debugger-and-retry message. Concurrent synthetic reads, dynamic content,
closed-bridge recovery and foreign-owner preservation are covered by the October 6 desktop check.
Live Slack reading remains a separate verification.

The provider-neutral broker supports listing, opening, navigating, accessibility snapshots,
clicking, filling, key presses, selecting, scrolling, and closing. The Copilot adapter exposes
`proteus_browser` as a native SDK tool. It does not expose arbitrary JavaScript, cookies, tokens,
network interception, local files, or the underlying CDP connection to the model. Existing tool
permission requests continue through the run's feedback interface.

Human-created tabs start private. Enable **Agent access** on a tab to make it available to runs.
A run can also open its own tab, which is available only to that run until explicitly shared.
Turning Agent access off revokes ownership, disconnects Playwright, and cancels pending actions.
The user can browse normally while a run works; for manual takeover, turn Agent access off first.
Only one turn runs per provider session; independent chats can execute concurrently. Human interaction can still change a page mid-action.

Sign in through the website normally. Browser profiles stay in Electron user data, outside Git.
Sites cannot load the privileged app origin. Explicit Download Linked File As is supported; ordinary
download handling and a full manager are queued in BF-2026-10-13-14 above. Notification permission
requests use the shared approval framework. Other device permissions remain denied. Persisted browser authentication is separate from other browsers; no cookies
or authentication are copied from Safari, Chrome, VS Code, or Codex. Open tabs and bounded URL navigation history persist across restarts; sign-in persists in the
existing profile separately from the workspace record.

For Slack, opening a workspace or seeing a tab is not content coverage. A successful integration
test must read an authenticated message and its thread, preserve the permalink, and report gaps.
If sign-in is needed, the run must ask the user instead of claiming an empty result.

Sources: [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view),
[Electron debugger](https://www.electronjs.org/docs/latest/api/debugger),
[Playwright CDP connection](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp).

Main, chat and Team browser tabs use site-supplied favicons. Resolution stays within the existing
Electron browser session: observed/cached icon responses are preferred; otherwise only the supplied
icon URL is requested through that session, with cross-origin credentials omitted. Icons have
bounded download time and bytes and become a 16-pixel PNG before reaching the app renderer or
workspace store. No external favicon proxy or application-server website fetch is used. Navigation
clears stale icons; unloaded tabs retain safe cached PNGs. The cursor replaces the icon only during
an actual agent browser operation, including its initial page load, and clears after completion,
failure or revocation. Agent access alone does not display the cursor.

Native browser surfaces are suppressed while any Proteus modal, renderer context menu or native
tab menu is open. Closing the overlay restores the selected view without navigating its page.
Main and Team tab overviews accept backdrop dismissal; unused space inside the panel stays open.
Chat navigation keeps the same mounted bar through send, queue and steer refreshes. Chat, Team
Tools and Standup tabs have their own icons and share the primary selected/unselected palette.

Chat and Team tab descriptors reconcile through the host's revision-protected content-tab store.
Desktop-to-mobile and visiting-Mac changes carry bounded browser/document identifiers, titles,
explicit renamed titles, addresses and order. Reconciliation preserves concurrent additions,
client selection and scroll positions; it does not transfer cookies or page contents. Stable
content-tab identifiers prevent duplicate views after local browser IDs change during restoration.
Sensitive authentication addresses remain local. Synced documents still require the existing
current-root checks. View chat documents grants direct retrieval; without it, a current exact-version one-time approval is required.

## Desktop workspace and trackpad gestures

Desktop tabs are recorded in `desktop-workspace.json` under the configured Proteus home,
with owner-only file permissions and atomic replacement. The record contains tab descriptors,
order and selection; it never contains Markdown contents, terminal output or startup commands,
provider credentials, browser agent grants, or chat messages. A changed loopback port does not
lose the workspace. The old Life/Transcription-only browser storage is migrated when present.

On restart, schedules and chats must still exist. Life opens only when enabled and configured.
Markdown is reread through the current authorized-root API; a removed or unauthorized file leaves
an explanatory tab with Retry. Browser HTTP(S) addresses are reopened in new private views:
Agent access is off, and no former run ownership is restored. Browser login sessions use the
existing local browser profile. Each browser tab now retains its ordered URL/title history,
selected history index, and forward entries. Restore uses Electron 44's native
`navigationHistory.restore({entries,index})` before any page navigation. Legacy records containing
only a URL reopen that page. Redirects and same-document entries use Chromium's committed history;
we do not reconstruct history by visiting every prior page.
Terminal tabs retain their profile and starting-folder descriptor, but no shell is started;
Resume new shell rechecks current folder authorization and omits the profile startup command.
Unsaved schedule edits, chat composer drafts, and webpage form drafts are not part of this record.
Closing a tab updates the record. Closing the main window keeps the running host and tabs alive;
quitting suppresses browser-removal notifications before disposing views, preserving the workspace.

History is limited to 50 entries and 32 KiB per tab, with 512 KiB of history across the workspace.
Entries near the current page are retained in both directions; farther entries are pruned first.
URLs are capped at 4,096 characters and titles at 200. The complete workspace file is capped at
2 MiB; an oversized or unreadable source is preserved and reported rather than silently replaced.
Only HTTP(S) URLs without embedded credentials are eligible. Authentication callback URLs carrying
common code/token/secret parameters are omitted, and the privileged current Proteus app origin is
rejected again at the native restore boundary. Malformed entries and indices cannot bypass these
checks. History and URL metadata remain private local app data, never repository content.

Only URL and title enter the persisted history. Chromium `pageState`, form values, POST bodies,
custom request headers, referrers, cookies and JavaScript `history.state` are not saved in it.
Restoring a submitted page loads its URL as a GET; it never replays a form POST. A server that
requires POST-only state may consequently show an error or its ordinary GET page. Form drafts,
scroll position and richer native page state are intentionally not restored. Browser startup
loads have a 15-second restore deadline; failed restores retain the tab and an error for retry.
Agent-facing browser snapshots/listings do not include the saved history. Reopening a tab does not
restore Agent access or prior run ownership.

Primary API references: [Electron navigationHistory](https://www.electronjs.org/docs/latest/api/navigation-history)
and [NavigationEntry](https://www.electronjs.org/docs/latest/api/structures/navigation-entry).
The pinned local Electron types confirm `pageState` is optional; no sensitive page state is needed
for the verified URL/index restoration.

Two-finger horizontal wheel gestures navigate back/forward with a progressive edge arrow and
animated release. Vertical scrolling, horizontally scrollable elements, modified wheels and
pinches are left alone; a zoomed page can pan without navigating. A gesture must reach the
threshold and stop before one navigation is committed. Forged page events cannot issue a gesture
command, and the host accepts it only from the active browser view's main frame. On release, the outgoing page snapshot slides aside over the incoming page with a smooth easing
curve. The snapshot exists only in a temporary isolated native overlay; it is never injected into
the website DOM, written to disk, or exposed to page scripts. Page CSS/transforms are untouched.
Reduced-motion preferences skip the slide; changing tabs, resizing, navigation or quitting cancels
the overlay. Capture/loading/animation have short deadlines and fall back to normal navigation.
This is a commit-time page slide with a progressive edge affordance during dragging, rather than
Safari's interactive multi-page history compositor.

Pinch zoom uses Chromium visual zoom from 1× to 3×. Browser views use Electron 44's isolated zoom
mode, so same-origin tabs do not change each other's layout zoom and the Proteus shell is unaffected.
Primary API references: [Electron webContents zoom APIs](https://www.electronjs.org/docs/latest/api/web-contents#contentssetvisualzoomlevellimitsminimumlevel-maximumlevel)
and [isolated zoom mode](https://www.electronjs.org/docs/latest/api/web-contents#contentssetzoommodemode).
The old BrowserWindow `swipe` event represents a three-finger gesture; it is not used for this
requested two-finger behavior.

Validation: `node --test test/workspace-session.test.js` checks descriptor validation, sensitive
field exclusion and durable writes. `node test/desktop-workspace-ui.mjs` exercises a disposable full
Electron app and real process restart: eleven checks passed, including mixed-tab order/selection,
authorization and feature flags, private browser restoration, inert terminal restoration, native page-slide overlay appearance/disposal,
visual pinch, isolated zoom, horizontal scrolling, and trusted/forged gesture events. Screenshots
were inspected at `/private/tmp/proteus-workspace-restored.png` and
`/private/tmp/proteus-workspace-browser.png`. The actual native slide frame is
`/private/tmp/proteus-browser-slide.png` (the shell screenshot API omits native child views). The complete Node suite passed 190 tests and syntax
checks passed. Physical trackpad feel remains a hands-on acceptance check.

History validation: `node --test test/browser-history.test.js test/workspace-session.test.js`
checks bounded history, index preservation, URL/auth filtering, private field omission, legacy
migration and oversized-file preservation. `node test/browser-history-ui.mjs` uses only a disposable
Electron profile and synthetic local site. It verifies A/B/C, Back to B, an actual quit/relaunch,
then Back to A and Forward through B/C; redirects and same-document entries; private restoration;
no form/POST replay across a second restart; denied privileged origin; legacy URL-only behavior;
agent history exclusion; persisted removal on tab close; long-press/right-click menus, backward
and forward selection, short-click behavior, and rejection of stale menu selections. Thirteen groups passed. No production browsing data or
installed app was used. Screenshot: `/private/tmp/proteus-browser-history-restored.png`.

## Native iPhone and iPad browser

The native Team browser keeps a stable ID and one cached `WKWebView` for each loaded tab.
Submitting the address/search field with **Go** navigates the selected tab, including a blank
new tab; it does not create a second tab. **+ Browser** explicitly opens a new blank tab.
On iPad it is available in the main tab bar as well as the browser strip; Team's other sections
also offer the action. Tab dividers and an active underline identify the current selection.
The compact iPhone layout retains the same browser controls in its Team view.

Back, Forward, Refresh/Stop, address/search and Go share one toolbar. WebKit's URL, title,
loading state and back/forward availability update the controls and descriptor through observed
state. Editing the address does not recreate the view or discard its in-memory navigation
history. Unloading invalidates observers and releases the view; reloading retains the descriptor
and tab ID, then opens the saved URL in a fresh view. Native back/forward history is not persisted
across unloading or app restart. Each browser view uses a nonpersistent WebKit data store.

Shared history rows show a localized date and time in the viewing device's current timezone,
plus the visiting device name. Old records fall back from `visitedAt` to `createdAt` and display
**Unknown device** when metadata is absent. The list begins with 25 records and offers **More
history** below them. New native visits keep `source: mobile`, record an ISO timestamp, a random
installation UUID stored in the local `browserHistoryDeviceId` preference, and the native device
name bounded to 100 characters (model fallback). They are never attributed to the selected
remote Mac. Existing account authorization and sensitive-URL filtering still apply.

Synthetic real-WebKit unit/UI tests passed on iPhone 17 Pro and iPad Pro 13-inch (M5), covering
same-tab Go, back/forward/reload, tab identity and selection, stale-observer invalidation after
unload, localized metadata and 25-row pagination. The final iPad layout was visually reviewed.
The build from `1101c3c` was installed in place on both physical devices on October 5; data,
preferences and destinations were preserved. Physical iPad shared-Team consent remains
unverified, and new optional history fields await activation of the staged website API release.
See `release-validation.md` for receipts and the distinction between simulator and device checks.

## Search, history and Team Tools — October 4

New tabs show a search/URL entry, explicit DuckDuckGo/Google/Bing choices, saved account links,
shared recent visits and retained local Proteus history. Address-bar terms search Google. Only
HTTP(S) destinations are accepted; credentials/auth callbacks and local paths are excluded.
`desktop/browsing-history.cjs` retains up to 10,000 visits, default 90 days, with search, pagination,
clear/delete and recording/retention controls. History is separate from open-tab restoration.
Main and Team browser homes start at the top of their scroll area, with width-bounded titles and
URLs. Local and shared history initially show 25 entries, followed by **More** beneath each list.
Search resets local pagination; a failed additional-page load retains the current entries and can
be retried. The local API retains its default page size of 50 for existing callers.
Shared visit/log/notification uploads use a bounded seven-day account-bound retry queue.

Team Tools has its own persistent overview/Standup/browser subtabs and left standup dock. On
leaving Team Tools, idle browser pages unload, retaining safe descriptors. Selecting an unloaded
page recreates its view/history without restoring Agent access. Audible, shared/agent-owned or
unsaved pages refuse automatic unload. Other desktop browser pages remain loaded. Engine Room
reports actual process CPU/memory with shared-process attribution and close/unload actions.

Website New browser opens the Proteus home in a real tab; external links open separate tabs.
The website cannot inspect a third-party tab's memory or later cross-origin navigation. It retains
Proteus-opened visit descriptors only; no Safari/Chrome history is imported. Native mobile WebKit
uses the same shared links/history with account-scoped encrypted local descriptors.


## Website shared visit metadata

Shared history accepts optional `visitedAt` (an ISO timestamp with timezone), `deviceId` (UUID)
and `deviceName` (up to 100 characters), alongside the existing URL, title, source, optional host ID
and idempotent event ID. These fields are stored in the existing account-scoped `app_records`
payload; no new table or migration is needed. `visitedAt` represents the visit, not the later upload.
Older entries remain valid and use their `createdAt` as the display fallback.

The website history orders and formats visits by `visitedAt`, falling back to `createdAt`, in the
viewing browser's local timezone. It displays the supplied device name and source; old entries
without a name show **Unknown device**. Website-originated visits use an account-scoped random
browser device UUID and a descriptive **Browser on macOS/Windows/etc.** label. The browser cannot
read the computer's configured name and does not attribute these visits to the Default Mac.
No fingerprinting or imported system-browser history is used.

The shared history API retains URL/auth filtering, account isolation, idempotent event IDs and its
500-record bound. Device metadata contains no conversation or page content. Synthetic website
checks verify a UTC visit rendered in the browser's local timezone, named and legacy records,
and a new browser-originated visit. These checks do not assert production deployment or delivery
from an actual desktop/mobile device.

## Desktop toolbar styling

The desktop source uses a shared robot toggle at the right of the address
field in main/chat/Team browsers. Off is an unboxed glyph; on has an accent fill and
inverted icon colors. The lighter URL background and hover/accessibility text make
the state visible without the old Agent access text button. Existing per-tab access
semantics remain. The isolated Electron fixture verifies main/chat/Team appearance,
keyboard toggling, sharing and revocation. Installed appearance needs a release check.

## Native browser interactions in the next change set

The Mac renderer asks Electron to show native tab-creation menus over embedded
browser views. Menu selection returns an item ID; dismissing it returns null.
Browser link hover URLs appear in an isolated, transient overlay inside the
browser view. The address bar can copy the committed page URL and request a
read-only certificate summary from Chromium's active HTTPS connection. Chromium
may expose only the document response's subject, issuer, validity, names and TLS
protocol rather than DER bytes; in that case the panel omits chain fingerprints
instead of inventing them. When Chromium exposes neither, it reports unavailable
without changing trust settings.

Command-W is routed by the main and embedded web contents to the renderer's
protected current-tab close action. Pinch-out overview entry requires additional
input after reaching baseline; tab switches, navigation and dismissal reset the
pending gesture. Hardware timing remains subject to installed trackpad validation.

## Browser selection across desktop restart

Local browser view IDs can change when Electron recreates a saved browser. Workspace restoration
remaps both the active tab and remembered chat-child selections to the recreated view before
validating and saving the workspace. The separate content-tab ID remains stable for descriptor
synchronization. A selected child must still exist and belong to the same chat; an unrelated or
missing child is never selected as a fallback.


### Native title and navigation stability — October 7 follow-up

Reproduced a loaded iPad chat-browser tab reverting to `New tab` after a desktop descriptor
refresh. Reconciliation now keeps the WKWebView title for the same loaded URL when no explicit
custom name exists. Remote custom names and changed URLs still apply. Publish the browser list
once so the selected child never disappears between removal and reinsertion. Tab IDs, WKWebViews,
local selection and page memory are retained. Simulator coverage includes actual encrypted
host descriptor exchange and UI switching, repeated refresh, history and background resume.

Native main/chat/Team strips reveal a newly added selected tab once. Selecting an existing tab
or navigating with the sidebar retains the strip offset. Sidebar highlights follow the selected
chat/schedule as well as ordinary pages. Home uses an inset heading on iPad without a blank
native navigation row. Mobile Home opens the bundled README project guide in a scrollable popup.
These source corrections are planned for native build 2610.6.4; see the acceptance audit for rollout.

## October 7 tab organization

Presentation parent IDs travel with browser creation and popups. Clicked chat links capture their
origin before asynchronous menus/IPC. Engine Room → Preferences selects the in-app or OS browser
for ordinary clicked web links; the OS-reported default app name is shown. Agent browser tools
remain in-app and their control grants are separate from tab presentation.

Desktop main/chat/Team context menus offer left/right insertion. Browser tabs can move or copy
between main tabs, local chats and Team. A move clears prior control access; a copy starts unloaded.
Protected documents and live terminals explain why transfer is unsupported. Project destinations
are deferred. Overview respects the current container and includes non-browser content cards;
the visible overview button and Command-Shift-Backslash are available without a trackpad.
Renderer pinch detection excludes editors/terminals/dialogs and ordinary scrolling. Native browser
pinch remains distinct from renderer surfaces; actual physical trackpad feel requires acceptance.

## October 7 follow-up implementation

0.2.5 releases active ownership and browser automation connections when a turn ends, keeping a
chat-scoped runtime association for same-ID resumption. Unloading/reloading preserves that
association; explicit revocation or transfer clears it. The access toggle includes resumable
access. Restarted workspace descriptors do not restore grants. Named-tab requests use list first
and ask for sharing when necessary instead of opening duplicate copies.

Background throttling is enabled for inactive pages, with visible-page, active automation and
audio exceptions. It does not unload pages. Overview highlights and reveals the current card.
See the [follow-up ledger](2026-10-07-followup-release.md) for verification and rollout boundaries.

## Stable refresh of native browser surfaces

Ordinary renderer polling may request the same browser surface repeatedly. The desktop broker
compares native bounds, visibility and background-throttling state before changing them.
Unchanged refreshes therefore do not reapply native compositor settings; actual resize, tab
selection, overlay and automation state changes keep their existing behavior. Synthetic Electron
checks cover repeated unchanged refreshes, draft/focus/page identity, resize and automation
throttling. This does not certify resolution of the operator’s reported Jira-page flicker;
that live page remains an acceptance check.

## October 8 source preview: find, agent cursor and Live Browser

Chat stays outside the horizontally scrolling child tabs on desktop, web and native. Desktop
and web loaded text has a sliding upper-right Find panel with immediate ranges, active count,
previous/next navigation and keyboard shortcuts. Electron pages use native find results; native
chat/Markdown use shared nonmutating ranges and native browser/HTML views use WebKit find.
Closed activity, canvas terminals and isolated web HTML previews are not part of DOM find.

Actual agent mouse coordinates and filled-field bounds drive an isolated, noninteractive page
overlay. A short action pulse remains visible for capture and clears after activity, navigation,
disconnect, unload or revocation. It does not move the operator's pointer. Synthetic Electron
checks cover click/fill coordinates, native find navigation and loaded-page image capture.

Web and native chat tabs can view their Mac's loaded browser pages through a separately granted
Live Browser channel. Follow-agent/manual selection, zoom, frozen point annotations and pending
decisions are implemented; direct remote mouse/keyboard control is deferred. See `remote.md`
and the [release ledger](2026-10-08-live-browser-release.md) for protocol bounds, test receipts
and remaining live acceptance. No deployment is implied by these source changes.

## October 9 swipe follow-up

Native content uses 56-point left/right edge regions, measured beside rather than underneath the
iPad sidebar. Back returns chats/documents to the list. Browser history consumes back/forward
first; at the first page, back returns a chat or main browser container to Chats. Gestures require
80 horizontal points and reject mostly vertical or center-of-page movement. Native simulator
checks pass on iPad and iPhone; iPhone also verifies a retained composer draft.

Desktop pixel-wheel trackpad back closes a chat tab or a browser at its history root. Forward
uses native browser history when possible and otherwise restores the last swipe-closed tab.
Only presentation descriptors are retained (maximum 12, memory only); browser agent grants are
not restored. Dialogs, inputs, terminals and scrollable horizontal content keep their own input.
Verification and physical-trackpad acceptance are tracked in the release ledger.

## Native follow-up reports — October 9, integrated in 0.2.11

BF-2026-10-09-33–36 now include the separator after Live Browser and explicit reorder sheets on
iPhone/iPad. Main, chat and Team ordering retain stable IDs and selection while preserving tabs
outside the edited scope. Reconciliation deduplicates shared tab identities and retains a private
login/redirect tab once instead of repeatedly reopening or navigating over it.

Native keeps one persistent WKWebsiteDataStore object for each account/profile and reuses it
across main/chat/Team tabs; Default uses the normal persistent store. Simulator checks passed
same-profile cookie sharing, profile isolation, scoped ordering and private redirect retention.
Affected physical devices still need installation and acceptance. iPhone/iPad each have their own
website sessions; profile definition sync does not sync cookies or website sign-ins. See
[the full release ledger](2026-10-10-full-chat-release.md).

## Browser load errors

Native shared-tab refreshes and mutation acknowledgements may contain an empty new-tab
placeholder from another client. For the same profile, that placeholder must not erase an
active local navigation or loaded page, including before SwiftUI constructs its web view.
Keep the local URL, title and history; explicit custom names still apply. Nonempty remote
navigation, profile changes, explicit unload and close retain their normal behavior.

Desktop main-page navigation failures use the shared fifteen-second notification with Reload and View logs actions. Keep a sanitized `browser.load-failed` warning in Engine Room → Logs after dismissal; retain the failure in internal tab diagnostics without reserving a strip above the website. Each navigation attempt reports once; intentional aborts and embedded-frame failures do not generate whole-page notifications. A new main-page navigation clears the stale error state. Site-authored banners remain controlled by the site.


### Background persistence and polling

Browsing-history retention/size trimming, serialization and atomic replacement run in a dedicated worker. Visits are immediately visible and consecutive automatic writes coalesce; explicit deletion/clear/settings changes report success after persistence. A failed save retains prior disk bytes, surfaces the existing storage warning and retries optional visits. Shutdown drains ordered history writes and encrypted session-cookie snapshots. Cookie snapshot disk operations are asynchronous; OS encryption remains at the Electron safeStorage boundary. Resources and terminal status polling use coalesced asynchronous process inspection. Workspace-session saves reuse their normalized returned snapshot for content-tab seeding; explicit reads continue to observe current disk state.


October 12 link actions capture their initiating tab before asynchronous work and insert new browser tabs immediately to its right in the same container. Browser failure View logs actions refresh and focus the recorded application event, falling back to Logs when the record is unavailable.


## Native history and gestures — October 12 follow-up

Recent sites for the Default browser profile belong to the signed-in app account, shared across
workspaces and devices. Each device can contribute visits; the owner computer is not the sole
history authority. Private profile visits remain outside this shared default history. Native
Recent sites refreshes on account, scope/tab and browsing-home changes and distinguishes loading,
failed refresh and an empty result. Local default-tab navigation may supply an explicitly labeled
fallback without invented visit times. A failed account refresh does not silently look empty.

Back/Forward uses each tab's saved navigation stack, separately from Recent sites. Native
navigation commits must not consume the old page's KVO update as the destination of an in-flight
traversal. Saved stacks remain usable after view recreation and app restart; same-document
changes update the stack while preserving forward entries on traversal. WebKit back/forward
gestures operate when its live stack matches the saved neighbor. Restored stacks use the
existing fallback where necessary.

Pinching inward at minimum page zoom opens the current container's tab overview with a spring
transition; Reduce Motion uses a fade. This is Proteus's scoped overview, not a recreation of
Safari's complete interactive tab animation. Simulator acceptance and physical trackpad/touch
feel are separate verification claims in the current release ledger.

**October 13 clicked-link correction (0.2.13):** Ordinary page links now claim their logical
destination before background history polling can reload the previous address. Active loads
preserve that destination until commit/redirect reconciliation. Slow links, hash links, redirects,
new-tab targets and existing shared Back/Forward/private-redirect rehearsals pass. Installation
and live acceptance are tracked separately in [the release ledger](2026-10-13-logs-browser.md).

### Stable tab activation and synchronization

Restored tabs retain their remembered page title while their native view loads. Owner title
updates also update an unloaded native snapshot, so its next state broadcast cannot restore
stale text. Browser loading status remains available separately in the toolbar. Custom tab names
remain local/shared metadata and are not replaced by page titles on selection.

Main and Team tab strips retain their nodes on unchanged polling/state events; labels, icons,
selection, profile menus and deliberate order changes still update. Reconciliation takes detached
navigation snapshots and checks the order again after native commands yield. A drag during an
awaited page load is retained and sent on the next pass. Concurrent scopes suppress recursive
synchronization until their apply operations have all completed.
October 14 owner compatibility correction (0.2.16): legacy browser-only main/Team navigation is
expanded once before synchronization to retain saved chats, terminals and viewers. Existing
browser closes/order remain authoritative; the persisted import marker prevents later restart
from resurrecting intentionally closed surfaces. Native clients remain at 0.2.15 / 2610.14.1.


October 14 follow-up (0.2.17): browser moves use the owner tab-management service and retain the
complete Back/Forward stack without extra visits. Navigation operation UUIDs are distinct from
entry identities. Identical saved entries can acknowledge a pending sync; conflicts or closed-tab
actions stop automatic retry and offer owner-history or explicit new-tab recovery. Expanded compact
navigation temporarily reserves layout width; native browser bounds follow it while the page stays
visible and loaded. Workspace Tabs defaults to a 360-pixel title column with pointer/keyboard
resizing and local remembered widths. Move chat to workspace is available from chat-tab menus and
updates membership/index together; Show in assigned workspace only opens its current association.


October 14 document-placement correction (0.2.18) supersedes the uninstalled 0.2.17 candidate.
Agent-opened documents resolve the existing workspace chat and appear beside it; they retain
original chat/file authorization and reuse their descriptor on subsequent opens. Standalone chat
subtabs remain supported. Future removal of that container concept is design review only.

### October 14 canonical placement follow-up (0.2.19 candidate)

Owner chat Move converges the saved main/workspace descriptor independently of browser retry
queues. User Move selects the chat in its target workspace and reveals both navigation tabs.
Recovery choices now say Keep saved history / Open pending page in new tab and show affected
title/URL. The first clears the unsaved action and restores saved navigation; the second opens
the pending URL in a new top-level browser tab first. Neither choice is taken automatically.
602 Node tests/checks and actual overflow/hidden-workspace desktop UI pass; rollout pending.

### October 14 redirect policy replacement

0.2.19 / native 2610.14.2 removes the redirect countdown and iOS rewriting. Native redirects
continue immediately; requested, intermediate, final and replacement URLs remain distinct in
navigation and history logs, with full query/fragment retention across paired clients. No engine
state, form contents or POST body is serialized. Synthetic Chromium GET/login/POST redirect
checks pass; an authenticated Microsoft account flow is not newly verified. Rollout pending.
