# Workspace Markdown picker

The Markdown action opens a folder picker with **Open existing** and **New file** modes.
Choose a configured workspace root, enter subfolders, or use the breadcrumbs to move
up. **All folders** includes each workspace's main/additional folders, shared repository roots
and every-chat folders. The server passes the full live ContextStore configuration; the older
workspace-array constructor remains compatible. Unavailable roots are
shown disabled. The picker does not accept an arbitrary absolute filesystem path.

Open existing lists folders and `.md` files (case insensitive). Select a file and
choose Open tab. Each document has its own tab identity, so opening a second note
retains the first. New file keeps a visible filename field and optional initial
content. A missing extension becomes `.md`; an incompatible extension is rejected.
Create & open creates the file exclusively and opens it in a Markdown tab.

**New folder** creates one folder inside the currently selected root/subfolder and
then selects that new folder. It never creates a path elsewhere or recursively
interprets a typed path. Existing files and folders are not overwritten.

The dialog uses the application's shared modal lifecycle. The desktop shell must hide
its native browser surface while the dialog is open and restore the correct active
surface when it closes. Filename/folder controls must stay visible when the action is
invoked with a browser tab active. This behavior is shell integration, not a second
browser layer owned by the picker.

## Filesystem boundary

`WorkspaceFiles` receives a function returning the current configured workspace
profiles. Every request resolves its root ID again from that authoritative list.
IDs bind the workspace, configured path and its current real path. Removed roots and
retargeted root aliases invalidate old selections. Request bodies contain a root ID
and relative location, not a client-supplied filesystem root.

Resolved directories and existing Markdown files must remain inside the selected
root. Broken aliases and links outside that root are hidden in listings and rejected
when requested directly. Internal links are supported. Traversal, absolute paths,
control characters, path separators in new names and surrounding whitespace in names
are rejected. File creation uses exclusive, no-follow opening; a filename collision
cannot replace an existing file or follow an existing symlink. New folders and files
use private permissions.

Listings sort folders before Markdown files, then naturally sort names. Pages contain
at most 200 entries, with a hard 10,000-entry scan limit for unusually large folders;
the UI reports that limit. Git's internal folder is omitted. Reads and initial content
are bounded to 1 MB and reject NUL-containing binary content. Large reads stay bounded
even if a file grows after the initial stat. These checks supplement the existing
loopback API authentication, not a new authentication mechanism.

## Integration

Create `new WorkspaceFiles(() => context.config().workspaces)` on the host and expose:

| Route | Method | Body / result |
| --- | --- | --- |
| `/api/workspace-files/roots` | GET | `roots()` → `{ roots }` |
| `/api/workspace-files/list` | POST | `{ rootId, directory, offset }` → folder listing |
| `/api/workspace-files/folder` | POST | `{ rootId, directory, name }` → created folder's relative location |
| `/api/workspace-files/read` | POST | `{ rootId, file }` → `{ file, content, rootId, relativePath }` |
| `/api/workspace-files/create` | POST | `{ rootId, directory, name, content }` → created document |

The returned `file` is the validated absolute path expected by existing Markdown tabs
and image rendering. The existing Markdown image endpoint should accept the same
case-insensitive `.md` extension check.

Serve `public/markdown-picker.js` and `public/markdown-picker.css` with the other
static app assets. Initialize with `initMarkdownPicker({ api, escape, showDialog,
openTab, toast, defaultWorkspaceId })`; the optional `defaultWorkspaceId` function
returns the active/default workspace's ID. Invoke `openMarkdownPicker('open')` from
the Markdown action or `'new'` for a direct new-file action. `showDialog` retains the
standard `close-dialog` and `dialog-submit` behavior.

Eight synthetic filesystem tests verify root discovery, sorted/paged listings,
nested folder and document creation, exact no-overwrite preservation, invalid names,
traversal, escaping/internal symlinks, changed root membership, alias retargeting and
size/binary bounds. All test files live in disposable temporary roots. No real notes
are changed by tests. The browser-overlay and dialog flow require the desktop
integration smoke test in addition to these backend checks.

Verification on October 3: seven filesystem tests and four authenticated API tests passed.
The full Electron regression verified native browser hiding/restoration, nested creation,
multiple file tabs, refreshed disk contents, no horizontal clipping, and late usage-dialog
responses preserving an unrelated draft. Tests used disposable workspace folders.

October 4 follow-up: all eight filesystem tests and four authenticated API tests passed, including
shared/every-chat root discovery and removal. The 20-group full desktop shell regression also passed.
