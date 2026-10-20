## Queued P1 — navigation continuity during workspace/project moves

BF-2026-10-19-23/24/25 in [planned updates](planned-updates.md) record reported installed-0.2.25
regressions affecting an empty browser stack moved from workspace to project, repeated conflict
resolution and healthy browser selection under a background conflict. A descriptor must retain
the authoritative revision even when there is no selected history entry. Audit the source stack
chosen during move/migration, preserve complete Back/Forward history, pending operations and
receipts, and make resolution converge without discarding intent. Keep conflict UI scope separate
from navigation selection; retain the latest selected tab/bounds while an embedded view is hidden.
These are queued P1 fixes, not implementation or permission to rewrite production state/build.

## Queued next release — Tabs-page selection and bulk actions

BF-2026-10-19-18 in [planned updates](planned-updates.md) adds Select/Hide/Move/Close at the right
of the Tabs-page action row, after Workspace configuration. Command-click starts selection mode
and reveals row checkboxes; Select provides the same entry point without a modifier. Selection
uses stable owner/tab IDs, shows its count and survives harmless refreshes without opening tabs.
Hide/Move/Close apply to the explicit set, with BF-17's grouped destination picker for Move and
unchanged type-specific lifetime/permission rules. Report real per-item outcomes and retain
unsuccessful selections for retry. No active-tab operations, implementation or build in this intake.

## Queued next release — workspace/project hierarchy in tab destinations

BF-2026-10-19-17 in [planned updates](planned-updates.md) changes Send/Move tab destination
pickers to workspace headers with their projects as selectable options. Include each existing
default project and identify targets by real owner/workspace/project IDs, including unopened
destination views. Repeated General names stay distinct under their workspace headers. Use
saved workspace/project navigation order and preserve other supported Application/Team/Chat
destinations. Select a project instead of a redundant bare workspace target; do not migrate
legacy resources or change defaults/membership implicitly. Existing move/copy lifetime and
permission rules remain. Queue only; no implementation, UI validation or build yet.

## Queued next release — drag workspace cards to set sidebar order

BF-2026-10-19-16 in [planned updates](planned-updates.md) adds drag-to-reorder on the Workspaces
collection's cards/boxes. Save one manual order per owning computer and use it for both the grid
and sidebar, retaining it across refresh/restart. A drag must not accidentally activate the card;
existing Open workspace/Configuration actions remain available, with a keyboard reorder route.
Preserve selection, workspace/project expansion, paging, default identity, memberships and all
live resource/draft/approval state. Keep Other Computers groups separate. This does not change
BF-08's current-first then alphabetical project overview order. Queue only; no implementation/build.

## Queued next release — multiple windows and scoped new-tab pages

BF-2026-10-19-11 in [planned updates](planned-updates.md) adds multiple desktop windows, each
with independent geometry, selected item/navigation and reading position. Explicit window Close
forgets that window's restore entry; whole-app Quit saves every still-open window for relaunch.
Keep one host/runner and existing stable chat/browser/terminal/viewer identities, drafts and
permissions; per-window saves and actions must not overwrite another window's state. Command+N
creates a window; Command+T creates a tab in the focused window's initiating navigation scope.
BF-12 replaces + submenus with new-tab pages whose option blocks retain each scope's existing
capabilities, including on iPhone/iPad. The page's combined address/history field receives focus.
These are queued requirements; current single-window behavior remains implemented until authorized.

## Queued next release — overview includes all current-workspace projects

BF-2026-10-19-08 in [planned updates](planned-updates.md) includes all projects in the current
workspace, current project first and the others alphabetically by name. Each section shows that
project's unhidden tab entries in navigation order; inactive projects and collapsed sidebar folders
remain included. The reported current project has one chat plus three browsers, four cards in
its section rather than a global limit. Hidden tabs remain in Tabs management and fixed navigation
pages do not become cards. Keep visible unloaded entries without loading them. Correct legacy
section identity/captions and counts without moving resources or changing chat membership. BF-09
queues browser/chat thumbnails captured after interaction and periodically while viewed, saved
through unload/restart and displayed from cache without delaying overview. Icons remain the
fallback; no sleeping page loads just to make a preview. Synthetic grouping/capture defects are
confirmed; cache implementation, full UI/performance acceptance and build remain held.

