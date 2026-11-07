# Schedule tool configuration

## Installed Nov 3 behavior and workaround

`read` reports saved configuration, not the resolved run configuration. Missing
`executionPermissions` means no explicit schedule override. Empty saved MCP/source lists
do not prove that the next run has no tools or instructions: preflight resolves inherited
sources. Use a fresh `read.revision` for operations; Nov 3 list hashes also include display
metadata and therefore differ from the stored revision.

Supported `changes` example (replace placeholders with exact owner-local values):

```json
{
  "executionPermissions": {
    "mode": "custom",
    "readOnlyTools": false,
    "folders": [
      {"path": "/absolute/input", "access": "read"},
      {"path": "/absolute/output", "access": "read-write"}
    ],
    "rules": [
      {"kind": "mcp", "server": "workflow", "tool": "lookup", "action": "read"},
      {"kind": "custom-tool", "tool": "tool_name", "action": "read"},
      {"kind": "shell", "command": "complete exact non-secret command"}
    ]
  },
  "workspaceSources": [
    {"workspaceId": "owner-workspace-id", "categories": ["instructions", "skills", "mcps"]}
  ]
}
```

`custom` uses saved rules; `ask` requires human tool approval. The tool rejects
`autopilot`, wildcard tool/server/action rules and interpreter-wide shell grants.
Folder access is `read` or `read-write`; it does not approve shell commands. Paths are
absolute and explicit grants are canonicalized at save. Never put credentials in rules.
MCP action must match the actual operation when it supplies an action argument.
URL rules use `{"kind":"url","origin":"https://example.invalid"}`.

Workspace categories are `folders`, `permissions`, `instructions`, `agents`, `skills`,
`mcps`. Categories are independent: folders add execution roots; permissions import that
workspace's permission profile. A schedule grant is not ownership of the workspace.
Permission edits/imports require the exact `schedule-configure-permissions` scope.

Updates require `settingsScope:"future-runs"` and the fresh revision. Explicit nested
objects/arrays are replaced, so retain existing fields when changing them. The effective
profile still merges inherited grants; empty explicit arrays do not revoke inherited grants.
Enabled state, unknown schedule fields, existing runs and history remain intact.

For a schedule with `source.manifest`, update its canonical workflow and reconcile its
export. Tool update is intentionally blocked. The documented CLI `validate` / `refresh`
workflow retains history but imports updates paused; it does not preserve enabled state.
Workflow owners must handle that explicitly. Do not raw-edit captured runs.

On Nov 3, obtain source IDs/kinds from the owner's Workspaces source picker. The tool has
no catalog action. `contextSelection` takes `selectedIds`, `includeDefaults` and optional
`agentId` (null clears it). `refresh-sources`, fresh revision, and `future-runs` rescans
sources and saves the selection; read again before preflight. It does not list available
IDs or change old run snapshots. Refreshing referenced workspace catalogs should be
performed through the owner's workspace refresh control when necessary.

## Nov 5 source implementation — not installed

- `read` retains saved fields and adds `workspace`, explicit permissions (null when inherited),
  and `resolved`: source metadata, resolved MCP names, workspace references, working folders,
  read-only boundaries and the current effective permission profile. Resolution failure leaves
  the saved record readable; preflight supplies diagnostics. Legacy top-level MCP availability
  describes saved owner definitions; managed MCPs are selected using source IDs.
- `sources` requires schedule-read and pages source metadata for the base catalog and already
  referenced workspaces. It returns IDs, kinds, paths and modes, never source text or MCP
  environment/command definitions. Use limit/cursor and restart after catalog changes. It is
  not authority to enumerate unrelated workspaces. Obtain a new workspace reference through
  the owner's workspace picker.
- `preview` requires schedule-test, future-runs scope and expectedRevision. It accepts the same
  changes and permission constraints as update, resolves and validates them, and returns
  `applied:false` without saving, enabling or starting anything. Permission changes require
  schedule-configure-permissions even during preview. Source-managed schedules can be previewed
  while remaining protected from tool writes. This does not validate an external workflow's export.
- Preflight includes the resolved configuration. New manual test receipts persist its start-time
  configuration for status/retry inspection. Old runs report null for this additional snapshot;
  no historical permission evidence is fabricated. The snapshot records preflight policy, not
  proof of all runtime grants: owner policy can change and protected requests can still prompt.
- List returns the stored schedule revision, matching read, instead of hashing display metadata.

For acceptance, start-test with a stable UUID and fresh revision; retain task/run IDs, inspect
status for the exact run, captured model/source hashes and start configuration, and verify the
workflow's actual output separately. Completion means a model turn completed, not that the
external workflow succeeded. Do not answer pending approvals or stop unrelated runs.

Build/deployment hold remains. Synthetic source tests cannot establish real unattended organization workflows
execution; the workflow owner owns that acceptance after supported configuration is applied.

## Additional confirmed installed limits

