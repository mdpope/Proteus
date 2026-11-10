# Durable workflow access and provider portability — v1

Nov 8 source implementation; installed acceptance is tracked separately in the release record.
HC installed 0.2.44 acceptance confirms provider selection/reconciliation and managed readiness,
but has not executed the command fixture: Copilot is waiting at explicit command identity consent.
The installed Codex MCP transport adds a redundant outer approval, and Claude's prefixed owner
tool name misses the unprefixed exact action rule. These are adapter defects corrected in later
source, not reasons to add broad trust or approve another run. Claude normalization is limited
to captured tools on this run's owner bridge. Codex transport acceptance executes nothing: each
invocation still reaches host identity consent, revocation, owner and sandbox checks.
The agent schema now describes all three adapters and their verified destination requirement.
Desktop runtime packages intentionally omit `docs/`; the versioned schemas ship in the package,
and this contract is available in the corresponding source companion. Its absence from the app
bundle does not establish a schema or runtime failure.

The installed Work Mac 0.2.43 adapters have **no qualified equivalent workaround** for a scoped
Codex schedule. Removing `sandboxedCommands` is not a supported migration: exact command
approval and a working directory do not enforce filesystem, network or child-process boundaries.

## Supported contract

A schedule keeps its canonical workflow intent plus two owner-owned fields:

- `accessOverlay: {version:1,binding:SHA256,grants:[...],managedBindings?:[...]}`;
  see `schemas/schedule-access-overlay.schema.json`.
- `ownerSelectionOverride: {version:1,source:{system,manifest},selection,baseSelection}`;
  see `schemas/schedule-owner-selection-override.schema.json`.

Each access grant has a UUID, approvedAt, optional revokedAt, and exactly one of folder,
rule, command or commandScope. Only the explicit **Allow for this schedule** choice saves
access automatically. Allow once and Deny do not. Ask stays Ask for every unmatched action;
saved schedule grants authorize only their matching operations. A schedule grant does not
change workspace defaults or approve a pending request in another run.

Folder grants pin resolved paths. MCP/custom-tool rules pin selected server/tool/action;
URL rules pin an origin. These operation grants cover the operation's arguments, not an
argument-specific mutation consent. Protected owner operations keep their independent gates.
Managed selections also pin logical name, connectionId, ownerId, workspaceId and configurationRevision.
The shared managed broker checks these pins for every provider. Credentials, prompts, request
payloads and tool results are never stored in the overlay.

Scoped workflows retain `executionPermissions.sandboxedCommands:true`, custom mode and narrow
explicit folder grants. All three provider adapters expose `proteus_exec` and disable their
native shell escape paths for that schedule. The tool accepts UUID operationId, argv, optional
source inputs and a bounded timeout; cwd is captured, environment is sanitized, no shell expansion
is performed. Exact consent pins executable bytes, argv hash, resolved cwd, policy hash and a
bounded source and dependency-manifest identity. Changed executable, command, source or policy needs new consent.
An optional, separate **Allow command variations within this schedule's sandbox** choice permits
varying commands within the same reviewed OS policy and source identity. It is never inferred from
an old shell rule or folder grant. Dynamic planning can use this explicit bounded authority; it
does not imply network, credential-service or arbitrary filesystem access.

Receipts retain a hash of arguments and bounded output, not raw arguments or environment.
A repeated completed operation returns its receipt. An uncertain invocation is not rerun under
another ID automatically. Tools expire with their active turn. Revoking a dependent overlay grant
aborts its active command/process group and is checked before subsequent operations. Historical
captured configuration and consent evidence remain intact; revocation is not retroactive deletion.

## Enforcement and qualification

| Provider | Scoped provider file tools | Schedule commands | Qualified evidence |
| --- | --- | --- | --- |
| Codex | Existing native restrictive profile and owner gates retained | Host `proteus_exec`; native shell/unified_exec disabled | Actual Mac native profile probe and native model run |
| Copilot | Owner permission gates; selected tool catalog; native shell/task guards | Same host executor | Actual Mac native model run |
| Claude | Mandatory owner hooks; selected-agent/MCP filters; native shell/delegation/network bypasses disabled | Same host executor; eager scoped MCP catalog | Actual Mac native model run |

