# Agent handoff

Proteus is a local AI scheduler and resumable conversation client. The Mac owns execution,
authorization, files, sessions and browser profiles. iOS is a remote client. A relay transports
encrypted traffic and cannot execute work. organization workflows and other workflow repositories own their policy
and manifests; this repository owns the generic app and provider adapters.

## Read first

1. `AGENTS.md`: invariants and validation expectations.
2. `README.md`: setup, configuration locations and operating behavior.
3. `docs/architecture.md` and `docs/decisions.md`: boundaries and why they exist.
4. `CHANGELOG.md`: recent changes; `docs/planned-updates.md`: the remaining backlog.
5. The feature document relevant to your change: `providers.md`, `schedules.md`, `permissions.md`,
   `context-loading.md`, `workspaces.md`, `browser.md`, `credentials.md`, `chat-rendering.md`,
   or `remote.md`.

Git and merged PRs are the implementation history. These documents explain behavior and decisions;
they do not replace reading the relevant module. Update them when behavior changes. Never assume
that a previous conversation is available to the next agent.

## Code map

| Area | Entry points |
| --- | --- |
| Authenticated loopback API and lifecycle | `src/server.js` |
| Schedule validation, disk reads, revision conflicts | `src/schedules.js`, `schemas/schedule.schema.json`, `src/cli.js` |
| Serialized runs, snapshots, resume and scheduler journal | `src/engine.js`, `src/turn-waiter.js` |
| Provider execution, model capabilities and refresh | `src/copilot.js`, `src/codex.js`, `src/model-catalog.js` |
| Workspace context, source delivery and tool scopes | `src/context.js`, `src/agent-tools.js`, `public/context-plan.js` |
| Live tool grants and workspace authorization | `src/permissions.js` |
| Mac forms, tabs, chat and shared controls | `public/app.js`, `public/features.js`, `public/conversation.js` |
| Tool event normalization and rendering | `src/tool-activity.js`, `public/tool-presentation.js`, `ios/Proteus/ToolActivityView.swift` |
| Shared Markdown | `src/markdown-renderer.js`, `public/markdown/`, `ios/Proteus/MarkdownView.swift` |
| Electron lifecycle, menu bar and browser bridge | `desktop/main.cjs`, `desktop/browser.cjs`, `src/browser-tools.js` |
| Credential fill | `src/credentials.js` (desktop-only boundary) |
| Encrypted remote protocol and relay | `src/remote.js`, `src/remote-crypto.js`, `relay/` |
| Native UI and remote store | `ios/Proteus/`, `ios/project.yml`, `ios/Proteus.xcodeproj` |
| VS Code companion | `extensions/vscode/` |
| Local Mac package | `scripts/package-mac.mjs` |

## Safe development and validation

- Inspect branch/status and preserve unrelated edits. Keep changes reviewable; do not overwrite an
  operator's configuration or run an operational schedule as a generic smoke test.
- Use a fresh temporary `PROTEUS_HOME`, `PORT=0`, and a separate Electron `--user-data-dir` for UI
  tests. One process must own each data directory. `npm start` and `npm run desktop` must not both
  run against the same directory.
- Run `npm ci`, `npm test`, `npm run check`. Node integration tests bind localhost and need that
  permission in a restricted execution environment.
- Model settings: `node test/models-ui.mjs`; chat presentation: `node test/chat-ui.mjs`;
  permissions: `node test/permissions-ui.mjs`; context: `node test/context-controls-ui.mjs`.
  These use disposable data and synthetic content; do not substitute the real application home.
- Native UI: start `node test/mobile-host.mjs`, then use the checked-in Xcode project and an
  available simulator (`xcrun simctl list devices available`). Run the relevant `ProteusTests`
  and `ProteusUITests`; fixture ports 4328/4329 must be free. Stop the fixture afterward.
