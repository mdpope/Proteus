## October 29 — inactive project synchronization and retained-window recovery

Open workspace/project roots subscribe to their owning host's canonical content even while a
different root is selected. Owner events hydrate the affected list, URLs and complete history;
the presentation follower still subscribes only to the visible project. Local windows keep
their own selection and scroll position. Paired web/mobile/desktop clients continue to use the
existing owner scope and remote presentation following; projects with matching names on different
hosts are not automatically merged. Cookies, sign-in, execution and permissions remain host-owned.

Mirroring an unloaded Persist tab registers its metadata without allocating a website renderer.
Persist still prevents automatic unloading after a view is loaded. Selecting the same browser
in two windows can create two live views so their scrolling is independent; opening another
project window does not eagerly load every website.

Engine Room → Windows → **Find tabs in saved windows…** scans retained window session files
and indexed closed/previous/named snapshots captured in the last 48 hours. It does not promise
recovery of every closed window: automatic retention is bounded and previously discarded records
may be unavailable. Parsing runs in a bounded disposable worker; the existing owner alone commits
changes. The review identifies unavailable scopes, read errors and identities now placed elsewhere.
It matches logical IDs and full navigation stacks rather than merging equal URLs. Restoring an
absent descriptor reuses retained worker history; a divergent saved branch becomes a separate
history copy, retaining order, Forward and selection. Current navigation is never replaced.

Recovery is explicit because older records cannot distinguish an intentional Close from a tab
that was never registered. Revision/source checks reject a stale review; original records remain
intact. Unregistered legacy local views survive first reconciliation until reviewed, while observed
owner closures remain authoritative. Explicit new opens/navigation still publish normally.
Recovery does not start a chat, replay terminal startup, approve a viewer source, or share a page.
This follow-up is source-only for the next release; live HC recovery is recorded separately.

## October 23 — native link callbacks and passive project synchronization

Native menu callbacks now explicitly re-enter the source tab's window context. The callback's
asynchronous page creation and selection no longer inherit another focused window. Foreground,
background and hidden/unloaded link actions retain source project/profile/window placement.

Owner `content-tabs` events synchronize the exact visible scope independently of general state
refresh gates, including when another window owns focus or an address/composer field has input.
Tab-list application remains passive and revision/history guarded. Open/close/order converge;
local-window presentation events do not change a sibling window's selection or reading state.
Paired-computer follow remains supported. Address edits are per-view ephemeral drafts, retained
through passive refresh and cleared by successful submission or Escape. Mounted filtered Tabs
lists redraw from current owner state without losing the query, selection or caret.

The real two-window regression covers native foreground/background/unloaded links, canonical
ordered membership, separate selections, an unfinished URL, a focused tab filter, and no hidden
page load. It uses isolated profiles and leaves the installed app untouched.

## Queued October 21 — distinguish current-tab refresh from renderer recovery

BF-2026-10-21-79 queues Command+R for the initiating window's selected tab, including when shell
chrome holds focus. Keep whole-window recovery available through an explicit Reload Window action
without that ordinary refresh binding. Refreshing a tab must not reload the app shell or touch
another window's selection/session. The existing menu binding below remains current until the
queued correction is implemented; **do not build yet** remains active. See
[browser behavior](browser.md) and [planned updates](planned-updates.md).

## October 21 — crashed renderer recovery

The host detects a lost app-shell renderer independently for every window and asynchronously
reloads that window's known local app surface. The same BrowserWindow, bounds/window ID and saved
tabs, selected content, drafts and reading positions remain. Live browser pages are reused without
loading them again or unloading background forms. Host execution, provider sessions, approvals,
terminals, scheduler polling and retry receipts are separate from this recovery. Pending UI
acknowledgements fail visibly and are not replayed automatically.

