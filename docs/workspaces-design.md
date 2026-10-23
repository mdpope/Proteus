# Unified Workspaces — October 11 revised design

Status: **implementation authorized October 11 and implemented in the 0.2.12 release candidate**.
See the [release ledger](2026-10-11-workspaces-release.md) for verification and installation gates. BF-2026-10-10-17 supersedes separate Projects BF-14. The operator rejected the first
preview's navigation and configuration simplifications. This revision replaces that design.
[Interactive preview](design/2026-10-11/workspaces.html) contains synthetic data and simulated actions.

## Navigation matches the application

Workspaces in the global left sidebar opens a feature page containing the complete workspace list.
It does not create a top-level tab or have its own tab strip. Existing content tabs remain in the
app chrome, unselected while viewing the feature page, as with the current Chats page.
Seven recent workspaces appear indented below Workspaces, using the existing recent-chat pattern.
Include each workspace's owning machine to distinguish identically named workspaces.

Opening a workspace creates/focuses a top-level tab named after it. Its child strip starts with one
pinned **Workspace** tab, equivalent to a standalone chat's pinned **Chat** tab. Inside Workspace,
**Chats / Configuration** buttons switch pages. Neither page creates another content tab.
Configuration is grouped into expandable sections rather than another full navigation row.
Its source-type buttons remain local filters within the source inventory. This is the recommended
resolution of the operator's concern about nested button navigation; the layout remains reviewable.

Reuse the shared Chats list with a stable workspace ID and an immutable workspace filter. The
workspace wrapper supplies the Chats/Configuration buttons, so the shared list does not need to
know how to render workspace configuration. Global Chats uses the same component with unlocked
filters. Keep each view's search/filter/scroll state separate. Adapt current module-global filters
and name-based workspace filtering to instance state and stable identity in the implementation.

## Chat identity and tab placement are separate

- Clicking a chat in the workspace list opens/focuses its named tab in that workspace's child strip.
- Creating a chat through the workspace navigation **+** keeps it in that workspace strip.
- Clicking in master Chats opens/focuses a top-level chat tab by default.
- The same chat can appear once in main navigation and once in its workspace navigation. These
  are views of one conversation: messages, draft, state and execution are not cloned.
- Right-click a global chat row or top-level chat tab for **Send tab to [workspace]**. Move the
  main tab representation and focus/create its workspace representation. If already present,
  focus it; never duplicate tabs for that chat within the same workspace. A visible action also
  exposes this operation for keyboard and touch users.
- Preserve the one-active-turn rule across both views. Closing a representation neither deletes
  the chat nor cancels a turn. Closing a workspace top tab preserves its child descriptors/order.
- Chat tabs use actual titles with the same ellipsis/full-title behavior as browser tabs.

Inside a workspace, links and browser/menu-created tabs inherit its child navigation. Outside a
workspace, preserve the existing originating-navigation rule. Browser transfer/copy keeps existing
transactional ownership safeguards. Terminal tabs are descriptors for owner-host processes;
restoring a descriptor never replays a command. Chat identity includes host and chat ID, not title.

## One workspace belongs to exactly one machine

Workspace identity includes its stable workspace ID and owning host. All its chats execute on
that host. Synchronizing a workspace to another desktop, web or mobile exposes the same workspace
and remote owner; it does not permit local chats from several hosts to enter it.

To reuse configuration on another machine, create that machine's own workspace version using an
explicit copy. Map paths/integrations and review approvals there. Subsequent configuration changes
are independent. Cross-machine copies do not transfer chats, running terminals, browser profiles, credentials
or approval grants. The list's same-machine **Copy** action prompts for a name, preserves the complete
configuration including approval templates and saved profiles under a new independent workspace ID,
and opens Configuration immediately. Existing host-local workflows and source configuration remain host-bound.

Synchronize authorized configuration, membership, history and portable tab references for access
from other devices. Local execution, website sessions and secrets remain on the owner. An offline
owner permits retained history/drafts but blocks new execution until reconnect. Workspace ownership
is shown as a fact, not an editable default-execution-host selector. Use as default is per owning
machine. Unsent chat drafts remain client-local; this release does not synchronize draft text across
devices. Configuration mutations use revision conflicts instead of silently overwriting newer saves.

## Preserve configuration, labels and semantics

The current UI in `public/shared/ui/features.js` is the baseline. The preview must not replace its modes
with invented binary availability settings or discard existing controls. Keep these in each
workspace's complete configuration, while incorporating accepted BF-12 folder sections:

