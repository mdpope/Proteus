# October 6 evening acceptance audit

The operator rejected 0.2.2 acceptance on October 6 (the audit continued after midnight UTC).
This audit supersedes blanket completion language in the earlier release/handoff. It covers all
22 October 6 build items, all 28 October 5 follow-up items, and the additional current reports.
Source presence, synthetic regression, installation, and real workflow acceptance are separate.
The first correction is source commit `c5bda4297293ebbcb10f56c8c3a680840f71fa34`, version 0.2.3.
Website release `20261007T035838Z` passed 14/14 endpoint checks; runtime configuration, schema and
nutrition data were preserved. Build Mac runs the signed correction with unchanged signer,
protected data and initial workspace projection. Later authoritative remote-tab reconciliation is
being compared with HC's pre-update scope revisions; no stale workspace was restored. HC's chat
installed and launched the same signed artifact; its post-launch verification remains pending.
Both physical iPad and iPhone installed and launched 0.2.3 (2610.6.2), with app data/preferences and
two destination identities preserved. Installation does not certify every physical gesture below.
Screenshots containing real chats and workplace URLs are evidence only and are not copied into Git.

## Confirmed failures and current corrections

| Report | Finding in the delivered source | Correction / remaining acceptance |
| --- | --- | --- |
| Desktop Home spacing and divergent website Home | `renderHome` and Blade generated different structures; desktop stacked cards without a layout gap and rendered the whole changelog | Both now use `public/home.js` and `public/home.css`. Four latest-release bullets, expansion for the rest, previous releases collapsed, common capabilities, optional Mac-only instructions. Actual desktop and Laravel UI exercised; demo available under `docs/design/2026-10-07/`. |
| Chat child icon tiny; repeated chat title | Flex shrinking allowed the SVG to collapse; child tab reused the chat title | Fixed 17px nonshrinking icon and `Chat` label. The top tab retains the chat name. Electron regression checks actual width. |
| Empty tool Details | Desktop unconditionally appended a details element | Append only if rendered details have content. Web now uses the same title/status/error/details hierarchy and omits empty details. |
| iPad duplicate title/back/menu row | `compactHeader` rendered unconditionally despite the outer regular-width tab menu | Hide compact header at regular width; retain phone controls. iPad simulator confirms exactly one top menu and no redundant row; phone regression preserves compact header. |
| Earlier messages does nothing / missing history | Native renders inert text; automatic pagination is gated by reading/restore/gesture flags. Merge replaces history when windows are disjoint | Added explicit load/retry, stable absolute before-event paging, sparse page retention and contiguous merging on web, desktop remote and native. Live updates no longer replace loaded history; unit tests exercise gaps, incoming messages and reconnection windows. |
| Subnav colors/fonts differ | Independent rules for main/chat/Team and website tab bars | Align child background, 13px text and 17px icons; selected/unselected colors follow main navigation. Whole-platform screenshot acceptance remains open. |
| HC Copilot allowance | Original work tested empty quota parsing but did not diagnose affected machine authentication | HC chat independently found quota probe `mode:'empty'` disabled Keychain auth and selected a different CLI identity. Normal-auth quota-only probe succeeded; adapter and regression integrated from `c67a61a`; all 366 Node tests pass. Real quota/cache/summary verified by owning Mac; installed signed-app acceptance remains open. |
| Default Mac Save spacing | Form was a block label followed immediately by button | Side-by-side flex layout, stacked with a gap at narrow widths. |
| Website version/status position | Website version was Home-only; no persistent default-connection footer | Sidebar footer below allowance now shows website version and observed Default Mac status. No invented quota or online state. |
| Web Engine Room duplicate tabs / highlight | Separate top nav and sidebar links without selected section state | Removed top nav; sidebar owns routes, active class and aria-current; heading names current section. |
| Web notifications | All content in one card, inline timestamp/buttons and bright primary actions | Preferences and History panels with desktop-style separated rows, timestamps, secondary controls. |
| Web resource formatting | Processes and tabs were paragraphs; totals boxes missing | Memory, CPU estimate and process totals, tab rows, process table. Unavailable metrics remain unavailable. |
| Attention icon mismatch | Web/native used circled exclamation; desktop uses plain exclamation | Plain mark on website/native. |
| Web chat/details parity | Separate renderer; workspace looked only at `context.workspaceId`; fewer sidebar sections than desktop | Activity hierarchy and missing working folders/context/usage/session sections corrected. Host-only file/export/MCP controls and complete pixel parity remain distinct; do not mark BF-09 fully complete from these changes. |
| Activity item left edges | `border-radius:8px` rounded the accented left side | `0 8px 8px 0` on desktop/web; confirmed in DOM style regression. |
| Activity always orange | Both group styles unconditionally used warm fill | Green by default, orange only when group contains a failed/interrupted issue. Updated operator direction supersedes unconditional warm-group wording in BF-09/13. |
| Web overview won’t dismiss | No backdrop handler; anchors did not close dialog; bottom-only close | Backdrop, tab activation and visible top X now dismiss. Inside click remains open. |
| Mobile tab history/resume | Shared descriptors omit history; native WK backstack is not persisted. Existing retention keeps six recent views and views touched within an hour | Bounded safe URL/title backstacks now travel in authorized chat/Team descriptors and native persistence. Native remote URL reconciliation updates an existing view instead of unloading it. Six recent views plus one-hour retention remains; OS termination can still require reload. Physical convergence remains to verify. |
| Desktop closing chat child jumps to Chats | Native close emits browser state before awaited close completes; handler removes active browser and selects overview | Select left neighbor before native close and apply same rule to external browser removal. Last child returns to Chat; inactive closure preserves selection. Main close also selects adjacent content. Isolated Electron reproduction passes. |
| Desktop remote “Next turn” empty expander | Absolute-positioned fields were clipped by composer overflow | Removed remote-only expander and floating row. Inline model/metadata controls and refresh match local layout; unsupported controls hidden. Model choices still come from destination provider metadata. Remote constrained-layout regression passes. |

