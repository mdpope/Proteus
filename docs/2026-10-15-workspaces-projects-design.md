# Workspaces, Projects, sources and permissions — October 15 design

Status: **design and clickable synthetic prototype only**. The operator authorized design
review and rehearsal, not application implementation, builds, installation, deployment, live
migration, source imports or permission changes. Queue entries are BF-2026-10-15-10–12.
[Prototype UI rehearsal](design/2026-10-15/prototype-validation.md) passed in isolated Chromium. It cannot
establish production persistence, provider enforcement or cross-device workflow acceptance.

- [Clickable prototype](design/2026-10-15/projects-workspaces.html)
- [Permission boundaries and proposed copy](design/2026-10-15/permissions-review.md)
- [Current workspace behavior](workspaces.md)
- [Prior navigation review](tab-navigation-review.md)

This proposal revisits Projects as organizational children of Workspaces. It supersedes the
older proposed Projects-as-independent-configuration relationship for this design only; it
does not claim that the installed application has changed.

## Ownership and navigation

| Object | Owns | Does not imply |
| --- | --- | --- |
| Owning computer | Source library, execution services and host-local resource identities | Another viewing device can execute its sessions locally |
| Workspace | Working folders, starting folder, defaults, source selections, permissions and optional workspace-level resource tabs | Moving an existing chat adopts those defaults |
| Project | Organization and project chat/resource-tab placement within one workspace | An independent configuration or permission layer |
| Chat | Conversation identity, history, drafts, captured configuration and session | Display placement defines execution configuration |
| Tab/view | Resource placement, order and visibility | New content access, a copied session or new resource identity |

Every workspace has a required default project, initially **General**. The app retains a
default workspace per owning computer for newly unscoped chats; those chats enter that
workspace's default project. Existing Unhoused chats remain Unhoused. Stable IDs, not labels,
select defaults, membership and execution owners. Renaming General cannot break routing.

The sidebar follows the existing line-navigation hierarchy: workspace entries sit under
**Workspaces**, with seven recent projects slightly indented beneath each workspace and **More**.
They must read as children, not separate sidebar sections. The workspace name appears in the
application's top-level navigation. Its local strip starts **Projects**, **Chats**, **Tabs**,
**Configuration**, pegged to the left and non-closable. There is no extra generic Workspace tab.
Opening a workspace defaults to Projects. Individual projects are not sibling workspace tabs.
The Workspaces collection has **Workspaces** and **Chats** local tabs; the latter includes
workspace-associated chats. Use the existing four-box collection icon, panel-shaped workspace
icon and a folder icon for projects.
Each project row expands to seven recent chats and **More**. Complete lists, filters and archived views remain
available; recents are not the inventory. Observations and polling do not manufacture recency.

Opening a project switches to its own view with a pinned **Project** root and a flat strip of peer
chat, browser, terminal and document tabs. The Project root switches between project-filtered
**Chats** and **Tabs**. Chats do not introduce another child strip. Workspace configuration
remains one workspace-owned page, not a copied project setup screen.

Workspace-level browser, terminal and document tabs may open after those fixed tabs in the
same strip. They are ordinary closable resource views and can remain at workspace level without
a project. **Tabs** aggregates these resources plus the workspace’s project tabs, with
location/type filters. Creating a resource from the workspace view keeps it there; creating one
inside a project or its chat uses that project. Chats created from the workspace use its default
project, and existing chat rows navigate into their actual project. Each resource still has one
explicit placement; moving it between workspace/project views preserves identity and access.

This final October 15 clarification supersedes the intermediate generic Workspace tab and
keeps workspace-created resources at workspace level. Chat lists reuse the current chat-index
presentation: type tabs, search, computer/provider/status/workspace/project/schedule filters,
dates, archive visibility and refresh. Workspace views lock Workspace; project views lock both
Workspace and Project. Each scope retains its own filter state. Scoped lists open chats in their
canonical project; global Chats also supports quick views.

