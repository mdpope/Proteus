## Native Favorites and complete simulator coverage — October 15, 2026

- Keep the chat Favorites section and star actions scoped to the current owning-host workspace, including captured chat profiles without an ID; reflect explicit favorite removal while source sections are offscreen.
- Route native browser edge swipes through one handler so the documented content-edge gesture consistently traverses one saved history entry. Matching native history still preserves page instances; WebKit’s separate interactive swipe animation is disabled. Hosted verification is pending.
- Validate native UI on actual iPhone and iPad simulator families with exhaustive, disjoint test selection. Correct stale UI interactions while retaining backend ownership, selection, draft and metadata assertions. Hosted rerun remains pending.

## 0.2.20 source integration — cross-platform acceptance pending

- Integrate the accepted Mac source companion from `418a083`, preserving native link/selection menus, source-workspace drafts and durable tab-sync retry/backoff behavior alongside the cross-platform host changes.
- Verify all 879 source hashes and archive digest; retain separate Mac source and Linux runtime fingerprints. Native project version advances with upstream to 0.2.20 / 2610.14.3, preserving app/signing identity.
- Require fresh checks and package acceptance for this integration. Earlier 0.2.19 receipts and in-progress hosted runs apply only to their tested checkpoints; no new local installation or live iPhone-to-Linux verification is claimed.

## Cross-platform host compatibility — October 14, 2026

- Use the selected computer's name across desktop, website and native connection, provider, permission, usage and file messages. Authenticated platform metadata identifies Linux or macOS when available; older protocol-1 hosts keep neutral labels.
- Keep independently paired Linux PCs and Macs behind the same encrypted relay, preserving host IDs, device keys, caches, drafts, approvals and retry receipts. Retain legacy wire/account preference keys and native Keychain identities.
- Resolve explicit legacy database credential references through Linux Secret Service or the existing Mac Keychain. Desktop token stores continue to reject plaintext fallback; normal Life clients still use the website API.
- Share Mac/Linux packaging inventory, source hashes and complete package metadata/provenance checks. Rebuild only the copied PTY; retain Mac bundle identity and Copilot vendor signing checks.
- Add hosted Linux/Mac desktop, web and iOS simulator validation. Native CI, signed Mac acceptance and a real iPhone-to-Linux relay session remain pending; see [current validation](docs/linux-app.md).

## Linux adaptation of accepted 0.2.19

- Build from the verified canonical 0.2.19 Mac source companion, retaining current workspace/tab/browser behavior. Add separate Linux packaging with source provenance and Electron PTY rebuild, XDG storage, user executable discovery, Linux tray/minimize/Quit controls and user-shell defaults. Preserve Mac packaging/signatures, native clients, protocol and pinned dependencies.


## 0.2.20 — candidate, validation/install in progress

- Native browser link actions also appear through the editing-menu path, resolve the pressed
  anchor, retain source placement and reuse downloads/native selection.
- Prevent stale tab metadata and shared-state application from generating repeated mutations.
  Persist retry identity, batch metadata, back off by owner and identify receipt-capacity limits.
- Carry forward the tested attachment-composer layout to the other authorized targets.
- Preserve receipt limits, retry protection and existing data; installation acceptance is pending.

## Update workflow instructions

- Limit recovery to two full verified generations per installation/device, avoid duplicate rollback and before/after/retry copies, and compact completed migration evidence. This is an operator/update workflow rule, not a new app feature.

## Historical October 14 intake — not implemented at that checkpoint

- BF-2026-10-14-01: Add appropriate native browser link/selection menus for iPad/iPhone and native Mac: new tab, copy link, start chat, download and native selection actions.
- BF-2026-10-14-02: Investigate receipt-capacity exhaustion and excessive background tab-sync traffic; fix redundant writes/retries and identify the owner/limit in the warning while preserving retry safety.

## Unreleased — Keep attachment controls visible

- Give attachments a bounded, scrollable section between the message editor and the fixed controls row in local desktop, visiting desktop and web chats. Keep +, model options and Send/Queue/Steer/Stop accessible for large batches and long drafts.
- Remeasure replaced attachment strips and account for waiting questions when sizing the editor. Match attachment chips, file sizes, thumbnails and controls across desktop and web.

## 0.2.19 — Navigation, redirect history and scheduled conversations

- Relocate the saved chat-tab descriptor from main navigation into its workspace in the owner store, independently of paused browser synchronization. Repeated Move converges duplicate placements while preserving other tabs, custom names, dates and metadata.
- Keep the moved chat selected inside its destination workspace and bring both navigation tabs into view.
- Identify the affected tab/page in browser conflict recovery and use plain saved-history/pending-page choices.
- Remove redirect pausing and countdown banners. Desktop, web and native history preserve original URLs and every redirect destination, including query strings and fragments, without replaying engine state or POST bodies.
- Open the existing tab from its Workspace Tabs title and reveal its navigation entry on desktop, web and mobile.
- Allow explicit conversation-only approval for a schedule-started conversation using its exact waiting request and existing context/revision checks; future scheduled runs retain their own approvals.
- Keep the 0.2.18 movement, membership/index, resizable columns, sidebar visibility and agent document placement corrections.

## 0.2.18 — Respect workspace placement for agent-opened documents

- Open an agent-created document beside its existing workspace chat instead of creating a duplicate top-level chat container. Reuse the viewer and retain original document ownership/access checks.
- Include the tested 0.2.17 tab movement, membership, resizing and sidebar corrections; the 0.2.17 candidate was superseded before installation.

## 0.2.17 — Tab movement and navigation follow-up

- Separate navigation operation IDs from history entry IDs, acknowledge identical already-saved entries without new visits, and pause conflicting or closed-tab retries with visible recovery choices.
- Move browser tabs through the owner service and retain complete Back/Forward stacks across placement changes, including revisiting an earlier destination.
- Give Workspace Tabs titles 360 pixels by default; resize columns with pointer or keyboard and remember widths locally. URLs truncate within their column; narrow screens retain the card layout.
- Enable Move chat to workspace from chat-tab menus, reconcile organizational membership immediately in Chats lists, and keep independent captured run/approval settings.
- Make expanded compact navigation reserve layout space beside the native browser, keeping the page visible and loaded.

## 0.2.16 — October 14, 2026

- Import saved chats, terminals and viewers into older browser-only navigation registries before
  synchronization can remove them. Preserve existing browser authority and ordering, and record
  the completed import so intentional closes remain closed after restart.
- Native clients remain on the tested 0.2.15 / 2610.14.1 build; the correction runs on the desktop owner.

## 0.2.15 — October 14, 2026

- Add required visible Proteus guidance/tool inventory and all-type tab management through the
  owner service/local MCP; Workspace Tabs lists metadata and supports hide, order, move and close.
- Move chats between workspaces while retaining captured run options and sessions. Delete a
  workspace with chat preservation/rehome options and retryable resource closure.
- Group recent Send destinations; persist browser tabs outside normal retention; keep the global
  Needs attention count stable; show agent questions alongside their recorded answers.
- Add desktop redirect decisions and native history reconciliation with requested-path provenance;
  downloads with dates, cancellation, destinations, folder controls and Save As/export.
- Integrate Playwright MCP and visual image/coordinate tools; optional scoped Chrome DevTools MCP
  and human DevTools; explicit extension-profile agent access and compact, localized, dismissible
  extension controls. SQLite workspace/chat metadata migration remains shelved.

