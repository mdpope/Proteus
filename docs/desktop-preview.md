**October 18 production promotion:** The operator authorized the reviewed feature set for
production desktop and web. The isolated preview remains supported for future design experiments;
its data and pending approval are retained independently. Historical preview-only status below
belongs to those builds. See [production rollout](2026-10-18-projects-release.md) for current
migration and installation status.

# Isolated desktop design preview

The operator authorized this desktop-only implementation on October 15, 2026 after reviewing the
clickable workspace/project and permission designs. Production replacement, migration of existing
workspaces/chats, web/mobile and the remaining release intake are still held.

## Launch and isolation

Run `npm run desktop:preview` for the development shell. Package a distinct app with
`PROTEUS_DESKTOP_PREVIEW=1 npm run package:mac`; the output lives under `dist/design-preview`.
Packaged metadata enables preview mode without needing a shell environment. An unsigned local
staging build can use `PROTEUS_MAC_UNSIGNED=1`; this is not a distribution-signing claim.

Proteus Design Preview has a different bundle ID (`org.proteusapp.proteus.design-preview`), app name,
single-instance domain, Electron profile and random loopback port. Its default private root is
`~/Library/Application Support/Proteus Design Preview` with `app-data`, `electron`, `codex`,
`workspaces` and `source-library` children. It does not register the production `proteus://` handler.
The synthetic browser profile uses mock Keychain storage and does not import production cookies.

Bootstrap accepts an empty directory or its own recognized regular marker, rejecting production
paths, unknown populated directories and symbolic-link targets. Existing experiments are retained
on relaunch. Synthetic fixtures are exclusive creates, never overwrites. There is no production
backup/restore or data migration in this build because production is not replaced.

Only the existing Codex `auth.json` is copied once into the private Codex home with mode 0600.
Native sessions/config and credentials are not copied into this repository. Existing preview auth
is not overwritten. Codex runs against the private home, using refreshed account/model metadata.
No shell-wide HOME or CODEX_HOME is changed. New Codex chats incur real provider usage and can
perform actual authorized operations; the sample completed chats are explicitly synthetic and
report no observed provider usage. Rehearsal remains available as a separate provider.

## October 18 iteration — verified desktop preview

Source library registration now awaits scanning before returning fresh results. Every workspace's
Configuration can select the registered entries. Add/Rescan and folder Refresh report counts and
complete, empty, partial or failed results, including readable errors. Preview library discovery
covers nested instructions, skills, agents and supported MCP definitions within existing exclusions;
MCPs stay Off by default. Registration grants no file/tool access or execution roots.

Configuration puts **Load in** and **Apply to all** beside **Set as starting folder**. The chosen
mode is applied once to all currently discovered sources in that folder group, including items
hidden by search/type filters. Users can then override each item. Favorites, other modes, unknown
configuration fields and revision protection remain; later discoveries retain their own defaults.
This is a per-workspace bulk edit, not an inherited folder policy.

Engine Room and its sections now scroll below the entire workspace tree, separated by a divider.
AI allowance remains below the navigation with its own divider. **Collapse all** beside Workspaces
clears workspace/project expansion and extra paging while preserving selected content, drafts and
native browser state. **Open data folder** is in Engine Room → **App settings**.

Chat permissions now show **Use workspace / Ask / Saved permissions / Auto-approve tools** inline,
a separate **Auto-approve read-only tools** checkbox, and working-folder **Ask / Read / Read and
write** choices. Remembered actions and their removal distinguish this chat and its continuations
from the matching workspace configuration. Use workspace follows the original permission origin;
Ask pauses saved reuse without deleting grants. Resetting a chat exception exposes workspace
defaults. Read-only approval relies on provider metadata, not shell-command safety inference.

In preview Codex Saved permissions, explicit read/write access for the canonical starting folder
allows workspace-write on the next explicit turn. An external grant alone cannot authorize that
folder. Ask remains read-only; native policy validation, protected requests, no implicit network
and no implicit temporary-directory writes remain. Additions leave a running narrower sandbox
unchanged; reductions require explicit continuation without replay. Selecting a Codex MCP server
authorizes its available tools for the turn, not individual-call approval. Providers may perform
native reads without asking. See [permissions](permissions.md) for the complete boundaries.

