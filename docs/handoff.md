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
   `remote.md`, `web-remote.md`, `mobile-destinations.md`, `transcription.md`, `omi.md`,
   `terminals.md`, `markdown-picker.md`, `life.md`, or `apple-build.md`.

Git and merged PRs are the implementation history. These documents explain behavior and decisions;
they do not replace reading the relevant module. Update them when behavior changes. Never assume
that a previous conversation is available to the next agent.

## Code map

| Area | Entry points |
| --- | --- |
| Authenticated loopback API and lifecycle | `src/server.js` |
| Schedule validation, disk reads, revision conflicts | `src/schedules.js`, `schemas/schedule.schema.json`, `src/cli.js` |
| Serialized AI turns, independent native job lanes, snapshots and journal | `src/engine.js`, `src/turn-waiter.js` |
| Provider execution, model capabilities and refresh | `src/copilot.js`, `src/codex.js`, `src/claude.js`, `src/model-catalog.js`, `src/usage.js` |
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
| Transcription, Omi and native process execution | `src/transcription.js`, `src/omi.js`, `src/local-process.js`, `public/omi.js` |
| Configured-root Markdown picker | `src/workspace-files.js`, `public/markdown-picker.js` |
| Ghostty VT terminal profiles and local PTYs | `src/terminals.js`, `public/terminals.js`, desktop IPC |
| Durable desktop tab descriptors | `desktop/workspace-session.cjs`, `public/app.js` |
| Life and full website application | `src/life.js`, `public/life.js`, `web/` |
| Reproducible Apple simulator builds/tests | `scripts/apple-build.mjs` |

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
- Sidebar visibility/collapse and whole-tab activation: `node test/sidebar-tabs-ui.mjs` uses
  disposable app data and a real isolated restart. `appearance.showProviderUsage` is the Setup
  feature flag; `appearance.providerUsageCollapsed` independently retains the compact sidebar.
  Both save immediately. Existing hidden preferences are preserved; do not globally migrate them.
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

The host serializes AI turns. Each of the three managed Omi native jobs has its own serial lane,
so native control work is not blocked behind transcription or an AI chat. It stays alive after window closure, but quitting the
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

See `chat-controls.md` for queue/steer semantics, `mcp-auth.md` for sign-in recovery, and `providers.md` for Codex/Claude compatibility limits. Physical iOS installation remains an explicit operation on the operator’s designated signing Mac; simulator verification does not update devices.


## October 4 continuation: Transcription, terminals and remote clients

This section supersedes earlier deployment/timeout statements below. Desktop and physical mobile
updates are installed. Life is active and verified through the installed app; processing ownership
handoff remains held as noted.

- Transcription now separates **Omi** from **private notes & MacWhisper**, with independent execution
  gates and ordinary schedules. Existing five IDs/history remain compatible. Both general schedules
  verify their installed Codex definition against canonical operator workflows manifests, attach explicit policy
  paths, and reject changed/replayed source snapshots. Policy remains in operator workflows; organization workflows is unchanged.
- Fresh observation found all three native LaunchAgents loaded and both source Codex automations
  ACTIVE with canonical parity. Native/general gates and takeover confirmations remain false;
  all five installed replacement schedules remain paused. No processing owner was changed and no
  live transcription workflow ran through Proteus. Existing native semantic retries were traced to
  missing files in the configured independent organization workflows policy checkout; personal policies are present.
  Native cutover is held rather than removing the domain policy guard. Installed replacements were
  refreshed while disabled, with canonical fingerprints on both general jobs and a private rollback
  snapshot. See `transcription.md` for scope and cutover.
- Installed-host Codex is now healthy. A forced catalog refresh returned seven models, including
  both transcript workflow models. Two bounded synthetic turns through the already installed signed
  host verified exact selected instructions, no echo of an unselected disposable AGENTS marker,
  no tool calls, native continuation, and observed usage. A subsequent single-file disposable check
  also verified a real native write approval, one-time approval reply, and exact written content.
  Neither test selected operational vault content. This does not certify transcript filing,
  permissions for real workflow tools, or exclusion of every global instruction source. No runtime,
  security, global AGENTS, source automation or operational vault change was needed to recover it.
- Markdown browsing includes every configured workspace main/additional root, shared repository
  and every-chat folder, with **All folders** navigation. Revoked/retargeted roots are checked again
  on every operation. Folder creation and filenames remain relative to the selected nested folder.
