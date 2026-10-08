# Changes

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
