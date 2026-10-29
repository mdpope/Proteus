## October 26 — shutdown presentation cleanup

After the owner starts quitting, trusted main-frame `hide` and `overlay` requests are
acknowledged without dispatching browser commands. A finishing renderer checkpoint or paint
cannot create a rejection/notification cycle during shutdown. Frame validation still happens
first; navigation, history, tab changes and every other command remain rejected. This does not
alter saving, checkpoint order or browser disposal.

## October 26 — five-second notification lifetime

Desktop and web banners expire after five seconds. Native overlays enforce the same lifetime
in their owner process so a background or suspended renderer cannot leave a banner above other
applications. Expiry leaves the notification list untouched, invokes no action, advances the
transient queue and cannot revive a banner when the parent window returns.

## October 26 — close wins over stale descriptor metadata

Metadata updates for an existing tab carry `updateOnly` through descriptor reconciliation and
revision-conflict rebase. The owner ignores them if another window closed or moved that identity;
they cannot recreate it. Explicit new opens remain separate. Team Tools close-all followed by
four standup links is exercised against a stale mirror with 15 older tabs using the real host
and native browser inventory. This fixes a reproduced race; incident logs do not identify which
saved window or device caused the operator's live recurrence. Upgrade participating clients;
older clients do not mark passive snapshots. Existing uncertain outbox identities stay unchanged.

## October 25 — Combined preview tab and resource corrections

Owner move acknowledgements carry current navigation metadata so the first placement works
when a window's project catalog lags. Saving placement precedes acknowledgement; repaint follows
it. Visibility/move preflight synchronizes its own source scope. Ordinary Hide retains guarded
unload, while Persisted Hide keeps the page and history loaded.

Engine Room Resources combines app/system processes, loaded tabs and canonical unloaded tabs.
System / Loaded / Unloaded toggles start enabled, with a name filter and explicit usage refresh.
Shared process usage is attributed once. Refresh/filtering never loads tabs; cold logical tabs
remain closable. Notifications sit at the bottom, and chat/Markdown link destinations use a
bottom display preview without opening or reading the target.

These changes are in the combined Design Preview source, pending exact-package review.

## October 23 — residency, titles, routing and shared destinations

Persisted pages stay loaded, including hidden pages and restored project tabs. Ordinary memory
eviction excludes them. Explicit Unload requires Unpersist first; Close still closes the page.
Engine Room → Browser configures the per-machine ordinary recent-page budget from 1–256,
default 6. Active/protected pages can exceed it; changing the setting does not eagerly load
ordinary hidden tabs. The older Hide description below now applies to non-Persisted pages.

Display browser titles with `[Profile name]` without changing saved page titles/history.
Hidden links use source link text as a provisional title until loading supplies the real title;
agents can supply a provisional `title` when opening a tab. Project Tabs combines text/title/URL
filtering with the existing type filter. Unloaded pages use the new-tab palette.

macOS installed builds declare HTTP/HTTPS handlers and provide Engine Room registration/default
and scoped repair controls. A green link picker groups all available projects by workspace,
supports filtering/keyboard selection, and routes to the window displaying that project, then
its workspace, then Main. Ordered host/glob/path rules can skip the picker; missing destinations
return to selection. Preview builds cannot register. Apple's recorded pending browser/passkey
entitlement request is separate from LaunchServices registration; no duplicate request was made.
SafariSelector-derived matcher/picker behavior retains its GPL notice in `docs/licenses/`.

Scheduled agents open their own needed tabs beside their chat rather than adopting unrelated
application tabs. Required core guidance and the host sign-in launcher honor the configured
browser preference without requiring an optional Proteus agent. Third-party CLI authentication
flows that independently require a system browser remain a platform/provider limitation.
All resource moves use the [shared destination menu](workspaces.md).

## October 22 — browser review controls

Home has no URL/search box. Proteus is its primary heading; normal browser tabs and their address bars remain the browsing entry points.

Browser tab menus place **Hide browser tab** directly below Unload. Hide uses the existing
visibility/lifecycle operation: unload first, preserve logical identity, profile, placement and
full history, and then remove the navigation entry. Existing active-work/unsaved-form blockers
remain. Restore stays available from the existing tab inventory. Main, project/chat/workspace
and Team strips create a normal browser tab on a double click in blank space; existing tabs,
buttons and reorder handles are excluded. The main strip's blank space is no longer a native
drag region; the brand area remains available for moving the application window.