Automatic recovery allows three attempts with 250/1,000/3,000ms backoff and a 30-second app-ready
deadline each. A stable minute resets the budget. Exhaustion displays a local recovery page; View
→ Reload Window retries explicitly. Logs retain the window, reason, exit code, attempt and
generation. The fallback document cannot use the trusted app bridge. An unresponsive report is
logged for manual recovery rather than force-killing a shared process. Closing an unavailable
window captures its last durable session; it does not require a dead renderer checkpoint.

Unsaved data that never reached the host before the crash cannot be reconstructed. The original
reported 0.2.26 renderer crash trigger remains unknown. Source and package/live verification are
tracked separately in the release ledger; this does not authorize updating the held Work Mac.

## October 20 — separate top-level and content overviews

The latest compact revision uses a 52-pixel title strip and 40-pixel tabs in both rows, preserving
the 11-pixel upper drag margin and matching two-pixel underline. Both rows use matching compact
overview/+ controls with a six-pixel right inset. Only actual scoped navigation has a second row;
standalone browser tabs and main feature pages have no fallback title or duplicate controls.

The top strip restores its existing overlapping-tabs overview button immediately left of +.
It explicitly opens App tab overview: this window's main navigation items only. The lower strip
keeps its own content overview for the current workspace/project, chat or Team Tools scope.
The app overview already had a separate `main` inventory; the unified chrome's hiding rule is
removed. The icon remains unchanged. Selecting or closing a content card retains its existing
owner/lifecycle rules; app and content overviews do not create duplicate tab sets.

iPad uses the same two levels: the top overview lists device-owned main roots from all connected
hosts. Its independent presentation state does not inherit workspace/pinch scope. iPhone's existing
content/pinch overview remains unchanged. This does not introduce iOS multiwindow tracking.
Source desktop UI and iPad root-only selection checks pass; final package/installation follow-up
is recorded in the [release ledger](2026-10-20-palette-release.md).

## October 20 — normal-build promotion authorized

The operator now authorizes building/installing the accepted design and queued repairs, including
chat disruptions. Unified native Mac chrome, shared Team ownership and Engine Room window sessions
are enabled in the normal desktop build. Preview fixture data/auth/provider restrictions remain
isolated. Earlier preview-only/build-hold statements below are historical for this scope.

iOS explicitly keeps one device-owned main navigation set, capable of mixing chats/workspaces
from every connected owner with local browser and other supported tabs. It neither mirrors a
Mac's top-level navigation nor keeps desktop window/closed-window records. Project/Team content
still follows its existing owning service and revision boundary. No mobile window manager is added.

# Desktop windows and shared content

## October 20 — follow-up design

The latest operator revision supersedes the earlier 64-pixel strip below. Use a 56-pixel header:
11 pixels of upper drag margin, 44-pixel tabs and the existing 1-pixel bottom border. This keeps
both pixels of the selected underline inside the top strip, matching the lower navigation.
The single Proteus brand is a noninteractive drag region in a fixed 128-pixel slot after the
native controls. It has no Home action or vertical separator and does not move when the sidebar
resizes. The existing sidebar-header chevron returns to its original location; no new hamburger
is placed in the title bar. Existing tab boundaries, ×, dividers and secondary right-side actions
remain. Disposable preview UI geometry/resize/keyboard creation checks pass.

## October 20 — initial isolated functional preview

The operator authorized building the accepted design and BF-2026-10-20-39–45 for exploration.
The isolated desktop preview now has the 64-pixel integrated title bar, a 20-pixel drag margin
above its existing 44-pixel top tabs, one centered brand and a connected sidebar. Existing tab
close buttons, top borders, dividers and selected underline remain. The existing overlapping
rectangles overview mark moves to the far right of the universal 44-pixel secondary strip,
beside New tab; it is removed from the address bar and top strip. This supersedes the earlier
both-strip overview placement. Home and other feature pages receive the same content actions.

