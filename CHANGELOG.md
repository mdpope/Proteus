# Changes

This is a concise behavior log. Git commits and pull requests contain the complete change history.

## Unreleased

- Add the Omi control room with status, normal schedules, run history, bounded processing logs,
  private settings and an execution gate that remains disabled until an explicit cutover.
  Three native jobs use independent lanes; AI provider turns remain serialized. Imported personal
  transcript automations retain their source policy and start paused.
- Incorporate Mnemosyne's full Laravel source under `web/` and rebrand it Proteus. Add optional
  native Life screens backed by database records, a local installer, and versioned upgrade plans.
  Keep production deployment and live database changes separate from local installation.
- Give Life and Omi persistent tabs alongside chats and schedules. Hide Life until configured
  and enabled in Setup. Make provider usage hideable, with green meters and centered percentages.
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
