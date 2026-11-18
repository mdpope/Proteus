# Feature and navigation conventions

These are the shared product rules for new features and corrections to existing ones.
Use Projects and Team Tools as reference implementations; reuse shared navigation controls
instead of copying a feature-specific variation. Platform differences must preserve these rules.

## Containers and resource views

- A resource type (scratch, reminder, browser, document, terminal) is independent of placement.
  A root tab stays at the root; project, workspace, chat and feature tabs stay in their container.
  Never infer placement from resource type, its associated project or the last sidebar selection.
- Reminders and Scratchpad are organization areas with persistent overview tabs. Opening an
  item from their overviews opens/focuses a resource view in that feature's secondary strip.
  Opening the same resource in another container does not move its existing view.
- A view has a stable ID distinct from the resource ID. Reopening a resource focuses its existing
  view in the requested container. File selection can change a scratch view's resource and title.
- Closing a view never completes/deletes its resource. Moving a view preserves execution owner,
  session, permission boundary, draft, history and retry identity. Project association is metadata.

## Tab strips

- Ordinary creation appends to the end of the initiating container's strip. Explicit Add left/right,
  drag reorder and owner-supplied link placement are intentional exceptions, not new defaults.
- Choosing a type on New Tab replaces that placeholder in its existing slot. Selecting an existing
  tab never reorders it. Keep fixed overview tabs first. Restore saved owner order without a second
  feature-local ordering cache.
- Plus and double-clicking empty strip space open the shared New Tab selector in that strip.
  Overview uses the shared tab overview. Keep shared icon metrics, borders and close controls;
  do not substitute dropdown menus. Feature resource choices may exclude chat as Team Tools does.
- The title/select region and close X are separate buttons with separate hover highlights.
  Hovering a title must not highlight the X. Full-title/URL hints use the shared local hint controller.
  Use the platform's canonical root/project title inset and icon size, including the website's
  supplied favicon and ordinary fallback. Both hit regions fill the existing tab content height.
  Adding hover colors must not change strip
  dimensions or separator geometry; verify root as well as nested strips with pixel measurements.
- Strips are flush with their parent navigation/content edges. Put margins inside page contents.
  Retain the global header/sidebar control, and restore each project's last selected view.

## Feature surfaces and editing

- Use the existing Proteus palette tokens, typography, icons and controls in both themes and
  with user color overrides. A native popup that ignores those colors needs a shared themed control.
- Use a fixed-width list rail and proportional content columns by default. Resize preferences
  retain their intended units: pixels for the rail and a fraction for the remaining width.
  Workbench dividers reach the bottom of the available viewport. Columns scroll independently;
  measure the actual mounted offset rather than subtracting a guessed navigation height.
- Item-card selection covers the card and remains highlighted while its record is open;
  completion/delete controls retain independent hit targets.
  Keyboard users get equivalent named controls. Hover and selection remain visibly distinct.
- Feature sidebar recents use the shared item treatment: resource icon, title/full-title hint,
  owner computer for machine-owned resources, and activity age. Account-owned reminders never
  have a computer label. Show seven initially, reveal four more per More action, and reset
  expansion on feature changes. Closing a tab retains the recent entry. History is metadata only,
  bound to its account/owner/storage root; opening still checks current resource access.
- Reminders belong to the Life account on the server. Desktop, browser and native clients keep
  local SQLite replicas of its revisioned change feed, including tombstones. Local caches grant
  no authority and never independently commit an effect. Scratchpad belongs to a computer's
  configured folder: choose the owner explicitly, refresh its workspace/project catalog and bind
  tabs, drafts and requests to that same owner/root. Device selection must not retarget open tabs.
- Keep edit/save feedback beside the editor heading. Changes are explicit where Save is present;
  Cancel restores the saved record. Preserve unsaved drafts and unconfirmed operation IDs across
  navigation/reload, and confirm before discarding. Never use navigation to commit a destructive action.

Offline/error/loading pages must retain owner selection and global navigation. Compact reminder
details support an edge swipe back to Items without closing the resource or committing edits.
Keep upload progress inside the solid composer surface above its editing controls; budget its
height when the keyboard is visible instead of overlaying conversation text.

## Review and verification

Before adding another renderer/controller, inspect the shared navigation, viewers and controls.
Test root/project/feature placement, append and replacement order, restore, separate title/X hover,
both themes and user palette overrides. Include keyboard and small-window behavior. Use isolated
demo data and bounded Electron cleanup; test completion alone does not prove its process exited.
Record platform gaps honestly; a shared-renderer pass does not establish native/mobile parity.

### Default integration contract for new tab types and feature areas

Every ordinary new resource tab uses the common placement, close, universal selection page,
overview and bounded screenshot-preview lifecycle. Feature areas own their nested tab group;
sidebar return restores that group's last selected tab. Explicitly choosing its master remembers
the master instead. Global overview shows the same feature membership without duplicating these
tabs under the app root. Resource type never determines placement or changes access/owner.
Workspace Files is available alongside Scratch and Reminders in applicable shared selectors.

Screenshot previews apply to ordinary resource types and new feature areas by default, including
Scratch, Reminders and Files. Keep captures bounded, account/owner scoped and off the UI hot path.
Incognito always uses its privacy icon and must never capture, persist or relay a screenshot.
No new tab type is complete until placement, overview grouping, selection restoration, preview,
close/reopen and narrow-screen behavior are qualified; deviations require an explicit instruction.
