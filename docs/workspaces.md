**October 14 implementation:**

Workspace pages now offer Chats, Tabs and Configuration. Tabs includes browsers, terminals,
chat views and document viewers, with title/URL, opened/interaction dates, icons and controls.
Unknown dates remain unknown; reads do not count as interactions. Moves retain resource and
source identities. Chat membership is stored separately from captured execution configuration.
Workspace deletion preserves all conversations (including archived/awaiting-input chats),
optionally rehomes them and closes associated tabs. A private deletion journal supports retry;
archived execution profiles retain existing chats/schedules. Project files are preserved. The
last workspace is replaced with a fresh empty default. Current rollout is in the release ledger.

See [release status](2026-10-13-tab-management-release.md).

# Workspaces and reusable context

**Queued October 13 — Delete workspace:** BF-2026-10-13-13 in [planned updates](planned-updates.md)
removes a workspace and closes its affected tab tree, including hidden/unloaded browsers, terminals,
viewers and chat navigation entries. Conversations survive as Unhoused in global Chats by default,
with an option to move all associated chats (including archived/non-open ones) to an existing or
new same-owner workspace. This bulk option moves chats; affected non-chat tabs close. Preserve
chat options, active turns, history/drafts and source folders/files. Default/final workspace and
schedule dependencies require explicit handling. No actual deletion, implementation or build.

**Queued October 13 — Send tab destination grouping:** BF-2026-10-13-07 proposes Workspaces
and Chats group headers with most-recent-first entries in each, retaining Application tabs and
Team Tools choices. The picker order should not alter navigation-tab order or transfer semantics.
See [future intake](planned-updates.md). No runtime implementation/build is authorized.

**Queued October 13 — Move chat:** BF-2026-10-13-06 proposes a Move button immediately left of
Archive, matching existing lifecycle controls. A workspace picker changes membership and moves
the visible chat into the destination workspace nav, retaining the same conversation, drafts,
child content and effective per-chat execution/configuration. Existing Send to workspace only
opens its current workspace. Membership must not silently replace run settings, inherited context
or approvals with target defaults; same-owner movement does not transfer execution hosts. Required
desktop/web/mobile parity and acceptance are in [future intake](planned-updates.md). This is queued
only; no runtime change, build or installation is authorized.

**October 11 implementation:** Workspaces now owns independent folders, instructions, skills,
agents, MCP selections, defaults and approvals. It supersedes the separate Projects proposal.
The Workspaces feature page lists all known owner-host workspaces, with seven recent entries in
the sidebar. Opening one creates its named main tab; the pinned Workspace child contains Chats /
Configuration pages. Its Chats list locks the workspace filter, while master Chats remains global.
A chat opened in both locations is the same conversation and shares its draft. Send to workspace
focuses an existing child representation instead of duplicating it. Closing the workspace preserves
its child descriptors; local browser sessions and drafts restore after restart.

Each workspace has one owning machine. Desktop, web and mobile can view the owner configuration
and edit source options/approvals through that host. Native folder pickers and local path actions
remain owner-local. Remote terminal descriptors are references, not live executable processes;
owner-only documents without a chat viewing grant retain an explanatory placeholder.

**Copy** in the workspace list asks for a name, clones the complete configuration and approvals
under a new stable identity on the same owner, then opens Configuration. The copies are independent.
Copy to another computer maps source folders to existing target paths and creates a new owner-bound
configuration with approvals reset to Ask for review. Neither copy duplicates chats, cookies,
credentials or running terminal processes. See [the design](workspaces-design.md) and
[release verification](2026-10-11-workspaces-release.md) for implementation/installation status.

Open **Workspaces** to create a named multi-folder workspace, choose its command starting folder,
add folders with the native picker, or import a local `.code-workspace` file. Relative folder
paths are resolved against that file. Import does not execute VS Code tasks or launch settings.
Existing Settings roots become the initial default workspace. Choose **Use as default** to change
which workspace New Chat starts with. A chat may override its command folder before starting.
Copilot uses that folder for relative commands; it does not need the Proteus source repository.

The starting-folder dropdown lists only the selected workspace's configured roots; New Chat also
includes folders explicitly added for that chat. It is not a filesystem scan result or the source
library. Adding a library folder discovers source artifacts but does not add it to this dropdown.
Selecting a discovered source can add that source's root to the captured chat workspace while
leaving its starting directory unchanged. Access remains subject to provider/resource permissions.

