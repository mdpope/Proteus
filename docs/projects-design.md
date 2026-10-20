# Projects — October 10 design proposal

**Superseded October 11:** The operator chose to evolve Workspaces into this concept, with complete
independent configuration and persistent chat/tab ownership. See [Unified Workspaces](workspaces-design.md),
BF-2026-10-10-17. No separate Projects section or workspace-preset layer is planned. The text below
is retained as earlier design history; production implementation remains held.

Historical status: proposed for operator review, BF-2026-10-10-14. Only documentation and a standalone
interactive preview are authorized. No production implementation, build, installation or
deployment. This proposal does not supersede the current behavior documented in workspaces.md.
Operator follow-up: hold this concept here; further Projects design will be handled separately.

## Why Projects and Workspaces both exist

Today, a workspace is a named reusable execution/context configuration: a starting directory,
additional accessible folders, and source discovery/loading settings. Chats capture their own
context snapshots. A workspace does not own a persistent collection of chats and browser tabs.
Source modes are partly global, not a complete independent per-project policy. See
`src/context.js`, `docs/workspaces.md` and `docs/context-loading.md`.

The earlier Projects discussion explicitly deferred a new schema (`docs/decisions.md`).
BF-2026-10-07-13 implemented browser transfer while deferring project destinations until their
relationship to Workspaces was resolved. Current `src/content-tabs.js` supports chat/team
descriptor scopes only. Existing tab persistence/remote sharing are foundations, not proof of
project support or account-wide project synchronization.

Proposed distinction: **a Project is the place you work; its workspace is the setup it uses**.
Reuse the existing context capture, source inventory and permission machinery. Add a persistent
project owner/container instead of implementing a second parallel context system. Existing
Workspaces remain reusable presets for standalone chats and new projects. Do not rename, delete
or automatically convert them during introduction.

Creating a project from a workspace copies the selected configuration references into a
project-owned setup. Source files remain in place; credentials and file contents are not copied.
Later project changes do not silently edit the preset or other projects, and later preset edits
do not silently alter established projects. An explicit Compare/apply preset update can come
later. Empty projects can be created and configured without an existing preset.

## Navigation and ownership

- Add Projects in global left navigation. Its list opens an existing project or creates one.
- Opening a project focuses its stable top-level app tab; opening it again does not duplicate it.
- Inside that tab, one child tab strip holds open project chats and browser tabs. A project chat
  rail lists all chats belonging to the project; closed chat tabs remain in this list.
- On phones, use a compact current-tab/count picker and a separate project chat sheet instead
  of wrapping a long desktop tab strip into multiple rows.
- Start in the last active child tab on this device. New projects start with an empty chat view.
- A project chat does not introduce another nested browser strip: its new links/browser tabs
  belong to the enclosing project. Keep origin-chat metadata for attribution and grants.
- Menu-created tabs, target-blank links, window-open requests and address-bar results inherit
  the enclosing project, matching BF-04. A user can explicitly choose another destination.
- Close a top-level project tab to hide it; it retains all children, history, setup and drafts.
  Closing a project or switching views never cancels its running chats. Archive is separate.
- Within-project tab close removes that open-tab descriptor, not the underlying chat. Reopen a
  chat from the rail; offer recently closed browser tabs. Closing a tab is a synchronized change;
  merely switching/hiding a project is device-local.
- All Chats continues to include project chats, marked with their project. Opening one focuses
  that project and child chat. Project rail defaults to recent activity; folder/item alphabetical
  ordering from BF-12 applies to the source catalog, not an imposed chat ordering.

## Project setup

The header exposes Setup with four sections:

1. **Folders:** starting folder, additional roots, logical labels, and per-device bindings.
2. **Sources:** Instructions, Skills, Agents and MCPs in the approved alphabetical Folder
   sections; the master query searches every section/folder, including collapsed groups.
3. **Chat defaults:** provider/model from live metadata, primary agent, allowed tools/features,
   and allowed additional agents. Existing agent ceilings and operation approvals still apply.
4. **Devices & sync:** setup revision, source readiness and selected execution host, plus explicit
   states for synced, pending, offline, missing binding and conflict.

Project-selected sources inherit automatically. New project chat requires a message and optional
title/provider/model override, not another sources picker. Chat details show the exact project
setup version and supplied sources. Opening a picker during a project chat edits project setup
by default, with that scope clearly named. Per-chat source exceptions are deferred; use a
standalone chat when a different setup is intentional. Provider/model overrides must support the
selected capabilities or fail visibly; no silent fallback or dropping mandatory sources.

Managed source policy: source inventory availability is reusable, but the project explicitly owns
its managed selection. Seed universal/default selections at creation and show them in setup;
do not silently inject later global additions. Explicitly disabled sources and source/agent
restrictions remain hard exclusions. Repository/provider-native mandatory instructions remain
applicable and visible where discoverable. Selection grants managed context, not arbitrary
operation approval; a selected MCP can still require connection credentials.

Saving setup creates a revision. New chats inherit it. Idle existing chats refresh before their
next turn; a running turn retains its captured context, with a pending-update indicator. Required
capability revocations must block new affected tool operations immediately, not wait for a
future turn. Provider reconnection follows existing context-refresh rules. Historical messages
are unchanged; changing settings cannot erase instructions already in conversation history.
Offer a fresh chat when the requested trust boundary requires clean context.

