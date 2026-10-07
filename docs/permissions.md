# Workspace permissions

Proteus owns persistent tool approvals in `<app data>/permissions.json`. Workflow repositories
continue to own their business rules and schedules. Importing a schedule does not grant trust or
enable it.

Choose a mode under **Settings → Workspace permissions**, or in a run's **Tool approvals** panel:

| Mode | Behavior |
| --- | --- |
| Ask each time | Show each permission request received from the provider. |
| Saved rules only | Use individually approved folders and operations. Other requests still ask. |
| Trusted workspace | Allow structured file reads/writes inside the listed roots, MCP calls marked read-only, and embedded-browser reading/navigation. Other operations need a saved rule or approval. |
| Auto-approve tools | Also allow terminal commands, configured MCP tools, URLs, and custom tools without prompts. Structured file requests outside trusted folders still ask. |

Auto-approve tools is Proteus's unattended tool-approval mode. Terminal commands are not confined
to the listed folders: they have the runner's normal filesystem and network access. This setting
is not an OS sandbox. Actual user questions, sign-in, runtime-marked enterprise approvals, and
sandbox-escape requests still pause. Unknown future permission kinds also ask.

This is similar to the permission levels in
[VS Code](https://code.visualstudio.com/docs/agents/run/approvals), but does not reproduce VS Code's
Autopilot planning/continuation behavior or automatically answer questions. Proteus does not import
VS Code's trust database. Runtime-marked enterprise requirements are never auto-approved; Proteus
does not claim to independently fetch all enterprise policies.

At an individual prompt you can **Approve once**, **Deny**, trust the displayed folder, trust the
whole workspace, or **Always allow** the displayed operation. Command rules match the complete
command exactly. MCP/custom-tool rules match the tool plus its `action` when one is supplied, so
allowing a multiplexed tool's `get` action does not allow `update` or `delete`. URL rules match the
origin. An individual saved rule does not implicitly trust other tools or folders.

Authorizations are scoped to the provider, canonical working directory, complete set of workspace
roots, skills, and MCP configuration. Renaming a schedule or changing its prompt does not erase
trust. Adding a repository or changing a server configuration creates a fresh permission context.
Symbolic links and new-file ancestors are resolved before checking file access.

Use **Revoke** in Settings to remove an authorization, or choose **Ask each time** to suspend it.
Policy is re-read for every request and queued requests are checked after the previous reply.
Changes from either the Mac or mobile chat details, or the plain file, immediately recheck a waiting
permission request in the same chat. Revocation applies
to future decisions; it cannot undo an operation already running. Human-created browser tabs
still require their separate **Agent access** toggle.

The versioned JSON format is documented in `schemas/permissions.schema.json`. AI tools can edit
existing folder grants/rules in this host-local file. Create contexts through the UI rather than
inventing their computed IDs. Keep the file, its machine paths, run history, and browser profiles
out of Git. UI saves use revision checks so stale forms cannot overwrite external edits.

The provider adapter returns the current SDK's `approve-once` decision for every authorized
operation. Proteus remembers the rule itself, so revocation takes effect without a hidden provider
cache of permanent grants. History records automatic approvals and their policy reason; only a
direct approval response is attributed as interactive.

## Chat-only auto-approval

An individual chat can opt into Auto-approve for this chat only without changing
`permissions.json` or any other chat or schedule. The override is stored with that
chat on its owning Mac, survives continuation and app restart, and can be revoked
back to the inherited workspace mode. Each change requires the current chat
revision and permission-context ID. Changing provider, workspace roots, skills or
MCP configuration permanently invalidates the override; switching back does not
restore it. New chats do not inherit it.

The override auto-approves supported operation requests within existing resource
grants. Structured file reads and writes still require the same canonical-path
folder authorization, and the Codex sandbox keeps its existing writable roots.
Managed enterprise approvals, sandbox-bypass requests and unknown request kinds
still ask. A changed override rechecks a waiting permission request in that chat.
Automatic approval history records whether the source was chat or workspace.

Legacy partial grants previously labeled Trusted workspace now display as Saved rules only; no
authorizations are broadened during migration. Duplicate SDK checks for the identical active tool
call share its one-time decision; the decision expires when the tool completes. Approval waits do
not consume the provider turn's active execution timeout.