Chat permission requests appear in the conversation immediately above the composer. The
action, target and reason precede once/chat/workspace scope; decisions leave an Activity receipt
and retain the draft. Details → Permissions and the composer mode button open the same controls
for captured defaults, chat overrides, folder access and remembered grants/revocation. The
prototype opens on this chat review after the navigation correction.

Global Chats supports **Open quick view** at application level and **Open in project**. A quick
view is a view alias of the same owner/chat identity, with its original workspace/project
breadcrumb and a route back to the project. It does not rehome the conversation. Drafts, history,
session and the one-active-turn lock remain shared. Closing a quick view removes only that view.
Resources opened from a housed chat's quick view enter its canonical project. An Unhoused chat
uses the retained application-level Unhoused area rather than silently adopting the default.

## Source library and working context

Engine Room **Source Library** registers reusable source folders for the owning computer:
**Add source folder**, path/status/usage and **Remove**. Existing individual-document
registrations and role overrides must remain represented during migration. There are no load
modes, Every chat toggles, write grants or workspace settings in this library. Adding a folder
authorizes source-definition discovery only; it does not add a working folder, execute scripts
or connect imported MCP servers. All examples in the prototype are synthetic.

Workspace Configuration selects which discovered instructions, skills, agents and connections
become defaults or remain optional. New chats inherit the workspace's selections and can choose
chat-only sources. Favorites remain navigation aids. Selecting a main agent differs from making
an agent available. Source-loading policy and filesystem access have separate representations.
Preserve existing Every chat/With workspace/Choose per chat/Disabled semantics when simplifying
copy; do not collapse distinct modes or silently enable previously disabled sources.

Removing a used library registration shows its affected workspaces. Saved selections and source
identities remain as retained unavailable references, with re-add/remove-selection recovery;
historical captured contents remain intact. The item is no longer offered for new selection.
Do not silently omit required unavailable context on a later refresh/turn, reload removed content
from a historical snapshot as if current, revoke unrelated working-folder access or interrupt
an active captured turn. Removing discovery registration is distinct from revoking access.

Working folders stay workspace-owned. **Add working folder** shows its owner/path and explicit
**Read only** or **Read & edit** access before saving. This action may record the corresponding
durable scoped grant; a starting-folder selection cannot upgrade it. Starting folder means
where commands start, not permission to execute commands. Folder removal and access revocation
are distinct actions with their effects disclosed.

Selected skills/agents can request narrow **helper-file reads** for their package directory or
documented helper root. A discovery repository is not automatically the helper root. Outside
references require existing applicable access or a new narrow request. Reading a script is not
authorization to execute it, and source selection never implies write access.

## Permissions and bounded Autopilot

The proposed primary choices are **Autopilot** and **Ask for new actions**, with existing broad
**Unrestricted tool approval** explicitly identified in advanced settings. This proposal does
not rename today's broad Autopilot into a bounded guarantee or activate a different mode during
migration. Preserve legacy effective modes until an explicit reviewed change.

Proposed bounded Autopilot continues within actual approved resources and actions. It asks for
new access, unknown effects or consequential actions not already authorized. Existing valid user
authorization must suppress redundant prompts. Show capability limits by provider/integration;
a provider that cannot enforce command containment must not display a bounded-execution promise.

- File reads/edits require the resolved target to be inside the applicable canonical scope,
  respecting symlinks and read-only boundaries. Changing automation mode does not add write trust.
- Commands, including tests/builds, require actual execution permission and truthful runtime
  boundaries for writes, environment and network. A command name or terminal cwd is insufficient.
- Connected tools need a trusted adapter or independently enforced scope for their real effects.
  Tool names, model assertions and MCP read-only hints are insufficient authority. If a provider
  enables an entire server, disclose that breadth rather than promising per-call read-only access.
- Saved rules bind owner, authenticated connection/configuration identity, action/effect,
  destination/resource and consequential argument constraints. A different recipient, customer,
  environment or deletion scope can invalidate the match.