## Agent-assisted project changes

Project context supplied to an agent identifies the project, current setup revision, active
execution host, source bindings and available configuration capability. A user request such as
“add the reference folder to this project” should update this project's setup, then report what
changed and which chats/next turns inherit it. Do not change the global default workspace.

Provide a scoped inspect/update capability, validating the bound project ID, expected revision,
source identity, permissions and actual host path. The agent's ability to propose/apply authorized
setup edits is always available in project chats; this does not grant blanket access to arbitrary
folders, allow it to elevate its own tool ceiling, or bypass OS grants. Ask only for a genuinely
missing/ambiguous path or required native authorization. After success, show a change receipt
with Undo; Undo is another validated revision, not restoration over unrelated changes. An active
provider may need a context refresh/reconnect before the newly added resource is usable.

Current evidence supports plain-file workspace configuration edits and revision-protected UI
updates (`docs/workspaces.md`, `src/server.js`); a project-scoped agent API does not exist yet.

## Persistence and cross-device synchronization

Account project identity and membership must be independent of local filesystem paths or the
device running a chat. Every durable mutation has a stable ID/revision for idempotent retries.

| Shared project state | Device/host state |
| --- | --- |
| Name, description, chat membership, authorized chat history | Running provider session and process ownership |
| Browser URL/title, stable child IDs, open-tab order | Browser cookies, logins, storage, extensions and live DOM |
| Logical folder/source references and setup versions | Actual paths, filesystem grants, installed tools and MCP credentials |
| Validated configuration change receipts | Active child selection, local scroll, viewport and in-progress draft |

Do not put secret-bearing MCP configuration or local browser profiles into project descriptors.
Continue URL sanitization and existing authorized account/encrypted transport protections; do
not broaden who can read a chat merely because it belongs to a project. Source reference sync
does not copy local documents. Map stable logical references to authorized host-local bindings;
current canonical-path hashes need an explicit mapping layer, not reinterpretation as portable IDs.

Web/mobile can inspect project setup, history and browser descriptors and use a paired desktop
to execute chats. A second desktop can become an execution host after its folders, sources and
integrations are mapped and verified. Existing sessions remain pinned to their execution host;
host switching is an explicit new-chat/handoff operation, never a side effect of opening a project.
Source availability must be checked on the execution host, not the viewing phone.

Restore websites from URLs using the viewing device's own browser profile. They may require
sign-in and cannot promise the same unsaved page/form state. The existing Live Browser is a
separate explicit way to view a host's live page. Drafts survive restart on their editing device;
cross-device draft merge is deferred rather than overwriting text edited elsewhere.

Offline: cached project/history remains readable and local draft editing continues. Show pending
descriptor/setup edits; replay idempotently on reconnect. No sending a turn without an available
chosen execution host. Do not overwrite simultaneous same-field setup edits: show a conflict
review; merge disjoint edits where safe. Stable child IDs plus tombstones prevent closed tabs
from reappearing through late synchronization. An active page removed elsewhere gets visible
reconciliation with an option to retain a personal copy before discarding unsaved local state.

## Transfers

Browser Send tab / Send a copy destinations include another project, standalone chat, Team
where supported, or the main navigation. A copy creates an independent destination descriptor;
moving transfers one owner after the destination accepts it. Same-host live moves preserve the
page where supported. Cross-device copies restore a URL, not a cloned browser session. Do not
transfer live resources across hosts by pretending to move a local view. Revoke stale source
agent grants on move; project membership alone does not grant every agent control of every tab.
Concurrent control uses explicit per-tab ownership/leases consistent with existing permissions.

Moving an existing chat into/out of a project is a later bounded operation: retain history and
execution-host ownership, validate next-turn context and disclose the new scope. Do not duplicate
provider sessions, replay work or silently refresh an actively executing chat. Browser transfers
are in this design; chat transfer UI, shared project collaborators, terminals, project schedules,
cloud file replication and cross-device draft merging are deferred to avoid overloading v1.

## Review and acceptance

The interactive preview uses synthetic projects and local simulated state. It covers project
switching, project-specific chat lists, chat/browser child tabs, New chat, contextual link routing,
browser transfer, setup sections, global source filtering, agent-assisted folder addition, creation
from a workspace preset, and desktop/phone layouts. Device status is illustrative, not a real sync
receipt. Saved preview state demonstrates interactions only, not production crash durability.

Isolated browser rehearsal passed project switching with draft retention, source master filtering
and type refinement/empty states, setup inheritance, agent folder receipts, new chats, contextual
browser tabs, project copies/main-navigation moves, creation from a preset, phone chat selection,
and settings in dark/light appearance with 360px viewport fit. No provider or account API was called;
actual application persistence, multi-device synchronization and permissions remain unverified.

Before production approval: review the configuration ownership/defaults policy and project-level
browser strip. Implementation acceptance must cover source selection parity, safe revision conflicts,
tab transfer rollback, cold restart, interrupted sync/replay, offline host behavior, cross-client
restoration, disabled sources, context revocation, stale agent grants and source binding failures.
Recheck BF-04/08 tab ownership/crashes, BF-06/11 composer stability, and BF-12/13 source/history
filtering together. Actual web/mobile/second-desktop tests must establish synchronized behavior;
an isolated prototype or clean build cannot verify those workflows.