The macOS executor uses a default-deny OS sandbox, narrow public toolchain reads, explicit folder
partitions, protected metadata write denial, denied network/credential IPC and a clean environment.
Child processes inherit this policy. Admission runs a synthetic filesystem/symlink/network boundary
probe; failure rejects without weakening the policy. Linux/Windows have the native restrictive CLI
backend path but **no destination-native acceptance in this iteration**. Qualification must succeed
there before claiming support. POSIX cancellation targets the launched process group; it is not a
claim of hostile-process containment beyond the inherited OS policy.

On Build Mac, actual catalog-selected Codex, Copilot and Claude model turns processed a nonempty
synthetic Python inbox (two records, count 2, total 10) and attached a read-only synthetic named
managed MCP bridge without prompts under preapproved identity consent. Replay/artifact validation,
first-run explicit consent reuse across providers, scoped command variation and active revocation
also have separate source/native tests. These are synthetic fixtures, **not HC business inbox,
planning/digest, authentication or installed-package acceptance**.

## Source reconciliation and migration

The owner overlay and provider selection override are not exporter-owned. Reconciliation ignores
exported replacements, preserves enabled state, unknown owner fields and histories, and reapplies
the owner provider/model after checking canonical system/manifest identity. `baseSelection` updates
to the latest canonical selection; clearing the override restores that latest selection. Resource
selection changes invalidate the access binding for review. Export timestamps/hash bookkeeping do
not. Provider/model changes alone do not widen authority or invalidate grants. In-flight runs keep
their captured provider/model; active access revocation remains enforced.

Supported migration after an independently accepted package on the destination:

1. Keep canonical folders, named managed bindings and `sandboxedCommands:true`; do not remove the
   flag or substitute broad trust. Preview current manifest/export hashes and revision if changing
   the workflow itself.
2. Refresh the **destination** provider catalog and choose its model and supported options. UI/API
   selection creates the owner override; agent schedule update uses future-runs scope and the
   expected revision. Do not carry Codex-only effort/context/speed values into another provider.
3. Preview effective capability resolution. A failed probe/save leaves the prior live configuration
   and the unsaved draft intact. Save only the reviewed provider selection.
4. Guide a manual first run. Approve the exact additional resources with Allow for this schedule;
   use the separate command-variation choice only if that reviewed scope is intended. Inspect
   produced artifacts and replay unchanged evidence before enabling unattended recurrence.
5. Reconcile and restart, then verify owner override, grants, enabled state and histories remain.
   Run representative synthesis/MCP workflows separately; an inbox pass is not their acceptance.

No live HC schedule/provider/permission/manifest edit or HC deployment was performed by this source
work. organization workflows can adopt the schemas while keeping its source-owned selection as the canonical fallback.
Do not manufacture an overlay in an exporter: consent is saved by the owner only.

## Review, revocation and errors

The schedule's saved-access panel lists active/revoked grants and its owner override. Authenticated
POST `/api/schedule-access/revoke` takes scheduleId/grantId/expectedRevision. POST
`/api/schedule-selection` with action `clear-owner-override` takes scheduleId/expectedRevision.
POST `/api/schedule-capabilities` resolves required restrictions and qualifies the host backend;
authorized remote `schedule.capabilities` uses the saved schedule plus selected provider.

Configuration, preview, preflight and reconciliation failures record durable silent ERROR events
with schedule/action/time/code/correlation. Retry failures deduplicate while unread. Known bounded
reasons are stored instead of arbitrary exceptions, prompts or arguments. Desktop errors are red
inline alerts; the draft survives. Local Notification Center persistence/dedup/restart has actual
Electron acceptance; the web API regression preserves severity/correlation and owner isolation.
Physical mobile/production account-forwarded presentation remains installed acceptance work.