**Validation at documentation freeze:** the full runtime suite passed 689 tests; the additional
permission presentation check and `npm run check` passed. Disposable Electron permission controls,
source controls and Engine navigation checks passed. Source-specific coverage includes realistic
nested AGENTS/skills/agents/MCP fixtures, all-workspace discovery, filtered bulk changes, individual
overrides, future discoveries, errors, favorites/unknown fields and revision conflicts. Engine
checks cover scrolling, Collapse all without resource/draft changes, resizing, collapsed overlay
and the isolated data-folder target. These use temporary synthetic profiles. Updated rich-sidebar
and tab-polish regressions also passed. Production, web and mobile remain held.

**Exact-package and live acceptance:** `dist/design-preview-controls`, revision
`ec8b213d382e+dirty.bc584feea48b`, passed packaged desktop acceptance and was reopened.
All 235 runtime files and build inputs match fingerprint
`bc584feea48b3e5d2bc74699439c63c84276b356ecc2bf933836020bf3755333`.
This is unsigned local staging, not a distribution-signing claim.

`test/preview-permission-live.mjs` passed with the real isolated Codex provider, freshly advertised
model/effort and a new disposable Permission lab workspace. Three retained chats verified five
native file edits: Allow once saved no grants and the next edit asked again; Remember this chat
saved only that conversation's folder access and a subsequent explicit turn reused it; a sibling
still asked, remembered the workspace grant, and a third matching chat using workspace permissions
reused that grant without prompting. Verified exact file bytes, three real approval request IDs
and receipts, stable provider sessions, preserved unsent drafts, and native read-only → workspace-write
turn-context evidence. The working-folder grant alone did not authorize another chat until the
workspace choice was made. Other workspace permissions were unchanged. Test prompts and receipts
remain private in the preview data home, not this repository.

After restart, the preview has four workspaces, eight projects and eight chats (the three added
chats belong to the new lab), and the original seven browsers. All prior identities, browser
placement, appearance settings and draft hashes were preserved. Native window inspection confirms
the open lab chats and inline permission controls. Retained the new controls bundle and immediate
prior project-delete bundle; retired the inactive activity bundle under the two-generation policy.
Removed 611,146,503 file bytes; measured free-space increase was 629,374,976 bytes. No live-data
backup was created.

## Available design

- Workspaces collection: workspace cards directly; no duplicate Chats tab.
- Named workspace: fixed Projects, Chats, Tabs and Configuration pages; optional resource tabs.
- Feature tabs use their existing icons; Open tabs uses the shared double-bubble chat icon.
  Selected titles are white for all tab types, with slightly brighter inactive tab/menu labels.
  Project rows and their right-side expanders share the group surface.
- Project Open tabs supports dragging from a title or row space to reorder siblings.
  Workspace aggregate Tabs is not reorderable. Alt+Shift+Up/Down works from a focused title. Filters do not alter ownership, and
  cross-project drops are rejected; Move remains the explicit placement operation where available.
  Normal title clicks, action buttons and column resizing retain their behavior. Preview arrow
  buttons are removed; production retains its existing controls.
- Nested projects: independent flat tabs, default project, create/rename/default selection, seven
  recent chats with More, contextual locked workspace/project filters and global quick views.
- Resize the sidebar from its right edge. Width is stored in application appearance settings,
  survives restart and is shared by pinned navigation and the collapsed popover. The popover
  covers the main content without moving it. While open, the existing browser-overlay mechanism
  temporarily hides native browser panels; pages remain loaded and restore when overlays close.
  Correct native-browser compositing beneath renderer overlays remains deferred.
- Grouped sidebar follows the latest sampled reference: sidebar `#121512`, active workspace
  `#181d19`, active project/feature `#1d231e`, selected row `#31392c`, accent `#bedc93`.
  Selected rows have a curved accent edge; inactive icons/counts use `#6e786f`, selected text
  uses `#d4e7b6`. Preserve all icon shapes and favicons. Selected tab icons use the green accent
  in each navigation bar while titles stay white. Inactive projects blend into their workspace.
  Panels use balanced, shallow insets. Active feature recents share one project-style panel
  around the heading and items, with transparent heading/list surfaces inside. The horizontal
  divider below Workspaces is restored. Counts remain plain except the
  filled nonzero Needs attention badge. No vertical hierarchy guide lines. Workspaces
  is followed by a separator and persistent workspace groups, then Engine Room. All
  groups start collapsed; opening names navigates independently of expanding their children.
  Workspace headers show computer name and total project count. Project lists combine their
  chats and resource tabs, with one entry per chat, type icons/browser favicons, two-line titles,
  relative activity age and total item counts independent of paging. The most recently active
  items come first; selection, focus and reading do not advance activity. Listing never opens/unloads resources or changes tab-strip order.
  Closed archived chats stay out of recents; an existing project tab for an archived chat stays
  discoverable without changing its archive state. Unknown activity times display an em dash;
  activity under one hour displays `<1m` or whole minutes, then hours/days for older activity.
  Expansion survives feature changes. Lists start at seven and More adds four. Closing a
  project or leaving the feature resets extra item paging; closing a workspace resets its
  extra project paging. Collapse all clears both levels and their paging. Engine Room follows the
  full workspace tree in the same scrolling navigation, with a divider above it. AI allowance
  remains fixed below the navigation with its own divider. Open data folder is in App settings.