- Sending, publishing, deployment, purchases, access changes and durable deletion proceed only
  when existing authorization covers the concrete action/target/scope; otherwise present the
  prepared result for one necessary approval. Mandatory sign-in, enterprise approval and sandbox
  expansion boundaries remain enforced.

Approval prompts show action, consequential target and why approval is needed before scope
controls. **This request / This chat / This workspace** explains duration and affected future
work. Already-granted operations show an activity receipt and **View permission**, not another
question. Preserve request identity and one-time consumption across retries. A permission change
revalidates affected resources without promising that today's coarse fingerprints already support
selective retention. Revocation blocks subsequent affected operations; it cannot undo prior work.

See the permission review for the inspected implementation gaps, provider differences and full
copy. These are proposed boundaries, not claims of new tools, grants or live enforcement.

## Movement and resource lifecycle

**Move chat** changes organizational workspace/project and its canonical navigation placement.
It preserves captured configuration, source versions, permissions, draft, history, active turn,
provider session and host. Copy: **Moves this chat's location. Its files, sources and permissions
stay the same.** Offer **Review destination settings** separately; adopting those settings is an
explicit reviewed next-turn change. Deleting the former workspace cannot erase the surviving
execution profile or resurrect it as a visible workspace.

Resource association is independent of placement. Review explicitly associated resources when
moving a chat; merely neighboring tabs are not implied descendants. **Move tab** preserves the
same browser profile/Back-Forward history, live terminal PTY/tmux/session/output, and document
source/version/authorization origin. It never replays startup commands or turns placement into
a content grant. Cross-host movement is not a hidden execution handoff.

**Hide**, **Unload**, **Close**, **Archive**, terminal **Detach** and terminal **End** remain
distinct. Visibility and load state are independent; restoring visibility need not load a page.
Initially unloaded imports must not load merely to register them. All-hidden projects remain
reachable through their Tabs list. Closing a chat view does not cancel its turn or close peers.
Browser close accounts for unsaved/active work; viewer close preserves source files.

## Complete migration and recovery contract

Migration is proposed organization/placement metadata transformation, not resource recreation.
Inventory every owner, persisted descriptor and lifecycle state, including hidden containers,
unloaded resources, non-open/archived chats and records absent from current UI caches. Preserve
unknown fields. Record a complete old-to-new identity/placement manifest and original provenance.

| Existing state | Mapping and preservation |
| --- | --- |
| Existing workspace | Keep its host/ID and complete configuration; create a stable General project and default-project reference. |
| Direct workspace chats | Place in General, retaining IDs, relative order, titles, dates and view state. |
| Direct workspace browser/terminal/document tabs | Keep workspace placement after fixed tabs, preserving IDs, order, load/visibility, sessions and access. Do not force into General. |
| Workspace chat descendants | Flatten beside the chat in its project; retain origin-chat links and resource authorization identities. |
| Main chat aliases | Keep deliberate quick views of canonical conversations; never duplicate sessions, messages or drafts. |
| Existing Unhoused chats | Remain Unhoused and discoverable globally, including archived chats; no default-based reassignment. |
| Main non-chat tabs and Unhoused descendants | Retain an application-level Unhoused tabs area with origins and relative order; flatten only placement, without creating implicit chat tab groups. |
| Team roots, pinned features and descendants | Preserve the Team utility scope and its existing resource ownership; do not invent workspace/project membership or copy grants. |
| Hidden/unloaded views | Preserve independently and include in complete inventories and affected sets, even when their parent is hidden. |
| Closed/archived chats | Keep lifecycle/history/membership/settings; migration must not reopen views or unarchive conversations. |
| Schedules and archived execution profiles | Retain source-owned JSON, unknown fields, IDs, activation, dependencies, history and execution configuration. Do not silently rewrite or activate schedules. |
| Browser and pending navigation state | Preserve full stacks, profiles, grants, pending operations, tombstones, operation IDs and unresolved retry receipts; matching URLs are not duplicate identity. |
| Terminals and viewers | Preserve sessions/process ownership/output and document source/version/access, even if their new presentation parent differs. |
| Client drafts and layout | Preserve drafts, attachments, pending answers, selection, scroll and local visibility; conflicting drafts stay recoverable instead of text last-writer-wins. |
| Repeated source registrations | Deduplicate verified host/canonical catalog metadata while retaining aliases, document roles and independent workspace modes/selections. |

