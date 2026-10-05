# Changes

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

## Unreleased

- Document and queue Copilot reset provenance, adaptive allowance refresh, consistent provider
  labels and desktop/web chat parity. Record grouped Activity and usage/context details as design
  proposals; source review and read-only status inspection do not constitute implementation.

- Queue matching dividers between Team Tools, Standup and the first browser subtab; the
  screenshot-reported presentation issue is not yet fixed.

- Queue a desktop Standup state-preservation fix: adding a saved link must retain the generated
  daily order through undocking/redocking. This is a reported issue, not an implemented fix.

- Queue investigation of MCP configuration reporting Connected while the active chat reports
  needs-auth, including per-session state and consistent Mac/iOS recovery feedback.

- Queue provider sign-in/reconnect controls and authentication refresh without restarting for
  Copilot, Codex and Claude Code; acceptance criteria are in `docs/planned-updates.md`.
  This is planned work, not an implemented authentication fix.

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
