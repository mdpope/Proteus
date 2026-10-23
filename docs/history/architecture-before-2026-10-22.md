# Historical architecture notes (before October 22 stabilization)

These notes contain superseded queued descriptions. For current implementation, see [architecture](../architecture.md).

# Architecture

**Queued supervised self-update — BF-2026-10-19-21:** add explicit runtime identity, a durable
update checkpoint and a narrowly scoped independent helper/verifier that survives app shutdown.
The current Electron-owned service aborts turns on quit; its scheduler worker is not a daemon.
After exact-artifact installation and verified startup under the sole runner lock, automatically
claim the authorized continuation in the original chat/provider session without replaying earlier
effects or requiring Continue. Successful compatible rollback must also resume that chat; preserve
handoff claims independently of restored data and test the recovery build's continuation boundary.
Keep update health/recovery independent of model availability. A later independently hosted runner
is optional; helper/handoff design does not require a second live runner. See the queued proposal
in [desktop updates](desktop-updates.md#queued-self-update-and-chat-continuation--bf-2026-10-19-21).
No helper, self-update tool or automatic continuation is implemented by this intake.

**Queued native desktop broker — BF-2026-10-19-22:** app/window-scoped native observation/input
is separate from embedded browser control. The operator selects Cua Driver primary and Peekaboo
as an on-demand Mac fallback, with Linux branch support through Cua and capability-gated Windows.
Use a compact stable tool catalog/wrapper and lazy backend runtimes under one host authorization/
target/control boundary across chats, internal tools, MCP and UI. Switch only after fresh observation
and resolution of uncertain prior effects; never duplicate an action or bypass a denied scope.
Separate schema/context loading, runtime lifetime and permission; stopping a backend cannot remove
already-read tool results from model history. Verify actual provider image delivery and visible
readiness/Stop controls. Exact package pins and integration are pending. This may support
BF-21's UI verification without making deterministic update recovery depend on a model/UI grant.
No backend installation or desktop-control tool is introduced by this queue-only review.

**Queued multiwindow boundary — BF-2026-10-19-11:** keep one host-owned service/runner per app-data
home while adding independently identified presentation windows. Route IPC, approvals, browser/
terminal/viewer surfaces and commands to the owning window; persist independent geometry,
navigation and view positions without renderer saves overwriting peers. Explicit window Close
and app Quit have different restoration semantics. This is next-release design scope, not an
implemented second service or permission change; see [planned updates](planned-updates.md).

The opt-in desktop design preview uses the same boundaries with a separate data root and app
identity. `desktop/preview-runtime.cjs` initializes only a fresh marked profile; `src/desktop-preview.js`
owns experimental projects and discovery registrations. `public/shared/navigation/desktop-preview.js` and
`public/shared/navigation/preview-permissions.js` gate presentation on the authenticated preview flag. Normal servers
do not expose preview mutation routes. See [desktop preview](desktop-preview.md).

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

The runner serializes AI execution and takes a process lock for its data directory. Allowlisted Omi native jobs have independent per-job execution lanes and still use native worker locks. A saved run
claims a scheduled occurrence even if the process stops before the scheduler journal is saved.
Restart marks active work interrupted. Catch-up coalesces missed occurrences to at most one new
run per schedule. Already-active schedules skip overlapping occurrences.

Module map: [agent handoff](handoff.md). Rationale: [design decisions](decisions.md).
Remaining work: [backlog](planned-updates.md). Live capabilities: [providers](providers.md).

General computer diagnostics use an independent worker-owned rotating SQLite log store with
summary cursor pages and on-demand redacted details. Notifications/preferences/account outbox
remain separate; diagnostic retention cannot expire execution receipts. See [logs](logs.md).

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

Copilot, Codex and Claude implement the same event, input, approval, cancellation and persistence boundary, with provider-specific capabilities and explicit unsupported-feature errors. Model catalogs are keyed by provider. OAuth recovery is a host command separate from model turns; the provider owns token storage and its Mac loopback callback. See `mcp-auth.md` for remote-client behavior.

The Omi adapter is opt-in and disabled by default. It bridges existing installed worker commands,
not recording transport or Bluetooth. Native ownership and the persisted execution gate are
checked on every run, including saved/resumed runs. Omi and Life occupy persistent, independent
feature tabs, so opening them does not repurpose the schedules or chat tabs.

Life is opt-in and absent from navigation before setup. Native desktop and mobile screens use the
same authenticated website API, independent of the selected execution Mac. The desktop service
keeps OAuth credentials in main-process protected storage; its renderer receives scoped record
DTOs, never tokens, database credentials or arbitrary SQL. PKCE, account/workspace binding,
serialized refresh and draft identity guards preserve account boundaries. Website-only migrations
require verified recovery and preserve immutable nutrition versions. Existing direct-database
configuration is privately archived without opening it; there is no SQL fallback. Database admin
code is separate from the app runtime, and no Life account tokens travel through the Mac relay.

Markdown creation is bound to configured workspace roots, revalidated for every operation. The
folder picker rejects escaping links and traversal, creates files exclusively, and bounds reads.
Native browser views are hidden while application dialogs are open.