Current tests and per-target rollout status are recorded in
[the release ledger](docs/2026-10-13-tab-management-release.md). Earlier queue-only notes below
are historical; no new installation is claimed by this entry.

## Future update intake — October 13, 2026 · queued only

- Confirm agent sharing for extension-enabled tabs (BF-17); queue address-toolbar Extensions/
  Install placement and localized extension names (BF-18), bounded/dismissible rendering popups
  (BF-19) and missing-answer/feedback reconciliation (BF-20). Completed owner read-only audit:
  native events/JSON/API agree; first explanation was not emitted, later explanation is preserved
  in a feedback question. Queue readable question history; historical UI acceptance pending.
  No application implementation/build, feedback sent or grant changes.
- Record answered Copilot/Claude questions disappearing from visible history while user replies
  remain. BF-20 reopens BF-2026-10-07-07 presentation acceptance: full linked question/answer
  history, beyond durable system-event capture. Queued only; no runtime change.
- Record chosen default Playwright and optional on-demand Chrome DevTools MCP, with built-in
  human DevTools/Inspect and agent MCP package integration; BF-2026-10-13-16. Queue configurable
  agent access for extension profiles instead of a blanket private block; BF-17. No build/grant changes.
- Record operator authorization to use the previously linked Zoho Assist session for future
  BF-2026-10-13-15 visual/input tests. Session details remain private; build hold stays in place.
- Add visual control to the build list using existing Playwright: actual image tool responses,
  viewport coordinate click/drag/scroll/keyboard and verification for Zoho Assist/canvas pages.
  Preserve scoped tab/profile access and semantic tools; BF-2026-10-13-15. No implementation/build.
- Queue Firefox-style browser downloads: normal-download handling, indicator/progress/date,
  per-item cancellation, configurable owner-local Downloads folder, Open folder and right-click
  Save As; BF-2026-10-13-14. Existing helper-grant path blocks ordinary page downloads. No build.
- Queue Delete workspace with affected-tab closure and preserved chats becoming unhoused, or
  bulk relocation to an existing/new workspace. Preserve conversations, run options, approvals,
  active work and project files; BF-2026-10-13-13. No actual deletion or implementation/build.
- Queue Workspace Tabs between Chats and Configuration, with typed inventory, flexible URL,
  opened/interaction dates and hide/restore/reorder/close/move. Extend associations to terminals/
  viewers as well as browsers; BF-2026-10-13-12. Add synthetic interactive design context only.
- Queue all-tab inventory/filtering/metadata and movement/closing for internal/external agents,
  with chat workspace/lifecycle management through a shared service boundary; BF-2026-10-13-11.
  Review SafariSelector patterns and add project AGENTS guidance plus a discoverable tab-manager
  agent profile. No management tools, runtime behavior or builds added.
- Queue a consistent global Needs attention badge across view changes and chat-index refreshes.
  Full renders include non-chat items; index callbacks currently overwrite it with chat-only
  totals. BF-2026-10-13-10; code finding only, no implementation/build.
- Shelve BF-2026-10-13-09 storage migration discussion in future ideas, outside the active batch.
- Review JSON versus SQLite for workspace/chat metadata and tab state; recommend considering
  a hybrid with editable JSON configuration and transactional app state, with one field authority
  and a separate decision for transcript migration. BF-2026-10-13-09; review only, no build.
- Queue Persist tab for browser tabs: prevent automatic unload and exclude persisted tabs from
  the regular loaded/retained allowance while keeping actual resource totals accurate. Remember
  the preference through restoration/moves; BF-2026-10-13-08. No implementation/build changes.
- Queue labelled Workspaces/Chats sections in Send tab destinations, each most-recent first;
  retain Application tabs/Team Tools and existing transfer behavior. BF-2026-10-13-07; no build.
- Queue Move chat beside Archive/Delete, with a destination-workspace picker and actual membership/
  navigation relocation on desktop, web and mobile. Preserve effective per-chat configuration,
  drafts/session/children and owner identity; BF-2026-10-13-06. No runtime/build changes.
- Queue redirect/replacement-aware browser history after reported ADO `view=results` Back/swipe
  loops. Record code findings, established browser behavior and future acceptance; preserve
  meaningful query parameters. Revised preference preserves original/login-redirect destinations
  and pauses eligible redirects for a five-second Accept / Reject banner with automatic timeout
  continuation and immediate Back cancellation. No runtime/build changes; BF-2026-10-13-05.
  Revised platform split: iOS/iPadOS uses redirect/replacement-aware history reconciliation
  without a banner, preserving original destinations as recoverable provenance. Electron desktop
  keeps its banner proposal. No implementation or builds are authorized.
- Queue required, visible Proteus feature awareness for chat agents, an accurate provider tool
  inventory and review of on-demand feature guidance/tools within existing context/details views.
  Record current built-in app guidance and partial tool coverage. No runtime behavior, builds
  or installations change; see BF-2026-10-13-04 in docs/planned-updates.md.

## Browser tab stability — October 13, 2026

- Preserve saved titles while activating restored browser tabs, and update unloaded native snapshots when the owner publishes a new page title. Loading placeholders no longer enter shared metadata and resize tab labels.
- Keep main and Team tab-strip nodes during unchanged state broadcasts and polling. Preserve scroll position, mounted page state and custom titles.
- Recheck current order after asynchronous browser reconciliation, preserve user reorders made during a load, count overlapping scope application correctly, and detach captured navigation/baseline snapshots from mutable renderer history.
- Correct the standalone browser Add tab popup's out-of-scope workspace reference. Validation/installation status: docs/2026-10-13-tab-stability.md.

# Changes

## 0.2.13 — Rotating logs and clicked browser links · October 13, 2026

- Store full redacted computer diagnostics in a separate worker-owned SQLite database. Rotate
  oldest records at 2,000 entries or the 64 MiB payload budget; preserve the original JSON during
  migration and keep execution retry receipts independent.
- Show compact log headers with Details expanders and 50-entry pages across desktop, web and
  native clients. Fetch traces only on expansion and locate retained older entries from alerts.
- Protect clicked-page navigation while loading so history polling cannot reload the old address
  and abort the intended destination. Preserve redirects, private pages and Back/Forward history.
- Tests and per-target acceptance/installation are tracked in docs/2026-10-13-logs-browser.md.

## New release intake — October 13, 2026 · queued only

- Start a fresh collection-only list under the operator's explicit build hold. Queue compact log
  headers, expandable full messages/stack traces/diagnostic fields and bounded pagination.
  Record current JSON storage/truncation and a proposed dedicated worker-owned SQLite store;
  no application implementation, migration, build, installation or deployment.

## Internet Search dialog layout — October 13, 2026

- Let the search input fill the enlarged dialog instead of inheriting the chat composer’s 140px height cap. Keep the provider actions and Cancel below the input, and scroll long text within the input.

## Team browser refresh correction — October 13, 2026

- Keep the selected Team Tools browser mounted during unrelated background state and shared-title updates. Preserve page scroll, address edits and native surface visibility while refreshing application navigation. Account, selection, load/profile, layout and explicit refresh changes still rebuild the view.
- Disposable renderer regression reproduces the former Preparing tab flashes and verifies the correction; installation status is separate.