Additional failures verified during this audit:

- iPad long blank gaps: every absorbed tool/approval event left a zero-height stack row with an
  18-point gap. Filtered to visible rows while retaining absolute event IDs. A 40-event iPad
  regression confirms the next visible message sits exactly 18 points after the Activity box.
- Website archived-chat menu vanished on live refresh: the archived index was cleared before its
  replacement arrived, and rerender discarded menu selection. Retain the index during refresh,
  apply authoritative lifecycle changes immediately, and restore the menu against updated rows.

## Follow-up reports while reviewing the installed correction

- Standup links: web showed general browser bookmarks instead of the selected shared list's links.
  Both now render the same compact name/URL/right-aligned actions table. API storage already existed;
  web now edits those revision-checked records and preserves IDs during roster edits. Desktop UI and
  actual Laravel add/edit/roster-save/reload/Standup/remove checks passed with synthetic data.
- New browser focus / recent sites: source focuses new desktop/web/native address fields and shows
  20 distinct URLs sorted by latest visit, with date/time and that visit's device. Desktop keyboard,
  mouse selection, dismissal and Team/main focus checks passed. The native ordering unit test and iPad focus/20-row/device/selection/dismissal plus existing Go/Back/Forward UI tests passed; iPhone and installed-device follow-up are separate gates.
- Resources overflow: fixed table width and ellipsis keep long tab names/process notes on one line;
  Electron checks at 1440px and 900px retain visible action buttons without horizontal overflow.
- iPad black chat-browser strip: the child strip inherited a transparent background while the main
  strip used system material. Both now share explicit green native tab colors and typography; Team
  strips use the same style. This late correction needs its own native build.
- HC Claude allowance: newly reported and routed to the owning Mac chat for diagnosis of the actual
  installed app. The earlier Copilot diagnosis does not establish Claude health.

## October 6 build: all 22 items

“Retained” below means implementation and identified historical test evidence exist, not that this
audit newly proved every live acceptance clause. “Reopened” means current evidence contradicts
completion, or required live evidence remains absent.