- Sidebar feature, workspace and project labels use 14px type. Individual chat/resource item
  titles, counts and computer metadata keep their existing sizes.
- Active Chats, Internet Searches, Schedules and Needs attention use the active-button and
  selected-item treatment in continuous panels, without top-level expanders. More adds four and resets when leaving
  the feature. Chat titles wrap to two lines with computer name beneath them. Schedules retains
  its existing recent scheduled-chat entries; this does not change schedule activation or ordering.
- Real chat moves retain native session, captured folders/sources/permissions and the shared draft.
- Engine Room Source library registers and scans discovery roots, with Rescan and result feedback.
  Entries are selectable in every workspace; workspace/chat choices decide what loads. Configuration
  offers one-time folder Apply to all modes, preserving individual overrides. Registration does not
  grant file/tool access or add roots to execution directories.
- Chat requests show action, target and short reason with Allow once / Deny / Remember.
  Permission management stays in the existing side panel; the composer shortcut is removed. The panel
  shows the origin, inline Use workspace/Ask/Saved permissions/Auto-approve tools choices, an
  independent read-only checkbox, working-folder access and remembered actions. Help contains
  explanations; Workspace permissions opens the original workspace's Configuration.
  Bounded Autopilot remains unavailable and is no longer presented as a disabled main control.

## October 16 permission model and navigation review

Historical review: the October 18 section above supersedes its mode controls and Engine Room
placement; the next-turn access-addition and protected-request boundaries remain.

Workspace folders identify working files. Source selection supplies instructions, skills and tools.
Neither is a blanket approval to execute commands or change connected services. Approval has three
scopes: this request, this conversation and its continuations, or matching workspace configurations.
Moving a chat changes its organization; it preserves the original execution and permission context.
Removing an override can expose a workspace default again. Therefore whole-profile removal is
labeled Reset to workspace defaults, and inherited folder access remains visible after a chat
exception is removed. Ask suspends saved workspace permissions instead of erasing them.

Provider behavior differs in this repository's adapters. Codex uses its native read-only or
explicit workspace-write sandbox plus requests forwarded to Proteus; selecting an MCP connection
authorizes that connection for a turn rather than giving Proteus individual-call control. Copilot
and Claude forward supported tool requests through their integration hooks. Common UI labels
describe Proteus policy; they do not claim identical operating-system containment across providers.

The reported broken-chat behavior was reproduced with Engine and Codex RPC fixtures: adding
workspace/folder trust saved the grant and also interrupted the current turn. The preview now
allows proven access additions without changing the running native sandbox, adopting new bounds
on a later explicit turn. Actual reductions, mixed replacements and unknown bounds still stop
the current turn, invalidate obsolete approvals, and require explicit Continue; no actions replay.
First-time Remember also preserves inherited folders/rules instead of replacing them with an
empty override. These execution changes are opt-in preview behavior only.