## Unified browser history and navigation — October 12, 2026

- Store Default and named-profile visits in a worker-owned indexed SQLite database, with progressive search, optional paired-computer replication and a durable native upload outbox. Keep legacy history and existing command retry receipts. The account service retains profile definitions; new browsing history stays on the owning computers.
- Synchronize stable per-tab navigation entries and the selected position, including Forward history. Atomic navigation/visit receipts prevent mirror and retry duplicates; conflicting offline changes remain recoverable. Local unload and private authentication pages cannot clear shared tabs.
- Configure history recording, retention and replication using the owning computer’s paired computers and profiles. Preserve hidden peer preferences and unknown settings when saving across clients.
- Add native navigation history lists, touchpad traversal, local tab previews, profile-aware history and bounded day-by-day older-history queries. Account refresh and browser profiles work independently of Life.
- Add Copy chat link to desktop/web/native chat tab menus and organize infrequently used paths in Run files & folders below approvals. Workspace agent browsing defaults to its initiating workspace, supports explicit destinations, and remote chat indexes preserve workspace identity.
- Preserve all restored local browser views when older sessions contain multiple views for one synchronized tab identity; ordering no longer leaves an undefined tab during startup or refresh.
- Validation and per-target installation status are recorded in docs/2026-10-12-unified-browser.md; implementation does not itself establish live verification.

## October 12 remote-state and interaction correction

- Avoid rebuilding full chat prompts for integration health. Reuse scoped catalog projections only within a synchronous enumeration, compile exclusions once per operation, retain exact registry IDs and reread current configuration/source bytes.
- Bound favicon resolution per navigation, coalesce in-flight resolution and ignore unrelated network completion so invalid HTML favicons cannot trigger a request loop.
- Retain separate bounded long-stall diagnostics, with context/attention/integration, attachment cleanup and activity persistence timings.
- Group tools, approvals and distinct system messages into contiguous Activity blocks using existing platform designs. Show recorded tool completion times, durations and related approval requests. Remote desktop Working follows owner state and clears when disconnected.
- Insert new browser tabs immediately after their captured source in the same navigation container. View logs refreshes the destination and reveals the associated event, with a fallback for missing entries.
- Restore native tab type icons, including workspace chat tabs. Preserve saved Back/Forward history across native navigation, refresh shared default-profile Recent sites with explicit loading/error states, enable compatible WebKit back/forward gestures, and add pinch-to-overview animation with Reduce Motion support.


## New release intake — October 12, 2026 · queued only

- Record alert-banner View logs doing nothing; queue opening Logs and revealing the associated
  entry when available, with a Logs-page fallback. Collection only; no runtime changes.

- Queue Open in new Proteus tab insertion immediately after its initiating tab in the same
  navigation container, instead of appending to the end. Collection only; no runtime changes.

- Queue remote desktop parity for the local Working spinner/message and queue/steer guidance,
  driven by owner-host turn state. Reported omission; no runtime changes or builds.

- Start a fresh collection-only batch under an explicit build hold. Queue consistent desktop,
  iPad and iPhone activity/approval cards, original-request/tool-call association and per-tool
  completion timestamps/durations. Combine intervening tools, approvals and darker system boxes
  into one Activity group between user/model messages. Requested comparison is design only;
  no application implementation, build, install or deployment.

- Clarify this intake as message-detail/relationship parity using each platform's existing design,
  including iPhone's different native layout. The comparison does not propose a full visual redesign.

## Unreleased — October 12, 2026

- Move periodic schedule reads, validation, cron calculation and durable checkpoint writes into a serialized worker. Preserve run claims before execution, current-file schedule changes, skip/coalesce behavior and checkpoint recovery.
- Add bounded private event-loop and phase timing diagnostics for periodic hangs, distinguishing synchronous blocking from asynchronous waits; retain current and previous diagnostic snapshots locally.

- Remote commands use incremental durable receipts in a worker instead of rewriting the whole journal on Electron's main thread. Preserve legacy data, replay protections and uncertain outcomes; add byte-aware admission and payload-free diagnostics. Suppress unchanged tab-sync mutations using shared descriptor semantics.
- Process and persistent-terminal metrics poll asynchronously, cookie snapshots use ordered asynchronous disk operations, and browsing-history serialization/retention/writes run in a worker. Preserve browser state across shutdown and remove redundant workspace-session rereads after saves.

- Missing supplemental workspace/source folders no longer block chat creation. Unavailable folders are skipped with a persisted chat warning while configuration is preserved; remote chat creation tolerates missing sibling folders too.

- Native chat/workspace browsers retain their current page when tab synchronization echoes an empty new-tab placeholder; real remote navigation, close and profile changes remain authoritative.

- Folder headers use their available width before wrapping; expanded sections retain row separators without an inner vertical border. Rename workspace-local discovery to Workspace sources.
- Show each computer’s configured name consistently and count only currently running, unarchived chats from connected computers in the Chats badge.
- Match workspace and main Add-tab menu order, icons and spacing across clients, preserving explicit owner-only capabilities on remote clients.

- Pinned Workspace/Chat tabs use the shared single 2-pixel selected underline, removing a duplicate inset shadow.

- Restore clearly expandable source-folder sections with disclosure arrows, folder headers and visually contained controls/items.

- Separate folder paths from scan counts with a spaced dot. Keep source-type buttons above the full-width master filter on desktop and web.

## 0.2.12 — Workspaces and browser fixes — October 11, 2026

- Workspaces now own independent folders, source selections, defaults and approvals, and persistent named navigation with a pinned Workspace page for Chats and Configuration. Seven recent workspaces appear in the sidebar; master and workspace chat views share one conversation and draft.
- Complete local workspace copies open Configuration after naming. Cross-computer copies map paths into an independent owner workspace and reset machine-specific trust. Remote configuration retains editable selections and approvals with owner-only folder picking.
- Sources use alphabetical folder sections and items with a master filter, per-folder refresh, configurable exclusions and independent scan budgets. Folder trust can be granted and revoked for one chat.
- Browser preferences and filter updates work from the menu; Chrome Web Store installation and managed update rollback are available. Tabs and links retain their navigation context; transfer exceptions are guarded; hover URLs use one line; history suggestions filter while typing.
- Browser gesture handling preserves native scrolling. Chat composers dock and resize without collapsing the live editor; Internet Search gives its larger message box the added space.
- Claude input totals include observed cache-read and cache-creation tokens. Older incomplete usage remains marked partial rather than estimated.
- Desktop, web and native verification and rollout are tracked separately in docs/2026-10-11-workspaces-release.md. Workspaces supersedes the separate Projects concept.

## Apple signing preflight — October 11, 2026

- Install the validated .5 iPad app as a native Designed for iPad client on this Apple silicon Mac,
  alongside desktop Proteus. Operator-confirmed launch and independent process checks passed after
  macOS Security authorization. Existing certificate retained; no runtime changes.

- Require Mac unlock before Apple account/signing checks, and repeat checks after unlock before
  diagnosing missing setup. Preserve existing accounts, certificates and app data. Instructions
  updated; the validated native .5 artifact was re-signed and installed in place on iPhone and iPad.
  Launch, seven protected files per device and destination retention were verified. Renewed profiles
  expire October 18; existing certificate shared with Omi retained. No runtime or Omi changes.