| BF ID | Acceptance reviewed | Audit result and evidence |
| --- | --- | --- |
| 01 | Connections discovery, default distinction, narrow/keyboard flow | Partial/reopened: flow exists (`remote.blade.php`, `app-tools.js`, connections fixture); duplicate navigation/active state and Save spacing were missed and corrected here. Fresh live pairing still open. |
| 02 | Desktop overview backdrop/interior/select/close | Retained; current `oct6-desktop-ui` passes main and Team backdrop and native-view restoration. Website omission is a separate newly fixed gap. |
| 03 | Device cards, separate status refresh, immediate grants | Retained; current Electron test exercises individual/all refresh, unchanged permissions, saved switches and narrow layout. |
| 04 | Diagnose real pairing closure, fresh invitation end-to-end | Reopened live gate: stage messages and synthetic interrupted/expired/account-save tests exist. Earlier deployment only restored existing grants, not fresh live pairing. |
| 05 | Dialogs above actual embedded browser, retained focus/state | Retained for tested cases; current Electron test uses a real native browser, overlay input and retained field. Every installed menu/resize combination is not newly certified. |
| 06 | Favicon/cursor main/Team/chat, privacy and lifecycle | Retained; current Electron synthetic session favicon/cursor recovery passes. Chat primary icon sizing was missed (BF-14). |
| 07 | Debugger attachment conflict recovery/concurrent reads | Retained synthetic verification: owned reuse, five concurrent reads, closed bridge recovery, foreign attachment respected. Live workplace-page workflow remains unverified. |
| 08 | Actual safe error desktop/web/reload | Partial: normalization and redaction tests pass, screenshot shows actionable failure, but empty Details survived. Corrected here; per-provider output coverage remains bounded by fixtures. |
| 09 | Website visual parity across representative pages and chat | Failed/reopened: Home, Engine Room, notification/resource layout and Activity edges differ in screenshots and source. Changes here cover several failures, not full chat sidebar parity. |
| 10 | Attention row/badge immediate reconciliation and stale reply safety | Retained source/test evidence (`oct6-web-state`, chats index); icon parity was outside the behavior tested and is corrected here. Fresh installed multi-host review remains a live gate. |
| 11 | Chat strip remains during send/queue/steer | Retained; current Electron regression verifies mounted strip, child selection, and switching during delayed submit. |
| 12 | Diagnose affected Mac allowance and verify provider response | Failed/reopened: missing-data explanation was implemented but HC root cause was unresolved. Current HC investigation found auth-mode mismatch. |
| 13 | Matching activity counts, live progress and reduced motion | Partial: desktop/web count/state regressions pass; native summary wording exists but group animation and visual parity do not have complete current physical acceptance. New failure-only tint rule recorded. |
| 14 | Icons/colors/long titles in all tab strips | Failed/reopened: tiny desktop chat SVG and repeated title; screenshots contradict completion. Fixed local sizing/label/colors, broader platform comparison remains explicit. |
| 15 | Desktop↔mobile tab descriptors, offline/revoke/converge | Partial: descriptor and revocation tests exist; website uses a separate local child-tab representation, not equivalent cross-client memory. Physical mobile convergence and resume behavior remain open. URL back/forward history was never included. |
| 16 | Collapsed mobile draft, circular Stop, retained state | Retained implementation/prior phone fixtures. Current physical keyboard/VoiceOver and all device widths not certified; new iPad fixture checks composer presence. |
| 17 | Compact phone header with 44pt targets | Retained on phone; iPad regression came from applying header unconditionally. Current correction limits it to compact width. |
| 18 | Mobile browser Go icon/submit/accessibility | Retained `TeamToolsView` implementation and prior browser UI fixture; no new physical navigation test in this audit. |
| 19 | Native Team single row, Standup action local | Retained implementation and prior focused native test; web Team has separate behavior and should not be implied covered by this native-only acceptance. |
| 20 | Phone header stays on chat/browser without blank spacer | Retained prior phone fixture; clarified iPad should have no extra header. Current changes preserve compact-width header. |
| 21 | Closing native chat browser stays in same chat | Retained native handler/prior fixture. Newly reported desktop failure was not covered by native acceptance and is reproduced/fixed separately here. |
| 22 | Visiting desktop reconciles all host chat descriptors | Partial: prior synthetic and installation sync receipts exist. Later HC unexplained removal/history changes remain unresolved; do not infer they were user actions. |

## October 5 build: all 28 items