- If Markdown sources change, run `npm run markdown:build` and commit the generated bundle.
  If Xcode file/target membership changes, run `npm run ios:generate` and commit the project.
- Build the local Mac bundle with `npm run package:mac`. See `docs/mac-app.md` before installation.
- Before restarting the operator's Mac host, check for active or waiting runs. Stopping an active
  host interrupts those runs. Verify the app and remote connection after restart.
- Describe exactly what was tested, with simulator versus physical-device results distinguished.
  An iOS simulator build does not install the update on an iPhone or iPad.

## Durable state and known limits

App data lives outside Git. Inspect the configured home rather than assuming paths from another
machine. `connection.json` contains a local API bearer token: never print or commit it. Browser
profiles, pairing secrets, provider credentials, private instructions, and real run records also
stay out of commits and test fixtures.

The host currently serializes execution. It stays alive after window closure, but quitting the
app or sleeping/shutting down the Mac stops execution. There is no detached always-running daemon.
Existing chats retain schedule snapshots; editing a schedule affects future runs. The composer can
change next-turn model settings in that same chat, retaining the initial snapshot and change history. Updating
a chat's context is explicit; authorization changes apply during active turns. A completed AI
turn does not certify completion of the external workflow.

An organization workflows source manifest is not the same format as the exported Proteus schedule. Export/reconcile
through that repository's supported client workflow; see `docs/schedules.md`. Do not bake organization workflows
paths, ownership or private prompts into this app.

Native signing is machine/account configuration, not repository configuration. Use an appropriate
Apple team on the installation Mac. Do not revoke or recreate certificates as an automatic fix;
coordinate signing across machines. Remote pairing is separate from Apple signing.

See `chat-controls.md` for queue/steer semantics, `mcp-auth.md` for sign-in recovery, and `providers.md` for Codex compatibility limits. Physical iOS installation remains an explicit operation on the operator’s designated signing Mac; simulator verification does not update devices.


## Latest validated update: chat controls and second provider

- 99 Node regression tests and static checks passed.
- Mac compact-composer, rich-chat, model-picker, browser/control, and packaged launch/signature checks passed using
  disposable data. Draft preservation, queue removal, scrolling, per-provider options and privacy
  toggle behavior were exercised.
- Live Codex synthetic tests verified selected instructions, unselected AGENTS exclusion, native
  continuation with model changes, runtime usage, dynamic browser-tool dispatch and steering during a tool call.
- iPhone simulator: four native tests plus five UI tests passed. iPad simulator: expanded tool
  output and model-capability UI tests passed. No physical-device install or signing changes.
- Copilot OAuth API/command tests verify native delegation and no authorization URL in transcripts.
  Real corporate consent/sign-in is an operator step; report its actual status rather than equating
  browser opening with authenticated tool access.

## Authentication and live-control regression checks

- `node test/mcp-auth-ui.mjs`: synthetic pending sign-in, persistent feedback, automatic connected
  state, sign-in during a slow background check, stable controls, connected-button removal and
  polling cleanup after closing the dialog.
- `node test/chat-ui.mjs`: streaming with a focused permission selector, stable composer/detail DOM,
  queued drafts and independent scroll positions. `node test/composer-ui.mjs` covers next-turn choices.
- `test/packaged-mac.mjs` must validate both Copilot vendor signatures and unchanged binary bytes.
  An app-level ad-hoc signature alone does not prove that provider Keychain identity was preserved.
- iOS `testMCPConnectionRefresh` uses the synthetic mobile host; it never performs real OAuth.
  A live provider status check after installation verifies whether prior authorization survived restart.

Validation for the signing/status/scrolling update: 99 Node tests and static checks passed; Mac
authentication-feedback, chat interaction, composer and packaged-app tests passed. The native MCP
status UI test passed on both iPhone and iPad simulators. The installed Mac build restored existing
selected MCP connections after a cold restart, with no new Keychain prompt observed during the
check. Physical-device installation remains separate.
