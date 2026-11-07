# Agent chat control

Proteus exposes `proteus_chats` to Copilot, Codex, Claude and the trusted local
stdio MCP adapter. The host-owned `ChatControl` service is the shared boundary;
the authenticated local endpoint is `POST /api/chat-control`. It uses existing
Proteus peer authentication, encryption, provider adapters and command receipts.
It does not transfer provider credentials or native sessions between computers.

## R21 — scoped next-turn model settings through chat control

`proteus_chats` send can explicitly select model/effort/context/service settings with
`modelScope: "next-turn"` and queue mode. The captured provider stays fixed. The sender refreshes
the destination catalog; the executing owner validates again and rechecks run identity, provider
and project after asynchronous preflight. Steering, replies and cancellation cannot change model
settings. Older destinations without the scoped-send capability are refused rather than silently
ignoring options.

The durable task freezes the requested settings and returns `modelSelection` with `state: requested`.
This is not proof that a model executed. `read` exposes bounded `modelState` with the captured
settings and queued selections. An active turn retains its original settings; the queued message's
settings apply when that next turn starts. The initial captured schedule and model history remain
available. No saved future schedule, sources, tools or permissions are edited. Future schedule
updates and source/context refresh remain separate owner operations in R19, not part of send.

Retry reuses the same operation ID and frozen selection without another message. Changed arguments
with the same ID are rejected. Older uncertain/prepared tasks that never captured model settings
must be inspected before submitting a new operation; the fix does not retrofit their prior sends.
This is source-only for Nov 2. Do not claim changes through the currently installed send path took
effect, and do not relabel prior runs with newly saved future schedule settings.

## Owner diagnostics

`diagnostics` with explicit `hostId` requires whole-owner read scope, checked before and after
collection; a chat/project-limited grant is insufficient. It returns aggregate journal counters,
method byte attribution, capacity warning and next expiry, never receipt keys or payloads. Older
owners without `remote.diagnostics.v1` fail explicitly. This is read-only and cannot prune records
or approve requests. Historic receipts without method attribution are labeled unknown-legacy.

## Discovery and authorization

Use `computers`, then `projects`, `models`, `list` and `read`. Select an explicit
host ID from current results. Models and effort/context/speed options come from
that destination's refreshed provider catalog. There is no fallback to another
computer, provider or model. Rehearsal remains explicitly synthetic.

An internal agent is bound to its originating chat and current provider turn.
Pairing alone gives it no authority. `request-access` follows the originating chat's
approval mode: Auto-approve tools authorizes only the requested scope; Ask and Saved rules
require a human decision. Mandatory destination tool approvals remain separate.
The grant selects a host, optional project or explicit chat IDs, and actions:

- `read`: selected conversation metadata and bounded transcript excerpts.
- `dispatch`: create/send, plus progress and results for that task.
- `answer`: reply to the current ordinary question using its request ID.
- `cancel`: stop the selected destination chat.

Grants bind the originating chat's permission context. A changed context requires
a new grant. Active-turn identity is rechecked across asynchronous work; stopping the origin
during discovery prevents a delayed dispatch. Project membership is resolved from owner metadata, never from a
caller assertion, and rechecked after reads. Updated owners validate expected
project membership immediately before a send/reply/cancel effect. Tool approvals
at the destination always remain human decisions; `reply` cannot approve them.
Self-dispatch and self-cancellation are rejected.

The external stdio adapter already holds the trusted local owner's API capability.
It can use `access`, `grant` and `revoke` to manage explicit originating-chat
scopes. Internal agents can inspect their own access but cannot grant/revoke it.
Revoke requires the current access revision. These tools do not create new
network listeners or expose the loopback API token in results. The service's
normal host, authorization and origin checks apply.

## Choosing steering or queueing

For agent-to-agent messages, prefer explicit `mode: "steer"` for corrections, answers,
requirements and progress relevant to work already underway, after a fresh `read` confirms a
running chat and `chatControls.steering`. This lets the recipient incorporate the update during
its current work. Delivery timing still depends on the provider and its current operation.