| Item | Acceptance reviewed | Audit result and evidence |
| --- | --- | --- |
| 1 | Cmd-W current tab; never close app window | Retained; current `next-changes-ui` covers renderer, browser and terminal focus and one surviving window. New neighbor-selection rule added separately. |
| 2 | Remote/local chat layout, details, composer, singleton controls | Failed/partial: clipped Next turn wrapper violated composer parity. Corrected inline controls; current remote repeated-refresh/anchor/layout test passes. Complete identical details coverage still open. |
| 3 | Add menu above native browser, no reload/click-through | Retained; current native menu creation/state test and overlay test pass. Full installed resize/scale matrix remains unverified. |
| 4 | Divider after Standup | Retained source in Team tabs and earlier UI record; new color/font alignment tracked above. Fresh installed visual comparison still needed. |
| 5 | Broad context menus/Copy/editing/terminal/web coexistence | Partial: handlers exist in app/context-menu/browser/terminal paths; no current all-surface Safari/Chrome/Firefox+installed acceptance matrix. Separate proposed message More menu remains deferred. |
| 6 | Compact attachment control on action line | Retained; current remote composer geometry verifies attachment/model/action alignment. |
| 7 | Mobile Send visible before text | Retained implementation and synthetic composer fixture; actual device keyboard variants not newly verified. |
| 8 | Mobile chat-row date/time | Retained localized row rendering and previous fixture; no screenshot contradiction reported. |
| 9 | Larger mobile input/tap area | Retained prior composer work; subsequent collapsed-composer request changes reading state, not draft integrity. |
| 10 | Label fade only on actual clipped edge | Retained tab-edge helpers/observers; current broader desktop tests pass, no fresh every-strip physical comparison. |
| 11 | Nested tabs flush upper-left | Retained; current remote layout fixture measures subtab-to-main gap. |
| 12 | Preserve reading position/anchors/drafts/selection on refresh | Reopened mobile history/resume and web completeness; current remote desktop repeated refresh/prepend test passes but is insufficient for all listed surfaces. |
| 13 | Remove iPad redundant title row; move ellipsis beside top + | Failed/regressed: outer menu exists but `compactHeader` also rendered title/back/menu. Corrected at regular width; new iPad fixture explicitly tests absence and exactly one outer menu. |
| 14 | No unintended blue accents on iPad | Retained theme/tint implementation. Screenshot does not establish complete compliance; pending physical/light/dark/keyboard check. |
| 15 | Chat-only auto approval within existing grants, revoke/context invalidation | Retained backend/synthetic regression evidence. No grant or permission mode changed by this review. |
| 16 | Automatic chat names; rename before/after start | Retained naming/API/title-revision and UI tests; no new model turn used to certify live generation. |
| 17 | Compact browser link hover overlay | Retained; current Electron test reads actual native overlay geometry and pointer noninterception. |
| 18 | Unboxed browser navigation/add controls | Retained toolbar and prior regression; subnav/icon mismatch is separately reopened. |
| 19 | Compact Agent access, off/on state, revocation | Retained browser toolbar implementation and access tests. No live permissions changed. |
| 20 | Copy full committed URL, actual read-only certificate | Retained; current Electron checks URL and HTTP absence; valid HTTPS certificate check passes. No trust changes. |
| 21 | Remember per-chat/Team child, stable identity/restart | Reopened closure transition and unexplained HC later changes. Prior correction remaps restored IDs; new close fix preserves/updates remembered selection. |
| 22 | Zoom baseline pause, deliberate overview entry | Retained current synthetic zoom gate; physical trackpad timing remains distinct and not newly verified. |
| 23 | Overview hierarchy/order, selection activates exact child | Partial: desktop grouping/selection exists; website anchors/backdrop failed dismissal. Corrected web close behavior; cross-client grouping parity remains bounded by supported descriptors. |
| 24 | Reorder/persist movable tabs, fixed boundaries | Retained; current Electron keyboard reorder survives reload. Full drag edge-scroll and concurrent close/rename matrix remains unverified. |
| 25 | Prominent native branding | Retained source and previous device test; no new contradictory screenshot. |
| 26 | iOS counts match desktop | Retained count aggregation/tests; icon mismatch was separate and corrected here. Physical offline/freshness counts remain a live check. |
| 27 | Browser toolbar density/color across clients | Retained current toolbar/history checks and prior device records; chat/Team *tab strips* still required separate alignment. |
| 28 | Held Back/Forward directional history | Retained local browser history implementation/fixtures. Native backstack persistence or cross-device backstack synchronization was not implemented by this item. |

## Why the previous verification missed this

- The release aggregated source presence, synthetic tests, installation and live acceptance into
  “all implemented.” Several required visual and machine-specific outcomes remained untested.
