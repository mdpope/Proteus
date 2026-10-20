# iPhone and iPad navigation previews

## Queued next release — new-tab page replaces the add menu

BF-2026-10-19-12 in [planned updates](planned-updates.md) requests the same direct new-tab page
on iPhone and iPad as desktop: + opens the existing browser home, with current supported creation
options as compact icon/label blocks at the top. Preserve main/workspace/project/chat/Team scope,
profile choices, tab layers and each idiom's accepted chrome. Combine Website address/history
filtering, focus that page field with `https://example.com` as placeholder, and submit typed input
using Enter or the existing angled-arrow icon at its right. A history-result tap opens that URL;
typing only filters. Keep existing search choices and history/link controls. This intake records
future requirements only and does not change the other chat's current native preview source,
build authorization or acceptance status described below.

## October 19 — final sidebar and composer design pass

The final native simulator pass slightly brightens inactive sidebar text/icons, uses desktop's
Home outline and Schedules/Team Tools glyphs. Project nesting is six points; items sit nine points
farther in, halfway between the last two reviewed item offsets.
Open tabs close glyphs are smaller, green and aligned near the drawer's right edge, retaining a
44-point touch target. The grouped selection colors and existing sidebar/tab ownership remain.

On iPhone, the idle reply composer is a single-line preview without Send or model/attachment
controls. Touching it animates the editor and its existing supported controls into
view; reading the conversation collapses it while preserving the draft. Reduce Motion disables
the expansion animation. Running-turn Stop and queued-message actions remain available while
collapsed. iPad always displays the editor and controls, even after reading taps, but its editor
also starts at one line. Explicit newlines grow either editor; soft wrapping scrolls within its
current height. The composer card, including controls and attachment chrome, is limited to half
the app window height, with a smaller budget when the keyboard leaves less space. Text scrolls
after reaching that limit; selected-attachment details also
receive a bounded scrolling region. iPhone Return inserts a newline and never sends. iPad Return
submits; Shift+Return inserts a newline. Pasted multiline text is preserved without submitting.

The attachment + is visible with expanded controls. Unsupported fixture providers show its
existing file/photo/paste choices disabled with an explanation; they do not gain upload capability.
Supported providers retain metadata-driven model/level/context/speed and attachment controls.
This pass is limited to the separately identified native simulator design previews.

**Verification:** final iPhone and iPad composer UI cases pass, including initial one-line height,
visible attachment +, soft-wrap scrolling, explicit-newline growth, size limits, draft preservation,
iPhone button-only submission and iPad software Return submission. The selected-project/sidebar
case passes with the new indentation. Two native unit cases cover layout limits and Shift+Return
command routing; all 756 runtime cases and static checks pass. Captured-keyboard GUI acceptance on
iPad saves the exact two-line synthetic reply using Shift+Return, then ordinary Return. XCTest on
this runtime drops hardware Return events, so that specific path is verified through native GUI
and command tests rather than claiming the UI runner delivered it. A reproduced iPad dismissal
hang is fixed by deferring keyboard resignation until after SwiftUI's layout update; the final
reading/dismissal case passes. Editor word-selection taps no longer toggle phone header visibility.
The connected fixture advertises model options but no attachment support; upload capability stays
unchanged. Production build and physical installation remain held for final design review.

## October 19 — Standup, browser controls and sidebar follow-up

The latest preview uses a numbered Standup order like desktop. iPhone has only the Standup tab;
there is no dock or pop-out. iPad can dock the order from an icon in the Standup page header and
close it with the dock's upper-right X. The dock contains only the selected list's order, agenda,
date/time zone and Generate action. List selection and editing stay on the Standup page; all link
viewing and management stay on Team Tools. The editor supports member names, fixed/random modes,
reordering, add/remove, agenda, name and time zone through the existing revision-guarded website
service contract. Hidden link fields and unknown fields are retained on list saves.

Phone browser controls read Back, Forward, Refresh/Stop, Find, circle More, Tab overview.
History and Downloads live in More; Back/Forward long-press history remains. iPad moves History
and Downloads into circle More immediately left of overview. The shared native overview mark
uses the supplied overlapping outlined rounded rectangles. Team browser tabs regain their active
underline. The desktop/web mark was handed to the named next-release chat for queue-only work.

