## October 18 — Source Library clarity and spacing

The operator authorized incorporating BF-2026-10-18-03/04 from “Queue source spacing fix”. Desktop
and web source now give registered folders an 18px inter-card gap, independently of card padding,
with wrapping paths and controls. Workspace sources help explains that every workspace on the
owning computer can choose registered sources without adding the folder again. Loading choices
remain workspace-specific under Instructions, skills, agents & MCPs.

“Configured in” describes saved source choices or existing folder references, rather than an
access list or observed prompt/tool usage. Choose per chat offers a picker entry; Default for new
chats loads when workspace defaults are included. Apply to all changes only current folder items,
including filtered ones; future discoveries keep their defaults and individual overrides remain.
Source loading grants neither working-folder read/write access nor connected-tool approval.

No source scanning, assignment or permission behavior changed. 740 runtime tests and static
checks pass. Web UI verifies 18px gaps and 22px padding at 1440px/390px with no overflow; shared
source discovery, scoped loading choices and individual overrides pass. Desktop normal-width
checks pass; narrow resize and signing wait for Mac unlock. Web deployment and desktop installation
are separate acceptance gates. Installed desktops remain 0.2.22.

## October 18 — required tab lifecycle guidance

Required core orientation version 2 and provider tool schemas now explain all-type tab inventories,
revision checks, hidden/unloaded creation, background page use and Load/Unload/Close distinctions.
Ordinary browser tabs need no sharing/profile opt-in. This guidance is always supplied independently
of optional workspace sources. See [browser agent access](2026-10-18-browser-agent-access.md).

## Production source library — October 18 candidate

Production now shares the tested host source-library service with the isolated preview. Existing
workspace library/universal roots are registered additively in `projects.json`; original per-workspace
source IDs, selections, modes, favorites and execution roots remain intact. New source registrations
appear as available entries across workspace Configuration, with nested MCP definitions disabled by
default. Registering or selecting a new owner-library root does not add execution roots or grants.
Existing configured roots retain their prior execution meaning, including canonical/symlink paths.
Add and Rescan await discovery and return per-root results; removal preserves source selections and
reports unavailable selected registrations instead of silently running with less context.

Connection-status batches may reuse parsed MCP source files and canonical paths for that one
synchronous projection, with entry/count/byte bounds. Each record still validates its captured
hash, source/root target, workspace mode and environment substitution. Batches discard the memo;
direct provider calls and the next batch read current disk state, including edits and symlink changes.

**October 18 isolated desktop preview — implemented:** Adding a Source library folder awaits its
scan, then exposes discovered entries in every workspace Configuration. Rescan and a registered
folder's Refresh update that root's catalog. The library displays scanned-folder/source counts,
completion time and complete, empty, partial or error status. Failed or removed roots retain
references instead of silently erasing saved selections. Worker scans merge into fresh catalog
state so concurrent metadata edits are preserved.

Library discovery includes nested AGENTS.md, skills, agent definitions and supported nested MCP
files (`.mcp.json`, `.vscode/mcp.json`, `.copilot/mcp.json` and `.copilot/mcp-config.json`), within
the existing root bounds/exclusions. Instructions, skills and agents are available for selection;
MCP entries remain Off unless explicitly selected. Registration adds no working roots, file grants
or connected-tool approvals. Ordinary production discovery is unchanged.

In preview Workspace Configuration, **Load in** and **Apply to all** sit beside **Set as starting
folder**. Choose Default for new chats, Match working folders, Choose per chat or Off, then apply
once to every currently discovered item in that folder group, across all source types and current
search/type filters. This writes per-item workspace modes, not an inherited folder policy.
Individual modes remain editable; future discoveries keep their own defaults. Favorites, other
folders' modes, unknown configuration fields and revision conflict protection survive the save.

Focused source/context/workspace tests (34 tests) and disposable Electron acceptance passed,
including registration, rescanning, multiple workspace selectors, filtered bulk changes, individual
overrides and a later discovery. Fixtures use temporary roots and synthetic data. Production, web
and mobile remain held. See [desktop preview](desktop-preview.md) for broader acceptance status.