- Interactive terminal tabs use Ghostty VT WebAssembly and local PTYs. Profiles support shell,
  command, starting folder, font and theme; a read-only native Ghostty import maps supported keys.
  Trusted main-frame desktop IPC is the only terminal control path. Tabs retain live shells across
  navigation; process restart restores descriptors with explicit **Resume new shell**, suppressing
  saved startup commands. Renderer failures offer **Reconnect view** without launching a second shell.
- Desktop session restoration now covers tab order/active selection, chats, schedules, feature tabs,
  Markdown and private browser views. Browser native horizontal gestures navigate history while
  preserving horizontal content scrolling; pinch updates bounded zoom. See `browser.md`.
- Website code has been deployed with Proteus remote views. The relay is an independent encrypted
  transport service; live TLS, two-host packet routing and host-isolation checks passed. No nutrition
  migration or production database schema mutation was part of that code deployment. Real paired
  browser/mobile end-to-end usage remains distinct from transport and synthetic client validation.
- Native Life backup restoration verification and the separately approved additive version-2 upgrade
  have completed. Core table schemas/row hashes and the nutrition digest remained unchanged; only
  two native audit ledgers were added. All seven database-referenced original evidence files were
  read and hash-verified through approved SFTP. Keychain access approval is complete. The installed
  app reviewed schema v2 with no migrations, enabled Life, and read all seven sections through its
  actual Keychain resolver and SSH route; activation changed no database records. No production
  evidence upload/test record was created. The four new deployment credentials were explicitly
  approved, saved to the authoritative vault, and verified by exact-content retrieval after sync;
  private item references remain in the website operations project. Personal and work hosts retain
  independent pairing keys, caches and permissions. Both Mac relay hosts are online. The signed-in web client is paired with the personal host and
  has read its schedules; the work host’s separate browser invitation requires its local approval.
  Existing work-host mobile authorizations and its previous container remain available for rollback.

- Live installed Claude allowance now resolves through the authenticated bundled Claude Code
  `/usage` path. Both five-hour and weekly percentages and the available weekly reset were verified
  in the installed UI; missing reset timestamps remain explicitly unavailable. Usage observations
  stay outside Git. Provider metadata still governs available models/effort/speed.
- Native Manage Macs now offers **Edit relay**, preserving the Mac identity, pairing credentials,
  history and drafts. Eight destination tests plus edit/restart UI checks passed on both iPhone and
  iPad simulators; a synthetic relay verified same-key reconnect.
- The development-signed Mac update restored the existing four tabs and active private browser tab.
  Both physical iPhone and iPad were updated in place and independently observed running. Pairings
  and encrypted cache migration were preserved; real relay commands were not dispatched from them.
  Omi capture applications and their recordings/bookmarks were untouched. See `apple-build.md`.
- Codex Trusted/Autopilot now use exact currently granted canonical workspace roots with no network
  or implicit temporary-directory writes; Ask/Custom remain read-only. Revocation interrupts the
  native turn. Shell approvals remain separate, so this does not establish unattended transcript
  execution. No permission mode or saved operational command rule was changed.

Validation: 199 Node tests and static checks passed. The sidebar/tab regression check passed ten
groups including settings persistence across actual restart, compact meters, and whole-tab selection. The native Codex sandbox smoke test verified
writes to two selected roots, denial of sibling/symlink escapes and network access, and native
approval settings. The full desktop shell passed 21 groups; the signed Ghostty terminal check
passed eight groups including reconnecting a failed renderer to the same PTY. Eleven browser/tab
checks cover restart, transition lifetime and bounded pinch behavior; physical trackpad feel remains
unverified. Signed packaging preserved Copilot vendor bytes/signatures. The production website's
49 Laravel tests (276 assertions), 17 remote protocol checks and 11 browser checks passed before
deployment. Native Life has 19 backend and 14 renderer checks; actual database reads and original
attachment hashes and installed Keychain-backed Life access were separately verified. Real mobile use through the new relay and processing cutover remain outstanding. The work-host
relay cutover is confirmed by its owning chat; its browser pairing is still awaiting local approval. The earlier credential-approval blockers are resolved.

## October 3: Omi, native Life and Claude expansion (earlier snapshot)

