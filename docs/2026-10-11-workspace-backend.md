# Workspace foundations — October 11 implementation handoff

Implemented in source; release installation evidence belongs in the release ledger.
Workspaces supersedes the separate Projects proposal. Each context store belongs to one
execution host; remote requests always address that owner through the existing paired transport.

## Configuration and API

`context.json` keeps schema version 1 for existing consumers, adds
`workspaceConfigurationVersion: 1`, and preserves each stable workspace ID. Migration captures
legacy global library/source policy into independent workspace fields and keeps a
`context.json.before-workspaces` recovery copy. Unknown fields are preserved.

Each workspace retains `id`, `name`, `cwd`, `additionalDirectories` and owns:
`libraryFolders`, `universalFolders`, `documents`, `workspaceFiles`, `modes`, `favorites`,
`defaults`, `discovery`, `approvals`. `defaults` includes existing source selection fields and
optional provider/model options. No feature enable/disable switches were introduced.

`GET /api/context?workspaceId=…` and paired `context.get {workspaceId}` return a scoped catalog:
all workspace profiles, the selected workspace's source-policy projection, metadata entries,
revision and per-root discovery status. Omitting the workspace selects the owner default.
Legacy top-level mutation callers continue to edit the default workspace's projection.

`POST /api/context` and paired `context.update` take `action`, `workspaceId`, `expectedRevision`:

- Existing source mode/favorite, library/regular folder, universal folder, document, import,
  starting-folder/default and workspace creation actions remain available.
- `save-workspace`: `configuration` is a partial object with workspace configuration fields.
- `copy-workspace`: `name` creates a new stable identity and returns `copiedWorkspaceId`.
  Local copies retain the complete configuration, approval templates and existing permission
  profiles, as explicitly authorized by the operator. Subsequent changes are independent.
- `import-workspace`: `name`, source `configuration`, source catalog metadata `entries`, and
  `pathMappings: [{from,to}]` create a workspace on the receiving host. Every source root must
  map to an existing owner-host folder. Source IDs are recomputed from target canonical paths.
  Existing chats, credentials, running terminals and browser profiles are never copied.
  Cross-host grants reset to Ask for review; same-host copy retains them.

Paired `context.mode` and `context.favorite` accept `workspaceId`. All changes retain the
existing revision conflict guard. Native folder selection is owner-local; remote clients may
submit an owner path for validation without opening an unrelated client-side folder picker.

`POST /api/context/refresh` and paired `context.refresh` accept `{workspaceId,root?}`. A
single-root refresh retains other roots' entries, errors and timestamps. `rootStatus[path]`
contains `refreshedAt`, `scannedFolders`, `partial`, and applied exclusions. Scan budgets reset
per root; configured exclusion names and relative `*`/`**` patterns prune traversal. Shared
root scans include the union needed by its owning profiles, while scoped catalog projection
applies that workspace's exclusions. HTTP startup/refresh/structural-save scans run in a worker
thread. Mode, favorite, defaults and approval changes do not scan the filesystem.

New chats inherit workspace source defaults. Before later turns, chats following their workspace
capture changed workspace configuration, retaining earlier snapshots and conversation history.
Explicit chat selections remain explicit. Active provider turns retain their captured context;
approval decisions read current rules. Provider model/effort availability continues to use the
existing provider catalog validation.

## Permissions

Permission identity adds stable `workspaceId` to the existing provider/canonical-root/integration
fingerprint. Existing permission profiles migrate once into their existing workspaces. Copies
get independent profiles; sharing a path alone does not share new grants.

`POST /api/permissions` supports `grant-chat-folder` and `revoke-chat-folder` with `runId`,
absolute owner `folder`, grant `access` (`read` or `read-write`), `expectedContextId`, and
`expectedChatRevision`. Paired `chat.permissions` uses the same action and `id` for the run.
Effective permission details expose `chatFolders`, `workspaceFolders`, and combined `folders`.
Grants persist in the chat record and apply recursively; canonical-path checks reject symlink
escapes. Revocation requires the current chat revision. A chat folder exception does not
reactivate workspace grants or shell rules suspended by Ask mode. Pending file approvals also
include an explicit chat-only folder choice. Enterprise/sandbox-required approvals stay direct.

