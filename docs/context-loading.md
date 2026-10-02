# Context selection and favorites

Each new chat and schedule can use workspace defaults or **Only selected sources**. Changing
loaded context does not change the workspace folders the agent can access. A selected source can
also add its own source folder, as before. Folder access does not preload every file in that folder.

With defaults enabled, Proteus includes sources marked Every chat and With workspace whose roots
match the chosen workspace or universal folders, plus explicit selections and the chosen main
agent. Discovery defaults top-level AGENTS.md, CLAUDE.md and .github/copilot-instructions.md to
With workspace. Nested instructions, skills and agents default to Choose per chat. MCP definitions
start Disabled. Sources come from configured workspace/library folders, individual documents and
local workspace MCP files; symlink aliases of documents are deduplicated.

Only selected sources excludes automatic universal/workspace sources and the legacy
`skillDirectories` and `mcpServers` settings. It does not enable disabled MCPs. Include needed
operating instructions explicitly when using this mode. In either mode, a disabled source cannot
be supplied. Missing/changed sources require a refresh or revised selection before execution.

The picker previews selected/automatic source counts, paths, and loading reasons. Its text estimate
is instruction and skill body characters divided by four, not provider-measured tokens. Selected
skills currently contribute their full SKILL.md text. Registered agent definitions, tool schemas,
wrappers, Copilot's built-in system instructions/tools, the Proteus browser tool, conversation
history and later file/tool results are additional context. Managed sessions disable Copilot's
automatic config/instruction discovery; Proteus supplies its captured sources explicitly.

To keep context smaller, select just the workflow skill, main agent, necessary policies and MCPs;
keep universal instructions short; move long indexes and reference material to optional sources.
Prefer MCP definitions with scoped `tools` lists where supported. Start a new chat for unrelated
work: changing context on a resumed chat preserves the earlier conversation and does not erase
what it has already read. On-demand skill bodies and per-tool catalog selection are possible
future improvements; this release does not claim either.

## Favorites

Star any source in Workspaces or a picker to move it to Favorites. It appears once, outside the
Other sources list. Check all favorites selects currently enabled, available favorites; it neither
changes the main agent nor enables disabled MCPs. A star by itself never loads or selects a source.
Favorites are IDs in `<app-data>/context.json`, shared by desktop and paired mobile clients.
They survive refresh/restart and do not alter Every chat/With workspace/Disabled modes.

## Schedule files

App-owned schedule JSON supports:

```json
"contextSelection": {
  "includeDefaults": false,
  "selectedIds": ["source-id-from-context-catalog"],
  "agentId": null
}
```

Use source IDs from the local catalog/picker. IDs are hashes of canonical source paths on the host,
not portable names or document contents. The app preserves additional extension fields. Omitting
`contextSelection` retains existing defaults. Each new run captures a validated source snapshot;
previous runs and context history keep their original contents. Refresh sources after editing
instruction files. Schedule controls do not enable paused schedules or rewrite existing selections.
Repository-owned schedules must be changed in their canonical manifest and reconciled through
their owning system. Proteus does not rewrite organization workflows manifests when you edit app configuration.

## Validation

`npm test` covers persistence, stale revisions, selected-only capture and SDK settings, schedule
execution, and encrypted favorites/context synchronization. `node test/context-controls-ui.mjs`
checks desktop favorites, draft retention, loading preview and schedule edits. `node test/chat-ui.mjs`
also checks bounded chat/details layout, preserved reading positions and narrow-window access.
The native `testContextFavoritesSelection` UI test requires the synthetic mobile host.