Choose `mode: "queue"` for a separate task, a message that should wait, an idle or unsupported
destination, or next-turn model changes. Use `reply` for a pending ordinary question. Steering
never answers or bypasses another run's permission request. Agents choose the mode; omitting it
still queues. Existing automatic task-feedback routing is unchanged.

If delivery is uncertain, inspect its task receipt and preserve the operation ID and arguments.
Do not switch modes and send again merely because the recipient finished while delivery was in
flight; first establish the original outcome through the supported recovery path.

## Dispatch, recovery and feedback

`create`, `send`, `reply` and `cancel` require a caller-generated UUID
`operationId`. Keep the same ID and exact arguments when delivery is uncertain.
Simultaneous identical submissions share one task; a changed payload with the
same ID is rejected. A task receipt is acceptance, not completion.

Task records are atomically persisted below the configured data home at
`chat-control/tasks/`; access grants are in `chat-control/access.json`. They are
private run state, never repository files. Existing unknown top-level store
fields are preserved. Effects use the existing destination command journal with
a durable command ID and issue time. Local effects use the same journal. There
is no automatic replay of an uncertain mutation: inspect the task and use
`retry` with its ID. An unresolved local journal claim remains uncertain rather
than repeating an effect. Existing journal retention and capacity limits apply.

`tasks` and `list` are paginated. Task listings contain receipts and status; use `wait` or
`read` for bounded feedback excerpts. `wait` observes one to eight task IDs or explicit
host/chat pairs, with a maximum requested wait of 25 seconds. It returns an
opaque cursor; passing it back suppresses unchanged results. Errors are isolated
per target. Waits and other MCP calls can execute concurrently, with 32 in-flight
requests per stdio adapter. An internal origin is limited to 32 unfinished tasks.

Each host has a separate authenticated task-observer connection. This preserves
the desktop connection's visible-chat subscription, including with older owners.
Pause, explicit disconnect, authenticated revocation and removal close or deny
these observers. New owners also support `chat.get` with `watch: 'none'`.