Sidebar features use the desktop rounded outlined selection, quiet inactive icons and exact
workspace/folder/team/collapse geometry, with desktop palette tokens for workspace/project/item
selection. Project and item indentation uses equal 12-point steps instead of 16. The phone drawer has an
explicit viewport/content width and stays mounted while hidden, preserving its expanded tree
without affecting hit testing or accessibility. Other accepted
navigation, URL editing, gesture and service-source decisions remain in effect.

**Verification:** both final separate simulator previews build, install and launch. Six focused
native UI cases pass, including compact numbered Standup/editing, iPad dock X and portrait bounds,
flexible header search, Home continuation, phone drawer bounds, browser menus/order and retained
Back/pinch behavior. Shuffle and minimum-page-zoom unit cases pass; all 756 runtime tests and static
checks pass. Final screenshots are reviewed. The iPad search field flexes in a narrow docked layout.
The fixture reached its 20-device limit during repeated setup; six oldest synthetic pairings
were retired through the verified fixture owner API, with no fixture restart or direct data edits.
Tests now reuse existing preview pairings. New one-time invitations bypass the HTTP cache.
A final main-browser → project-item rehearsal found a missing owner environment on the project
navigation destination. The project push now carries its computer store explicitly, workspace
selection clears the displayed main-tab selection without closing that tab, and a sixth native
UI case verifies the actual chat and its selected sidebar state. This fixes the reproduced crash.

Production/physical rollout remains held. The previous acceptance record below describes its
prior iteration, not proof of these follow-up changes.

## October 19 — paired iPhone and iPad preview iteration

The operator authorized native design previews for **both** simulators. This supersedes the
previous pass's iPad exclusion, while leaving release and physical-device rollout separate.
The latest decision keeps iPhone main tabs in a labelled **Open tabs** sidebar section and adds
the same section to Home. iPad keeps its main tab strip and Home section, without main tabs or
feature recents in its sidebar. The iPhone “+” remains to the right of feature actions so a main
browser tab is always reachable; it is distinct from a workspace/project's scoped add menu.

Normal phone addresses occupy one line, retain the scheme and path, and fade at the right edge.
Focusing expands the editor. The enter icon remains; the extra Recent sites Done button is gone.
History synchronization status sits beside Recent sites. Existing bottom browser controls remain.
Root features use one compact phone header with drawer, title and existing actions; search stays
below. iPad uses an appropriately sized page header, actions and search above the page, after its
two adjacent tab layers. Double-tap header hiding is phone-only. Workspace/project/item hierarchy
uses equal indentation steps and the desktop theme tokens.

Home includes Open tabs and interaction-based Recents, seven at a time with More. Needs Attention
uses the same seven-item paging across connected computers and notifications. Recents in this
rehearsal are bounded in-memory chat selections plus existing browser interaction timestamps;
provider updates and sidebar polling do not create visits. Durable cross-device chat recents are
not claimed by this preview.

Team Tools keeps the **website service** as its only record source. No desktop-owned list source,
record migration or new account grants are introduced. The selected service list is shared by the
Team Tools and Standup pages on a device; refreshing reads the existing account data. Tools shows
standup links with add/edit/remove/reorder. Long-press a phone link to see its URL and actions;
iPad shows URL and direct editing controls. Standup owns roster/list settings and its in-page
Dock control (the follow-up above removes Pop out). iPad tab icons reproduce the desktop SVG geometry. Existing list revision
and account-identity checks remain in force; saves retain fields the editor does not understand.

Both Debug simulator identities use the same private synthetic service fixture for acceptance.
That fixture rehearses the existing service contract and revision conflicts, never actual account
records. Production credentials and physical installations remain untouched.

```sh
npm run ios:preview:phone -- --device IPHONE_SIMULATOR_UUID
npm run ios:preview:phone -- --ipad --device IPAD_SIMULATOR_UUID --reuse-fixture
```

`--reuse-fixture` verifies the named synthetic service before connecting a second preview.
The launcher resets pairing only in the separate disposable preview installation. It never erases
a simulator or changes signing accounts/certificates. Validation status is recorded in the handoff.

