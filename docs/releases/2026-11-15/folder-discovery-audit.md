# Workspace Files discovery audit

N11-06 source investigation, November 12. The scope correction below is implemented; the
picker design remains a proposal pending representative desktop/web/phone/tablet review.
No real folder inventories or connection grants were changed during this investigation.

## What supplies the list

`WorkspaceExplorer` asks `WorkspaceFiles` for roots on each operation. For the chosen workspace,
the sources are its `cwd`, `additionalDirectories`, `libraryFolders` and `universalFolders`.
Primary/additional folders appear before library and every-chat folders. This is configured
membership, not a recursive scan of the source catalog or a history of previously visited folders.

The source-library catalog is separate. Registering a reusable source there does not itself add
it to Workspace Files. Selecting an instruction, agent or MCP also does not grant file access.
Projects resolve to their owning workspace for file browsing; a project does not introduce a
second set of file-sharing grants. An explicit source root configured on that workspace can
appear even if no source beneath it is selected for the current chat.

Removing a root invalidates its old identity on the next file operation. A configured but missing
directory remains visible as unavailable. Historical source catalog entries, favorites and saved
tab descriptors cannot revive its access. The root identity includes workspace, configured path
and resolved real path; retargeting a root symlink invalidates the earlier identity.

## Confirmed scope defect and correction

`ContextStore.config()` exposes the default workspace's library/every-chat arrays at its top
level for compatibility. `WorkspaceExplorer.files()` selected another workspace but also passed
those top-level arrays into `WorkspaceFiles`. Consequently workspace B could list and resolve
library roots belonging only to default workspace A. A remote grant for B was insufficient to
distinguish this accidental expansion because the explorer reported those roots as part of B.

The explorer now passes only the selected workspace. Its own library/every-chat roots remain
available. A regression reproduced the extra A roots before the change and verifies their absence,
rejected foreign-root operations, rejected references, and immediate removal of a revoked B root
afterward. Existing encrypted remote grant/revocation and file operation tests also pass. This
corrects membership; it does not change configured roots, agent grants or connection permissions.

## Existing access and duplicate behavior

Remote requests require explicit viewing permission for the exact workspace on its owner;
editing needs a separate grant. The owner rechecks the grant before returning results. Root and
symlink containment is resolved again for each read/mutation. Local human browsing and an agent's
filesystem permissions are distinct boundaries.

Repeated normalized paths within a workspace are visually reduced to one root. A configured
primary/additional root takes precedence over the same library/every-chat path. Different aliases
of one canonical directory can still appear separately, as can nested roots. Across workspaces,
root IDs retain workspace association. Across computers, IDs must always be paired with owner
identity. Equal names or path strings are not proof of equal authority.

Desktop and web currently show a flat select with basename and path. Native mobile shows only
the basename, making equal-name folders ambiguous. The picker does not currently explain source
category, project-to-workspace resolution, or why a source-library-only folder is absent.

## Proposed interaction and acceptance

Keep the current workspace as the default. Show its computer/workspace above the picker, then
group roots under Workspace folders, Source folders and Every-chat folders. Use basename plus
configured path on every client. Mark unavailable roots explicitly and disable selection. An
optional Other workspaces entry should navigate to another already-authorized workspace; it must
not combine its roots or editing grant with the current view. Source-library registration remains
separate from adding a browseable root.

Preserve each existing root ID. If aliases are grouped visually, retain separate association
choices and never union grants. Keep nested roots and same-name/different-path roots selectable.
Owner-disconnected state should retain location context and offer reconnect rather than silently
falling back to a different owner or root.

Before implementing the picker redesign, compare a three-root workspace and a 200-root workspace,
including equal basenames, configured aliases, nested roots, a missing root and two owners with
matching paths. Check keyboard search, touch targets, long paths, accessibility text sizes and
restored selection on desktop, web, iPhone and iPad. Those visual comparisons are still pending;
the scope regression is independent of them.