## Queued next release — startup tab rendering before state readiness

BF-2026-10-19-07 in [planned updates](planned-updates.md) records the confirmed initialization
race behind “Cannot read properties of null (reading 'desktopPreview')”. Browser profiles can
return before initial application state and invoke tab rendering while `state.data` is null.
An unchanged-source isolated Electron rehearsal captures the exact stack; reversing response
order avoids the error and both cases eventually load Home. The internal property name does not
mean an isolated preview is enabled. Queue readiness-safe tab rendering while retaining fetched
profile choices, restored views and production/preview identity. No runtime fix or build yet.

## Queued next release — preserve sidebar folder expansion across features

BF-2026-10-19-06 in [planned updates](planned-updates.md) keeps workspace/project folders in
their current expanded or collapsed state while visiting Engine Room or another sidebar feature.
Previously exposed project browser tabs must remain visible and directly selectable, returning
to the same tab/page state. Keep feature selection separate from folder expansion, preserve
owner-scoped state through rerenders/refreshes, and retain manual collapse controls. Requirements
also specify that clicking a sidebar workspace or project name navigates to its page and ensures
that branch is expanded. Repeated name clicks do not collapse it or other branches; preserve nested project expansion,
paging and all sibling branches. The separate chevron still toggles manually. Visiting other
features continues to retain workspace/project state, so this name-click behavior does not become
an automatic collapse-on-navigation rule. Implementation, reproduction and UI acceptance remain
pending under the next-release hold.

## Selected phone drawer preview — October 18

The operator selected a button drawer applied to current Proteus screens. Implemented simulator-only
phone code removes the bottom app-section bar, keeps visited section navigation mounted, and puts
Workspaces with integrated collapse after Team and before Engine Room using thin dividers and
existing desktop hierarchy colors. No Home redesign or iPad navigation changes are included.
Workspace/project/chat back navigation uses the native stack in the preview. Simulator compilation
and 740 runtime tests pass; the signed preview is installed. Native UI checks validate drawer
ordering and full touch targets. Real chat/browser snapshots use aligned cards without loading
unloaded pages. See the
[phone design status](iphone-navigation-design.md) and BF-2026-10-18-02.

## Phone navigation exploration — October 18

BF-2026-10-18-02 in [planned updates](planned-updates.md) removes persistent phone app-section
buttons and explores a Home hub with Button drawer, Right-edge drawer and Upper-left pull.
The downward upper-left experiment preserves horizontal left-edge Back. All alternatives retain
an explicit navigation button. The operator selected all three for a local synthetic preview;
no final navigation design or production native implementation is accepted yet. See
[phone navigation design](iphone-navigation-design.md). Shared smooth back/pinch motion also
applies to iPad, whose two tab-navigation layers remain the separate BF-01 target.

## Queued iOS sidebar and iPad navigation — October 18