The detached video player supports dragging its video surface after a small movement threshold,
leaving buttons, sliders and native bottom playback controls usable. Trusted trackpad pinch
(control-wheel events) proportionally resizes the current window, preserving its aspect ratio and
clamping both axes to the display work area. No player, session or navigation is recreated.
Script-generated gestures are ignored; host IPC is scoped to the active player's own frames.
Escape/return-to-tab, navigation and disposal retain their existing cleanup. Platform code uses
Electron work-area/bounds APIs on macOS, Windows and Linux. Physical Windows/Linux gestures remain
release acceptance; native Wayland compositors can restrict programmatic move/resize (see
[Electron window limits](https://www.electronjs.org/docs/latest/api/browser-window/)).

Autoplay blocking remains a device-wide atomic `browser-media.json` preference under application
data and is restored before browser pages are created. No new shared account setting is needed.
Browser Preferences adds per-profile, device-local **Show in toolbar** controls and Move left /
Move right ordering. The same installed-extension records preserve pins/order across restart and
updates. Enabled pinned extensions appear between Go and the trailing controls; unpinned ones
remain in the page menu. Extension popup/profile boundaries and permissions are unchanged.
Installed icon files are bounded, resolved within the extension folder and rendered as small PNGs;
a compact generic icon is used if no image exists. Lists are cached until extension changes, and
all open app windows refresh their toolbar metadata. Downloads precedes the Page menu button.
Tab/page menus use 15px vector/extension icons while retaining their 32px native menu rows.

## October 22 — open links in a loaded background tab

Native browser link menus now offer **Open Link in Background Tab** immediately after
**Open Link in New Tab**. It loads an unhidden tab after the source in the same local profile
and parent, including Team Tools, while preserving the current selection and focus. Typing in
the current page remains available while the new page loads; a later address-bar or tab choice
keeps its focus when loading finishes. The foreground action still selects
its tab; **Open Link in Unloaded Tab** still creates a hidden tab without fetching the page.

`test/browser-background-link.test.js` covers menu and renderer routing; the isolated
`test/browser-background-link-ui.mjs` exercises native loading, profile/placement, selection,
focus, drafts, delayed completion, Team mounting, and the existing foreground/unloaded actions.

## October 22 — local-profile follow-along and complete incremental history

Project/workspace follow-along keeps cookies and signed-in sessions local, synchronizes the shared
URL and tab selection, and binds scroll to the observed navigation entry. Full browser history is
retained, including sessions beyond 10,000 entries. Bounded descriptor windows and navigation deltas
reduce ordinary transfer; they are not retention limits. Inactive scopes do not hydrate or load
new pages. Database page reads stop at their byte/count budget with one continuation lookahead,
so large histories do not allocate an entire requested stack before the transfer limit applies.
See [project follow-along](project-follow.md) and the history acceptance tests.

Unsynchronized local navigation persists its pending marker and complete stable-ID
history across app restart, including Forward entries and Team browser tabs. Pending
stacks bypass the legacy 50-entry startup window; exceeding the shared 8 MiB session
history budget rejects the atomic save and preserves the prior file. Native restoration
retains the marker until an owner acknowledgement covers every pending entry and its
selected position. A late acknowledgement for the same selected page cannot erase newer
Forward visits. Navigating from an unloaded tab retains the logical stack while loading
only the new URL. `test/workspace-session.test.js`, `test/browser-navigation.test.js`, and
the isolated `test/browser-resources-ui.mjs` verify persistence, limits, lifecycle and
acknowledgement behavior without changing installed app data.

## October 22 — native browser chrome regression repair

The iPhone bottom controls reserve their own safe-area space instead of competing with WebKit
inside the page stack. A simultaneous, non-cancelling vertical gesture observer on the WebKit view
handles both document scrolling and nested overflow panels; horizontal navigation and pinch remain
separate. Top controls hide on upward swipes and return on downward swipes; bottom controls stay
available. Desktop Apple review packaging uses the proposed `com.wtbtech.proteus.desktop` identity;
installed browser/update identities are unchanged until migration is verified.

## Apple browser review preparation — October 22, 2026

The macOS package now declares HTTP and HTTPS alongside the existing custom callback schemes.
OS website links wait for workspace restoration and open new default-profile human tabs. Repeated
links remain separate tabs; credential URLs/non-web schemes are rejected. Opening a link with all
windows closed creates a window. No default-browser preference or agent grant is changed.
Desktop Home provides a URL/search entry without changing restored workspace selections.

`node test/browser-webauthn-ui.mjs` exercises actual embedded Chromium with a disposable CTAP2
USB authenticator: credential creation, assertion, cryptographic signature, challenge/origin/RP hash,
user presence/verification and rejection of an unrelated RP. It does not exercise physical security
keys, Touch ID, iCloud Keychain or Apple's restricted entitlement. `PROTEUS_TEST_EXECUTABLE` selects
an exact packaged candidate. `node test/external-urls-ui.mjs` checks host open events, repeated links,
second-instance events, background window creation and Home navigation with synthetic data.

Bitwarden's installed inline menu was verified on the reported KSL form on October 22: the blue
shield and matching-account suggestion appeared, with no fill or login submitted. Its existing
“Display suggestions when icon is selected” preference explains why field focus alone did not
open the list. No extension setting or vault data was changed. Apple Passwords remains a separate
helper-authorization issue.

## October 21 — iCloud Passwords remains blocked by Apple helper launch policy

The installed 0.2.28 browser still cannot pair with iCloud Passwords. The latest local helper crash
report identifies Proteus as parent/responsible process and records `SIGKILL (Code Signature Invalid)`.
Read-only `codesign -d -vvvv` inspection of Apple's installed helper shows parent launch constraints:
an approved browser signing-identity/team pair or the restricted
`com.apple.developer.web-browser.public-key-credential` entitlement. The installed Proteus identity
is absent from those constraints and its signed entitlements do not contain the alternative grant.
This explains helper termination despite a valid on-disk Apple signature. The EPIPE lifecycle repair
prevents the uncaught main-process exception; it does not grant Apple helper compatibility.

Apple documents the browser inclusion process and OS-delivered constraints in
[Password Manager Resources](https://github.com/apple/password-manager-resources#how-apple-uses-web-browser-extension-distribution-information).
Its [browser credential entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.web-browser.public-key-credential)
requires a request by the Account Holder of an organization developer account. Supported remediation
requires Apple inclusion or an approved/provisioned entitlement, followed by actual pairing/fill
acceptance. No Apple request was submitted, browser identity spoofed, helper modified or signing
team changed. Installing the extension is not proof of working Apple Passwords support.

Follow-up UI should report the observed compatibility limitation instead of suggesting repeated
installation can repair it. This diagnosis changes documentation only; the tested 80115ff176d2
release remains unchanged and Apple Passwords remains unverified/unavailable on this Mac.

## October 21 source update — video fullscreen pop-out (BF-90)

Website video fullscreen now uses a resizable always-on-top Electron window at the originating
Proteus window's exact x/y/width/height. The actual Chromium WebContentsView is temporarily moved,
so playback, cookies, profile, player state and history remain on the same tab. The player retains
its website/native video controls; a host-owned close/drag strip fades after idle. Close or Escape
returns the player to its original tab without reloading. Switching shell pages/overlays does not
hide the pop-out. Tab navigation, destruction and owner-window close clean it up. Pop-out tabs
cannot be unloaded until returned. Ordinary non-video fullscreen remains a full-window view.

The permission handler previously rejected fullscreen wholesale. Fullscreen now requires an
available profile and the selected tab (or its current pop-out); Chromium still enforces its own
fullscreen activation policy. No camera, microphone, filesystem or other permission is widened.
This uses built-in Electron/Chromium support, with no extension or video URL extraction. Native
Chromium PiP remains a separate web API with browser-managed size/control limits; exact window
coverage uses Electron. The synthetic player verifies exact bounds, fading, active playback and
same-view/history return. Actual YouTube/DRM, Linux and installed acceptance remain separate.

BF-88/89 are now implemented in source: link opening first, editing above Inspect, and Duplicate
tab with independent identity/history, original profile/placement and fresh per-tab grants.

## Queued October 21 — Duplicate tab (BF-89)

Browser-tab context menus need an in-place Duplicate tab action. Preserve full history/active
index, original profile and placement, applicable presentation and persistence choices, with a
fresh independent tab identity. Use the latest owner state; keep source live state intact and
avoid replaying submissions or duplicating tab-specific permissions. Exact restored page/form
state has browser limits and must be verified rather than promised. See planned-updates.md for
scope and loaded/unloaded, profile, history, concurrency and restart acceptance. No implementation
or build in this intake; the confirmation hold remains active.

## Queued October 21 — browser menu ordering (BF-88)

For link targets, Open Link in New Tab is always first. Copy Selection/Copy and Select All
move immediately above Inspect Element near the bottom; Copy Link stays among link actions.
Preserve editable actions, source selection, profile/tab ownership and non-link behavior.
Queue only: the operator requires build confirmation and this intake changes no menu code.

## Native-helper connection notices

If an extension such as iCloud Passwords cannot connect to its desktop app, Proteus shows
its connection guidance at most once per extension per app launch, shared across profiles
and windows. Dismissing or expiring the notice does not make background retries show it
again. Renderer reloads and profile recreation do not reset the limit; quitting and reopening
Proteus does. This in-memory notice limit does not change native connections, permissions,
extension popups or profile data.

## 0.2.28 — browser menus, refresh, icons and extension recovery

Address suggestions now use a sandboxed, owner-bound child window instead of hiding the
underlying native webpage. The address field retains keyboard editing/selection; Escape, blur
and toolbar disposal close the suggestions. Command/Ctrl+R refreshes the selected tab in its
originating window; View → Reload Window remains an explicit application recovery operation.

Agent browser/tab observations replace base64 favicon bytes with content-hash identities. Actual
icons remain in the host/UI, and full history remains where the existing action returned it.
Hashes are metadata, not new fetch permissions. Identical icons share a hash; similar URLs are
not assumed to have the same icon. Screenshot image delivery is unchanged.

The pinned extension adapter now contains native pipe/child failures per connection, handles
UTF-8/partial/multiple frames, bounds queued work and settles timeout/disconnect paths. Profile
optional grants persist and control native messaging; unload/revocation close the relevant pipes.
Popup identity includes session and parent window, preventing identical extension URLs from
reusing another profile's popup. Setup guidance covers Bitwarden desktop biometric integration.

Synthetic Electron/native tests pass. Actual Bitwarden Touch ID, Apple Passwords pairing and the
original Social blank-screen trigger remain live acceptance; OS helper/signing failures are not
bypassed. See the [0.2.28 ledger](2026-10-21-browser-chat-release.md) for BF-74/78–82 evidence.

## October 21 — browser continuity during window renderer recovery

If an app-shell renderer exits unexpectedly, the host recovers that window independently. Existing
native website WebContents/processes, loaded forms and background agent pages remain alive; the
replacement shell attaches to their stable IDs. Recovery clears only stale shell overview/overlay
state and skips ordinary background-page unloading. It neither navigates those pages again nor
restarts the host, scheduler, provider turn or terminal session. An incomplete UI acknowledgement
fails without automatic replay. See [window recovery](window-management.md) for bounded retries,
the local fallback and native View → Reload Window. The original reported SIGTRAP remains unknown.

## October 21 — browser issue notifications and device-local loads

Desktop browser load errors and shared-history conflicts appear in Notifications/Needs attention,
with existing notification preferences. They do not create a page overlay or toast. Recovery
references remain local to their original host/window and are not published as account activity.
Unread repeats deduplicate per window and tab/scope. Explicit actions focus the original window;
closed windows require restoration in Engine Room. Load issues offer Open tab, Reload and View
logs; history issues offer Keep saved history or preserve pending pages in new tabs. Stale or
unavailable recovery stays unread, with its durable outbox and retry receipts retained.

A mirrored native WebKit load keeps its guard through redirect chains and duplicate observations.
Device-local login redirects do not rewrite shared URL/history or truncate Forward. Deliberate
address, link/form/history actions release the guard, as do SPA changes following recent trusted
input from the isolated main-frame script. Page scripts cannot synthesize that trusted intent.

iPhone browser navigation retains 48-point controls and removes the extra footer padding and
nested container safe-area gap; keyboard safe-area handling remains enabled. Tab insertions reveal
their complete control in either row, including link/chat/tool opens without selecting background
tabs. Desktop measures after right-side overview control layout; ordinary refresh/reorder preserves
manual strip scrolling. See the release ledger for source, simulator and installed acceptance.

Standalone top-level pages do not receive a synthetic secondary label/control row. The lower
strip appears only for actual workspace/project/chat or Team content. The top App overview and
+ remain available. Explicit tab selection is never blocked by a content text selection.
Extension bookkeeping reflects host selection without requesting it again; extension-initiated
activation remains supported through the existing host-owned path.

## October 20 — 0.2.27 palette, rate and certificate follow-up

Engine Room → Colors edits the actual app. An unsaved desktop draft is private to its window;
Save uses current settings revision protection and applies the named palette to other windows
and future launches. Reset is a draft until saved; Discard restores the saved palette. JSON
import/export shares only colors/name/slider values, never accounts or browser data. Surface
lightness/saturation excludes bright text, icons and highlight colors. Native palette storage is
local to each device, with the same portable format. Native window controls remain OS-owned.
Desktop saves to its application-data settings file; native saves its app preferences. Web Colors
uses versioned JSON in this browser profile, scoped to the signed-in account and restored before
rendering on relaunch. Separate browser profiles/devices retain separate palettes. Saving in a web
tab does not change any connected computer's palette; another web tab observes the saved revision.

Download rates use recent received-byte deltas, shown in KB/s (1 KB = 1,000 bytes), with paused
and completed rates removed and stalled rates dropping to zero. Desktop history remains private
to its window; mobile has one in-memory app-session list, no window/session manager and no durable
download history. Existing downloaded files and destination preferences remain intact.

The certificate observer registers Security/Network observation before the first load and invalidates only on
main-document replacement, preserving the chain through iframe and same-document navigation.
A bounded per-partition Chromium verification observer can supply a chain whose subject/validity
matches the current document TLS details. It always returns Electron's -3 default-verification
result: no trust bypass, Certificate Transparency override or second network connection. A viewer
query borrows the owned debugger without detaching other clients; foreign debugger ownership is
preserved. HTTP, failed and unloaded pages report unavailable information honestly. Native uses
the current WKWebView serverTrust chain. Exact release verification is in the release ledger.

## October 20 — browser controls preview contract

Human-opened tabs now start unshared. Use the robot button to share/revoke page access; an agent can call request-access for an explicit native human decision. Agent-created tabs start shared. Legacy implicit availability is not a grant. The host persists logical-tab choices across recreation/window aliases, fails closed on unreadable preferences and gates every page backend. Shared pages remain controllable while another project/chat is selected. Listing and tab organization remain separate. This supersedes the October 18 no-sharing wording retained below as history.

The operator reaffirmed this policy on October 22: agents do not need to request sharing for
tabs they create. Exact signed-package verification with `test/browser-agent-sharing-ui.mjs`
covers loaded and unloaded creation without another sharing prompt, human-tab refusal/grant,
release/unload/recreation, explicit revocation and persisted decisions through an actual restart.
This verifies the existing policy; it introduces no new grant or runtime change. General tool
approval and authorization for external writes remain separate from a tab's page-access grant.

The page menu includes one persistent Block video autoplay in all tabs setting, spanning windows/profiles. It blocks script/declarative video before document activation and leaves manual Play available; live toggles do not reload forms. The preference is not an adversarial-content security boundary. Disposable real-media acceptance is separate from account-specific YouTube verification.

Downloads open a native child popup over the website with file icons, separators and trailing pause/resume/restart/folder actions. Resume depends on Electron/server support; restart is a fresh safe URL request in its original profile, not a replayed form. Metadata lasts until its owning window closes, is not written as download history, and old history metadata is retired without deleting files. Saved folder preferences remain. Item commands cannot act on another window's list.

Navigation replies update the initiating tab, not the current selection; redirect results are authoritative. The host rejects a shared-history response when native URL/entry changed after capture. Find uses renderer content on blank/setup tabs, debounces typing and cancels older native searches. Team surfaces retain identity as URL changes and skip identical bounds updates. Exact installed-code wrong-tab race is reproduced; the full operator flashing sequence remains separately qualified.

## October 20 — Apple Passwords preview integration

Engine Room → Browser Preferences offers Apple Passwords setup/open on Mac for each profile.
It downloads only Apple’s official iCloud Passwords extension (`pejdijmoenmkgeppbflobdenhhabjlaj`)
through the existing Chrome Web Store installer and permission review. Installation is optional;
cancel leaves the profile unchanged. Apple’s native helper handles pairing/unlock. Proteus does not
import the vault, and its browser tools do not offer an extension-background or vault endpoint.
Passwords deliberately filled into an ordinary website are still part of that website; do not
promise that extension installation makes filled fields inaccessible to an authorized page agent.

iPhone/iPad’s persistent WKWebView browser uses system Password AutoFill. Native Browser settings
now explains Apple Passwords and offers Apple’s public `ASSettingsHelper` provider-settings shortcut.
The operator chooses Passwords and approves Face ID/Touch ID in the system UI. iOS 17 remains the
minimum; settings names differ on older systems. No Chrome/Safari extension injection is implied.
Apple documents [WKWebView password handling](https://developer.apple.com/documentation/authenticationservices/password-use-in-web-browsers)
and [Password AutoFill setup](https://support.apple.com/en-us/120758).

The official extension installs and presents its unpaired setup screen. On this Mac, its helper
startup fails: macOS records `SIGKILL (Code Signature Invalid)`, while an on-disk signature check
passes. A direct empty-input launch outside Electron is also killed. This is an observed OS/helper
execution blocker, not proof of an Electron limitation or a repaired autofill flow. Retest a healthy
helper with the signed normal build. Pairing, actual fill/save and physical devices remain unverified.
The preview labels this integration experimental. Disabling/removing/reloading an extension closes
its own profile popups before their renderer is unloaded. Popups now size to content; the Apple popup uses
its own supported window mode plus a scoped readable green palette, preserving vendor contents. Electron’s optional
[Touch ID WebAuthn configuration](https://www.electronjs.org/docs/latest/api/app#appconfigurewebauthnoptions)
creates device-bound keys; iCloud passkeys need separate browser API integration/acceptance.

## October 20 — background control, menus, scale and overview

Switching tabs/projects hides presentation only. It must preserve the same native page, browser
partition and scoped automation connection. Active agent turns keep controlled pages unthrottled
and protect them from retention between calls; completion and human pause release that protection.
Unloading is distinct from selection and rejects active turns. Synthetic acceptance includes actual
hidden screenshot pixels, coordinate input, direct/Playwright MCP actions, reconnection and no
selection/focus stealing. The operator's original exact failure is still unreproduced.

Native WebContentsView pages and shell HTML are different compositing surfaces. Legacy shell
overlays explicitly hide the native page, which explains their white/blank backdrop; CSS z-index
alone cannot place shell HTML above it. Compact popup clients now use a sandboxed child BrowserWindow
above the website, including Ghostery and tab menus. Inline New chat removes another modal path.
Large remaining shell dialogs still use the legacy hide behavior; a general native overlay surface
is a possible later change, not a current requirement to rewrite the browser engine.

Page scale persists in private browser-sites storage by hashed account-owned partition and
registrable domain, with private suffix boundaries. It applies across paths/subdomains/schemes,
all matching loaded views, new windows and restart. Local/IP fallback keys retain ports. Empty or
nonwebsite pages do not overwrite a domain preference. Store only domain/percent/update metadata,
never complete URLs, queries, credentials or page contents. Menu failures preserve the last valid
preference. Browser visual pinch remains separate: at baseline a fresh small outward gesture may
open overview; a gesture that reaches baseline from zoomed content must end first. Remove CSS title
casing from overview captions so path case remains intact. See desktop-preview.md for acceptance.

## October 20 — explicit robot pause and background-control report

The desktop robot is a working per-tab pause/resume button again, retaining ordinary default
agent access across profiles. Host-owned private pause preferences use stable logical identity,
atomic revision-checked persistence and fail closed on unreadable records. Pause disconnects owned
automation sessions, blocks direct and both MCP page routes and survives unload/recreation;
Resume reuses existing page/session/history. Listing and organization remain independent. Agents
must respect agentPaused and cannot resume it themselves. Main/Team UI and ordinary named/default
profile/extension fixtures pass. Existing October 18 status-only wording below is historical.

BF-2026-10-20-48 retains the operator's reported control loss after browser/chat switches for the
normal build. Repeated synthetic switches and real direct/MCP clicks/snapshots/reconnection pass
without replacing the native page or losing the chat draft. No actual failure cause or fix is
claimed. Capture the real host/tab/tool error and lifecycle before changing loading/authorization.

## October 20 — functional isolated preview

The operator authorizes the current window preview and associated iPad repair source.
See [window management](window-management.md) for current implementation, ownership and validation;
earlier chat-only/pending-implementation entries below describe historical intake. Preview Team
content is canonical across windows; top-level navigation and selection stay independent. The
existing overview icon now lives at the right of the universal secondary strip, beside New tab,
instead of the address bar. Named window recovery resolves current shared contents before restore.
Native source fixes chat pinch observation, readable headings, 44-point navigation rows, Team
account/editor layout and preservation of mixed-type tab descriptors. Production/physical-device
acceptance remains separate.

## October 20 — reported iPad chat pinch-to-overview regression

BF-2026-10-20-42 reports that zoom-out pinch does not open tab overview from an iPad chat tab.
Reproduce on the chat surface and restore the gesture while retaining ordinary zoom/scroll and
correct owner/container/card selection. Browser-only acceptance does not cover this regression.
Earlier simulator/package success does not establish the current physical workflow. This is
next-release intake; no native change or device test occurred. The subsequent supplied iPad
screenshots identify 0.2.26 (2610.20.1) on Home and document other layout symptoms; static images
cannot verify this gesture failure or repair. See [planned updates](planned-updates.md).

## October 20 — multiwindow shared content and integrated title-bar intake

BF-2026-10-20-39 clarifies shared browser identity/URL/history and Close across windows viewing
the same Team Tools/workspace/project/chat container, while top-level standalone browser tabs
and each window's selection stay independent. The secondary-window Team Tools duplicate/wrong-tab
report remains unreproduced; source review finds window-specific Team scope IDs that contradict
the clarified contract. Preserve stable identities and revision/retry protection; do not remove
matching-URL tabs as an assumed repair. BF-40 adds named window recovery; BF-41 selects Unified
strip with existing close/underline/divider styling for the revised chat draft before a Proteus demo. Runtime and live acceptance remain
pending. See [window management](window-management.md) for the ownership/restore contract.

## Queued X filtering compatibility and Developer tools menu fixes

BF-2026-10-19-27 in [planned updates](planned-updates.md) records a live installed-0.2.25
protection-on/off/on test: X's `Maximum call stack size exceeded` recursion disappears after
pausing its Ghostery protection and reloading, then returns after resuming and reloading.
Repeated anonymous-source frames match the function proxy column in cached X cosmetic scriptlets;
the precise injection/proxy repair remains unimplemented. Entry-form rendering is not verified
account sign-in. Separate API 404/FedCM errors are not proven to share that cause.

Proteus's built-in **Ghostery button beside the address bar → Pause protection for this site**
already provides an exact-origin exception in the current browser profile. Reload to test a fresh
document; the same menu offers **Resume protection for this site**. This control is separate from
installed extensions in the Page menu. The authorized diagnostic restored protection afterward,
without submitting credentials, clearing cookies, updating filters or restarting the app. Queue
scriptlet compatibility/regression work; do not silently disable protection as a repair.

BF-2026-10-19-28 separately records Page menu → Developer tools doing nothing while right-click
Inspect Element works. A detached inspector window is the existing intended mode. Investigate the
post-popup disconnected-control early return and popup result ordering without treating either
as a confirmed cause. Verify the correct live target, refresh/reuse and debugger handoff; no build.

## Queued P1 navigation/history regressions from the installed 0.2.25 report

BF-2026-10-19-23/24/25 in [planned updates](planned-updates.md) record the operator-supplied
confirmed failure report for build `ec8b213d382e+dirty.8dbb06075488`. Reported installed-module
reproductions identify loss of an empty relocated stack's authoritative revision, recurring
empty-history conflict resolution, and a global conflict overlay that hides healthy browser scopes
and drops newer selection/bounds. Preserve authoritative revisions even without an entry, define a
non-destructive convergent resolution/acknowledgement contract, and scope conflicts while retaining
the newest desired native surface. Keep pending intent/receipts and full Back/Forward stacks across
moves and restarts; do not repair live history or bypass optimistic concurrency to suppress errors.

The report's live access was read only and its signed app unchanged; this intake has not rerun the
reproductions. Combined regression/UI/exact-signed-package acceptance is queued on Personal under
the build hold, without interrupting HC work or installing an unapproved artifact. BF-26 separately
records black rectangles behind UI text as an observed symptom with no proven navigation link.

## Queued next release — circled-ellipsis More menu icon

BF-2026-10-19-20 in [planned updates](planned-updates.md) replaces the desktop/web browser
Page/More menu's three diagonal slashes with the supplied iOS-style mark: a thin outlined circle
around three horizontal dots. Match toolbar size/theme states, preserve menu actions/placement,
accessible names and hit targets, and use the same geometry across supported browser scopes.
The current desktop mark is created in `public/features/browser/browser-extensions-toolbar.js`. This icon is
separate from BF-10's overlapping-rectangles overview mark. Reference reviewed; no implementation,
native preview change, UI acceptance or build in this intake.

## Queued Widevine feasibility

BF-2026-10-19-15 in [planned updates](planned-updates.md) evaluates native Widevine/CDM support
for the desktop browser; it is not supplied by a normal Web Store extension. Current stock
Electron has no Proteus CDM integration. A candidate is
[CastLabs Electron for Content Security](https://github.com/castlabs/electron-releases), subject
to exact version/architecture, bridge/profile and signed-package validation. Its production VMP
signing is separate from ordinary app signing ([vendor guidance](https://github.com/castlabs/electron-releases/wiki/EVS)).
Verify actual requested-service playback and codec requirements before claiming support; component
detection alone is insufficient. Research only: no runtime swap, CDM/vendor setup or build yet.

## Additional profiles — account connection path and queued guidance/loading fix

The additional-profile checkbox is disabled when the profiles API reports no account identity.
The operator clarifies that Life and Team Tools already work; this report must be investigated
as an inconsistent/stale profile-control state rather than assumed missing sign-in. Compare fresh
same-owner account/profile API state with the mounted panel and preserve the working session.
For genuinely missing or saved-unloaded sign-in, open **Engine Room → App settings → Proteus account** (App Setup in older layouts),
then **Sign in securely**, or **Refresh connection** if a sign-in is already saved. Life can stay
off. Return to Browser Preferences, use Refresh profiles, then enable additional profiles. If
the server reports missing shared-feature consent, use Authorize shared features in that same
account card. Signing into an ordinary website or opening website account/security settings does
not by itself connect the desktop app account.

BF-2026-10-19-13 in [planned updates](planned-updates.md) queues a direct setup/refresh link and
clear disabled reasons. A source-level fixture confirms that a saved session with Life disabled
can remain unloaded after startup: Refresh profiles alone does not load it, whereas account
Refresh connection does. Queue account loading independent of optional Life activation, preserving
account/profile boundaries and real server authorization. No live account status was inspected;
the fix and UI acceptance remain pending under the build hold.

BF-2026-10-19-14 separately queues honoring the configured in-app/system browser for sign-in and
returning authorization to the initiating app/window. Current desktop auth forces the system
browser and shares a callback scheme/mobile-labelled OAuth client with iPhone/iPad. A misleading
client label and actual wrong-app delivery are different findings; the latter is not yet verified.
Preserve the existing working account and keep auth content out of thumbnails/history/agent tools.

## Queued next release — direct new-tab page and combined address/history entry

BF-2026-10-19-12 in [planned updates](planned-updates.md) makes + open the new-browser-tab page
directly on desktop/iPhone/iPad, with current scope-supported creation options in compact blocks
across the top. Corresponding web controls follow the same presentation where available. Merge
Website address and Filter saved history into one field with the `https://example.com` placeholder;
focus this page field on creation instead of the toolbar URL. Typing filters history, choosing a
result opens it, and Enter/the existing angled-arrow icon on the input's right opens typed input.
Keep search engines, shared links, history controls and owner/profile boundaries. Do not fetch a
website while merely filtering or steal focus during asynchronous updates. BF-11 adds desktop
Command+T in the focused window and Command+N for a new window. Queue only; no UI or build changes.

## Queued next release — consistent desktop/web tab-overview icon

BF-2026-10-19-10 in [planned updates](planned-updates.md) replaces desktop/web overview grid
glyphs with two overlapping rounded rectangles in a simple thin outline, matching the reviewed
reference. Apply the same vector style to existing main/scoped/Team overview controls and the
web shell, retaining current theme colors, control sizing, labels and actions. Grouping, scope,
visibility and cached-thumbnail requirements remain governed by BF-08/09. Native iPhone/iPad
implementation belongs to its separate chat. Queue only; no desktop/web implementation or build.

## Queued next release — current-workspace project overview and browser thumbnails

BF-2026-10-19-08/09 in [planned updates](planned-updates.md) correct duplicate General sections,
misleading membership/counts and missing loaded-page previews. Include all projects in the current
workspace: current project first, others alphabetically by name. Each shows its unhidden tabs in
its own navigation order, even when inactive. The reported current project has one chat and three
browsers, four cards in that section; the total also includes other projects' eligible entries.
Hidden tabs and fixed navigation pages are excluded; registered-browser totals remain separate.
Share per-project visibility/order rules with navigation, retaining the existing tab on selection.
Source fixtures reproduce legacy group identity/caption duplication and children included despite
a hidden/closed ancestor. A broker fixture confirms the first-30-global-entries capture budget
can be consumed by sleeping descriptors before loaded current-scope browsers are considered.
BF-09's latest scope caches real browser and chat thumbnails soon after interaction and periodically
while viewed. Keep the last good image through unload/restart and show it immediately in overview;
icons remain the fallback. Use bounded local app-data storage and throttle captures/writes. Do not
wake sleeping pages for screenshots, change focus/scroll or wait on a batch of real-time captures
when opening overview. Cached images do not expose hidden tabs. These are queued requirements,
not implemented or live-verified fixes.

## Queued next release — Inspect Element at the bottom of link menus

BF-2026-10-19-04 in [planned updates](planned-updates.md) moves Inspect Element to the final
action in the browser's right-click link menu, below the existing link actions. Preserve the
clicked element/tab target and inspection behavior. Requirements only; implementation, build
and desktop UI acceptance remain held until authorized.

## Queued next release — false aborted-navigation alerts reported on Work Mac

BF-2026-10-19-05 in [planned updates](planned-updates.md) records Slack loading successfully on
Work Mac while Proteus reports `ERR_ABORTED (-3)`. An isolated unchanged-source Electron rehearsal
reproduces a usable destination plus a stale failure notification/tab error when a page replaces
its document before the original load completes. The navigation promise catch bypasses the
`did-fail-load` handler's code -3 exclusion. Ordinary HTTP redirects and same-document URL updates
pass the control checks. HC's exact live trigger is inferred, not observed. Queue consistent
abort/replacement tracking and truthful final navigation status while retaining genuine failure
alerts and bounded waits. Investigation only; no fix, build or installed-app changes yet.

## October 19 — native Find follows document changes, not app polling

Browser Find keeps the current match and the operator's manual scroll during unrelated shell
mutations, owner-state broadcasts and app polling. Passive refresh compares the query, stable
native tab ID and an ephemeral top-level document revision before advancing the request epoch.
It therefore leaves a pending explicit search valid. Typing, Next and Previous always search;
a new document or deliberate reload refreshes results once. A fresh wrapper around the same
native tab is not a target change. The revision is not persisted in browser history or profiles.

Late success/error replies must still match the current query, tab, document and open Find
panel. Clearing, switching targets and closing stop the captured native target only. Renderer
chat/Markdown range refresh stays passive and does not scroll. The focused tests use a synthetic
DOM and real localhost long pages, never private website content. See BF-2026-10-19-01 for
acceptance and rollout status; this change does not alter tab/profile authorization or storage.

## Selected iPhone functional preview — implemented in the separate simulator app

The operator selected the existing app with a button drawer, full URL at top and a separate bottom
Back/Forward/Find/History/one Tabs toolbar. Circle “…” contains existing Refresh/Stop, Downloads,
tab lifecycle and control-visibility actions; no new Share action. Double-tapping the native page
toggles the phone's top controls, retaining bottom controls. No automatic scroll hiding or iPad
navigation changes in this pass. Native browser snapshots and shared tab/history operations remain
the underlying paths. The code is gated to Debug iPhone simulators; builds and 740 runtime tests
pass. The signed preview is installed and runs against the synthetic owner; native checks exercise
full URLs, Back/Forward/History, touch targets, double-tap chrome and pinch-to-overview. See
[phone design](iphone-navigation-design.md) for the current acceptance record. UIKit owns phone
app Back and WebKit keeps browser history Back; legacy phone drag observers do not compete with
those recognizers.

## Queued phone browser chrome and shared iOS motion — October 18

BF-2026-10-18-02 in [planned updates](planned-updates.md) moves phone browser navigation controls
out of the URL field into a bottom browser toolbar, while removing persistent app-section buttons.
Browser Back remains; redundant app-page Back links go away. Phone and iPad should reveal the
previous page interactively on edge swipe and shrink content continuously into its tab thumbnail
on pinch-to-overview, including cancellation and Reduce Motion. Browser history, page zoom and
app navigation need explicit gesture arbitration. Real thumbnail capture must retain authorization
and unloaded-page boundaries. The [phone design](iphone-navigation-design.md) is a synthetic local
preview only; these native requirements remain queued.

## Queued iOS Live Browser navigation — October 18

[BF-2026-10-18-01](planned-updates.md#bf-2026-10-18-01--desktop-sidebar-parity-ipad-tab-layers-and-live-browser-entry)
queues removal of Chat tools and entry to Live Browser through the relevant tab-strip “+” menu,
with an authorized agent able to load the same tab through the owner service. Keep Conversation
and document tabs reachable, preserve chat/owner identity and existing Live Browser access, and
verify actual native/owner support before claiming this agent route exists. Broader iPhone
navigation is a subsequent design discussion. No implementation/build or live acceptance yet.

## October 18 — consistent agent access and explicit browser lifecycle

Ordinary website tabs now use every available configured profile without per-tab sharing or
extension opt-ins. Agents can register hidden/unloaded tabs without fetching, then load/read/control
them in the background, unhide without loading, unload or close explicitly. Existing profile sessions
remain separate. Source and isolated UI checks pass; production rollout is pending. See
[browser agent access](2026-10-18-browser-agent-access.md), including the optional developer AX
snapshot limitation. Earlier queue/status notes below are historical.

**October 15 project design — BF-2026-10-15-11:** Browser/terminal/document tabs may have
a workspace or project placement. Workspace creation stays in its own strip after the fixed,
non-closable Projects/Chats/Tabs/Configuration tabs, below the workspace name in application
navigation. There is no extra Workspace tab. Tabs aggregates direct and
project resources; project creation stays in that project. The [clickable design](2026-10-15-workspaces-projects-design.md)
rehearses hidden/unloaded creation, independent visibility/load state, typed moves and terminal
detach/reattach. Existing main/Team/Unhoused scopes remain explicit migration exceptions. No live
browser policy, tool, profile or tab changed in this design task.

**Queued October 15 — BF-2026-10-15-08:** Remove remaining extension/private profile gates
from authorized agent tab creation/loading/reading/control across all profiles. Supersedes BF-17's
extra opt-in; ordinary tab permissions apply consistently. Audit legacy flags, access/tool/restore
paths, extension transitions and obsolete errors/guidance. Preserve signed-in sessions and identity.
See [next release list](planned-updates.md). Queued only; no runtime setting or tab changed here.

**Queued October 15 — BF-2026-10-15-07:** Support initial unloaded and/or hidden workspace
browser tabs through shared UI/agent creation/import operations. Hidden and unloaded are independent;
registering an unloaded tab must not load the page. Retain metadata/profile/order, discoverability,
retry protection and restart state; later explicit activation loads the same logical tab. External
browser imports require actual authorized URL retrieval and do not transfer cookies or grant page
access. See [next release list](planned-updates.md). No implementation/build or real import claimed.

**Queued October 15 — BF-2026-10-15-03:** Reduce the shared Proteus pop-up alert duration
from 15 seconds to 5 seconds, including browser failure notifications. Preserve alert actions,
retained logs and pending approvals. See [next release list](planned-updates.md). Planning only;
the current fifteen-second behavior described below remains implemented until this is built.

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
`desktop/browser/browsing-history.cjs` retains up to 10,000 visits, default 90 days, with search, pagination,
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

## Isolated preview activity and closure — October 17

See [desktop preview](desktop-preview.md) for the preview-only activity/ordering and closure revision.
Selection and restoration do not advance recent activity. Workspace aggregate Tabs is not
reorderable; project order is manual. Browser Hide unloads and Restore waits for selection to
load. Chat view closure preserves durable state and active work while releasing presentation
caches; successful terminal input advances its recent activity. Production rollout remains held.

## Native design rehearsal — October 19

The separate Debug simulator previews retain the existing WebKit, browser profiles and scoped
tab IDs. Phone URL display keeps scheme/path on one constrained, right-fading line; focusing
expands its editor. Enter submits, and Recent sites no longer duplicates it with Done. Sync
status sits beside that heading. Back/Forward/Find/History/one overview remain below the page,
with the circle menu for existing actions and a main-tab add menu in the feature header.
Phone double-tap hides/restores top chrome. iPad retains main navigation and uses the shared
animated overview without phone chrome hiding. See [preview scope](iphone-navigation-design.md);
these synthetic simulator checks do not establish a physical-device or real-account release.

## Website controls (0.2.25, installation held pending operator approval)

Use the three-slash Page menu for current-site clearing, filtered Engine Room → Website data,
default/desktop/mobile requests, current-connection certificate details and extension actions.
See [website controls and scoped overview](2026-10-19-site-controls.md) for storage granularity,
cookie domain scope, no-fetch inspection, icon caching, hidden unloaded links and acceptance.
Workspace overview now groups visible tabs by named project within that workspace, current
project first; main overview mirrors only main navigation. Same-owner reorder and typed close
preserve sessions/history. A zoomed gesture must end at 100% before a separate pinch enters
overview. Refresh confirms POST resubmission and uses Chromium's current-document request;
Enter opens the address with a fresh GET. Form bodies never enter portable tab history.

## October 19 combined release implementation checkpoint

Inspect Element is last in link context menus. The Page menu uses the circled horizontal ellipsis;
its awaited native popup dispatch no longer requires the replaced DOM button to remain attached.
Replacement-navigation ERR_ABORTED is ignored consistently and successful main-frame load clears
stale errors. Real HC Slack/X login acceptance remains pending.

Overview reads cached last-good browser/chat captures rather than taking screenshots while opening.
Captures follow interaction and periodic visible-page viewing, persist privately through unload and
restart, and use profile/content identity; failed captures keep icons/last-good images. Hidden and
navigation-closed tabs are excluded. The current workspace includes current project first, then
other projects by name. Native sections use project identity and cached chat/document images too.
+ and New Tab open the browser home with creation blocks and focused combined Website address /
history filtering; choosing another resource replaces the blank. Team uses the same page. Browser
history/full Back/Forward stacks, optimistic revisions and recovered pending intent remain separate.

Source and disposable desktop acceptance pass overview/grouping/native cache, cross-project bulk
moves, main/chat/Team restart selection, and two-window ownership/geometry. Native 134-unit acceptance
passes before the final overview refinement. Signed/live/device and native UI acceptance remain
pending; no new package is installed. Cua 0.36.0 and Peekaboo 4.9.5 are installed on Build Mac and
both real MCP catalogs work through Proteus. OS grants, actual input/cursor and provider image
acceptance are not inferred from catalog discovery.

Later Personal acceptance grants Accessibility/Screen Recording to both signed vendor hosts and
passes their exact-window screenshot/native-click/fresh-observation flows in a disposable counter
app. An uncertain Peekaboo dispatch is observed before any further input. The actual image result
adapter retains image bytes; real-provider delivery and visible cursor animation remain separate.
Private Cua lifecycle names rotate after Stop and all owned sessions end even after fallback.
Fresh input observations require matching backend process/window receipts. Cua 0.36.0's structured
diff can fail typed-output validation; use a fresh full read without replaying input. Run the opt-in
`test/desktop-control-live-ui.mjs` only with installed/granted hosts. Team's new-tab address/filter
survives resize/polling and uses the shared outlined overview icon.
# October 19: native keyboard focus on New tab

When the selected native browser is hidden for a renderer surface, return keyboard focus to that
window's renderer if the window is currently focused. This lets the new-tab Website address field
receive immediate real typing after a loaded page. Its DOM focus alone is insufficient while a
hidden WebContentsView still owns native keyboard input. Repeated hide/layout calls and inactive
windows must not steal focus. Live release acceptance found this after the first signed candidate;
the corrected artifact must repeat package/update acceptance before other desktop installations.


October 20 follow-up: native Command-T and the File menu return keyboard ownership before
notifying the renderer. Each window temporarily uses an ordinary text input while its blank tab
is created, preserving native editing/composition and early Enter for that exact tab. The final
address field takes its value/selection after its handlers are installed. Pointer navigation,
page teardown or creation failure clears this temporary state; nothing is logged or persisted.
The foreground native regression delays creation while delivering a complete URL and Enter,
then verifies the exact loaded destination and removal of the temporary input.


## October 20 native navigation follow-up

Native workspace pages and content share one horizontal strip with separators. The page name is
a plain label, independent of the sidebar control. Phone browser controls extend to a compact
bottom allowance. A deliberate downward page scroll hides top controls and upward movement
restores them; double tap and More remain available. Horizontal drags on the unedited phone
address select adjacent visible container tabs in their current order, with no wrap or history
traversal. Browser snapshots wait for scrolling/deceleration/zoom to stop and coalesce; thumbnail
encoding, writes and retention run on a serial utility queue. Current acceptance is in the ledger.

## Browser page scale

The desktop browser … menu includes Page scale with −, its current percentage and +. Clicking
the percentage resets to 100%. The controls read and change the native website's zoom factor;
they leave the application interface scale unchanged. Chromium retains its normal origin/profile
zoom behavior. The popup stays open for repeated adjustments and dismisses with Escape or loss
of focus. Existing website-data, site-version, certificate, extension and Developer tools actions
remain in the menu. The host binds actions to the captured page and validates its lifetime;
the sandboxed menu has no website, credential or general application API. Preview validation and
production deployment are recorded separately in desktop-preview.md.

## Convergent selected-entry metadata

Two clients can observe the same page title at the same navigation revision. The shared
descriptor client settles a redundant redirect intent only when the authoritative selected
entry ID, URL and title all match exactly. If a peer commits between GET and mutation, an
explicit stale redirect conflict permits one fresh verified read to establish that same match.
It does not resubmit the stale operation or manufacture an execution receipt. Metadata companions
continue through normal synchronization; batches with navigation/traversal retain conflicts.

Different selected entries, URLs or titles retain the original pending intent and conflict.
Operation-ID collision, closed-tab and journal errors are unchanged. Uncertain transport failures
keep the original request identity and bytes for retry; a later read may independently prove
the metadata intent satisfied. No history entry, Forward branch, visit or server receipt is deleted.
This is source behavior; exact packaged latency acceptance and installation are separate gates.

## Complete session history with incremental synchronization

The desktop descriptor synchronizer requests bounded 200-entry navigation windows.
An initial connection hydrates and verifies all pages once; subsequent navigation,
Back/Forward and title changes apply contiguous owner revisions to the retained
stack. A transport-only journal keeps the latest 256 deltas per tab. If that journal
has expired or placement invalidates it, the client falls back to a complete verified
paged snapshot. It never applies an incomplete stack or discards pending receipts.
Renderer cache entries are replaced per tab and cleared when their scope/host is
forgotten, rather than retaining a full copy for every navigation revision.

The former 10,000-entry rejection is removed from canonical session navigation.
History remains available back to the session's first page. Normal new navigation
after Back still branches from the selected entry and replaces that tab's Forward
branch, matching existing browser behavior; independently recorded visits follow
the user's history retention setting. Long URLs use byte-bounded pages, including
a selected-page fallback when a centered window exhausts its byte budget.

`test/navigation-delta.test.js` verifies a 10,050-entry session, incremental append,
Back/Forward, branching and title changes, stale-delta refusal, and complete
long-URL paging below 512 KiB per history response. Existing clients keep the
previous snapshot protocol; this is source validation, not a deployed update.

## October 26 navigation and notification follow-up

Address validation examines authority credentials structurally and permits `@tenant` in URL fragments. Link menus enumerate every configured profile, preserving originating placement. Provider/model menus use the shared themed renderer menu for consistent keyboard and focus behavior.

A failed top-level navigation displays a safe themed document with the hostname, observed Chromium error category and Retry. The logical destination/history stays the requested website. Page notifications with permission feed the existing notification framework with tab/profile/origin identity. Exact page-event IDs deduplicate, while distinct rapid events are retained; click dispatch returns to the original page event. Service-worker/background Web Push integration is not established by this page-notification path.

Browser state-change bursts coalesce projection/IPC work over 16 ms. Direct reads, mutations and revocation remain immediate; disposal cancels stale sends. The [release evidence](2026-10-27-release-evidence.md) records a comparable disposable Electron measurement without claiming a broad production memory reduction.

## October 28 — first blank tab creation

New top-level browser tabs retain the existing `pendingOpen` creation marker until owner synchronization acknowledges the same identity. Native browser-state broadcasts may register the view before the create reply; `openTab` preserves the marker on that existing view. Initial reconciliation against a populated owner registry must distinguish this new user action from an obsolete restored tab. Saved/restored untracked tabs still follow the existing owner-authority rules.

`test/browser-strip-create-ui.mjs` reproduces the failure by starting inside a project with a populated main registry, double-clicking the actual empty top-strip area, then reconciling and entering a URL. It verifies selection, native-view survival, marker settlement and project-strip navigation. Source acceptance is separate from installation in the running desktop.

## October 29 native swipe update

WebKit's interactive back/forward swipe is enabled on iPhone and iPad. The content-edge gesture
described above is now the backup: it acts after a short delay only when WebKit did not traverse,
covering the edge beside a pinned iPad sidebar and owner history missing from WebKit. Once history is
exhausted, a project browser returns to its project home. See the October 29 decision.