## New issue / feature plan — October 10, 2026 · queued only

- Revise Workspaces design after operator feedback: feature list without its own tab, seven recent
  sidebar entries, pinned Workspace with Chats/Configuration pages, existing configuration labels
  and all four modes retained. Master Chats opens main tabs; workspace chat views share identity
  and Send to workspace deduplicates. One owning machine per workspace, per-folder refresh, no
  feature switches. Replaces the initial separate configuration-tab preview; design only.

- Design unified Workspaces as independent configurations and persistent chat/tab containers,
  superseding the separate Projects proposal. Add an interactive preview of workspace list,
  configuration, shared locked/global chat lists and named content tabs. Seven recent workspaces;
  isolated source selections and approvals. Design only; no production implementation/build.
- Start a separate planning batch under an explicit implementation/build/install/deployment hold.
- Record acceptance of configurable discovery exclusions and independent root scanning, followed
  by an explicit wait-to-build instruction. Replace the proposed Use in this chat action with
  Set as starting folder in source-folder headers. Queued only; no implementation/build started.
- Investigate the October 11 source-discovery warning: the global directory budget can be
  exhausted by an earlier root and falsely implicate later small roots. Verify an isolated scan
  succeeds and dependency/cache exclusions sharply reduce traversal. Queue accurate per-root
  discovery, scan-cadence improvements and clearer chat-folder/source-library distinctions.
  Installed/source comparison and read-only rehearsal only; no live configuration/runtime change.
- Hold further Projects design for a separate discussion. Queue whole-folder trust scoped to
  one chat, with recursive access, restart/continuation persistence and revocation. Current folder
  trust is workspace-scoped; chat-only auto-approval grants no new folder access. No runtime change.
- Propose Projects as persistent chat/browser containers with project-owned inherited setup,
  reusing existing workspace context machinery and retaining Workspaces as presets. Add a synthetic
  desktop/phone UI preview and document scoped agent edits, tab routing/transfers and cross-device
  sync boundaries. Design review only; no project runtime or synchronization implementation.
- Queue typed address-bar filtering of recent history, **Search with…** options for multiword
  queries and Enter using the configured default search engine. No address-bar changes implemented.
- Record the operator's selection of **Folder sections** for Instructions, Skills, Agents and MCPs,
  with folders/items alphabetical and master filtering across all sections/folders. Keep the folder
  sidebar as an unselected preview alternative. Synthetic browser rehearsal only; the operator
  reaffirmed no build yet, and production implementation/build/install/deployment remain held.
- Record rapid desktop history scroll jitter while typing; queue investigation of composer sizing
  and transcript resize/scroll-following interactions, preserving reading position and draft/caret.
- Confirm Claude Input tokens omits cache-read/cache-creation input. Queue complete accounting,
  a retained breakdown and historical-scope reconciliation; no normalization change implemented.
- Queue single-line browser link-hover status popups, using available width and an end ellipsis
  for long addresses instead of wrapping over page content.
- Record repeated main-process exceptions during browser-tab moves to an Internet Search chat.
  Both reported request-handler traces match unsafe `webContents.id` lookups; lifecycle
  reproduction and correction remain queued.
- Queue an Internet Search dialog 30% wider and 40% taller, with the added usable space assigned
  to the message box and existing control/font sizes retained.
- Record the website chat composer failing to dock at the panel bottom, with a large unused gap
  in the operator screenshot. Queue shared-layout investigation and visual acceptance checks.
- Queue new-tab routing from menus and links to the source tab's navigation area: same chat,
  top application navigation or Team as applicable, preserving placement through refresh/restart.
- Record choppy browser scrolling and plan performance profiling, including the blocking gesture
  wheel listener. Cause and thread scheduling concerns remain unconfirmed; no runtime change.
- Record Ghostery Browser Preferences opening Resources and Update Ghostery filters appearing
  to do nothing; causes and affected-install reproduction remain unconfirmed.
- Plan Chrome Web Store installation and managed extension updates without manual folder handling.
  Feasibility references and acceptance criteria are in `docs/planned-updates.md`; extension
  compatibility remains unverified. This entry records planning, not application changes.

## Mobile history and composer follow-up — October 10, 2026

- Open at the latest message and progressively expose every older event. Prefetch into cache within two viewport heights of the top; preserve the visible message while prepending. Count collapsed activity as one meaningful row so tool-heavy history advances quickly.
- Defer collapsed activity bodies and nested tool output until expansion; release offscreen native Markdown renderers and pause completed runtime timers. Include the composer safe-area inset when finding the bottom.
- On mobile, prepare older messages 2.5 screens before the boundary, fetch transport pages up to six screens ahead, warm rich content 1.5 screens ahead and prepare twenty-four rows per later batch while retaining the twelve-row initial window. Continue preparing during upward scroll momentum.
- Replace persistent desktop browser load-error bars with the existing fifteen-second notification, Reload/View logs actions and a sanitized retained Logs entry. Ignore aborted/subframe loads and avoid duplicate reports for one navigation attempt.
- Use one green directional expander in compact native model options.
- Give desktop/web New chat a taller dialog and keep attachment previews above the provider/model/action row.
- Stack runtime, input tokens and output tokens vertically, with centered dark value boxes and labels above them; include the same information in expanded native Chat details.
- Compact safely expired completed command receipts within the existing capacity bound, removing the misleading day-long command-limit message.
- Verification/install status: `docs/2026-10-10-mobile-history.md`.

## 0.2.11 — October 10, 2026 · full queued chat release

- Apply the approved composer across desktop, remote desktop, web, iPhone and iPad: plain +,
  circular green up-arrow Send, clock-badged Queue, circular Steer/Stop, labeled wide choices
  and a compact options menu when space is limited. Keep desktop and web composer colors aligned.
- Grow the message editor upward with its content until the composer reaches 60% of available
  chat space. Center attachment hover highlights and enlarge model-option highlights.
- Share the local desktop Run details format with remote and web chats: larger runtime, smaller
  input/output token counts beneath it, collapsed explanations, visible/copyable paths and
  disabled remote local-file Open buttons. Match Home, Workspaces and Internet Searches icons.
- Fix native Choose photos presentation, place Working above the composer, inset Chats headings,
  separate Live Browser from other tabs and add explicit touch-friendly tab reorder sheets.
  Retain one desktop-origin tab during private login redirects and share persistent same-profile
  website storage across native tabs. Website logins remain independent between devices.
- Preserve isolated native draft editing and cache unchanged visible-event indices so text input
  does not traverse a long conversation. Keep queue, steering, attachments and draft restoration.
- Automatically bundle chat-linked localhost design HTML, CSS, JavaScript modules, images and
  fonts on the owning Mac and deliver versioned snapshots through existing encrypted viewing
  grants. Remote viewers update a stable preview tab; each revision resets script consent.
  Static designs are supported; host APIs, WebSockets and HMR are not forwarded.
- Correct native HTML preview blocker syntax and inherited CSP so approved interactive controls
  and bundled images/fonts render while network, files and app actions remain blocked. Bound
  snapshot caches and remote request bursts; coalesce website reconnects.

Installation evidence is recorded separately in `docs/2026-10-10-full-chat-release.md`: Build Mac,
iPhone, iPad and production web are verified on 0.2.11; HC installation awaits a pending-run decision.

## 0.2.10 — October 10, 2026 · rollout authorized

