# Proteus

A local control room for scheduled AI work: set the cadence, watch each run, and return to the
conversation when it needs you. Provider-independent scheduling and storage, with GitHub Copilot,
Codex and Claude adapters, native Omi processing schedules, and optional native Life records.

## Omi, Life and Apple builds

The **Omi** section observes the installed recording pipeline and prepares disabled replacement
schedules for its audio, library, semantic, transcript-intake and follow-up jobs. Native services
and Codex automations keep running until a separately reviewed cutover. See [Omi](docs/omi.md).
Bluetooth capture and the iCloud recording/review library stay in the separate Omi iCloud app.

**Life** brings the complete former Mnemosyne application into `web/`: nutrition, garage,
maintenance, fuel, evidence, account security and OAuth/MCP. Life is an optional native desktop
section, hidden until enabled and configured in Setup. It reads database records directly through
the trusted host, with a local SQLite installer and private MariaDB connection profiles. The full
Proteus-branded website source is retained for future deployment. No browser or iframe supplies the
native Life screens. See [Life](docs/life.md) for migration and nutrition preservation boundaries.

`npm run ios:doctor`, `npm run ios:build` and `npm run ios:test` use the checked-in Xcode project
on the designated build Mac without replacing signing settings. See [Apple builds](docs/apple-build.md).

## Run the desktop prototype

Requires Node.js 22.16+ and npm. The desktop prototype targets macOS.

```sh
npm ci
npm run desktop
```

The first run may download Electron. Use `npm start` for the local web interface instead. Both
use the same runner and data directory; only one may own that directory at a time. Open the
printed local launch URL when running the web interface. The default port is 4317; `PORT=0`
selects an available port. `PROTEUS_HOME` overrides the application-data directory.

## Implemented

- Editable five-field cron expressions with IANA time zones and next-five-run previews.
- Plain JSON schedules, atomic saves, external-edit conflict detection, and JSON Schema.
- Manual and scheduled runs, serialized AI turns, independent Omi job lanes, overlap prevention, and skip/coalesce policies.
- Captured schedule/context versions per run; persisted conversations, feedback, permissions, and
  continuation. Explicit context refresh retains the previous versions. Interrupted runs require explicit continuation after restart.
- GitHub Copilot SDK adapter, explicit model selection, compact account allowance rows with reset
  details for all providers, and observed per-run token usage. Copilot authentication uses the official runtime's existing sign-in.
- Codex native app-server adapter using the Mac’s existing sign-in, with separate live model, effort,
  and speed controls. See [provider compatibility](docs/providers.md).
- Claude native runtime adapter with dynamic model/effort/supported-speed controls and explicit
  sign-in, quota and integration limits. See [provider compatibility](docs/providers.md).
- Queue next and supported-provider Steer now during active chats; readable tool cards and complete Markdown responses
  on Mac, iPhone and iPad. See [chat controls](docs/chat-controls.md).
- Copilot MCP connection status and browser OAuth recovery, including `/mcp auth <server>`.
  See [MCP sign-in](docs/mcp-auth.md).
- Local rehearsal provider for trying the feedback flow without an AI call.
- Tabs for schedules, conversations, formatted Markdown, and shared browser tabs with embedded Playwright control.
- Named multi-folder workspaces, live context discovery, universal/per-chat source controls.
- Standup utility with a live, always-on-top floating window, visible session paths, transcript export, and desktop Bitwarden login assistance.
- Small VS Code companion that starts a chat using all roots of a local multi-root workspace.

## Prototype boundaries

The scheduler runs while the desktop app or server is open. Background service installation,
distribution signing/notarization, notifications, and independent concurrent workspaces remain future work.
A locally signed, branded Mac bundle is available; closing its window keeps the menu bar host running.
AI turns use one execution queue; a run waiting for feedback holds that
queue until answered or stopped. Each managed Omi native job uses its own serial lane and native locks. Missed occurrences of an already-active schedule are skipped.

The embedded browser has site titles, an address bar with Enter navigation, history, and multiple
persistent tabs. Playwright uses the same pages through a scoped bridge; human-created tabs require
Agent access before a run can use them. See [browser design](docs/browser.md). Authenticated Slack
coverage requires a real signed-in read; synthetic browser tests do not establish Slack coverage.
Markdown renders formatted text, tables, code, and inline images; embedded HTML remains escaped.