**Verification — October 19:** separate ad-hoc-signed iPhone and iPad previews build,
install and launch on the existing iPhone 17 Pro and iPad Pro 13-inch (M5), iOS/iPadOS 26.5.
Five focused native UI cases and the minimum-page-zoom arbitration unit case pass. Checks cover
phone full URL display/editing, browser controls/history, double-tap chrome, chat interactive
Back and pinch; visible single feature title, bottom search and header actions; service link
changes visible across both previews and phone long-press editing; iPad header/search placement,
Team Tools naming/links/settings/dock placement, retained main navigation and animated overview.
Final sidebar separators use fixed-height horizontal rules, avoiding List row padding and
orientation-dependent Divider behavior. All 747 runtime tests and static checks pass.

Acceptance corrected the URL focus transition and intrinsic width, native title accessibility,
and SwiftUI row-wide multi-button activation. Tests use independent app/test identities and run
pairing setup serially: the synthetic owner has one outstanding invite. The final iPad run keeps
the emulator's current orientation; real device ergonomics and actual website-account workflows
remain separate acceptance items. Source/data ownership was not changed. No simulator erase,
service reset, account/certificate change, live-data backup or physical install occurred.

## October 18 selected phone preview — prior accepted baseline

The operator selected **Button drawer** and authorized a functional iPhone simulator preview
applied to the current Proteus interface. This supersedes the three-option exploration below.
Use current Home and section screens; do not add the mock-up's section hub or a new Share action.
Keep complete scheme/host/port/path/query URLs above the page. Keep Back, Forward, Find/search,
History and one Tabs button in a bottom browser toolbar, with circle “…” for additional existing
options. Double-tap page contents to hide the top controls and double-tap again to restore them;
the bottom controls remain. This is a manual toggle, not automatic hiding on scroll. iPad
navigation changes are explicitly excluded from this implementation pass.

The native preview reuses the existing store/WebKit, history, browser profiles, chat composer,
workspace/project navigation and source permissions. It includes a phone drawer with integrated
Workspaces collapse and existing desktop hierarchy colors, native stack back navigation without
redundant back links, actual loaded-browser previews and visited chat/document snapshots, a mixed
overview, pinch progress/cancellation and Live Browser in chat “+”. Snapshot caches are memory-only,
reset on account changes and never load unloaded browser pages. Scope selection retains original
tab IDs and uses existing organizational drafts rather than making replacement resources. Actual
native behavior is checked against the synthetic owner, rather than the historical HTML mock-up.

`NativePhonePreview.enabled` limits the code to Debug iPhone simulators, enabled by the preview
bundle identity or explicit launch argument. Normal/physical builds and iPad retain their original
navigation path. The launcher uses the separate `org.proteusapp.review.proteus.iphone-preview` identity, a temporary
display-name plist and disposable owner fixture. It never changes signing teams/certificates,
installs on a physical device or backs up/migrates live data.

```sh
npm run ios:preview:phone -- --device SIMULATOR_UUID
npm run ios:preview:phone -- --device SIMULATOR_UUID --build-only
```

The first command builds, checks the preview identity, starts a private synthetic owner only if
fixture ports are free, and installs/launches only on the chosen iPhone simulator. It prints build,
fixture and receipt locations. Keep the fixture alive while testing; do not replace another owner
on occupied ports. `--build-only` compiles without starting a fixture or installing. No provider
workflow or usage verification is implied. The prepared `PhoneDesignPreviewUITests` target the
separate app and test full URLs, bottom actions, one overview entry point, double-tap visibility,
the drawer, chat back navigation and pinch. They require that preview installation and fixture.

**Verification — October 19:** the signed separate preview builds, installs and launches on the
existing iPhone 17 Pro/iOS 26.5 emulator. Both focused native UI cases pass, as does the existing
minimum-page-zoom arbitration unit test. UI acceptance covers drawer order/selection, removal of
bottom app-section navigation and Chat tools, full URLs, 44-point browser controls, actual
Back/Forward/History, one overview control, circle-menu actions, double-tap hide/restore, browser
and chat pinch-to-overview, closing the overview, and native chat edge-back. Captured screenshots
show recognizable chat/browser content in aligned cards; unavailable previews remain explicit.
All 740 runtime tests and `npm run check` pass, along with parser/project/JavaScript checks.