- The operator approved building/installing the completed combined update and the native typing
  follow-up on Build Mac, Work Mac and available iPhone/iPad devices. The prior build hold is lifted.
- This was the partial rollout. The operator reopened acceptance and required every queued
  composer and automatic-preview change in the full 0.2.11 release above.

## Native chat typing — October 9, 2026 · simulator verified, not installed

- Isolate existing-chat text edits from conversation rendering and shared host-state notifications.
  Preserve immediate scoped draft saving and attachment/external draft refreshes.
- Move automatic encrypted history-cache encoding and writes off the UI thread; serialize writes
  with lifecycle flushes/deletion to retain the latest draft and prevent forgotten-cache recreation.
- Share an ephemeral store among bundled Markdown renderers, suppress idle Find notifications,
  and replace per-edit Character differences with a linear single-Return check.
- Verify long-chat typing/draft retention on iPhone and iPad, 33 native unit tests and keyboard Send
  on iPhone, plus 402 Node tests/static checks. Final iPad run reuses existing binaries under the
  build hold. No physical install; see `docs/2026-10-09-native-typing.md` for limits.

## Queued issues — October 9, 2026

- BF-2026-10-09-39: queue automatic, versioned localhost preview bundling/delivery through the
  encrypted relay for locally and remotely originated chats; no agent packaging required.
  Further builds are on hold until change intake/design review is complete, after finishing the
  already-started native typing work.

- Package desktop/web design HTML with inline styles and scripts for existing encrypted remote
  document transport; link it and the standalone mobile review from `shared-previews.md`.
  No HTTP proxy or application deployment; remote device acceptance remains unverified.

- BF-2026-10-09-25: iPad **Choose photos** attachment action reportedly does nothing. Recorded
  reproduction details, an unconfirmed native presentation lead and acceptance criteria in
  `docs/planned-updates.md`; investigation and implementation remain queued.

- BF-2026-10-09-26: move iPhone/iPad chat-level **Working** text and spinner to the bottom of
  the conversation above the composer. Source placement confirmed; implementation remains queued.

- BF-2026-10-09-27: align the iPhone/iPad attach icon with model selection and move it closer
  to the composer corner to leave more space. Implementation remains queued.

- BF-2026-10-09-28: selected an up-arrow Send icon in a circular button on all platforms,
  keeping the current green color. Implementation remains queued.

- Approve the interactive adaptive composer design for iPhone, wide iPad and narrow iPad,
  with separate options when space permits, a plain + attachment icon and circular Steer,
  Send/Queue and Stop buttons. Preserve existing text-box colors. Updated browser rehearsal
  only; native changes remain queued.

- BF-2026-10-09-29: adopt the adaptive composer layout for desktop/web. Add a full interactive
  HTML model with visible selector labels, desktop-sized circular actions, the existing plain +
  and local desktop's text-box colors shared by all three views. Browser rehearsal passes;
  application integration remains queued.

- BF-2026-10-09-30–31: extend the review page with identical local/remote/web Run details,
  centered + hover, larger option highlights, Explanation expanders, promoted runtime and compact
  tokens, visible/copyable paths, remote/web disabled local-file Open, and upward editor growth
  capped at 60% of chat space. HTML rehearsal verified; application integration queued.
- BF-2026-10-09-32–36: queue native heading insets, the Live Browser separator, tab reordering,
  duplicate desktop-origin tabs after refresh and repeated website sign-ins. Causes/device
  acceptance remain unverified; persistent profiles do not imply cross-device cookie sharing.

- BF-2026-10-09-37: select the web Home, Workspaces and Internet Searches icons for desktop.
  Exact SVGs added to the review page; application integration remains queued.

## 0.2.10 — October 9, 2026 · staged, not deployed

- Enable parallel independent provider chats while preserving one turn per session and showing queue reasons.
- Add persistent browser profiles with opt-in account settings sync, Ghostery protection and an unpacked extension manager. Default retains existing browser data; cookies and vault secrets never sync.
- Add shared actionable notification banners, Needs attention notification lists, site permission controls and direct document access for authorized devices.
- Fix optional history write failures, clipboard staging before provider selection, duplicate models, schedule draft/reload races, stale-source recovery and Internet Search settings reloads.
- Preserve tab positions, pinned Chat spacing, browser Find dismissal, visible agent pointers and directional device pauses. Automatically load older chat messages on every client.
- Native browser stores now persist; profile isolation and the shared banner are checked in the iPad simulator. Bitwarden's official extension install/popup works in isolation; authenticated vault flows, native AutoFill and background website push remain acceptance boundaries.
- See [the combined ledger](docs/2026-10-09-combined-update.md) for exact tests, limitations and build receipts. No deployment is implied.

## 0.2.9 — October 9, 2026

- Add content-edge swipe back to the native Chats list, including beside the iPad sidebar; browser swipes traverse back/forward history before leaving the chat at the first page.
- Retain web new-chat setup expansion through background updates and provider changes, with desktop-style initial expansion, labels and spacing.
- Add desktop trackpad back to close chat/browser tabs at the history root and forward to reopen swipe-closed tabs, with bounded descriptors and momentum protection.
- Native swipe and web setup validation pass; desktop gestures are exercised with trusted wheel input. The operator approved the native design and authorized both Mac and physical iPhone/iPad updates.

### Live browser and UI improvements

- Pin Chat outside scrolling child tabs; retain pending-answer drafts separately from ordinary messages.
- Add upper-right find for loaded desktop/web text, native chat/Markdown matches, and browser find with counts and previous/next navigation. Search coverage limits remain in the release ledger.
- Show agent click/fill feedback at actual browser input coordinates.
- Add chat-scoped Live Browser viewing on web/iPhone/iPad with separate device grants, bounded encrypted screenshots, follow/manual selection, zoom, point references, instructions and pending decisions.
- Preview the native green palette and matching icon meanings, remove duplicate iPad branding, collapse activity by default, and prevent cached selection from reopening a chat when visiting the list.
- Add categorized recents and running indicators. Web conversations use full workspace width; Queue/Stop share desktop styling and one row, with Stop absent for merely queued or completed runs.
- Upgrade HC Claude through its supported updater while idle. Providers refresh now exposes the current 5.5 catalog; retain the existing explicit refresh workflow.

Source checks and simulator previews are separate from installation. The authorized four-device rollout is tracked separately. See `docs/2026-10-08-live-browser-release.md` for exact verification and remaining gates.

## 0.2.8 — October 8, 2026

- Edit unprocessed queued messages in place across local/remote desktop, web and native clients, with stale-text checks and attachment/model retention. Existing queued-to-steering conversion remains available for eligible messages.
- Dismiss the exact needed-input form after a successful Enter submission, including focused fields and immediate streaming; preserve unrelated composer drafts and failed-send input.
- Restore every host-offered persistent approval choice in remote desktop/web prompts, alongside approve-once, deny and guarded chat-only auto-approval.
- Replace Integration profiles with Accounts & Integrations: private consumer labels, generic resource contexts, separate runtime/authentication/access evidence, observation time, reported expiry and recovery history. Website profiles are read-only with owning-Mac checks and supported noninteractive recovery.
- Check live MCP sessions in the background without cold-resuming idle chats. Serialize checks with the MCP dialog; bound automatic recovery and defer reconnects while tools are active. Copilot uses its runtime probe/restart capability, retaining runtime-owned credentials. Isolated multi-account switching, independent identity/resource verification and universal token renewal remain unsupported adapter work.
- Recover saved peer connections on demand without replaying commands; retain backoff and explicit disconnect/authentication stops. Notices can be dismissed and expire despite repeated background failures.
- Avoid unchanged native browser bounds, visibility and throttling writes. Synthetic page-state checks pass; the reported Jira-page flicker still needs live acceptance.