Copilot, Codex, Claude and rehearsal providers are implemented; Omi native jobs use a restricted local-process adapter. Provider adapters retain different native
capabilities; unsupported context/tool restrictions fail explicitly. A `completed` run means its model turn
ended; workflow-specific checks determine whether the underlying task really succeeded.
Raw Copilot conversations remain in Copilot's own persistent session store; Proteus keeps their
IDs, event history, schedule snapshots, and measured usage locally. Cross-provider context transfer
is not implemented. Persistent workspace and tool approvals support unattended execution within their configured scope.

## Schedule files

Default app data: `~/Library/Application Support/Proteus/`. It contains `schedules/*.json`,
`runs/*.json`, scheduler state, and a private local connection file. Do not commit this directory.
The provider's session storage and Electron browser profile are separate runtime-owned stores.

Start with [the template](templates/schedule.json) and [schema](schemas/schedule.schema.json).
The file name must match the schedule ID. Unknown fields are retained. Credentials belong in
environment variables, system keychains, or provider authentication, never schedule JSON.

```sh
npm run cli -- validate /path/to/export.json
npm run cli -- import /path/to/export.json
npm run cli -- list
```

Imports always start paused and reject duplicate IDs. Imports and edits do not reset conversation
history. A workflow repository may export a resolved schedule and retain its own canonical
schedule definition; `source` metadata records ownership. Permanent changes to managed workflows
belong in that upstream repository before updating the derived file in Proteus.

## VS Code companion

Open the extension in an Extension Development Host:

```sh
code --extensionDevelopmentPath="/path/to/Proteus/extensions/vscode"
```

Run **Proteus: Start Chat with This Workspace** with Proteus already open. The command passes
the workspace roots and your prompt through the authenticated loopback API. It does not read
VS Code's private Copilot databases. The companion source is included but is not installed or
published to the marketplace by this prototype.

## Validation

```sh
npm test
npm run check
node test/ui-smoke.mjs
node test/workspace-ui.mjs
```

The UI smoke test opens two temporary desktop sessions and verifies cron edits, persisted files,
feedback, restart/resume, settings, multi-root chat defaults, navigation, and embedded Playwright control. It uses isolated temporary data and a
rehearsal provider. The core suite covers DST behavior, unsafe paths, external edits, duplicate
schedule occurrences, recovery, paused imports, and loopback authentication.

See [architecture](docs/architecture.md) and [provider interface](docs/providers.md).

## Settings and workspace context

**Settings → Paths & defaults** edits `settings.json` in the app data directory: default working
root, additional repositories/directories, provider/model, time zone, skill directories, and
MCP servers. These defaults apply to new chats and new schedules. Existing schedules and run
snapshots retain their configuration. `PROTEUS_HOME` selects a different data directory before
launch; changing it does not move existing history. Settings are plain JSON and support atomic
saves, external-edit detection, and directory validation. Keep credentials outside this file.

**Workspaces** manages named profiles, native folder selection, VS Code imports, and a discovered
inventory of instructions, skills, agents, and MCPs. Select Every chat, With workspace, Choose per
chat, or Disabled for each source. Imported MCPs start disabled. Refresh rescans without restarting;
idle chats can explicitly refresh their captured context before continuing. See
[workspace and context behavior](docs/workspaces.md).

The Copilot adapter receives the chosen folders and explicit managed context. The VS Code companion
also supplies active file/selection metadata; it does not transfer VS Code's index, unsaved buffers,
extension tools, or old chat history. Chat details show exactly which source versions were supplied,
the execution directory, native session path, and Open/Copy/export controls.

**Standup** persists one dated order and editable roster/agenda. **Credentials** configures the
desktop Bitwarden CLI provider and exact login bindings. Browser Fill login makes a tab private;
passkeys and verification remain interactive. See [credential setup](docs/credentials.md).

An app-created schedule is saved to `<app data>/schedules/<id>.json`, paused. A source-owned organization workflows
schedule stays canonical in `organization workflows/automations/<id>.json`; the editor shows its source path.
After changing and exporting that manifest with organization workflows, validate and refresh the local copy:

```sh
npm run cli -- validate /path/to/export.json
npm run cli -- refresh /path/to/export.json
```