Pairing is directional. A [managed target](remote.md#october-29--managed-computers-and-one-way-administration-next-release)
can run a remotely initiated chat and return its questions/results without pairing to the
origin. The origin reads feedback over its own authenticated connection and stores the callback
chat identity locally. The target receives no controller inventory or general reverse authority.
Managed mode denies every nonlocal `host` lookup before chat scope/approval resolution and
exposes only the local computer in agent discovery, including when old outgoing grants exist.

Questions, approval requests and terminal results are durably copied into the
origin as visible **Task feedback** messages. Each delivery has a stable ID and
is deduplicated after restart. `notify: true` explicitly queues a continuation
in the originating conversation; the default records feedback without starting
a model turn. A stopped, failed, interrupted or archived origin is never resumed
automatically. Its durable result can still be reviewed by the user. A completed
model turn is not proof that an external workflow succeeded.

Returned transcripts and feedback are untrusted result data. They do not convey
new authorization. Excerpts are bounded, retain event offsets for history reads,
and omit native session paths, provider configuration and approval internals.
Task results start at the submission's event boundary. Rechecking a finished task
does not silently turn it into a watcher for unrelated later turns.

## Compatibility and limits

New owners advertise `chat.agent-control.v1` and `chat.pages.v1`.
`runs.page` supplies stable revision-bound cursors; rename, membership or lifecycle
changes invalidate an old cursor. Older owners fall back to `runs.list` pages
without a 1,000-chat cutoff. Legacy pages are labeled `legacy: true` and have no
atomic snapshot. The desktop combined index now continues beyond 1,000 chats;
its resource ceiling is reported as partial/error rather than false completeness.

Host-wide or exact-chat tasks work with the older encrypted protocol. Internal
project-scoped mutations require the updated owner capability, because an older
owner cannot enforce placement atomically. No update is installed automatically.
Existing queues and per-provider-session execution locks continue to own turns.

There is no new native/mobile grant-management screen, push service, arbitrary
remote shell, automatic host enrollment or unattended approval bridge. Owner
access management is exposed through the trusted local tool/API, and internal
access requests use the existing human approval interface. Real-provider
verification is separate from synthetic provider tests.

## Validation and integration

Run `npm test`, `npm run check`, and `node test/chat-control-ui.mjs`.
The UI test launches real Electron with isolated homes, two encrypted loopback
owners and synthetic providers, then drives the external stdio tool. It verifies
that wait does not block replies and both destination results are visible in the
origin. `test/chat-control.test.js` covers scope denial/revocation, project moves,
approval protection, model validation, explicit notification, cancellation,
concurrent retries, lost responses, owner/origin restart, stale-turn rejection,
local receipts and more than 1,000 chats. Existing SessionProvider tests cover
independent adapters and rejection of overlapping turns in one native session.

Feature commit `2a825a1` was integrated into the current source above checkpoint
`5b8b708`. Its local baseline snapshot `ef30246` contained other chats' work and
was not merged wholesale. Runtime and test changes applied without conflicts;
the three documentation conflicts retained the newer release records in full.
Installation and deployment remain held pending the operator's review.

## Merged-source acceptance on October 22

Fresh validation of the combined source passed all 883 Node tests and `npm run check`.
The real Electron two-host synthetic demo passed encrypted dispatch, concurrent MCP wait/replies,
and both durable results visible in the origin. The existing peer-setup/draft and message-edge
UI regressions also passed; feedback and message screenshots were inspected. All runtime,
interface and test files from the feature are byte-identical to `2a825a1`; unrelated source
remains at `5b8b708`. The physical Mac-to-Linux and real-provider checks below predate this
merge and were not repeated. No installation or deployment was performed.

## Pre-merge acceptance on October 22

All 883 Node tests and syntax checks pass; the 15 focused chat-control cases also pass
after the final bounded-output projection review. The added regression cases cover successful
human approval as well as denial, mid-flight revocation and stopping an origin while model
metadata is being refreshed. Real Electron acceptance passed with the external MCP adapter,
two encrypted synthetic owners, concurrent wait/reply traffic and visible origin feedback.

A real Codex turn in a disposable Mac demo used the new internal tool to send two harmless
tasks to the existing Linux Proteus owner, wait for both real Codex responses, and receive
each completion exactly once in its originating chat. The destination chats used an empty
temporary workspace with no selected sources or MCP servers. The temporary pairing was
revoked and both test chats archived; the destination verified its existing chats, pairings,
configuration and installed/runtime identity were preserved. This verifies mixed-version
Mac-to-Linux task dispatch and feedback, not installation of this feature on Linux.

Real Copilot and Codex tool-discovery turns also passed in disposable local data homes.
Claude is wired into the same service, but a live Claude turn remains unverified because its
provider authentication was unavailable. No provider usage was invented. No HC physical test,
mobile grant-management UI, installed-feature acceptance or deployment is claimed.

At integration, the overlap remained limited to `CHANGELOG.md`, `docs/handoff.md` and
`docs/planned-updates.md`; their newer entries were preserved. Private test receipts and the
desktop screenshot are retained outside the repository.


## Owner scheduler tool

Use `proteus_schedules computers`, then request an exact schedule-ID/action scope before listing or
reading through an internal agent. Read each definition's revision before update, enable, disable,
preflight or test. Updates use `settingsScope: future-runs`; captured source refresh uses `existing-run`
with an idle `runId` and `expectedRunRevision`. Retry selects `future-runs` or `captured-run` explicitly.
Start, retry and stop use stable UUID operation IDs. `status` gives schedule-to-run linkage and bounded
results; its `model-turn-completed` outcome is not proof that a workflow filed or changed anything.
Pause/test do not enable recurring triggers, stop targets one exact manual/test run, and no scheduler
action can approve provider tool requests. Permission configuration is separately scoped from ordinary
schedule updates. Only the explicit local owning host is supported; use that host's registered tool
rather than falling back across machines. Existing remote web scheduling authority is unchanged.