Preview Team scopes now use one host-owned registry across windows. A creation/synchronization
race that appended two local Team entries for one native tab is reproduced and corrected by
reusing the stable logical identity after asynchronous creation. Matching URLs alone are never
merged. Legacy per-window Team registries merge once by identity; independent main navigation
scopes remain unchanged. Workspace/project/chat children continue using their canonical owners.

Engine Room → Windows lists open windows, recently closed windows, named snapshots and previous
app-session snapshots. Rename, Save session, Focus, Restore and explicit snapshot removal are
available. Renderer checkpointing saves current drafts/reading positions before capture. Private
atomic versioned records retain 20 automatic snapshots and at most 50 named snapshots, with an
18 MiB per-snapshot and 128 MiB aggregate bound. A repeated restore focuses its existing window.
Shared content resolves against current owner state before restoration, preventing stale tab or
URL resurrection. A previously lost window is not recovered retroactively by these new records.

Address-history suggestions are non-fullscreen auxiliary windows. They dismiss on parent
fullscreen entry/exit as well as move, resize, blur and close, retaining the parent and sibling
window identities. A native macOS regression exercises URL entry with three windows, fullscreen,
Escape, fullscreen exit and history selection. The operator reported previously invisible windows
returning after restart; their pre-restart Space/visibility state was not captured, so this does
not establish a separate window-loss cause. Choosing a suggestion clears only the draft that was
present when navigation started; typing added during navigation remains intact.

Validation: 821 runtime tests and static checks pass. Disposable real Electron windows
verify integrated geometry, the unchanged overview icon/action, shared Team identity/URL/Close,
named capture, close/restore and current-owner protection. The final exact package additionally verifies early Enter without shell reload, native window
geometry and saved reading positions on restore. Baseline two-window IPC/reading-position/Quit
restoration also passes. Native 137-unit and three iPad simulator UI scenarios pass, including
chat pinch with a selectable card, browser pinch/rotation, full headings, Team information/list/link
editing and measured 44-point rows. The separate companion iPad preview is built and launched.
Physical-device/HC acceptance and remaining native-window checks are separate from fixture success.
The historical chat-only samples below describe the design process, not the current authorization.

### Content belongs to its owner; navigation belongs to a window

| State | Owner and synchronization |
| --- | --- |
| Team Tools, workspace/project and chat child tab membership, order, title and URL/history | One canonical set per owning host and container, observed by every window displaying it. |
| Content-tab Close | Close that logical tab in every observing window; keep type-specific conversation/resource lifetime rules. |
| Top-level navigation tabs and their order | Independent for each window, including standalone browsers and which feature/workspace/project roots are open. |
| Active root, selected child, window bounds and reading position | Independent for each window. Content synchronization must not steal another window's selection or focus. |
| Browser profile/account, terminal session, chat session and viewer source authority | Existing host-owned resource identity, independent of the window displaying it. |

If two windows display the same project, opening/closing/reordering a project content tab updates
both. Changing that tab's URL, including through a page link or Back/Forward, updates its other
views even when those windows currently select a different child. Selecting a different child
in one window does not select it in another. A window whose selected content tab closes chooses
a valid local fallback; other windows retain their existing valid selections. Closing a top-level
workspace/project/feature representation affects that window's navigation, preserving the shared
container and its content. Standalone top-level browsers remain independent window resources.

Match host/container/logical-tab identities and current revisions, never labels, row positions or
URL alone. Distinct logical tabs may legitimately have identical URLs. Within one container view,
reconciliation must not manufacture multiple representations of one logical tab. Native view IDs
remain window-local; clicks and late async callbacks must resolve the intended logical tab and
window without falling through to a sibling. Preserve current navigation receipts and detect
competing writes instead of repeatedly replaying or resurrecting closed tabs. Use the existing
host-owned tab/browser boundary for all views and agent actions.