The operator selected Workspace panel after comparing alternative group shading. Workspace
panel backgrounds and shallow grouping recover width for two-line item names. Active feature
highlighting is independent of expansion: Workspaces stays highlighted within workspace/project
views, but navigating elsewhere never hides or collapses the tree. Extra paging resets on feature
departure; collapsing a workspace preserves its child expansion while resetting project paging.
Explicitly collapsing a project resets its extra items. These are
preview navigation preferences, not resource ownership or execution settings.
The selected treatment groups the workspace on one surface, distinguishes project headers and
highlights the selected item without a left rail. The distinction between ancestry and selected location follows the separate parent and leaf states in
[Carbon's navigation specifications](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/specifications);
[Fluent's tree guidance](https://fluent2.microsoft.design/components/web/react/core/tree/usage/)
also supports independent expanders and readable wrapping labels.
Research favors visible left-aligned labels and avoids duplicated navigation ([NN/g](https://www.nngroup.com/articles/vertical-nav/));
Carbon distinguishes product navigation from deep trees and recommends shell navigation with
breadcrumbs for deeper structures ([Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/tree-view/guidelines)).
Atlassian's current navigation uses expandable menu items instead of its older nested-view pattern
([migration guide](https://atlassian.design/components/navigation-system/migration-guide)).

Non-chat project-resource moves and workspace deletion are unavailable in this preview. Project
placements currently use the desktop session; the cross-client owner protocol still needs project
scope before those operations or web/mobile can be implemented. Production migration, complete
agent project lifecycle management and bounded Autopilot enforcement remain deferred. Existing
browser permission/profile behavior is unchanged; the earlier request to remove profile barriers
remains queued.

## Verification

### October 17 revision

- Restored Workspaces divider, 14px sidebar labels and continuous feature panels: `npm run check`
  and disposable Electron sidebar/overlay acceptance passed. Visually reviewed the divider and
  Chats heading/items sharing one project-style panel without an inner list box. Individual leaf
  text sizes remain unchanged. Exact unsigned package `ec8b213d382e+dirty.69050fe61a22` under
  `dist/design-preview-groups` passed retained-profile acceptance and reopened with verified source
  hashes, three workspaces, six projects, five chats, five browser identities/placements, drafts,
  appearance settings and available Codex. Kept this and the prior type bundle; retired the obsolete
  reference bundle. No full data backup was made. Cleanup increased free space by 629,620,736 bytes
  (including concurrent disk activity).
- Label typography: sidebar feature, workspace and project labels increased to 15px; individual
  chat/resource titles, metadata and counts keep their existing sizes. `npm run check` and exact
  packaged desktop acceptance passed for `ec8b213d382e+dirty.0ce8d63c460d` under
  `dist/design-preview-type`; the rendered sidebar was visually reviewed. Reopened and verified
  source hashes, three workspaces, six projects, five chats, five browser identities/placements,
  drafts, appearance settings and available Codex. Retained this and the previous reference bundle;
  retired the obsolete flat-nav bundle. No full data backup was created. Cleanup increased free
  space by 630,722,560 bytes (including concurrent disk activity).
- Latest reference palette: `npm run check`, the disposable Electron sidebar resize/overlay
  suite and tab-polish suite passed. Verified shallow balanced insets, continuous active panels,
  unboxed feature lists, rounded selection edge and green selected icons with white titles in
  main, workspace/chat and Team Tools navigation. Existing icon paths and favicons are preserved.
  Exact unsigned package `ec8b213d382e+dirty.da3c52c727c8` under `dist/design-preview-reference`
  passed retained-profile acceptance, including sampled RGB surfaces, selected-edge geometry and
  tab icon colors. Reopened it and verified source hashes, three workspaces, six projects, five
  chats, five browser identities/placements, settings, drafts and available Codex. Kept this and
  the previous flat-nav bundle; retired the obsolete olive bundle. No full data backup was made.
  Free space increased by 630,837,248 bytes during cleanup (including concurrent disk activity).
- Unboxed feature lists and lighter active project: `npm run check` and the disposable Electron
  sidebar resize/overlay suite passed. Verified transparent, borderless feature wrappers and
  child lists while retaining active-button and selected-item fills, equal insets, saved width
  and native browser identity. Exact local unsigned package `ec8b213d382e+dirty.bb40e6285e87`
  under `dist/design-preview-flat-nav` passed retained-profile acceptance, including the slightly
  lighter active project and unchanged olive selection. Reopened it and verified source hashes,
  three workspaces, six projects, five chats, five browser identities/placements, settings and
  drafts, with Codex available. Retained this and the previous olive build; retired the obsolete
  chat-palette bundle. No full data backup was created. Free space increased by 629,825,536 bytes
  during cleanup (including concurrent disk activity).
- Selected olive override: sampled `#46503f` from the operator's latest reference. `npm run check`
  passed. Exact local unsigned package `ec8b213d382e+dirty.b4841b8bcb32` under
  `dist/design-preview-olive` passed retained-profile acceptance, including exact selected-color
  comparison and the remaining chat-surface mappings. Reopened it and verified source hashes,
  unchanged settings/drafts, three workspaces, six projects, five chats and five browser
  identities/placements with available Codex. Kept this and the immediately previous chat-palette
  build; retired the obsolete balanced build. No full backup was created. Cleanup increased
  free space by 613,969,920 bytes (including concurrent disk activity).
- Chat-surface mapping: `npm run check` and the disposable Electron resize/overlay suite passed.
  Existing dark inactive/collapsed projects, equal insets and saved width were retained. The
  packaged check now compares the sidebar, active workspace/button, current expanded project
  and selected item directly with the rendered main background, outer chat card, assistant
  message and user message, respectively. All exact comparisons passed in local unsigned package
  `ec8b213d382e+dirty.416e38dce93f` under `dist/design-preview-chat-palette`. Reopened that bundle
  and verified source hashes, unchanged appearance/drafts, three workspaces, six projects, five
  chats, five browser identities/placements and available Codex. Kept this and the immediately
  previous balanced build; removed the obsolete panel build after verifying it was not running.
  No full data backup was created. Cleanup increased free space by 630,591,488 bytes (including
  concurrent disk activity).
- Cohesion/spacing refinement: `npm run check` and the disposable Electron resize suite passed.
  The UI check explicitly verifies dark active-collapsed and inactive-expanded project states,
  the brighter active-expanded state, and equal horizontal insets (within one pixel) around
  project panels, child lists/rows and feature sublists. Existing settings-save, native-overlay
  and restart checks passed; screenshots were reviewed. This iteration changes CSS only.
  Exact local unsigned package `ec8b213d382e+dirty.8c43f5777e11` under
  `dist/design-preview-balanced` passed retained-profile acceptance, including project contrast
  and equal insets. Reopened it and verified exact source hashes, unchanged appearance/drafts,
  three workspaces, six projects, five chats, five browser identities/placements and available
  Codex. Retained this and the immediately previous panel build; removed the obsolete color
  build after confirming it was not running. No full data backup was created. Cleanup increased
  free space by 630,956,032 bytes (including concurrent disk activity).
- Selected project-panel/reference-palette revision: `npm test` passed 649 tests and
  `npm run check` passed. The shared age formatter covers sub-minute, exact minute/hour/day
  boundaries, future timestamps and unknown values. All three disposable Electron suites
  (sidebar resize, rich sidebar and tab polish) passed. Verified whole-project panel containment,
  continuous header/children surfaces, active/inactive workspace colors, plain counts, pale-green
  selected sidebar text, minute labels across recents, paging resets, native resource identities,
  saved-width/overlay/restart behavior, permissions and tab reordering. Selected tab-strip titles
  remain white. Exact local unsigned package `ec8b213d382e+dirty.134d8dbd5156` under
  `dist/design-preview-panels` passed retained-profile navigation, continuous panels, palette,
  plain counts and permission-sidebar acceptance. Reopened it and verified source hashes,
  unchanged appearance/drafts, three workspaces, six projects, five chats and five browser tabs
  with preserved identity/placement and available Codex. No new model turn was submitted.
  Kept this and the immediately previous color build; retired the obsolete width build after
  confirming it was not running. No full data backup was created. Cleanup increased available
  space by 630,517,760 bytes (including concurrent disk activity).
- `npm test`: 648 passed. `npm run check`: passed. Settings tests cover optional width,
  revision conflicts, invalid values, unrelated preferences and persistence across store restart.
- Disposable Electron resize checks passed for pointer and keyboard changes, renderer reload and
  full process restart, equal pinned/popover widths, and no main-panel displacement. Native browser
  visibility and webContents identity were verified: sidebar open/close does not unload/reload the
  page, independent overlay tokens remain intact, and reload/outside click/outside pointer release
  do not leave the browser hidden. Workspace/feature surface and active-project/selected-child
  treatment passed computed-style checks and screenshot review.
- A delayed AI Allowance settings save followed by a resize preserves both preferences. Existing
  rich sidebar and tab-polish regressions passed, including the then-pinned Engine Room keyboard focus (placement superseded October 18),
  paging, resource identity, terminal startup-once, permission controls and tab reorder guards.
- Packaged local unsigned revision `ec8b213d382e+dirty.1942e4419eae` is under
  `dist/design-preview-oct17`. Reopened that exact bundle and verified its source fingerprint,
  three workspaces, six projects, five chats, five browser tabs, unchanged drafts/appearance,
  browser identity/placement and available Codex connection through read-only owner state.
  That attempt's retained-profile automated navigation check was interrupted: the window resized and
  switched to a browser during row sampling, outside the test's actions. No renderer errors
  were observed. Stopped automated clicking and left the preview open for experimentation;
  The subsequent check below completes packaged acceptance for the newer color revision.
- Color refinement: `npm run check` and the disposable Electron resize/overlay/restart suite
  passed again. Exact packaged revision `ec8b213d382e+dirty.1b3626bf6a2c` under
  `dist/design-preview-colors` passed the retained-profile click-through: workspace → project →
  existing live chat, compact permission sidebar, feature tabs/icons/separators, counts and
  two-line item titles. Rendered group colors equal the active Workspaces button; the selected
  child is lighter green with a white title. No new model turn was submitted for this check.
  Reopened the exact bundle and verified source hashes, three workspaces, six projects, five
  chats, five browser tabs, unchanged drafts/appearance and browser identity/placement, and
  available Codex. The separate project-separation comparison remains a proposal.
- Project-separation comparison controls and 736/320-pixel layouts passed. After verifying the
  new bundle, retired the obsolete original preview staging bundle; retained the new color build
  and October 17 width build. No data backup was created. Free space increased 630,730,752 bytes
  during cleanup (including concurrent disk activity).
- Retired the obsolete October 16 staging bundle after verifying it was not running; kept the
  current and immediately previous preview bundles. No full data backup was created. Measured
  free-space change across packaging/cleanup was +0.024 GiB (including concurrent disk activity).

### October 16 revision

- Workspace-panel revision: `npm test` passed 646 tests and `npm run check` passed. Seven new
  navigation tests cover unique counts, membership/owner separation, archives, recency, remote
  identity collisions, resource aliases/cycles and bounded icons/age formatting. Rich isolated
  Electron checks exercise seven-item lists and four-item paging, reset behavior, mixed resources,
  hidden/unloaded browsing without eager loads, matching icons, two-line titles, computer placement,
  active selection, feature groups and fixed footer. Existing browser/document/terminal identity
  survived navigation and renderer reload; a synthetic terminal startup marker remained exactly
  once. Polling left recorded access and chat update timestamps unchanged.
- Exact packaged acceptance and live reopening passed for the workspace-panel revision
  `ec8b213d382e+dirty.49105d8c14b1`. The local unsigned Design Preview retains three workspaces,
  six projects, five chats, five browser tabs, unchanged drafts and the prior live approval
  receipt. Browser identity/placement and packaged source hashes matched; Codex remained
  available. Production was not replaced, and this revision did not run a new real model turn.
- Latest icon/contrast/drag revision: `npm test` passed 639 tests; `npm run check` passed.
  `node test/preview-polish-ui.mjs` exercised real isolated Electron title/row dragging, normal
  title clicks, protected action buttons/links/resizers, Escape and detached-row cancellation,
  keyboard focus, filtered order, cross-owner rejection and retained browser order after reload
  and restart. Feature/chat icons, selected browser contrast, whole project-row background and
  the sole permissions sidebar passed. Permission and desktop navigation regressions passed.
- Exact packaged acceptance passed for `ec8b213d382e+dirty.eba0dc3dcd03`, including the four fixed
  feature icons, selected/inactive title contrast, retained live sample and approval receipt,
  permission sidebar and private preview identity. This is a local unsigned design preview.
  Reopened and live-verified that exact bundle with three workspaces, six projects, five chats,
  five existing browser tabs and unchanged drafts. Browser identity/placement and source hashes
  matched; the private Codex connection remained available. Production was not replaced.
- `npm test`: 636 passed, no failures. `npm run check`: passed.
- Grouped-sidebar acceptance (`node test/preview-sidebar-ui.mjs`) passed with 24 synthetic chats:
  collapsed workspace roots, independent names/expanders, seven-chat paging, final-batch focus,
  two-line titles, active location, navigation/reload retention, project-collapse reset, polling
  near the bottom of the scroll region, minimized rail and keyboard Engine Room navigation.
  The existing source Electron rehearsal passed again with the new sidebar.
- The grouped revision's packaged acceptance passed against the retained synthetic profile:
  `ec8b213d382e+dirty.fe1d2d52e923`. The then-fixed Engine Room below AI allowance (superseded October 18), grouped roots,
  workspace navigation and the existing permission sidebar were verified in the exact bundle.
- The source Electron UI checks passed for fixed-tab separators (including the resource-tab
  boundary), direct collection cards, retained workspace/project Chats, drafts, moves and restart.
- The permission UI used the real owner API with a synthetic provider: one sidebar, Help,
  focused Add/Remember/Change, saved command reuse, folder removal, draft preservation and the
  original workspace Configuration link passed. Engine/Codex RPC tests also cover additions,
  reductions, mixed changes, obsolete pending approvals and preservation of inherited grants.
- The exact packaged app passed the opt-in real Codex test with Remember → This chat for the
  advertised workspace folder: one real file approval, exact file contents, same-session
  continuation, saved chat-only access and draft preservation. Provider usage was observed;
  the disposable test profile was removed. The model/effort came from refreshed metadata.
- Packaged acceptance retained the existing three workspaces, six projects, completed live
  sample chat, approval receipt and user-opened browser tabs. It verified the private identity,
  compact permission sidebar, Projects/Chats/Tabs/Configuration and separators. Local unsigned
  preview revision: `ec8b213d382e+dirty.4f5c23601ad2`. No production replacement occurred.
- The separate navigation-options mockup passed collapse, selection, project switching and
  narrow-width overflow checks. It is a proposal, not the sidebar shipped in this revision.

### October 15 initial preview

- `npm test`: 628 tests passed at the final combined checkpoint. An isolated-test cleanup race
  was corrected so server/SQLite owners close before disposable homes are removed.
- `npm run check`: passed.
- `node --test test/desktop-preview-runtime.test.js`: preview isolation/auth staging/fixture retention
  and project session normalization passed.
- `node test/desktop-preview-ui.mjs`: actual isolated Electron navigation, scoped filters, shared
  drafts/quick views, composer permission dialog, project chat setup, flat browser placement, chat
  moves, source library and cold restart passed.
- `node test/preview-permissions-ui.mjs`: five isolated permission interaction groups passed.
- `node test/preview-agent-resources-ui.mjs`: real desktop browser/document opening from a chat
  quick view reaches its canonical project; explicit workspace/application destinations, original
  document authorization and restart passed. Project session descriptors are excluded from the
  legacy workspace seeder so moving a chat cannot recreate an old workspace alias.
- `PROTEUS_PREVIEW_LIVE=1 node test/desktop-preview-live.mjs`: live isolated Codex account and
  fresh model catalog passed; a real chat, one inline Approve once, exact synthetic file bytes,
  same-session continuation, unchanged broad-approval mode and draft preservation passed.
  The model and effort came from refreshed provider metadata. Private evidence remains under
  the preview root, outside this checkout; no synthetic provider usage was invented.
- `node test/desktop-preview-package.mjs` with explicit preview paths: packaged launch, distinct
  runtime identity/private profile, three workspaces/six projects, retained completed live chat and
  approval receipt, permission dialog and correct workspace navigation passed. Local unsigned
  bundle revision: `ec8b213d382e+dirty.5fa022847cb6`. Vendor bytes were preserved; no Apple account
  or signing checks were performed while the Mac was locked. No production installation occurred.

The tests use disposable directories and synthetic content, never production app-data edits.

## October 17 — activity ordering and tab lifecycle in the desktop preview

Selection, focus and scrolling no longer advance recent-item age or order. Preview activity uses
`lastActivityAt`, separate from browser retention's `lastTouchedAt`: new resources, accepted chat
messages, explicit browser navigation/refresh and successful terminal input advance it. Reading,
provider output, title changes and restoration do not. Chat summary/index/view projections expose
accepted-user activity with creation fallback; legacy focus timestamps are not treated as activity.
Projects keep an explicit workspace-local order, edited by title/row drag or Alt+Shift+Up/Down on
the workspace Projects page. The sidebar follows that order. Workspace aggregate Tabs cannot be
reordered; project Tabs retain sibling reorder. Lists validate workspace, project and owning host.

Closing workspace navigation survives passive reconciliation and returns from active descendants.
Closing the final chat view evicts history/render caches, including late fetch results, while
preserving history, drafts, permissions and execution. Browser Hide now unloads in the preview;
Restore reveals without loading; selection loads. Persist/shared status alone does not prevent
Hide, but actual in-flight work/unsaved page state still reports a blocker. Hidden persisted tabs
stay unloaded through restart, with portable navigation identity preserved. Native hide succeeds
before visibility is committed, with conflict checks and rollback on persistence failure.
Production, web and mobile remain held. See desktop-preview.md for verification and current app.


### Activity/lifecycle revision validation

- `npm test`: 664 passed; `npm run check`: passed. The existing parity fixture now closes
  its asynchronous log worker before removing its temporary directory.
- `preview-project-order-ui.mjs`: real disposable Electron drag/keyboard ordering, sidebar
  order, strict workspace/project scope, disabled aggregate reorder, passive-close stability,
  retained drafts, renderer reload and full restart.
- `preview-chat-close-ui.mjs`: selection/scroll leaves activity unchanged; real rehearsal send
  promotes the chat; actual shell input promotes the terminal while focus does not. Closing one
  alias keeps a shared view; final closure evicts history and late fetches cannot repopulate it.
- `preview-activity-ui.mjs`: browser selection/read/focus stability, refresh/navigation promotion,
  shared/Persist Hide unload, Restore remains unloaded, selection loads; full restart preserves
  hidden state, activity and portable history identity without fetching the hidden page.
- Rich sidebar and tab-polish Electron suites passed, including all resource types, paging,
  retained terminal identity, protected actions and persisted project tab order. UI evidence
  uses disposable synthetic profiles and rehearsal; no new provider turn is claimed.

- Final local preview package `ec8b213d382e+dirty.6b8a11aaa04a` under
  `dist/design-preview-activity` passed packaged acceptance and was reopened. Verified all 234
  runtime source hashes, three workspaces, six projects, five chats, seven browser identities and
  placements, draft hashes, appearance settings and available Codex sign-in. No new provider turn
  was needed for this pass. The app is unsigned local staging, not a distribution release.
- Retained the current activity bundle and immediate prior groups bundle. Retired only the
  obsolete inactive type bundle: 611,126,726 file bytes removed; measured free-space increase
  633,122,816 bytes. No full data backup was created; existing preview data was preserved.

## October 17 — delete projects and choose the default

The workspace Projects page has Delete for nondefault projects and Set default for choosing a
replacement. The deletion review names the receiving default. Deletion reassigns all associated
chats and resource tabs, preserving history, drafts, approvals, active execution, terminal
sessions, browser views/profile/grants/history, document source authorization and activity age.
The current default cannot be deleted. General becomes deletable when another project is made
default, and it is not recreated on restart.

The host commits deletion and a fixed same-workspace redirect atomically in the revisioned
preview catalog. Membership follows redirect chains without rewriting active runs. Session
reads/writes and browser/renderer placement resolve those redirects, including late creation
and stale saves. A lost acknowledgement can be retried with the same reviewed revision.
Validation and package acceptance for this revision are recorded below when complete.

Deletion validation:
- `preview-project-delete-ui.mjs` passed in disposable Electron with a real pending rehearsal,
  draft, running shell, documents and browser fixtures. Verified default protection, reviewed
  destination/cancel, stale-review rejection, all resource identities, hidden/unloaded states,
  untouched document bytes, unchanged pending settings/events/request, and no shell startup replay.
- Verified Set default immediately updates the row controls, former General deletion and redirect
  chains, renderer reload, stale saved-session recovery and full application restart.
- Native parent-only browser creation in an unopened project and late creation under a deleted
  project both preserve the correct destination. Targeted browser tests preserve active/shared
  native view/grant/owner/history state; document-await race coverage preserves source authorization.
- Shared placement tests cover remote-owned children, cycle/cross-workspace rejection, same-slot
  root replacement, selection/drafts and production gating.

Final acceptance for project deletion:
- `npm test`: 678 passed; `npm run check`: passed. The project-order Electron suite also passed.
- Packaged preview `ec8b213d382e+dirty.1732b450b708` under
  `dist/design-preview-project-delete` passed exact-package acceptance and is reopened.
  Verified all 235 runtime files and build inputs against the recorded source fingerprint
  `1732b450b7089ecee8a8586249417e18e77caa91290a6cd46ec737420eb9111b`.
- Retained 3 workspaces, 7 projects, 5 chats and 7 browsers, with browser identity/placement,
  drafts and appearance preserved. Existing Codex availability remains verified; no new provider
  turn was sent. Native window inspection shows default protection plus Set default/Delete on
  nondefault projects. No retained project was deleted during acceptance.
- Retired obsolete `design-preview-groups` after confirming no process used it. Kept current
  `design-preview-project-delete` and previous `design-preview-activity`; removed 611,127,010
  file bytes, with measured free-space increase 646,713,344 bytes. No live-data backup was created.
