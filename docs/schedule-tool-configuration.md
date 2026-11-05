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
caller revision, manifest/export evidence and enabled/history preservation is queued as P7.

The Codex adapter currently uses native untrusted command approval and disables network access.
Native trusted reads may run without a prompt; variable shell execution does not inherit approval
from filesystem grants. Custom exact rules cannot guarantee unattended synthesis. The existing
managed profile also permits broad read access, so listed workspace roots must not be described
as a complete read-isolation boundary. A separately authorized and enforced workflow execution
profile is queued as P8; no new approval mode is installed or implemented in P6.

Validation: ten focused tests pass; full suite 1,542 pass/four skip with a short canonical temporary
root; static checks pass. Default-temp failures (11) reproduce on unchanged Nov 3 source.