- Tests asserted an SVG existed, not its rendered size; asserted a group was orange without
  checking the success-only case; opened a populated Details case but not an empty case.
- The close tests checked removal/window survival, not the selected neighbor after the native
  state event. The remote model wrapper existed but its clipped expanded contents were not tested.
- Phone header tests actively expected a header, and those expectations were reused without an
  explicit tablet no-header assertion. Website Home tests expected a different layout.
- The prior warm-group requirement explains the orange default, but the current operator request
  explicitly replaces it with failure-only tint. Other mismatches are omissions/regressions.

## Validation for this working tree

Current evidence and remaining work are updated here as checks complete. No deployment follows
from a clean build. Private live receipts remain with the owning Mac/deployment workspace.

- 366 Node tests passed with the integrated quota adapter/auth regression; final `npm run check`
  and `git diff --check` passed.
- Isolated Electron: 11 October checks passed, including the newly reproduced close race,
  left-neighbor/last-child fallback and measured icon width.
- Remote desktop: repeated refresh, one lifecycle control set, reading anchor, constrained composer,
  inline model picker, and actual URL/certificate checks passed.
- Activity: error/count/progress/reduced-motion checks plus success-only tint, empty Details and
  straight left corners passed.
- Website: Vite build, eight populated synthetic Engine Room/layout groups, and 22 actual Laravel shell/UI
  groups passed using temporary SQLite/storage, synthetic accounts and no production records.
- Home demo: desktop/web/mobile screenshots inspected, expansions work, no page errors or mobile
  horizontal overflow. Actual desktop and website screenshots were also inspected.
- Native iPad: compact composer, no duplicate header/menu, and 40-event Activity spacing tests pass.
  iPhone: compact header, draft preservation and browser closure test passes. Screenshots inspected.
- Full website chat regression passes (29 groups), including added context/session sections,
  Activity details, measured 17px Chat icon, viewport-bounded details scrolling, and a forced live
  refresh while the archived-chat action menu is open.

Open live release gates: physical iPad/iPhone acceptance and cross-device history convergence;
fresh production pairing; live browser workflow; installed HC
allowance with the corrected signed build. These are not complete just because installation of
0.2.2 previously succeeded.

## 0.2.3 final correction scope

The operator authorized deployment to both Macs, the website, iPad and iPhone. Shared Home now
contains the full version/build box and abbreviated capabilities expandable into the bundled
project guide. Website Home uses the same renderer and data contract. Transcript card geometry,
colors and spacing now match desktop; native Activity rows use straight left accents and green
normal/orange failed fills. Safe browser history is limited to 50 entries/32 KiB and carries no
page content, cookies or credentials. Older clients may omit the optional history field. Loaded
desktop pages keep their local navigation; restored/unloaded tabs receive synchronized history.
The OS may terminate a mobile app; persisted tabs and history survive, live page memory cannot
be guaranteed. The existing local selection policy is retained.

The stable before-event cursor prevents message arrival from shifting older-page boundaries.
Sparse older pages remain cached until gaps are filled, so no absent messages are represented
as contiguous history. Unit tests cover this across the shared web/desktop merger and native.

Deployment and physical verification receipts will be recorded separately from these source checks.

Final UI rechecks: all 29 web chat groups and 22 actual Laravel shell groups pass.
Native iPad real-gesture Back/Forward, held history selection and 40-event spacing pass (3/3).
The history check exposed a missing Team active-tab accessibility value and observation during
in-flight navigation; both are corrected. Website reading anchor restoration now follows the
restoration of disclosure layout, preventing scroll clamping during live refresh.

## Follow-up validation and current installation boundary
The installed baseline on both Macs, website and physical iPad/iPhone is 0.2.3 from c5bda429 (native 2610.6.2). Signed identity, data, pairing and runtime checks passed. HC Copilot allowance and Refresh passed. HC Claude is signed out and explicitly deferred by the operator until tomorrow; no Claude patch or invented allowance.

The subsequent Standup table/API links, address focus/20 shared recents, Resources truncation, iPad green tab bars, shared desktop/web allowance popups and plain web nested Details are source changes awaiting the next signed rollout. 368 Node tests and desktop follow-up checks pass. Actual Laravel shell checks (24), web Engine Room groups (8), full remote web groups (29), iPad browser tests (2), iPhone recents test (1) and native recents unit test pass. Physical installs do not alone prove every live cross-device workflow.