**October 15 isolated desktop preview:** Engine Room Source library now registers reusable roots
in the synthetic profile. Workspace/chat selectors discover those entries; selection does not add
source folders to execution roots. Removed used entries retain unavailable references. Production
configuration is unchanged. See [desktop preview](desktop-preview.md).

**October 15 historical design proposal — BF-2026-10-15-10/12 (preview source controls superseded above):** Engine Room would register owner-wide
source folders with Add/Remove only; workspaces/chats would select what loads. Preserve current
source modes, explicit document roles, disabled selections and historical snapshots. Used removed
registrations remain unavailable references with recovery instead of silently disappearing from
saved selections. Working-folder access, narrow source helper reads, execution and connected-tool
permission remain separate. Proposed bounded Autopilot needs real provider/adapter enforcement;
no new grants or tools are claimed. See the [design](2026-10-15-workspaces-projects-design.md) and
[permission review](design/2026-10-15/permissions-review.md). Documentation/synthetic rehearsal only;
[prototype UI rehearsal](design/2026-10-15/prototype-validation.md) passed, with application implementation/build/deployment held.

**October 14 required app guidance:**

Proteus core guidance is provider-injected independently of optional source selections and
cannot be disabled by those selections. Chat details show the required text and the captured
registered Proteus tool inventory, including selection availability and on-demand loading.
Registration is distinct from permission and actual backend startup. Older runs accurately show
that the updated guidance applies on the next model turn.

See [release status](2026-10-13-tab-management-release.md).

# Context selection and favorites

**Queued October 15 — BF-2026-10-15-08:** Remove extension/private profile vetoes from authorized
agent creation/loading/reading/control across every profile, superseding BF-17's extra opt-in.
Update tool guidance and inventory to actual implemented capability and remove obsolete switch-to-
no-extension-profile advice. Ordinary tab scopes apply consistently. Planning only; no runtime
change claimed. See [next release list](planned-updates.md).

**Queued October 15 — BF-2026-10-15-07:** Extend agent orientation/tool discovery with actual
support for creating/importing workspace browser tabs unloaded and/or hidden once implemented.
Describe these as independent states; current hide/restore/move tools do not establish unloaded
creation support. External connector inventory/access is separate from Proteus tab registration
and browser page grants. See [next release list](planned-updates.md). Planning only; no new tool
availability or runtime behavior is claimed.

**Queued October 15 — BF-2026-10-15-06:** Explain changed-source chat-start failures as
“‘[source name]’ changed on disk. Refresh sources to load its latest version, then start your
chat.” Put a working **Refresh sources** action in the alert itself, awaiting the current dialog's
owner-host refresh and preserving its draft, attachments and configuration/selection state.
Report completion/failure and let the user review and send again. Retain version checks and
disabled-source boundaries. See [next release list](planned-updates.md). Planning only; no build.

**Queued native desktop tools — October 19, BF-2026-10-19-22:** the operator selects Cua Driver
as primary, with Peekaboo as an on-demand Mac fallback and Linux branch integration through Cua.
Extend required core guidance and visible inventory with actual backend availability and default
tool order: existing repository tests/APIs for their tasks, browser Playwright for website UI,
Cua for native UI, and Mac Peekaboo for confirmed capability/observation gaps. Keep the current
chat/provider as planner. A fallback must take a fresh backend-owned observation of the same
target, preserve authorization and reconcile uncertain effects before another mutation.

Use a small stable desktop wrapper/catalog with task-relevant schema discovery and lazy native
process startup/idle cleanup. Existing browser list/call wrappers offer an implementation pattern,
not proof that the desktop feature exists. Schema registration/discovery, backend running state
and authorization are distinct. Providers differ in mid-turn catalog updates and reconnection;
do not rely on universal hot loading/unloading. Stopping a process or removing a tool cannot erase
its descriptions/results/images already read in the conversation. Preserve context/approvals and
report actual loaded/idle/unavailable state, bounded payload sizes and observed resource costs.
This is next-release scope only; no desktop tools or runtime guidance are registered by intake.

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