| Existing control/label | Revised location / scope |
| --- | --- |
| Workspaces & context. | Configuration page heading within the selected Workspace tab. |
| Workspace folders | Expandable section, with all configured roots. |
| Starting folder | Consistent label for the existing command working-directory dropdown and current-root marker. |
| Use as default; Add folder; remove folder | Retained; default belongs to the owning machine. |
| Import VS Code | Existing import workflow available from list/configuration. |
| Sources across workspaces | Retained library concept/heading; configuration explicitly identifies the current workspace. Shared discovery never shares activation. |
| Source folder; Document | Retained add controls; document kinds remain Instructions / reference, Skill, Agent. |
| Every chat checkbox for a library folder | Retained, scoped explicitly to chats in this workspace. |
| Refresh; Last refreshed | Workspace-wide refresh retained, with per-folder Refresh added. |
| Editable context configuration; Copy path; Open | Retained; operates against the owning host, never the viewing client's unrelated path. |
| Instructions, Skills, Agents, MCPs | Existing type filters/counts retained; master filter searches all types/folders. |
| Source; Scope / status; Load in | Retained source paths, aliases, discovery/availability/connection status, mode dropdown and Open action. |
| Every chat; With workspace; Choose per chat; Disabled | All four modes retained. Every chat is automatic for this workspace; With workspace follows its source root; Choose per chat is an optional per-chat selection; Disabled excludes managed loading. |
| Favorites | Retained stars and favorites filtering without breaking alphabetical folder/item order. Favoriting alone does not load a source. |
| Discovery issues | Retained, with accurate independent-root errors/partial status from BF-16. |
| Source loading; Main agent (optional) | Retained in chat defaults, including Include every-chat and workspace defaults / Only selected sources. |
| Workspace tool approvals; Authorized folders and saved rules | Workspace-scoped modes, saved rules and folder grants; preserve explicit per-chat overrides. |

The library can discover references reused by several workspaces, but each workspace stores its
own library inclusion, source policies, favorites/default selections and approvals. Do not silently
change the legacy global meaning during migration: show the reviewed effective configuration being
captured for each workspace and preserve the original for recovery. Wording that formerly meant
global activation must visibly state its new workspace scope. No selected or loaded source should
disappear just because it is stored in a shared library.

Keep alphabetical folder sections and alphabetical entries, not the unselected folder-sidebar
alternative. The master name/path filter searches Instructions/Skills/Agents/MCPs together and
expands matching sections. Preserve source status and aliases, including missing/unsupported states.
**Set as starting folder** in each source-folder header targets this workspace's draft, adding its
root if needed; it does not enable all sources or grant trust. No Use in this chat feature.

Refresh buttons on configured workspace/source folders refresh only that root, show its timestamp,
and leave other roots' results intact. Global Refresh still exists. Independent scan budgets,
configurable exclusions/inclusions, cached background discovery, and honest incomplete status are
BF-16 requirements. Selection/approval changes must not require a full filesystem scan.

Browser, file read/edit, commands and terminal features are always available. Remove the first
preview's feature enable/disable controls. Availability does not bypass tool approval or OS/provider
permissions. Retain model/effort/context metadata from refreshed provider catalogs, not hardcoded lists.

## Inheritance, isolation and recovery

New chats inherit their workspace's complete setup without repeating its configuration. Optional
Choose per chat entries remain available for explicit exceptions. Chat details expose inherited
workspace configuration and version. A chat-only folder grant remains chat-only (BF-15).

Store approvals by workspace ID, owning host, provider and canonical resource/integration identity.
Sharing a source folder or opening another representation of a chat does not copy or widen grants.
A configuration save affects only the current workspace. Keep unsaved drafts when switching to
other workspaces/pages; make Save and Discard explicit. Existing active turns retain captured
execution settings; revocations block future approval decisions immediately. Refreshing context
retains conversation history and records the effective revision change.

Migrate stable workspace IDs in place, associating chats using recorded host/workspace identity.
Never infer membership from matching names or folder paths across machines. Leave ambiguous legacy
records unassigned and visible globally for review. Agent-assisted configuration changes target the
current workspace/owner and validate revision, path and scope; chat-only requests remain separate.

## Preview and implementation acceptance

The preview models list/navigation, shared chat views, contextual creation, right-click transfer,
isolated source modes/approval drafts, folder refresh and synthetic file-picker/source operations.
It is not evidence of live providers, permission enforcement, discovery, process recovery or sync.
The historical preview remains synthetic. Production implementation and its separate desktop/web/
mobile verification are recorded in the release ledger; preview results alone do not establish rollout.

Implementation acceptance checks the retained-control inventory above, every mode's actual
provider delivery, one-chat execution across two representations, workspace-tab deduplication,
owner-host enforcement, migration, default selection per host, approval revocation, restart recovery,
remote/offline behavior and device edit conflicts. Test desktop/web/mobile and keyboard/touch paths.

Preview checks on October 11: isolated Chromium rehearsal passed seven recent entries, eight-item
full list with no feature tab, pinned Workspace/Chats/Configuration navigation, all four source
modes, independent saved configuration, folder-only refresh, master-chat main routing, right-click
transfer deduplication, shared chat draft, workspace-plus chat creation, document-source dialog,
master source filtering and 320/360/736 layouts with no document horizontal overflow. Desktop
dark/light screenshots were inspected; no JavaScript errors. File imports, source opening, scans,
provider execution and synchronization are represented with synthetic dialogs/state only.