Validation and deployment status: `docs/2026-10-08-account-chat-release.md`.

## 0.2.7 — October 7, 2026

- Keep the chat child-tab strip flush with the workspace across shell, local Markdown, remote file, browser and conversation views. Its borders and close controls no longer inherit content padding, and document scrolling leaves navigation visible.
- Desktop-only correction; website and native clients remain on 0.2.6.

Validation and installation status: `docs/2026-10-07-tab-layout-release.md`.

## 0.2.6 — October 7, 2026

- Separate User Chats, Scheduled Tasks and Internet Searches while preserving chat filters; show seven recent user chats and searches without scheduled-run sidebar noise.
- Start Internet Searches with a workspace, attachments and provider buttons; configure provider defaults in Engine Room and promote searches to ordinary chats.
- Send with Enter, retain Shift+Enter for multiline drafts, and convert queued messages to steering without losing them on delivery failure.
- Show file-search patterns and original permission requests; supply agents with a workspace-authorized Markdown document-tab tool and runtime guidance.
- Persist renamed chat titles and retained browser child descriptors after closing a parent; select new iPad browser tabs immediately.
- Align web composer, filters, message actions and runtime display with desktop; inset assistant messages and correct dialog spacing.

Validation and installation status: `docs/2026-10-07-search-release.md`.

## 0.2.5 — October 7, 2026

- Reuse sent or cancelled user messages as editable drafts, retaining available same-session attachments for explicit resubmission.
- Compact new-chat controls into the bottom action bar and place attachment previews above them.
- Preserve remote chat controls across refreshes and keep disconnect notices outside the chat/details grid.
- Restore tab close separators and the final chat-tab border; reveal and highlight the current tab in overview.
- Release browser automation connections after turns while retaining chat-scoped same-tab resumption. Throttle inactive pages with visible, automation and audio exceptions.
- Refresh desktop summaries without full histories; load history on demand, send cursor updates and bound inactive chat/history caches.
- Preserve valid JSON and clean temporary files after failed atomic writes; handle disk-full scheduler diagnostics without an uncaught reporting exception.

Validation and installation status: `docs/2026-10-07-followup-release.md`.

## 0.2.4 — October 7, 2026

- Automatically recover eligible desktop peer connections with bounded jitter, heartbeat checks and authoritative refresh, preserving drafts and respecting manual disconnect and authentication failures.
- Widen the desktop new-chat composer, choose a starting folder, add chat-only folders locally, refresh provider metadata and preserve draft text and attachments across destination switches.
- Separate schedule paths from file actions and clarify approval lifetimes.
- Retain original questions, option descriptions and stable answer associations; show active turn, tool-group and total runtime on desktop, website and native clients.
- Keep clicked and agent-created browser pages with their originating chat, including popups, and save the Mac's clicked-link browser preference.
- Add scoped tab overview, left/right insertion, browser move/copy between application, chat and Team containers, and durable standup-link ordering.
- Tighten terminal layout and add an explicitly read-only view of actual provider command activity.
- Expose existing chat-specific MCP consumers through Integration profiles. New isolated Azure/Jira/ADO credentials remain subject to the adapter limitations in the implementation ledger.

Installation and live acceptance are recorded in `docs/2026-10-07-implementation.md`.

## October 7 implementation intake

- Import the 17 requested changes and approved new-chat design from PR #18.
  Implementation and validation are tracked separately from this planning checkpoint.

## 0.2.3 — October 7, 2026

- Keep an iPad's loaded browser title when desktop tab synchronization supplies an older automatic title; retain explicit renames, page state and tab identity.
- Add a readable full project-guide popup to Home on iPad and iPhone, using the same bundled guide as desktop/web.
- Inset the iPad Home heading, highlight its active sidebar page, and reveal newly opened main/chat/Team tabs without moving the strip when selecting existing tabs.

- Share desktop/web AI Allowance pills and provider detail dialogs, including refresh and one collapse state. Show the connected Mac once with a green status dot and version below. Remove the extra box/border inside web Activity Details.
- Show Standup links in matching desktop/web name-and-URL rows with quiet right-aligned Edit/Remove actions. Website Team now uses the selected shared list's API links; roster edits preserve link IDs.
- Focus the address field in new browser tabs on desktop, website and native clients. Show the 20 latest distinct visited sites with date/time and originating device when editing the address.
- Use one green native tab-bar background and text style for main, chat and Team browser strips, including iPad.
- Keep long tab titles and process labels on one truncated line in Resources, with actions inside the page width.

- Expand the shared Home capabilities into the complete project guide and show the full version/build in its own box.
- Preserve loaded chat history during live updates and recover earlier pages with a stable boundary.
- Restore bounded browser Back/Forward history through synchronized chat/Team tabs and native app restarts; retain native browser views during URL reconciliation.

- Share one Home renderer and stylesheet between desktop and website, with latest changes,
  readable expansion and an optional Mac-only instructions panel.
- Fix desktop chat-browser close selection before native state notifications; select the tab
  to the left and preserve the chat. Label the fixed child tab Chat with a full-size icon.
- Replace the clipped remote-only Next turn expander with inline model controls.
- Omit empty tool Details, use straight activity-item accents and reserve orange groups for issues.
- Remove duplicate website Engine Room navigation; align notification/resource rows and Default
  Mac controls; add sidebar version/status and reliable overview dismissal.
- Remove the redundant regular-width iPad chat header, add an explicit earlier-history button,
  and eliminate blank rows left by grouped Activity events.
- Show website working folders, loaded context, usage and session details; retain archived rows
  and their action menu while refreshing live state.
- Keep Copilot quota probes on the same authentication settings as conversations so Keychain
  credentials remain available.
- Reopen incomplete 0.2.2 acceptance; see the per-item audit for remaining live/device gates.

## 0.2.2 — October 6, 2026

- Clarify website Mac pairing, connection and Default Mac navigation, with pairing-stage recovery
  messages and retained invitation text until authentication succeeds.
- Keep desktop dialogs above browser pages, dismiss tab overview by its backdrop, and preserve
  chat tabs through Send, Queue and Steer. Show site favicons and an active agent cursor.
- Recover browser reads by sharing Proteus-owned debugger attachments with certificate inspection.
- Match website chat density to desktop and preserve safe failed-tool details. Use the accepted
  warm Activity group, green successful rows, orange failures, consistent counts and running states.
- Reconcile Needs attention rows and badges immediately after review, including remote and offline
  status; explain unavailable Copilot quota without inventing allowance.
- Sync bounded chat browser/document tabs and Team browser tabs between the host and native clients;
  visiting desktops also reconcile remote chat tabs. Keep selection and page state local.
- Remap a chat's remembered browser child when restart recreates its local browser view, retaining
  the selected child while adopting stable content-tab IDs.
- Compact native chat headers and collapse the composer to a draft preview while reading, with a
  circular Stop in both sizes. Flatten Team browser tabs and retain chat ownership when closing.