Refresh requires matching source ownership and existing IDs, preserves run/session history, and
leaves schedules paused. The app does not automatically write UI edits back into another repository.

For an opt-in live Copilot check, run `node test/copilot-smoke.mjs`. It consumes a small amount of
Copilot usage, creates a temporary synthetic file, approves only a read of that exact file, and
verifies that the model received its contents. It catches SDK/CLI permission-protocol mismatches
that rehearsal tests cannot detect. It does not read professional sources.

## Persistent tool approvals

Use **Settings → Workspace permissions**, or **Tool approvals** in a run, to select Ask each time,
Trusted workspace, or Auto-approve tools. Prompts also offer folder trust and Always allow for the
current command/tool operation. Saved approvals apply to matching workspace contexts across chats,
schedules, and restarts, and can be revoked. Policies live in host-local `permissions.json`;
see [permission behavior and scope](docs/permissions.md). Importing a schedule never grants trust.

Auto-approve tools supports unattended tool execution, including terminal commands with the
runner's normal access. It is not a filesystem sandbox or a promise to answer user questions.
Runtime-marked enterprise approvals, sandbox escapes, and genuine questions still pause.

`node test/permissions-ui.mjs` tests the permission UI with a synthetic provider.
`node test/permissions-smoke.mjs --run-live` is an opt-in Copilot test that reads, writes, and checks
synthetic temporary files with zero manual approvals. It uses provider credits, not professional data.

`node test/context-copilot-smoke.mjs --run-live` checks explicit instruction delivery and changed
context on a resumed native session using only synthetic sources. It consumes Copilot usage.

`node test/agent-copilot-smoke.mjs --run-live` verifies a synthetic custom agent can read and resume,
while read-only and no-tool profiles retain their restrictions in the actual Copilot runtime.

## iPhone/iPad and menu bar host

Closing the Mac window now leaves Proteus running in the menu bar. Choose **Quit Proteus and stop
runs** to stop the host. Native iPhone/iPad clients can pair with it, see and resume chats, edit
app-owned schedules, and select workspace context while all execution stays on the Mac.

Open **Remote access** for built-in LAN pairing, or run `npm run relay:local` to build and connect
a local Docker relay. Open `ios/Proteus.xcodeproj` on your iOS development Mac to install the app.
See [remote setup, signing, protocol, and validation](docs/remote.md) for the full workflow and
current prototype limits. Imported MCPs and schedules keep their existing enabled/disabled state.

Chat labels use the selected main agent’s saved name. Chat messages and Markdown tabs support rich formatting on Mac, iPhone, and iPad. See [rich chat rendering](docs/chat-rendering.md) for behavior, supported images, and validation.

The sidebar shows account-wide Copilot premium requests remaining and used, refreshed every five
minutes or with its refresh button. Missing quota is shown as unavailable; unlimited and stale
results are labeled explicitly. This is separate from per-chat token counts.

Standup → Floating standup opens one always-on-top window at the upper left of the main window’s
screen. It matches the sidebar width and fills the usable screen height, leaving the menu bar and
Dock available. Regeneration updates the floating order automatically. The bottom Close button
closes only that window. `node test/standup-ui.mjs` validates the desktop behavior.

Chats and schedules have Favorites, Check all favorites, an explicit source-loading mode, and a
preview of which instructions, skills, agents and MCPs will load. Favorites sync with paired
mobile devices. See [context loading](docs/context-loading.md) for automatic defaults, token
estimate limits, and the plain-file schedule format.

## Handoff and current behavior

For another agent, start with [the handoff guide](docs/handoff.md), which links design decisions,
the module map, validation commands, feature docs, the [changelog](CHANGELOG.md), and
[remaining work](docs/planned-updates.md). Runtime/private context stays outside this repository.

Thinking effort and context size are beside the model picker on Mac and iOS. Mac Settings also
sets defaults. All choices come from the refreshed provider catalog; see [providers](docs/providers.md).
Opening/reloading a schedule reads its latest local JSON, with conflict protection for unsaved
edits. organization workflows source manifests still require export/reconciliation; see [schedules](docs/schedules.md).

For the native Proteus name and iOS artwork in Finder/Dock, build the [local Mac app](docs/mac-app.md).