Source orientation: secondary main and Team scopes both use `window:<windowId>` in
`public/app.js`, `src/services/workspaces/content-tabs.js` and shell inventory in `desktop/main.cjs`. Main isolation
matches the requested top-level behavior; Team isolation conflicts with the clarified contract.
Workspace/project scopes already use container IDs. `public/features/tools/team-tools.js` keeps separate local
tab/native-view IDs, and reconciliation deliberately retains older aliases. These were the initial investigation
points; the isolated creation race and scope corrections are described above. Do not merge
or remove real tabs by URL. No HC data/session was inspected or changed by this source review.

### Engine Room → Windows

Automatically retain a closed window as a recoverable window session. Let the operator name it,
list/focus open windows, restore recently closed windows and retain named sessions. Record the
window's top-level tab arrangement/order, active feature/workspace/project and selected child,
normal geometry and applicable display/window mode, plus supported per-window reading state.
Names persist through closure and restart. Preserve app-Quit restoration of all open windows and
provide access to prior session layouts after later launches. Ordinary New Window still starts
fresh. This supersedes BF-2026-10-19-11's explicit-close-forgets-restoration rule.

Restore the saved window presentation and resolve shared content against the current owner.
Do not roll a project's tab set/URLs back to the time the window closed, resurrect a subsequently
closed shared tab or restore stale approvals. If the selected child no longer exists, choose and
show a valid fallback. Missing/offline owners or deleted containers stay explicitly unavailable;
restoration must not recreate a deleted workspace/project. Restore an already-open session by
focusing its window, avoiding duplicate restores. Distinguish a named retained layout from its
currently open instance so repeated actions have stable identities and retry behavior.

Keep one host/runner per data home. Window closure/recovery does not archive chats, cancel turns,
replay terminal startup commands or grant viewer/browser access. Preserve drafts, active-turn
configuration, history and retry receipts. Bound automatic closed/session history and its storage;
make retention/removal explicit, preserve named layouts until explicitly removed, and keep session
metadata private under configured application data. Validate versioned records before atomic
replacement, preserve unknown fields and use revision/conflict protection. Display removal must
recover accessible bounds. Existing old closed-window records are not promised recoverable.

Source confirmation: `desktop/windows/windows.cjs` forgets explicitly closed window records, and
`desktop/main.cjs` calls `windows.forget(id)` during individual close. Existing per-window session
files alone do not constitute a supported closed-window recovery manager. No production app-data
editing or claim of recovering the operator's lost window is made here.

### Title-bar alternatives

**Selected direction:** Unified strip with the darker continuous background and current top-level
navigation-tab treatment: visible close ×, rectangular tab boundaries/dividers and an underline
for the selected tab. Replace the first draft's pill-style selection. Keep native controls, one
Proteus brand and reserved drag space. The revised draft's top-level selection and Close are local
sample interactions; closing an inactive tab retains selection, and closing the active one chooses
an adjacent remaining tab. This does not implement application window/tab management.

**Latest refinement:** top-level tabs also have a thin top border matching their dividers, making
the title-bar boundary visible. Keep the existing overlapping rounded rectangles tab-overview
button form and its overview meaning. Both overview and New tab sit at the far right of each
applicable strip. Window management stays in Engine Room, separate from tab overview. The sidebar
starts directly beneath the title bar and spans beside both secondary navigation and page content;
the second tab row begins at the sidebar's right edge. It must not cut across the sidebar or leave
an unused segment above its first feature icon. The isolated runtime now follows this connected-sidebar layout.

- **Unified strip:** native window controls, a single Proteus brand, top-level tabs and overview/new-tab
  actions in one compact band. Keep a narrow full-width drag margin and reserved empty drag area
  even when many tabs require overflow. This is the selected layout, with the styling above.
- **Session band:** a slim upper band for native controls, the single brand and named window session;
  top-level tabs sit directly beneath in the same continuous title-bar background. It provides a
  larger grab region and makes named windows easier to distinguish at a modest height cost.
  Retained here as the unselected initial alternative.

