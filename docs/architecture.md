# Architecture

Proteus has four boundaries: file-backed schedules, the runner, provider adapters, and clients.
The scheduler has no model API knowledge. The desktop UI and VS Code companion use an authenticated
loopback service. A future service mode can keep that runner alive independently of both clients.

The Electron shell hosts the trusted local interface and a separate sandboxed WebContentsView
for remote browsing. Remote content never receives the app preload bridge. URLs in the app shell
stay on its own origin; the browser only permits HTTP(S). User browser permissions are denied by
default in this prototype. A browser must remain able to display authentication and hand control
to its user before it can be used for scheduled authenticated workflows.

Schedule files are portable definitions with host-resolved workspace directories. The UI validates
before saving and uses a revision hash to reject overwriting edits made by an editor or AI agent.
Unknown fields survive a form edit. A run snapshots the schedule and is bound to its provider
session ID. Resume reuses that ID and reapplies directories and tools; it does not follow a newly
edited schedule accidentally.

The runner serializes execution and takes a process lock for its data directory. A saved run
claims a scheduled occurrence even if the process stops before the scheduler journal is saved.
Restart marks active work interrupted. Catch-up coalesces missed occurrences to at most one new
run per schedule. Already-active schedules skip overlapping occurrences.

## Next milestones

1. Installable macOS background service with a separately restartable desktop client.
2. Explicit unattended permission profiles and workflow completion validators.
3. A browser broker with profile ownership, a human/agent control toggle, and scoped Playwright MCP.
4. Packaged VS Code companion, workspace picker, and active-file attachments.
5. Additional provider adapters; capability-aware model, usage, and session handling.
6. A paginated run store as history grows; notifications and usage budgets.

The initial app deliberately owns its generic schemas, templates, and client implementation.
Operating-system repositories own their own schedules, workflow policy, and durable knowledge.
Neither side imports the other's private operational content into its source repository.