## 0.2.1 — October 5, 2026

- Make Command-W close the selected closable content tab while keeping the Mac window open.
- Match remote chat layout and controls to regular chats, constrain the conversation to the
  window, and keep one compact Archive/Delete action pair through repeated refreshes.
- Keep new-tab menus above embedded browser pages. Add context-sensitive copy, editing, chat,
  document, log, terminal and tab actions while preserving native website editing menus.
- Put the compact + attachment control beside model selection and Send. Increase the mobile
  message-entry area, improve disabled Send contrast, and add chat-list date/time details.
- Remove outer subtab padding, restore the Standup divider, and fade tab strips only where
  content is actually clipped. Keep the selected chat or Team child when returning.
- Preserve conversation reading anchors, draft state and expanded activity during refresh.
  Reorder movable content tabs with pointer, keyboard or available native move actions.
- Group the tab overview by main content, chats and Team Tools. Add a deliberate pause at
  baseline zoom before another outward pinch opens the overview.
- Use a shorter browser toolbar matching the sidebar green, a compact lighter URL field,
  and unboxed, muted navigation, Stop, Login, Enter and + controls. Highlight the robot icon
  when agent access is enabled. Show hovered links in a compact translucent overlay.
- Hold Back or Forward to choose a page from that direction’s navigation history; a normal
  click or tap still moves one page.
- Add Copy URL and read-only current HTTPS connection details to the URL-field menu. Show
  only certificate fields Chromium reports; do not fabricate an unavailable fingerprint.
- Add optional starting chat names, prompt-derived automatic names, and guarded rename actions.
- Add opt-in Auto-approve for this chat within existing allowed resources. It persists across
  restart, is revocable, clears when the provider/roots/integrations change, and leaves workspace
  defaults and other chats unchanged.
- Simplify iPad chat chrome to top tabs and chat tabs, move its existing chat menu beside +,
  retain the green accent, and show the Proteus arrow/name prominently on mobile Home.
- Add iOS navigation counts for Chats, Schedules and Needs Attention with exact host totals
  and unavailable-state handling. Preserve the existing five iPhone bottom tabs.

## 0.2.0 — October 5, 2026

- Keep open chats, schedules, browsers, terminals and documents as content tabs. Chat and Team
  workspaces share one + menu, consistent browser controls and persistent tab order/scroll position.
- Restore content tabs after reopening Proteus. Browser pages load only when selected; Home opens
  first with version, update-source status and release notes.
- Put Proteus in the upper-left of a compact full-width tab bar, with the sidebar below it.
  Keep feature icons available when the sidebar is collapsed and preserve readable tab titles.
- Make desktop and web chats consistent: provider names, grouped expandable Activity, compact
  composer/model controls, read-only remote details and automatic earlier-history loading.
- Manage chats from context menus or chat-view controls: Archive, Unarchive and confirmed Delete.
  Show Archived sits after the date filters; host-owned changes sync to authorized clients.
- Paste supported images/files into chat drafts, preview images with click or tap, and close with
  Escape, the backdrop or X. Sending confirms the exact files and provider destination.
- Keep the ordinary chat composer compact with + Attach beside the provider controls and Send.
  A message can contain up to 256 files within a 32 MiB total budget (8 MiB per file);
  selected thumbnails remain in a bounded row above the controls.
- Open generated Markdown and HTML documents inside their chat workspace on demand. Remote files
  use revocable viewing permission and approval for the exact document version; scripts stay off
  until explicitly enabled in an isolated preview.
- Add optional tmux-backed local terminals, session/profile controls and locally saved output.
  Reconnect when possible or start a fresh shell by typing, without replaying previous commands.
- Retain the six most recently used browser tabs and tabs touched within the past hour, protecting
  active work while allowing older pages to unload.
- Preserve generated Standup order when links change; correct iPad list editing and separate main
  browser tabs from Team browser tabs.
- Read Copilot quota with a fresh isolated SDK process so Refresh does not reuse a stale
  process-lifetime snapshot or interrupt running chats.
- Refresh provider allowance more often during execution and less often while idle, label estimated
  Copilot reset dates, and improve provider/MCP authentication recovery.
- Connect explicitly selected MCP servers to Claude chats with private configuration and existing
  tool permissions. Show runtime-reported Claude model versions and actionable connection status.
- Route iPhone/iPad notification taps after startup restoration, retain schedule targets and
  show unavailable targets safely instead of letting Home or restored tabs override navigation.
- Clear reviewed failures from Needs Attention while keeping unresolved approvals visible. Expand
  Resources with app processes, host children and managed persistent-terminal usage.

## Connection and presentation follow-up

- Show desktop AI Allowance as three compact provider columns, retaining details and independent
  hidden/collapsed preferences.
- Use each authenticated Mac’s configured name across desktop, website and mobile destinations;
  preserve host IDs and pairing credentials through renames.
- Let all website sections use existing account or browser pairings, and distinguish no selected
  destination from an offline connection.
- Match website Chats to the desktop filterable list and main tab bar, with the shared New Chat
  toolbar action.
- Display iPhone/iPad chat timestamps in the device time zone, including daylight saving changes.
- Keep iPad address/search navigation in the current browser tab, with Back, Forward, Reload,
  a grouped address toolbar, + Browser actions, tab dividers and active underlines.
- Show browsing visits with device-local date/time and their recorded source device; preserve
  unknown provenance on older entries and paginate history in groups of 25.

## Empty desktop connections follow-up

- Avoid Keychain requests and empty encrypted-cache writes when the desktop has no saved
  outgoing Mac connections. Existing encrypted credentials still fail closed; new pairing
  checks secure storage before contacting the destination.

## Message actions follow-up

- Add Copy and local Read Aloud controls below completed assistant messages across desktop, web
  and iPhone/iPad, with Pause/Resume, Stop and a reading-position scrubber during playback.
- Share desktop/web speech behavior, preserve playback through chat refreshes and stop when its
  chat or authorization context changes. System voices require no AI provider call.

This is a concise behavior log. Git commits and pull requests contain the complete change history.

## Earlier changes

- Keep new-tab search and address controls reachable when history grows, in both main and Team
  browsers. Bound long rows to the viewport and show history in batches of 25 with **More**.
- Isolate packaged Mac smoke tests from the real Safe Storage Keychain item; production launches
  keep normal Keychain protection.

- Unify navigation around Chats, Team Tools and Engine Room, with contextual children, collapsible
  sidebars, phone Home allowance, paired chat bubbles, attention !, and no tagline.
- Aggregate authorized Mac chat indexes; retain bounded encrypted caches and account-scoped
  drafts. Add an explicit website Default Mac without implicit execution fallback.
- Share Team rosters/links/history/preferences through explicit account API scopes; add standup
  docking, browser homes/search/history, Team tab unloading and actual host resource metrics.
- Support remote schedule editing and signed host revocation while preserving pairings on forged
  relay notices. Add generic notification/log history and retryable push delivery foundations.
- Preserve existing Apple signing; background APNs provisioning remains pending. Multi-provider
  implementation is deferred. See `docs/parity-release.md` for exact acceptance and limitations.

- Keep website sign-in feedback and cancellation in Setup; space the connected account badge
  and actions consistently on narrow and wide screens.