Both remove the generic duplicate title strip, retain native window controls and keyboard behavior,
use a background cohesive with the app, and separate draggable regions from interactive tabs,
menus and inputs. In-chat samples are synthetic local interactions, not a Proteus implementation
or native-drag verification. The selected direction proceeds to an isolated Proteus demo before
final header implementation/installation. Check macOS controls/fullscreen, drag, double-click,
overflow, zoom and other desktop-platform frame controls in that later phase.

Initial preview-only verification: isolated Chromium passes both designs in light/dark at 1024, 736, 390
and 320 px without shell overflow or out-of-bounds controls. Local rename, sample Restore, content
Close/selection fallback and narrow navigation pass without script errors; desktop and narrow
screenshots are visually inspected. `npm run check`, `git diff --check` and the three existing
window-registry unit cases pass. Those unit cases confirm the existing discard-on-Close baseline;
they do not verify the requested new recovery or shared-content behavior. No runtime files change.

The revised selected Unified strip also passes those four widths in light/dark, with visible top
close controls, the selected underline and dividers, no overflowing controls and no script errors.
Local inactive-tab Close preserves selection; active-tab Close chooses an adjacent remaining tab.
Narrow overflow selection, sample window rename/Restore and content Close still pass. Desktop and
narrow revised screenshots are inspected; static/diff checks pass. Native dragging and actual
Proteus session synchronization/recovery remain unverified.

The connected-sidebar revision passes geometry checks at 1024, 736, 390 and 320 px in light/dark
with fine/coarse pointer layouts: sidebar top meets the title-bar bottom; secondary tabs start at
the sidebar's right edge; main/content overview and + controls align at the right edge; tab top
border matches dividers. Scoped sample overview selection, New tab, Close fallback and Engine Room
rename/Restore remain local preview interactions. The overview sample does not certify or redesign
the actual app's overview. Native dragging, actual app layout and production workflows still await
the Proteus demo/runtime phase.

### Required acceptance

Use disposable data and two or more real Electron windows. Exercise Team Tools, direct workspace,
project and chat-child scopes; tabs with matching titles/URLs but different IDs; rapid select,
navigation, close/open/reorder, delayed native callbacks, simultaneous edits, conflict/retry and
restart. Verify one representation per logical tab per container view, correct clicked selection,
shared URL/history/closure and independent top-level navigation/selections. Include terminals and
viewers without resource recreation, history loss or expanded grants.

Verify close/relaunch/recovery, named-session rename/restore, previous app sessions, repeated
restore, open-session focus, missing displays, deleted/offline owners and stale shared-content
snapshots. Verify selection fallback and no content resurrection. Exercise the selected header in
the desktop UI. Run `npm test` and `npm run check` after execution/persistence changes. Signed
package and actual HC acceptance are separate from fixture success; follow the existing update
and recovery policy when installation is authorized for that artifact.

### Unloaded browser address updates

Applying a shared history/URL to an unloaded native view now emits the same owner state
notification as a loaded view. This refreshes mounted address controls without fetching a
website or changing the selected tab. Exact-package two-window acceptance covers this path;
it is distinct from the unreproduced browser/chat agent-control dropout in BF-2026-10-20-48.

## October 21 — menu bar Keep Screen Awake

The operator requested a tray-controlled idle keep-awake feature. The desktop host now offers
**Keep Screen Awake**, off on launch, using Electron's native `prevent-display-sleep` assertion.
It remains active with windows closed and stops on toggle-off or application quit. It does not
move the pointer, require Accessibility input permission, or change system sleep preferences.
Native protection starts immediately, so it also covers sleep timeouts shorter than a few minutes.
Explicit locking/sleep and OS policy remain in control. The setting is local to this process;
restart/update returns to off. All 865 Node tests and syntax checks pass. Isolated Electron UI acceptance verifies the native
macOS display-sleep assertion, background operation, toggle-off and quit cleanup. Packaging is
in progress; installed apps are unchanged.
