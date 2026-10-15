**Native workspace Favorites correction — October 15:** Chat source selection reads current
favorites from the authenticated owning host’s workspace profile, even while its scoped source
section is offscreen. An explicit captured chat workspace ID also scopes star mutations when
the captured folder profile omits its ID. Explicit empty favorites clear stale selections;
legacy hosts without workspace favorites retain the scoped-catalog fallback. Host ownership,
revision checks and source activation/trust rules remain unchanged. Unit and UI regression
coverage passes in hosted run 38693169853: the new unit regression and actual Favorites UI
workflow succeed. Broader native UI acceptance is tracked separately.

**October 14 required app guidance:**

Proteus core guidance is provider-injected independently of optional source selections and
cannot be disabled by those selections. Chat details show the required text and the captured
registered Proteus tool inventory, including selection availability and on-demand loading.
Registration is distinct from permission and actual backend startup. Older runs accurately show
that the updated guidance applies on the next model turn.

See [release status](2026-10-13-tab-management-release.md).

# Context selection and favorites

**Queued developer backend discovery — October 13:** BF-16 selects default Playwright and
optional on-demand Chrome DevTools MCP, surfaced through BF-04's required orientation and visible
tool inventory. Advertise loadable developer tools without loading all schemas in every chat;
report actual backend/version/granted scope. BF-17 requires distinct explanations for private
tabs, extension policy, unavailable profiles and missing developer capability. No runtime change.

**Queued visual browser awareness — October 13:** BF-2026-10-13-15 extends BF-04's required
orientation/tool inventory with actual screenshot and coordinate-control availability. Guide
agents to observe/act/verify pixel-only surfaces and use semantic locators when available. A
remote desktop absent from ARIA does not establish absent authentication. Keep provider image
capabilities and tab access explicit; the feature is queued, not a current runtime promise.

**Queued workspace Tabs — October 13:** BF-2026-10-13-12 extends the tab-manager guidance/tool
inventory with all-type hide/restore/reorder/move and typed Close. Required runtime orientation
must distinguish navigation visibility from resource lifetime and browser Persist. Terminal moves
preserve the execution session; viewer moves preserve authorization/source identity independently
of display parent. The synthetic design preview is context only, not an available runtime tool.

**Queued agent tab management — October 13:** BF-2026-10-13-11 adds the proposed general tab/
chat management surface to BF-04's required runtime orientation and visible tool inventory.
Project AGENTS.md and .github/agents/proteus-tab-manager.agent.md explain current limits and the
inventory/action/verification workflow. The profile is optional/discoverable when this repository
is a configured source; it is not automatically selected and does not register tools or replace
future required runtime guidance. Internal adapters/external MCP must describe actual availability
and granted scopes. No runtime loading or management-service behavior has changed.

**Queued options review — October 13:** BF-2026-10-13-04 proposes a required, visible Proteus
orientation/capability index in every chat, independent of optional workspace sources, plus
on-demand feature instructions and scoped tools. This is not implemented or approved for build.
The existing adapters already append compact `appInstructions`; current context source counts
do not represent the complete provider tool/app-instruction inventory. Browser/document/integration
registration differs by adapter/runtime. See [future intake](planned-updates.md).

**October 11 implementation — BF-12/16/17:** Source policies, favorites, defaults and approvals
are isolated by stable workspace ID on their owning host. Sharing a folder or cached discovery
metadata does not share activation or trust. Chats inherit the selected workspace, with explicit
chat-only overrides. Inherited configuration changes apply between turns, recording context history;
active turns retain their captured snapshot.

Configuration uses alphabetical folder sections and items. Its master name/path filter searches
all Instructions/Skills/Agents/MCPs sections and expands matches. The chat picker's filter includes
favorites. Set as starting folder in a configuration folder header targets that workspace and keeps
its other roots; it neither enables sources nor grants trust. No Use in this chat action is added.

Discovery has an independent budget and partial status per root, configurable exclusions/inclusions,
and folder-specific refresh. Oversized roots do not block later folders. Startup, explicit refresh
and structural source changes use worker discovery; mode, favorite, default and approval changes
use the cached catalog. Opening a remote New Chat no longer rescans the filesystem. Refresh returns
actual scanned-folder counts and preserves results for roots not being refreshed.

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

Star any source in Workspaces or a picker to add it to Favorites. The configuration retains the source in its alphabetical folder as well; the chat picker shows it once in Favorites. Check all favorites selects currently enabled, available favorites; it neither
changes the main agent nor enables disabled MCPs. A star by itself never loads or selects a source.
Favorites are IDs in the selected workspace profile in `<app-data>/context.json`, shared by clients of that owning host.
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

## Unavailable supplemental folders

Chat creation skips supplemental workspace and every-chat folders that no longer exist, including cached instruction, skill and MCP entries rooted there. The captured context and provider folder list exclude these paths; a system message in the chat and provider context identify the skipped folders. Saved workspace paths and selections remain intact, allowing a refreshed context to use a restored folder. Local and remote chat creation share this behavior.

The selected starting folder must still exist, and an explicitly selected main agent cannot silently be replaced. Missing individual source files in otherwise available folders, changed instruction content and changed MCP definitions retain their existing refresh checks.