- Synced the Source checkout to upstream `1f61b9b`; work is on `codex/omi-life-claude`.
  The separate Mnemosyne checkout is unchanged. Its full 263-file Laravel application is
  incorporated under `web/` with Proteus branding, retaining original migration contents.
- Omi has Overview, Schedules, Runs, Logs and Settings in a persistent tab. Three native
  schedules and two imported Codex transcript schedules use the normal scheduler. All five
  are paused in this Mac's private app data and the global execution gate is disabled.
  No Omi processing was run through Proteus. Three original LaunchAgents and two original
  Codex automations retain ownership. Native capture/mobile review remain separate.
- Life is now native local UI, not a website tab or iframe. Setup explicitly enables the
  feature and installs a local SQLite database or validates a private existing connection.
  Life is absent from navigation until enabled and configured. Versioned, reviewed upgrades
  preserve food versions and nutrition records; existing remote connections default read-only.
  See `life.md` for data scope, schema handling, evidence storage and server-only limitations.
- Live database preflight authenticated SSH but found forwarding to MariaDB administratively
  prohibited. No production SQL was executed. A dedicated read-only access route is awaiting
  operator approval. No production website, nutrition record, schema, relay or server access
  configuration was changed. Do not activate an unverified profile or infer principal IDs.
- Life/Omi tabs survive navigation and reload. New tab actions are icons in the tab strip.
  AI allowance uses hideable green meters with centered percentages and detailed resets.
  Markdown supports configured workspace roots, subfolders and new folders without requiring
  a full path; modal dialogs hide native browser views and reopening a file refreshes it.
- Claude subscription authorization completed. The installed app's bundled runtime returned
  12 models and completed two synthetic turns with native session continuation and observed
  token usage. Runtime speed metadata reported fast mode unavailable. Rate-limit events
  supplied a reset/status but no utilization; the allowance percentage remains unavailable.
  This is distinct from successful model execution and per-turn token accounting.
- The Claude `kill EPERM` crash is fixed: cleanup catches denied group/child termination,
  reports unconfirmed termination and prevents overlapping discovery/turns. Desktop quit
  catches asynchronous cleanup rejection. Regression checks exercised both failures.
- The Mac bundle now uses the existing Apple Development identity, keeping its designated
  requirement stable across updates while preserving GitHub's vendor signatures/bytes.
  Installed-host Codex still timed out during startup file access after earlier macOS iCloud
  approval; direct runtime/node-mode catalog and usage probes succeeded. A new signed-app
  permission prompt, if shown, must be granted by the operator. Global AGENTS exclusion from
  the actual model prompt remains unverified. Do not claim all providers are live on this host.
- Validation before the latest native-Life refinement: 140 Node tests, static checks, isolated
  Electron integration, shutdown regression and package checks passed. All 45 Laravel tests
  passed (251 assertions), Vite/Pint passed, and synthetic desktop/mobile web checks exercised
  nine protected routes. The latest full regression and package result is recorded below.
- iPhone and iPad simulator builds passed. Four native unit tests, all six iPhone UI cases
  (one corrected and rerun), and three targeted iPad UI cases passed. Proteus was installed
  in place on the unlocked iPhone and launched, independently confirmed by process inventory.
  Its encrypted cache remained byte-identical, pairing was retained, and remote reconnection
  was not newly verified. Signing reused the existing certificate with a command-line team
  override; no project-signing setting changed. Profile expires October 10 at 17:29 MDT.
  Physical iPad installation is deferred at the operator's request. See `apple-build.md`.

Final native-Life validation: 164 Node tests and static checks passed; the full Electron shell
passed 20 check groups and the native Life renderer passed 13 checks against disposable SQLite.
The cleanup-failure shutdown regression passed. The development-signed Mac bundle passed its
isolated launch, identity, vendor-signature and byte-preservation checks. All 64 runtime source
files matched the bundle. Installed and launched the final app in place with a rollback copy;
authenticated health confirms zero active runs, Life off/unconfigured, all five Omi schedules
paused, and all three native Omi owners loaded. Copilot reports 19 live models and Claude 12;
Codex still reports its startup timeout. This does not certify live MariaDB or Omi cutover.

At that earlier validation point, live Life access and website/relay deployment were pending. See
the October 4 continuation above for their newer status. Keep the encrypted relay as an independent
supervised service; Docker is optional packaging, not a protocol requirement.

## Previously validated update: chat controls and second provider

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