The shared details view renders grant/revoke controls. Local callers bind
`bindChatFolderTrust(root,{run,request,pick,refresh,notify})`; `request` receives the local payload.
`bindRemoteDetails` supplies paired transport automatically.

## Navigation persistence and sync

Desktop session normalization preserves workspace shells, `workspacePage`, hidden shells and
children, run aliases with the real `runId`, and selected workspace child IDs. Main and workspace
representations retain one chat identity. Shared chat indexes expose stable `workspaceId` and
human-readable `workspaceName` separately.

`tabs.get` / `tabs.mutate` and `/api/content-tabs` accept `scope: workspace`, `id: workspaceId`.
Workspace descriptors support browser, document, chat and terminal. Chat descriptor IDs normalize
to `chat:<chatId>` and owner membership is checked before opening. Terminal descriptors contain
only host session identity/title; no commands or output are transported. Local terminals reconnect
through existing host APIs; another host displays an owner-only notice rather than invoking its
local terminal bridge. Browser cookies/profile credentials remain local.

Local workspace document descriptors resolve through a private source registry, never a path
in the shared descriptor. Chat-associated remote documents use existing document consent.
Workspace documents without a chat association remain owner-only; the remote view explains how
to attach one to a workspace chat for approved viewing. Device document-access checks still apply.

## Verification

Focused context, permissions and encrypted-remote regression group: 43 passed before later
persistence integration. Expanded foundation, content-tab and session group: 26 passed, including
migration, complete local copy, cross-host mapping, fair root scan, per-root cache retention,
selection saves without scans, recursive chat-only trust/revoke/restart, suspended-grant isolation,
owner API defaults/index, browser descriptor security and hidden workspace restoration.
Full suite outcome is recorded by the coordinating release task after integration.

## Final desktop/shared UI review

The shared workspace configuration now preserves scoped source aliases and selected defaults, shows actual `scannedFolders` discovery counts, retains alphabetical folder sections when entries are favorited, and exposes selected-source defaults. Chat source pickers send their workspace identity on refresh/favorite mutations and the filter includes favorites. Local copies retain full configuration. Cross-machine mapping requests use directories for document/workspace-file parents. Restored workspace descriptors preserve host names, and known remote workspaces remain in the catalog when offline.

`mountWorkspaceApprovals` in `public/features/workspaces/workspace-ui.js` is shared by desktop/web adapters. It edits mode, template folder grants and exact shell/URL/MCP/app rules. Existing fingerprint-specific profiles are shown separately. They survive ordinary edits; the explicit “Replace saved chat configuration folder grants and rules with these defaults” checkbox sends `replaceApprovalFolders`/`replaceApprovalRules` only when requested.

Chat-only folder grants now reach Claude/Copilot native additional directories on subsequent turns without changing the workspace configuration or permission fingerprint. Copilot resumes cold when these directories change. Codex exposes chat-granted roots and includes granted external write folders in an already trusted native sandbox. Under Ask/Saved-rules mode Codex retains read-only native sandbox and routes writes through existing approval requests, avoiding an implicit write grant to the starting folder. Revocation removes the next-turn root and active Codex policy rechecks remain enforced.

Verification after review: 97 focused host/context/permissions/provider/session/UI-policy tests passed; full live Electron workspace-navigation test passed (copy independence, tab ownership, shared drafts, browser restoration). Paired-client parity regression added for scoped updates, full local copy, and root refresh.

Final navigation regression checks additionally cover remote top-level tabs resolving workspace membership from paginated owner chat metadata, native agent-terminal `runId` preservation when reparented, failed browser transfer retaining the original chat/container, and remote preview chat authorization remaining distinct from workspace display ownership. Remote workspace chat creation carries Internet Search type and prompt through the paired API. Four targeted behavior tests pass in `test/workspace-navigation-policy.test.js`.
