# Shared embedded browser

Electron owns the visible WebContentsView tabs, their persistent sign-in session, page titles,
address bar, navigation history, and lifecycle. Proteus supplies the tab strip and browser controls.
Enter navigates; Command/Ctrl+L focuses the address; links opening new windows create new tabs.
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

The provider-neutral broker supports listing, opening, navigating, accessibility snapshots,
clicking, filling, key presses, selecting, scrolling, and closing. The Copilot adapter exposes
`proteus_browser` as a native SDK tool. It does not expose arbitrary JavaScript, cookies, tokens,
network interception, local files, or the underlying CDP connection to the model. Existing tool
permission requests continue through the run's feedback interface.

Human-created tabs start private. Enable **Agent access** on a tab to make it available to runs.
A run can also open its own tab, which is available only to that run until explicitly shared.
Turning Agent access off revokes ownership, disconnects Playwright, and cancels pending actions.
The user can browse normally while a run works; for manual takeover, turn Agent access off first.
Only one model turn runs at a time, but human interaction can still change the page mid-action.

Sign in through the website normally. Browser profiles stay in Electron user data, outside Git.
Sites cannot load the privileged app origin. Downloads and device permissions are not enabled
in this prototype. Persisted browser authentication is separate from other browsers; no cookies
or authentication are copied from Safari, Chrome, VS Code, or Codex. Open tabs and bounded URL navigation history persist across restarts; sign-in persists in the
existing profile separately from the workspace record.

For Slack, opening a workspace or seeing a tab is not content coverage. A successful integration
test must read an authenticated message and its thread, preserve the permalink, and report gaps.
If sign-in is needed, the run must ask the user instead of claiming an empty result.

Sources: [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view),
[Electron debugger](https://www.electronjs.org/docs/latest/api/debugger),
[Playwright CDP connection](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp).

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
