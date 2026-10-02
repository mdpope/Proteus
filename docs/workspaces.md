# Workspaces and reusable context

Open **Workspaces** to create a named multi-folder workspace, choose its command starting folder,
add folders with the native picker, or import a local `.code-workspace` file. Relative folder
paths are resolved against that file. Import does not execute VS Code tasks or launch settings.
Existing Settings roots become the initial default workspace. Choose **Use as default** to change
which workspace New Chat starts with. A chat may override its command folder before starting.
Copilot uses that folder for relative commands; it does not need the Proteus source repository.

**Sources across workspaces** adds other repositories or individual Markdown documents. Checking
**Every chat** on a source folder makes its files accessible from every chat; it does not inject
all of those files into a prompt. The inventory separately controls the documents and MCPs supplied
to the provider:

| Mode | Effect |
| --- | --- |
| Every chat | Include this individual source in every new context snapshot. |
| With workspace | Include when its source folder belongs to the effective workspace. |
| Choose per chat | Offer in the New Chat or Refresh context picker. |
| Disabled | Exclude from managed loading, including previously selected sources after refresh. |

Refresh rescans instructions, skills, agents, and MCP definitions without restarting the app.
Selections survive refresh and restart. New Chat includes a workspace selector, context picker,
optional primary agent, and models from the live Copilot catalog. Missing models or failed catalog
requests are shown; the app does not silently substitute a model.

Discovery includes AGENTS.md, CLAUDE.md, Copilot instructions, instruction files, Claude rules,
SKILL.md, and agent Markdown files. It skips build/dependency directories, deduplicates real paths,
and records scope, content hash, aliases, and source paths. Add Document can designate an arbitrary
Markdown file as instructions, a skill, or an agent, overriding its discovered role. Repository root
instructions default to With workspace; skills and agents default to Choose per chat. Source scope
and domain routing remain applicable when a document is included universally.

For managed Copilot sessions, Proteus disables automatic instruction/configuration/hook discovery
and supplies the selected instruction and skill text explicitly. Agents are registered as SDK
custom agents; selecting an agent makes it available, not proof that the model invoked it. Agents
with inline `mcp-servers` or `hooks` metadata still require an adapter and are visibly unavailable
in the chat picker. The `tools` field accepts YAML lists or comma-separated strings. Supported portable groups
(`read`, `search`, `edit`, `execute`, `agent`, `web`) map to Copilot runtime tools. Read/search stays read-only; `tools: []` provides no
tools; an omitted list or `['*']` inherits configured tools. Unknown names fail visibly instead of
dropping restrictions. The selected main agent also sets the session tool ceiling, including an empty list, so provider-added
planning tools cannot bypass it. Delegation cannot expand that session ceiling. Source declarations
do not approve operations or enable MCP servers.
`infer`, `disable-model-invocation`, and `user-invocable` controls are respected. This does not override GitHub organization policy or provider system
instructions, which Proteus cannot enumerate. Selected source paths may reference other documents;
those later tool reads are not automatically promoted into the managed source inventory.

Chat details distinguish **captured** from **supplied** versions. Supplied means the SDK accepted
the session configuration, not that the model followed every instruction. **Refresh / choose
context** updates an idle chat for its next turn and retains the previous snapshot in context
history. Changed MCP configuration forces a cold provider reconnection. Refresh does not erase
old conversation messages or instructions already in history; start a fresh chat for that boundary.

## MCP configuration

The catalog reads workspace MCP settings, `.vscode/mcp.json`, `.mcp.json`, and supported `.copilot`
MCP files. Every imported MCP starts disabled. Enable one individually by choosing a mode. The app
stores its source path, key, and hash, not a copied secret-bearing definition. It resolves the
source definition immediately before provider use, with source-relative launch directories,
`${workspaceFolder}`, and `${env:NAME}`. VS Code `${input:...}` values require an input adapter and
currently fail visibly. VS Code OAuth state does not transfer automatically.

Identical effective configurations are deduplicated. Conflicting selected server names fail before
provider execution rather than overwrite one another. The inventory says **connection not checked**;
a standalone connection/authentication tester is not implemented. Validate enabled servers with a
bounded real chat. Existing source-owned schedules keep their explicit skill directories and MCPs;
chat details show those separately. Explicitly disabling a matching catalog skill/server excludes it
from that legacy configuration. Merely discovering a disabled import does not rewrite an existing
schedule's integration settings. New roots or integration selections invalidate prior workspace
permission fingerprints.

## Storage and plain-file editing

All host-specific configuration lives under `PROTEUS_HOME` (by default the platform app data folder):

- `context.json`: versioned profiles, default workspace, source folders/documents, individual modes.
- `context-catalog.json`: discovered metadata and missing-source records, refreshed from source files.
- `settings.json`: new-chat/schedule defaults and optional Copilot data directory.
- `runs/<id>.json`: conversation events, exact captured context, source versions, native session ID.
- `standup.json`: editable roster, agenda, timezone, and one current generated result.
- `credentials.json`: nonsecret provider paths and exact login bindings.

AI tools can edit the plain files. UI writes are atomic and detect stale revisions. Refresh reads
context-file edits without restarting. Source text stays owned by its original repository or vault;
resolved machine paths and run content must not be committed to Proteus.

Chat details expose the run and native session paths with Open and Copy controls, plus Markdown/JSON
transcript export. Exports contain readable user/assistant messages, not raw tool/config payloads;
message content can still be sensitive. Settings can select an existing Copilot data directory for
new sessions. Existing sessions stay pinned to their original directory; history is not moved.
The native default is `~/.copilot/session-state/<session-id>` unless Copilot's base directory changes.

## Standup

Standup opens a tab with Current order and Settings. Enter randomized members, fixed members in
the desired order, agenda, and timezone. Generate shuffles the random group, appends the fixed
group, and saves today's result. Editing settings does not change the current result until Generate.
The result survives app restarts. No daily document or model call is created. This utility does not
claim completion of a separate workflow that requires durable artifacts.

Tool mappings follow [GitHub agent configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
and [SDK agent tool scoping](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents).
Source-qualified MCP tools remain limited to the configured servers; extension-only tools need
a provider adapter. The model and normal workspace permission policy still come from the chat.