[BF-2026-10-18-01](planned-updates.md#bf-2026-10-18-01--desktop-sidebar-parity-ipad-tab-layers-and-live-browser-entry)
queues desktop sidebar order with Workspaces before Engine Room, thin horizontal section dividers,
Collapse all integrated into Workspaces, and desktop workspace/project/item background colors.
iPad should keep two tab-navigation layers, remove the redundant “‹ Workspace” row and restore
vertical tab dividers. Preserve selection, tab identity and conversation state. This is future
build scope, not implemented or verified behavior; broader iPhone navigation remains undecided.

## October 18 — agent-created hidden project tabs

Agent browser creation accepts an explicit project/workspace destination and profile with initial
hidden/unloaded flags. No fetch occurs for initial unloaded tabs. Native hidden state survives
renderer/session reconciliation and background page loading; Unhide alone does not load. The
shared tab manager provides revision-checked browser Load/Unload while preserving placement.
See [browser agent access](2026-10-18-browser-agent-access.md).

## Other Computers and native projects — October 18 follow-up

Desktop shows the local workspace tree first. Web uses the account's default computer; native
uses its saved selected destination. Browsing a different owner does not silently change that
primary destination. Remove inline computer names from workspace headers. A divider and Other
Computers expander contain named computer headings and independent workspace/project trees.
All identities, cached descriptors, expansion and commands remain scoped to their owning host.
Offline saved navigation stays visible without claiming a live connection or loading pages.

Native workspaces have fixed Projects, Chats, Tabs and Configuration navigation. Projects retain
manual order and default identity; deleting a nondefault project reviews reassignment to the
current default. Native browser moves retain the existing view and history. Unconfirmed commands
in a deleted scope keep their original receipts and expose a recovery warning instead of being
silently replayed. Terminal and unsupported document descriptors explicitly remain available on
their computer; a descriptor is not a live terminal or a document-access grant.

Native Source library registration and workspace source choices use the same owner services.
Per-folder Load in applies once to current entries, retaining individual overrides. Sidebar
recents combine chat and resource descriptors without changing activity on selection. Desktop
scroll persistence is debounced and flushed on page lifecycle events without rerendering the tree.
See the release runbook and native parity ledger for build, installation and live-verification status.

## Production projects and preservation migration — October 18 candidate

The host-owned `WorkspaceProjects` service now supplies the production project catalog through
`/api/workspace-projects`, with `/projects` and `/sources` mutations. The isolated design preview
inherits the same service while retaining its separate markers, data files and provider bootstrap.
Production creates `projects.json` atomically with one stable General project per existing workspace.
It registers existing library/universal source folders without rewriting workspace configuration,
schedules, chats, provider sessions, approvals, drafts or browser profiles. Unknown catalog fields
and revision protection survive reads, writes and restart. No preview fixtures or credential copies
are part of production migration.

Legacy chat views directly beneath a workspace gain its default project parent, preserving view IDs,
selection, child resources and drafts. Direct workspace browser/terminal/viewer tabs remain there.
Unhoused chats remain unhoused. Closed chats gain catalog membership without reopening views.
Passive migration preserves main chat aliases and their existing child registries; it only relocates
workspace/project descriptors. It uses saved descriptor order rather than chat creation order,
committing each ordered membership reconciliation atomically. Remembered workspace→project→chat
selection chains remain valid even while another feature is active. Restoration retains unavailable chat views instead of inferring deletion
from an incomplete summary. Saved peer chat aliases absent from an older owner registry stay local
until that owner exposes the descriptor, without publishing a reopening. Peer upgrades remap
workspace chat aliases to their owner project before applying descriptor closures, preserving IDs
and children. Multiple native browser views sharing a logical descriptor remain distinct local views.
Project deletion redirects membership and synchronized project scopes to the reviewed default;
source authorization remains tied to the original chat/document. Redirect reconciliation resumes
after restart. Project ordering changes no activity timestamps or provider execution settings.

Paired clients negotiate `projects.v1` and `source-library.v1`. `projects.get/update` and
`sources.get/update` return the catalog; `chat.start` and `chat.move` accept a project ID.
Content tab scopes include `project` alongside workspace/chat/main/team, with owner validation,
revision checks and the existing document/resource permission boundaries. Native installation and
live-data preservation verification remain separate from disposable migration tests.

**October 16 preview revision:** The Workspaces collection opens directly to workspace cards;
the redundant collection Chats tab is removed. Individual workspace/project Chats remain scoped.
Fixed Projects/Chats/Tabs/Configuration tabs have the same separators as resource tabs. The
selected grouped sidebar uses a shaded panel per workspace, project headers, right-side expanders
and two-line item names. Workspace headers include computer name and project count; project lists
combine unique chats and all resource tab types with icons, recency ages and full item counts.
Workspace groups remain below Workspaces on every feature; expansion survives navigation, while
closing a project or leaving the feature resets its seven-item list. More adds four. Closing a
workspace resets extra project paging. Features and groups scroll above the pinned allowance
and Engine Room footer. Feature tabs use matching icons; all selected tab titles are white and
inactive navigation labels are brighter. Selected project backgrounds include their expanders.
Open tabs supports title/row drag and Alt+Shift+Up/Down within the same workspace/project;
preview up/down buttons are removed. See [desktop preview](desktop-preview.md).

**October 15 isolated desktop preview:** BF-10–12 now run in a separately named app with synthetic
data. Project navigation, scoped lists, source library and chat moves are implemented and exercised
in Electron. Production migration, non-chat project-resource moves and workspace deletion remain
deferred. See [desktop preview](desktop-preview.md). The design below remains the target for production.

**October 15 design proposal — BF-2026-10-15-10–12:** Workspaces retain configuration, working
folders, defaults, selections and permissions; Projects become organizational children with flat
peer tabs. Every workspace has a default project for chats. The workspace name appears in app
navigation; Projects/Chats/Tabs/Configuration are fixed left in its local strip, with no generic
Workspace tab. Optional browser/terminal/viewer tabs follow and may stay at workspace level.
Tabs aggregates direct and project resources. The collection has Workspaces/Chats tabs. Chat
lists follow the existing index with locked contextual Workspace/Project fields; collection,
workspace and project icons remain four boxes, panel and folder respectively.
Projects are nested beneath each workspace in the existing sidebar line hierarchy, not sibling
tabs beside the workspace name. Global quick views and chat moves preserve
original execution settings. Existing main/Team/Unhoused exceptions and every saved resource must
survive migration. See the [design, migration mapping and journeys](2026-10-15-workspaces-projects-design.md)
and [synthetic prototype](design/2026-10-15/projects-workspaces.html). Documentation/rehearsal only;
[prototype UI rehearsal](design/2026-10-15/prototype-validation.md) passed. This does not change the implemented behavior below or authorize
application builds, live migration or new grants.

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

**Queued October 15 — BF-2026-10-15-07:** Add/import browser tabs into a workspace unloaded,
hidden, or both using the shared owner service and supported UI/agent tools. List all saved entries
in Workspace Tabs with independent load/visibility state. Restore visibility need not load a page;
explicit activation loads an initially unloaded tab. Preserve identity/order/profile and state
across restart/sync; importing must not load pages first. See [next release list](planned-updates.md).
Planning only; external source-tab retrieval and actual imports are not verified by this intake.

**Queued October 15 — BF-2026-10-15-05:** In the plus-workspace creation flow, Enter in the
name field should invoke the same validated creation action as **Continue**. The operator reports
that a Continue click is currently required. Preserve validation/cancellation and prevent duplicate
submissions. See [next release list](planned-updates.md). Planning only; no implementation or build.

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

**October 17 desktop preview refinement:** Sidebar width is adjustable and stored in application
appearance settings, shared by pinned navigation and the collapsed popover across restarts. The
popover covers content without moving it; native browser views are temporarily hidden through
the normal overlay mechanism. Navigation follows the latest reference palette: charcoal-green sidebar, quiet
workspace surfaces, slightly brighter active project panels and a muted green selected row with
rounded accent edge. Preserve icon designs and favicons. Selected tab icons use the same pale
green accent, while selected tab titles stay white. Inactive projects blend into their workspace;
active panels contain heading and children with balanced, shallow horizontal insets. Feature
recents share a project-style panel around the heading and items, without a nested list box.
Restore the horizontal divider below Workspaces. Counts are plain except the nonzero Needs attention badge. No hierarchy
guide lines. Activity under one hour shows `<1m` or whole
minutes (`1m`–`59m`); older items keep hours/days.
Production, web and mobile remain held. See [desktop preview](desktop-preview.md) for validation.
Sidebar feature, workspace and project labels use 14px type; individual chat/resource titles,
counts and computer metadata keep their existing sizes.

## Isolated preview activity and closure — October 17

See [desktop preview](desktop-preview.md) for the preview-only activity/ordering and closure revision.
Selection and restoration do not advance recent activity. Workspace aggregate Tabs is not
reorderable; project order is manual. Browser Hide unloads and Restore waits for selection to
load. Chat view closure preserves durable state and active work while releasing presentation
caches; successful terminal input advances its recent activity. Production rollout remains held.

## Isolated preview project deletion — October 17

On a workspace’s Projects page, **Delete** appears for nondefault projects. The review names the
current default receiving all chats and tabs, including browser, terminal and document tabs.
Files and chat history are preserved. **Set default** on another project makes the former default
deletable; General is an initial name, not a permanent special project. Reassignment preserves
active work, draft text, approvals, browser state, hidden/unloaded state and activity age. Changing
the default afterward does not move these items again unless their receiving project is deleted.
Production/web/mobile rollout remains held; see [desktop preview](desktop-preview.md).

## Native sidebar design rehearsal — October 19

The iPhone/iPad simulator previews use the desktop workspace/project/selected-item theme colors
and equal 16-point hierarchy steps. Workspaces and its collapse action share one row, between
Team and Engine Room, with thin horizontal separators. iPad removes feature recents from the
sidebar while keeping workspace children and main tabs above the page. Phone main tabs stay
in a labelled Open tabs section; Home also provides that section on both idioms. Closing a
main tab remains placement closure, not chat archival or resource deletion. Production rollout
remains queued; see [preview design](iphone-navigation-design.md).

The 0.2.25 desktop overview uses the current workspace's project sections, current project first.
It highlights and reveals the selected content card, supports same-owner reordering and closes
through the existing typed actions. Top-level overview contains top-level navigation only; it
does not expand every project. Hidden/sleeping link creation keeps source profile and placement
without fetching or adding a navigation-strip item. See the site-controls acceptance ledger.


### October 19 native simulator navigation acceptance

The paired design previews use the desktop workspace/folder/item icon geometry and selection
palette with equal 12-point tree nesting. The phone drawer retains expansion while hidden.
A project destination must explicitly receive the same computer store as its workspace: SwiftUI
can resolve that destination at the outer navigation stack, beyond a destination-local environment.
The phone preview now passes the owner through that push, fixing the reproduced missing-store
crash. Opening a workspace selects its content without closing an existing main browser tab.
A native regression opens a project chat from a main browser and verifies its selected tree item.
This acceptance uses the private synthetic fixture; physical mobile rollout remains held.

## October 19 combined release implementation checkpoint

The new release implements direct expansion/navigation on workspace/project names while retaining
other branches across feature changes. Workspace-card pointer/keyboard reorder saves the same owner
order used by the sidebar. Tabs exposes Command/Ctrl-click or Select, a checkbox column and top-right
Hide/Move/Close. Move pickers use workspace headings and real project/default-project choices,
including unopened projects. Each item uses fresh owner revisions; failures stay selected and
successful items are cleared. Existing native sessions and document origins survive moves.

The disposable Electron bulk harness verifies selection, typed hide, cross-workspace project moves,
unchanged IDs/files/hidden state, and no hidden-page loads. Project source registration now uses the
actual project-aware session in isolated and production modes. Visibility actions commit through
the owner management boundary to avoid a first-sync race reverting local Hide before Move.
Multiple-window broker/unit and real Electron restart/close tests pass. This is source/fixture
acceptance; no new production installation or physical native workflow is claimed.
