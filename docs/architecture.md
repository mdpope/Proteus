# Architecture

Proteus has four boundaries: file-backed schedules, the runner, provider adapters, and clients.
The scheduler has no model API knowledge. The desktop UI and VS Code companion use an authenticated
loopback service. The Electron host stays in the menu bar when its window closes. Native iPhone/iPad clients connect through an encrypted relay protocol; see `remote.md`.

The Electron shell hosts the trusted local interface and a separate sandboxed WebContentsView
for remote browsing. Remote content never receives the app preload bridge. URLs in the app shell
stay on its own origin; the browser only permits HTTP(S). User browser permissions are denied by
default in this prototype. A browser must remain able to display authentication and hand control
to its user before it can be used for scheduled authenticated workflows.

Schedule files are portable definitions with host-resolved workspace directories. The UI validates
before saving and uses a revision hash to reject overwriting edits made by an editor or AI agent.
Unknown fields survive a form edit. A run snapshots the schedule and is bound to its provider
session ID. Resume reuses that ID and reapplies directories and tools; it does not follow a newly
edited schedule accidentally. An explicit idle-chat context refresh preserves the initial schedule
and prior context snapshots before replacing the effective context for the next turn.

The runner serializes execution and takes a process lock for its data directory. A saved run
claims a scheduled occurrence even if the process stops before the scheduler journal is saved.
Restart marks active work interrupted. Catch-up coalesces missed occurrences to at most one new
run per schedule. Already-active schedules skip overlapping occurrences.

Module map: [agent handoff](handoff.md). Rationale: [design decisions](decisions.md).
Remaining work: [backlog](planned-updates.md). Live capabilities: [providers](providers.md).

The initial app deliberately owns its generic schemas, templates, and client implementation.
Operating-system repositories own their own schedules, workflow policy, and durable knowledge.
Neither side imports the other's private operational content into its source repository.

Embedded Playwright uses a per-tab Electron debugger bridge. Only the browser broker can select
targets; provider tools cannot access the app window or arbitrary CDP methods. See `browser.md`.
Settings defaults are captured into each new chat/schedule. Parallel provider permission requests
are queued and shown one at a time; cancellation rejects both visible and queued requests.

Managed context discovery and exact source snapshots sit above provider adapters. Copilot automatic
configuration/instruction loading is disabled for managed sessions; selected sources are supplied
explicitly. Context changes cold-reconnect the provider for reliable MCP removal. The credential
broker is a separate main-process boundary and has no agent/API entry point. See `workspaces.md`
and `credentials.md` for persistence and authentication details.

Remote access is opt-in. A relay can run locally, in Docker, or behind TLS on Linux. Only the Mac
host executes tools and owns persistence. iOS uses a Keychain device credential, encrypted cache,
versioned edits, deduplicated mutation IDs, and replay/snapshot recovery. Relay routes carry no
provider credentials. Desktop IPC and the credential broker remain inaccessible to remote clients.