Discovery uses independent per-root budgets and canonical path deduplication, with root-specific
counts, timestamps and partial/error states. One oversized root cannot starve later roots. Refresh
can target one configured folder while retaining all other results. Exclusions and explicit inclusion
paths are configurable per workspace; default exclusions cover common dependency/build/cache trees.
Scanning runs in a worker at startup, on explicit refresh or structural source changes. Mode,
favorite, approval and chat-default saves use cached metadata and do not trigger a full scan.

**Sources across workspaces** adds other repositories or individual Markdown documents. Checking
**Every chat** on a source folder makes its files accessible from chats in this workspace; it does not inject
all of those files into a prompt. The inventory separately controls the documents and MCPs supplied
to the provider:

| Mode | Effect |
| --- | --- |
| Every chat | Include this individual source in every new context snapshot in this workspace. |
| With workspace | Include when its source folder belongs to the effective workspace. |
| Choose per chat | Offer in the New Chat or Refresh context picker. |
| Disabled | Exclude from managed loading, including previously selected sources after refresh. |

Refresh rescans instructions, skills, agents, and MCP definitions without restarting the app.
Selections survive refresh and restart. Folder sections and their items sort alphabetically; the master filter searches all source types and favorites. Source-folder headers offer Set as starting folder on the owner. Name, discovery and approval drafts survive page changes within the client; explicit Discard clears them. Revision checks reject stale draft saves. New Chat includes a workspace selector, context picker,
optional primary agent, and models from refreshed provider catalogs. Missing models or failed catalog
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

## Queued workspace Tabs manager

BF-2026-10-13-12 in [planned updates](planned-updates.md) adds Tabs between Chats and Configuration,
listing all open direct workspace-nav tabs, including hidden/unloaded browsers, terminals, viewers
and chats. Order is icon/title/flexible URL or location/opened/interaction/actions. Hide/Restore
changes visibility, reorder changes nav order and Move preserves the actual resource across
workspace/chat/main/Team placement where supported. Terminal execution and viewer authorization
origins remain independent from display parent. The
[synthetic preview](design/2026-10-13/workspace-tabs-preview.html) is interactive rehearsal, not
implemented behavior or live acceptance. No app build is authorized.

## Storage and plain-file editing

Queued BF-2026-10-13-11 extends BF-06 Move chat to internal/external agent operations, including
filtered inventories and browser-tab moves among chat/workspace/main/Team navigation. Chat tab
Close remains distinct from Archive/Unarchive and must preserve conversation data. Reuse owner
service operations and preserve effective per-chat configuration/approval scope; project guidance
does not implement these features. See [queued scope](planned-updates.md).

The [shelved storage idea](planned-updates.md#future-ideas--shelved-outside-the-active-update-batch) considers SQLite for mutable chat/
tab metadata while keeping editable configuration and schedule formats as JSON. This is an
unapproved future idea outside the active update batch; the storage below remains current.

All host-specific configuration lives under `PROTEUS_HOME` (by default the platform app data folder):

- `context.json`: independent versioned workspace profiles, owner-local default, source folders/documents, modes, discovery options, defaults and approval templates.
- `context.json.before-workspaces`: recovery copy retained when migrating legacy shared configuration.
- `permissions.json`: workspace-ID and provider/resource-specific saved approval profiles.
- `content-tabs.json` / `desktop-workspace.json`: shared portable descriptors and private desktop session state.
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

Folder scan summaries separate the path and count with ` · `. Source-type buttons occupy the row
above the full-width master filter on desktop and web.

Source folder sections have an explicit disclosure arrow and folder icon, a distinct header with
folder name/full path/count, and a body separated by a top rule containing only that folder’s controls
and items. Collapsing hides both controls and rows; master filtering still searches every section.

Folder header paths use the available width before wrapping. Expanded content has no inner vertical border. Workspace and main Add-tab menus share Markdown file, browser profiles, Terminal, New chat and Internet Search ordering and appearance. Remote clients explicitly mark owner-only actions.

Computer labels use the owner's configured Proteus connection name, including local workspace lists, configuration, and chat destinations. A device hostname is only a fallback when no configured name exists; displaying a name never renames the computer. Platform-neutral controls say “computer.”

The Chats sidebar badge counts currently running, unarchived chats across categories and connected computers. It counts each owner/chat identity once, including chats also open inside a workspace, and excludes queued, awaiting-input, completed, and cached offline records. Encrypted host snapshots carry a full running count independently of the recent-history page. Web feature pages keep lightweight status connections so the badge can update outside the Chats page.