- Complete graceful shutdown even when a local HTTP client leaves headers or a request body
  unfinished; release the runner lock and connection record before restarting.
- Use the Omi iCloud waveform in the Transcription sidebar. Keep an enabled Life tab visible
  through sign-out and API migration; show account setup without losing the tab.

- Restore website Mac destinations from the signed-in account across browser sessions, with
  encrypted credential storage, automatic selected-host reconnection and independent browser sessions.
- Connect desktop Life through the same authenticated website API as mobile, using PKCE and
  protected local tokens. Retire direct database setup/access from the desktop runtime.

- Paginate the desktop food library in groups of 25, with stable ordering, matching counts and
  search resetting to page one; preserve selected-food versions and complete meal choices.

- Share the dark Proteus design across desktop and website, with a compact sidebar, persistent
  section tabs, machine selection and collapsible real provider allowances in the web remote.
- Enrich native Life with Garage cards, weighted fuel reports and fixed calendar nutrition periods;
  retain independent date filters, immutable food versions and scoped evidence access.
- Add direct website-account Life on iPhone/iPad, with native records/forms, PKCE sign-in,
  Keychain tokens and retry-safe mutations. Add selected-Mac usage and automatic legacy host labels.
- Start chats on separately paired desktops using their own folders, agents, skills and provider
  catalogs. Default new chats to This Mac; split history by destination with This Mac first.
- Preserve private browser URL/title history and its selected position through restart; hold or
  right-click Back/Forward to choose a history entry. Never restore agent grants or form POST data.

- Edit a saved Mac’s relay address on iPhone/iPad without replacing its identity, pairing key,
  cached history or drafts. Reconnect only the selected destination and stop old transport retries.

- Collapse AI allowance to a compact three-provider summary with a persistent expand control.
  Only the Setup visibility flag hides the panel; its checkbox now saves immediately without
  discarding other Setup edits. Existing disabled preferences remain disabled.
- Select desktop tabs by clicking anywhere in their rectangle; closing a background tab does
  not activate it, and title buttons retain keyboard activation.

- Read authenticated Claude account allowances with available reset details; distinguish real quota
  from per-turn token counts and explicitly unavailable timestamps.
- Apply Codex workspace writes only to currently trusted canonical roots, retain separate command
  approvals, and interrupt active expanded-sandbox turns when grants change.

- Rename the processing section Transcription, separating Omi from general private notes/MacWhisper
  export intake and follow-up review. Preserve the five existing schedule identities, verify
  canonical policy/cadence, and enforce independent disabled-until-cutover gates.
- Browse all configured repository/folder roots in the Markdown chooser, including shared and
  every-chat folders, while preserving scoped nested creation and revoked-root protections.
- Add interactive Ghostty VT WebAssembly terminal tabs, local PTYs and editable/importable profiles.
  Keep terminal access desktop-only; restore terminal descriptors without replaying startup commands.
- Restore full desktop tab order and selection across restart, including private browser tabs and
  Markdown documents; support native browser history gestures and bounded pinch zoom.
- Add separately paired Mac destinations to mobile and a protected Proteus web remote client,
  keeping per-host keys, drafts, caches and command destinations isolated. Retain the independent
  encrypted relay and protect existing nutrition data during website code-only deployment.

- Add the Omi control room with status, normal schedules, run history, bounded processing logs,
  private settings and an execution gate that remains disabled until an explicit cutover.
  Three native jobs use independent lanes; AI provider turns remain serialized. Imported personal
  transcript automations retain their source policy and start paused.
- Incorporate Mnemosyne's full Laravel source under `web/` and rebrand it Proteus. Add optional
  native Life screens backed by database records, a local installer, and versioned upgrade plans.
  Keep production deployment and live database changes separate from local installation.
- Give Life and Omi persistent tabs alongside chats and schedules. Hide Life until enabled in Setup. Make provider usage hideable, with green meters and centered percentages.
- Move icon-only new-tab actions into the tab strip and remove the redundant top header. Add a
  workspace/subfolder Markdown picker with nested folder creation and safe exclusive file creation;
  hide native browser views while dialogs are open.
- Catch denied Claude termination signals and asynchronous shutdown failures, preventing native
  JavaScript error dialogs. Verify native Claude sign-in, model discovery and continuation.
- Add Claude provider selection on Mac and iOS and common provider allowance summaries.
- Add reproducible Apple simulator build/test commands and managed native-processing views.

- Preserve and verify GitHub’s Copilot binary signatures during Mac packaging, retaining the
  provider identity used for Keychain authorization.
- Show persistent MCP sign-in progress and refresh connection state automatically on Mac/iOS.
- Keep chat controls and detail panels attached during streaming; preserve focused selections,
  scroll positions and disclosure state while updating the conversation and usage.

- Move model, effort, speed and applicable context menus into the compact Mac/iOS composer footer.
  Separate Queue/Steer/Stop actions; Stop appears only while running or waiting for input.
- Capture settings for each queued message, apply model changes on the next turn in the same session,
  and retain the original schedule plus model-change history. Steering keeps active-turn settings.

- Add Codex through its native app-server, separate model/effort/speed catalogs, native session
  continuation, selected context and explicit provider compatibility errors.
- Keep the chat composer available during work; durable Queue next, removal and live Steer now
  on Mac/iOS. Preserve reading position and typed drafts while output streams.
- Present tool output as affected paths, commands, fields and tables with secondary raw details.
- Compact browser navigation and make Agent access a pressed toggle with privacy tooltip.
- Add Copilot MCP connection status and native OAuth recovery on Mac/iOS, including `/mcp auth`
  as a host command. Sign-in opens on the Mac; no OAuth URL/token enters transcript storage.

- Live thinking-effort and context-size controls in Mac chat/schedule/default settings and iOS
  chat/schedule forms. Preserve options in run snapshots and apply them on create and resume.
- Refresh model capabilities at startup, every five minutes and on request without restarting
  active sessions. Preserve and label stale metadata; reject unsupported saved options explicitly.
- Schedule reopen/reload fetches current disk state; show conflicting external edits without
  overwriting drafts. Document source manifest versus exported schedule behavior.
- Share the iOS artwork with the Mac Dock and branded local Proteus .app.
- Add an agent handoff guide, code map, design decisions and maintained backlog.

## 2026-10-02 — chat activity and live approvals

- Expandable tool summaries, arguments, output, progress and failures on Mac and iOS.
- Permission changes resolve waiting tools in active sessions; individual grants remain distinct
  from workspace trust. Waiting for input does not consume the provider execution deadline.
- Catalog-backed schedule model picker, bounded browser navigation, useful background tab
  viewports, and separately scrolling Mac chat/details areas.
- Show nonzero shell exits as failed commands and omit empty assistant cards.

## Earlier prototype milestones

- Plain-file schedules, durable run history, continuation and multi-folder workspaces.
- Source discovery, explicit context selection, favorites and captured instruction versions.
- Embedded shared Playwright browser tabs and explicit Bitwarden login fill.
- Native encrypted iPhone/iPad remote client and local/container relay.
- Shared Markdown rendering, standup popout, quota display and agent identity labels.

Known unfinished work and distribution limitations are tracked in `docs/planned-updates.md`.

- Browser tab and overview selection reloads an unloaded page immediately; background pages remain
  unloaded. All five native link actions have verified macOS template icons.