CLI refresh takes only an export file, validates exported schedule JSON and matching source
identity, captures the save revision internally, and always pauses. It does not accept the
caller's expected revision or validate the foreign manifest. The local schedule editor can save
the exported record with a revision check and retain enabled state, but is not a source-provenance
reconciler. The remote editor rejects source-managed changes. Source-aware reconciliation with
caller revision, manifest/export evidence and enabled/history preservation is now implemented in source as P7, described below.

The Codex adapter currently uses native untrusted command approval and disables network access.
Native trusted reads may run without a prompt; variable shell execution does not inherit approval
from filesystem grants. Custom exact rules cannot guarantee unattended synthesis. The existing
managed profile also permits broad read access, so listed workspace roots must not be described
as a complete read-isolation boundary. A separately authorized and enforced workflow execution
profile is now implemented in source as P8, described below. It is not installed.

P6 validation originally passed ten focused tests and 1,542 full-suite tests. The final P6–P10
suite passes 1,548 tests/four skip/zero fail using a short canonical temporary root; static checks
pass. Default-temp failures (11) reproduce on unchanged Nov 3 source. Native synthetic sandbox
and MCP-catalog probes also pass; neither starts a model turn.


## New scoped controls — source only, build held

### Reconcile a workflow export

Use a fresh read.revision and settingsScope future-runs. preview-reconcile requires schedule-test
and schedule-configure-permissions plus:

    sourceExport:
      exportPath: /absolute/path/inside/current/working/folders/export.json
      exportSha256: SHA-256 of the exact export bytes
      manifestSha256: SHA-256 of the current source.manifest bytes

The export may be a single schedule or array with exactly one matching ID. Ownership fields must
match. Proteus validates the exported schema and hashes; the workflow owner validates its foreign
manifest. No exporter runs. Preview returns planDigest; reconcile requires schedule-update,
schedule-configure-permissions, that digest, the same revision/evidence, and a stable operationId.
It preserves current enabled state, unknown fields and all prior runs. Reuse identical operation
arguments after uncertain delivery; conflicting current state requires review. Existing native
service protections remain. Do not point exportPath at credential files.

### Configure scoped Codex commands

Add this explicit field to the existing future-run executionPermissions object:

```json
{
  "executionPermissions": {
    "mode": "custom",
    "readOnlyTools": true,
    "sandboxedCommands": true,
    "folders": [
      {"path": "/absolute/working/directory", "access": "read"},
      {"path": "/absolute/output/directory", "access": "read-write"}
    ],
    "rules": []
  }
}
```

The working directory must be covered. Add only required input, output, runtime and scratch
directories. Arrays/objects retain the replacement semantics above. Other providers are rejected.
The native profile denies filesystem-root and ambient temp access; minimal public runtime reads
remain (including the macOS public OpenSSL configuration). Network stays disabled for commands.
Use separately authorized connector tools for research. Each selected MCP server can connect when
readOnlyTools is true or a named tool on that server is explicitly granted. Native Codex calls
use the connected server's actual thread-scoped tool catalog: readOnlyHint must be true and
destructiveHint must not be true. Missing/ambiguous annotations, discovery failures and unknown
tools cannot gain read-only authorization. Writes still require exact rules or human approval.
The native catalog probe verifies this against a synthetic server without a model turn.
This does not grant credential-manager access, network shell commands or sandbox escape.

Native on-request approval permits variable commands inside the profile. A request outside the
profile can still stop for human approval; this feature does not answer it. The scope must cover
the complete intended workflow to run unattended. The real Mac probe validates filesystem and
network denial without a model turn. Real workflow completion and other-platform acceptance
remain separate.

### Rescan and recapture

Schedule refresh-catalog takes the exact schedule and expectedRevision with schedule-refresh
scope. It rescans the base and referenced workspace catalogs without changing schedule settings
or existing run snapshots. refresh-sources also uses that actual rescan. Catalog sharing no longer
retains an old hash merely because another discovery root references the same source.

For an unsent ordinary create, proteus_chats recapture takes taskId and a stable new operationId.
It uses the original task's host, project, provider, prompt and selected sources. Existing dispatch
authority must still apply, and the owner must advertise chat.recapture.v1. The owner requires its
settled source-hash rejection for the original command. Missing/pending/successful receipts and
update/build/attachment creates are not eligible. This is not a new create with guessed identity.
The original journal record remains; a logical-create claim prevents duplicate delivery, including
a lost recapture response. A crash leaving that claim pending requires review. No pending tool
approval is answered. Ordinary retry continues to replay its original receipt.

Status now honors limit and cursor, sorts newest createdAt first with an ID tie-break, and rejects
paging against a changed history. Inspect the specific runId for pending approval details.

### Installed acceptance remains outstanding

The workflow owner reports successful managed connector reads and passing workflow source tests;
native startup approval still blocks its planning fixture. Existing enabled schedules and provider
settings are untouched. Acceptance after an authorized installation requires an actual source
rescan, revision-checked reconciliation preserving enabled state/history, a complete Codex workflow
without permission prompts, and a second run with no new evidence. Verify artifacts and external
effects separately from model completion. Nov 3 closeout and the existing build hold still gate
an installable release; these source changes are not an installation receipt.