Ambiguous ownership remains visible for review; matching names or paths cannot establish it.
Intentional aliases and distinct resources sharing a URL survive. Preserve original opened dates;
unknown dates remain unknown. Existing deliberate close tombstones stay authoritative.

Before future implementation acceptance, validate the complete mapped state, publish atomically
with revision checks, and make retries idempotent using durable migration/operation receipts.
Handle concurrent owner changes and partial failure without rerunning actions. Gate or translate
old-client writes so they cannot resurrect closed layouts or discard project membership. Use the
existing two-generation recovery policy for any later authorized installation; prototype work
does not justify a live-data backup. No real migration is authorized by this document.

## Agents and desktop/web/native parity

Use one host-owned service for UI, internal agents and authenticated external MCP operations.
Inventory actual capabilities and complete paged owner state; match fresh stable IDs/revisions;
act within existing authorization; verify owner results. Metadata/organization permission is
distinct from reading another chat, browser automation, terminal access and document access.
Do not edit application-data files as a substitute for unavailable tools.

Viewing clients preserve the same hierarchy, lifecycle and permission meanings. Phone layouts
use compact project/tab pickers and accessible action sheets rather than extra nested strips.
Offline owners permit cached reading and local draft editing but cannot falsely report execution
or a completed mutation. Remote resource references do not imply transferred cookies, local
processes or host filesystem grants. Show owner-only actions and unsupported capabilities.

## User journeys and acceptance

Evaluate these journeys with synthetic data in the clickable prototype:

1. Add/remove a Source Library registration; inspect affected workspace references without
   changing workspace selection or granting write access.
2. Add a working folder with explicit durable read/edit scope; choose a different starting
   folder without silently changing permissions.
3. Choose workspace sources and a main/available agent; create an inherited chat, add a chat-only
   source and inspect narrow helper reads and connection approval requirements.
4. Switch workspaces/projects, expand seven recent chats, use both More routes, and open the
   pinned project Chats/Tabs views with correct filters.
5. Verify the workspace name appears in app navigation above fixed Projects/Chats/Tabs/Configuration.
   Verify Workspaces/Chats collection tabs and consistent chat lists with contextual filter locks.
   Create workspace browser/terminal/viewer tabs after it, close a resource without closing fixed
   views, create project resources as project peers, and inspect the aggregate location filter.
6. Open the same chat in a project and a global quick view; edit a shared draft, switch views,
   close one view and retain the original association/session.
7. Move a chat between differently configured workspaces, retain its effective settings and
   inspect the separate destination-settings review. Move browser/terminal/viewer samples
   while retaining their displayed identity, history, session and authorization origin.
8. Exercise visible/hidden and loaded/unloaded independently, all-hidden recovery and typed
   close/archive/detach/end behavior with honest consequences.
9. Compare once/chat/workspace approval scope, an already-approved activity receipt, an
   unsupported bounded-command provider and a changed connection needing only relevant review.
10. Inspect synthetic migration accounting for main/Team/workspace/chat descendants, aliases,
    Unhoused, archived, hidden/unloaded, schedules and retry receipts with no discarded records.
11. Repeat supported operations with keyboard/touch and desktop/narrow layouts; inspect offline
    owner/conflict feedback and the equivalent simulated agent action/result.

Keep **Design prototype — synthetic data; no live permissions changed** visible. Rehearsal
results belong in the main task's verification record after execution. Real implementation
acceptance separately requires restart/retry/partial-failure/conflict tests, actual provider
source delivery and enforcement, live resource continuity, legacy-client compatibility, and
desktop/web/native owner verification. A successful prototype or clean build proves none of those.