Native acceptance fixed parent accessibility identifiers masking controls, plain-button hit areas
and a legacy SwiftUI reading drag competing with UIKit Back. Phone reading now uses the existing
UIKit scroll observer, and app Back keeps UIKit's interactive transition. iOS 26's content-pop
recognizer is restricted to a horizontal gesture at the leading edge; WebKit retains history
ownership. The launcher supports this Xcode installation's Device Hub application.

Use simulator ad-hoc signing for Keychain pairing. UI tests used a private manifest with separate
preview/test-runner identities. The operator requested no dramatic recovery: no simulator/service
reset, erasure, Apple account/certificate change or physical installation occurred. The accepted
app and synthetic fixture remain available for review; private receipts/logs/screenshots stay
outside source. `npm run ios:generate` was attempted but XcodeGen is absent; the checked-in project
has the matching source reference. Physical-device gestures, iPad changes and actual agent-triggered
Live Browser loading remain separate acceptance items. Earlier HTML checks do not validate Swift.

## Historical three-option browser rehearsal

The operator wants more content space on phone, a bottom browser toolbar separate from the URL
field, smooth interactive back navigation, better tab previews and Safari-like pinch-to-overview
motion. Shared motion also applies to iPad. BF-2026-10-18-02 in
[planned updates](planned-updates.md) holds the requirements; BF-01 separately holds iPad tab layers
and desktop sidebar parity.

The authorized deliverable is a local synthetic phone design preview. Production native changes,
builds and installation are separate. The operator selected all three navigation alternatives to
try; none is the accepted final design.

| Alternative | App navigation | Back gesture |
| --- | --- | --- |
| Button drawer | Top-left navigation button opens a compact left drawer | Horizontal swipe from left edge |
| Right-edge drawer | Swipe inward from the right edge, or use the top-right button | Horizontal swipe from left edge |
| Upper-left pull | Pull downward in the upper-left header, or use its button | Horizontal swipe from left edge, including in that header |

Each includes a Home hub with every section and recent work. There is no persistent bottom
app-section bar or app-page Back link. Browser Back/Forward, Share, overview and page options
occupy a compact bottom browser toolbar. Chats retain the composer at the bottom; Live Browser
is reachable from tab “+”. All data and provider text in the preview are synthetic.

The preview rehearses dragging the current page aside to reveal its previous contents, cancelling
or committing that drag, content shrinking into its thumbnail, selecting a card to expand it,
and a content grid for browser/chat/document views. Rehearsal buttons provide mouse-accessible
motion previews; design controls compare two/three thumbnail columns and animation timing.
The upper-left gesture is an experiment in conflict avoidance, not a promise that it will feel
natural on an iPhone. Browser device emulation cannot establish native recognizer arbitration,
Safari's exact motion, system-edge behavior, VoiceOver or physical pinch ergonomics.

Editable source: [phone preview fragment](design/2026-10-18/iphone-navigation.html). It uses the
conversation preview host for icons, alternative switching and optional design controls. The
local standalone browser wrapper is temporary preview output, not a shipped app or production
route. It reads no Proteus app data, uses no owner/provider API and contains no real screenshots,
chat text, URLs or usage measurements.

Browser-only verification passed eight focused groups: Home/drawer order and cancelled/committed
back navigation with draft retention; overview/opening, bottom browser history controls and Live
Browser from “+”; right-edge versus left-edge gesture separation; downward upper-left versus
horizontal Back separation; 360/320 px fit; two-touch pinch into overview; cancelled pinch with
scroll retention; and Reduce Motion. No page-script errors were observed. Screenshots of the
browser, in-progress back gesture, overview and narrow Home hub were inspected. An initial state
echo dismissed the overview; the corrected preview preserves it. Mouse edge dragging also avoids
accidental text selection while retaining ordinary selection outside the gesture.

These checks use an isolated Chromium browser with synthetic touch input and phone dimensions.
They do not verify native WebKit, iOS navigation transitions, actual tab screenshot capture,
provider work or a physical phone/tablet. No app runtime, signing settings, device installation
or live application data changed. Production runtime suites were not run for this documentation
and standalone design-preview change.
