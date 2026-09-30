# Proteus

A local control room for scheduled AI work: set the cadence, watch each run, and return to the
conversation when it needs you. Provider-independent scheduling and storage, with GitHub Copilot
as the first real provider.

## Run the desktop prototype

Requires Node.js 22+ and npm. The desktop prototype targets macOS.

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
- Manual and scheduled runs, serial execution, overlap prevention, and skip/coalesce policies.
- Immutable schedule snapshots per run; persisted conversations, feedback, permissions, and
  continuation. Interrupted runs require explicit continuation after restart.
- GitHub Copilot SDK adapter, explicit model selection, account quota display, and observed
  per-run token usage. Copilot authentication uses the official runtime's existing sign-in.
- Local rehearsal provider for trying the feedback flow without an AI call.
- Tabs for schedules, conversations, Markdown source, and a human-interactive browser.
- Small VS Code companion that starts a chat using all roots of a local multi-root workspace.

## Prototype boundaries

The scheduler runs while the desktop app or server is open. Background service installation,
packaging/signing, notifications, and independent concurrent workspaces remain future work.
The single execution queue avoids concurrent mutations; a run waiting for feedback holds that
queue until answered or stopped. Missed occurrences of an already-active schedule are skipped.

The embedded browser is interactive, persists its own sign-in session, and is isolated from the
privileged app UI. Playwright does **not** yet control that embedded tab. A separately configured
Playwright MCP browser can be supplied to the Copilot provider in a schedule's `mcpServers`.
See [browser design](docs/browser.md). Real authenticated Slack coverage has not been validated.
Markdown is displayed as escaped source; it does not execute embedded HTML.

Only Copilot and rehearsal providers are implemented. Provider neutrality is an architectural
boundary, not a claim that other providers already work. A `completed` run means its model turn
ended; workflow-specific checks determine whether the underlying task really succeeded.
Raw Copilot conversations remain in Copilot's own persistent session store; Proteus keeps their
IDs, event history, schedule snapshots, and measured usage locally. Cross-provider context transfer
is not implemented. Permission requests are interactive; unattended tool approval profiles are
not yet implemented.

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
```

The UI smoke test opens two temporary desktop sessions and verifies cron edits, persisted files,
feedback, restart/resume, and an interactive browser. It uses isolated temporary data and a
rehearsal provider. The core suite covers DST behavior, unsafe paths, external edits, duplicate
schedule occurrences, recovery, paused imports, and loopback authentication.

See [architecture](docs/architecture.md) and [provider interface](docs/providers.md).
