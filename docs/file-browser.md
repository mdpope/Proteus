# Workspace file browser

Files uses configured workspace roots, with bounded requests and no background index or folder
replication. Desktop and web share a draggable/keyboard-resizable split, independently scrolling list and
preview, a custom green SVG icon set, lazy folder disclosure, selectable columns, sorting before
paging, search, keyboard arrows/Enter, platform modifier/Shift selection and drag-to-folder moves.
The breadcrumb toolbar and file context menu provide create, rename, copy path/name, duplicate,
move and native system trash. Existing destination names are rejected. File snapshots are checked
before mutation; roots, linked paths and protected control metadata cannot be changed through it.
Batch failure returns completed results and stops, so the client must refresh rather than retry.

Markdown uses the existing Markdown-it renderer, including relative links, wiki links, bounded
Obsidian raster embeds and referenced local raster images. External images remain blocked.
Plain text/source files are displayed as text. PDFs load Chromium/Electron's built-in viewer only
when viewed; its controls supply text search and page thumbnails. Desktop PDFs are capped at
32 MB, images at 4 MB and text at 1 MB. Unsupported formats report that no preview is available.

The native iPhone/iPad view uses the encrypted paired-owner request path. Connections → Browse
files grants one device read access to selected workspaces. Connections → Edit files is a new,
separate, explicit per-workspace grant; existing read grants do not enable mutation. Every request
rechecks current grants. Native folder pages and document resources are fetched on demand and
rechecked when revisited; no folder tree is mirrored to device storage. Preview assets are bounded
in memory and released when leaving. Explicit file opens use shared owner navigation tabs through
`files.open`; other clients receive their own current permission-filtered projection. Moving a
document tab does not change its source workspace or grant access to its contents. PDFKit supplies
native PDF search/thumbnails. Both native layouts support keyboard selection, custom green file
artwork, sortable columns, a breadcrumb/action toolbar and modifier-aware batch selection. Phone
has an adjustable vertical split and optional detailed columns; iPad has a horizontal split and
horizontally scrolling columns. Folder expansion pages inline without mirroring the tree.
Remote PDF transfer is capped at 8 MB; Markdown image assets are fetched separately under the same
workspace read grant, at most 32 references and 8 MB encoded aggregate memory.

Web file tabs and previews now use the same owner-bound Markdown link/image resolver. Remote PDFs
use the approved encrypted file stream, validated as PDF and bounded at 8 MB, then an ephemeral Blob
URL released on view exit. No desktop-only PDF URL is used remotely. Browser-native PDF controls
depend on the client engine; transport tests do not establish search/thumbnail UI acceptance.
The [full request audit](releases/2026-11-08/request-audit.md) identifies remaining native parity
gaps. Further deployment is held until implementation and predeployment acceptance are complete;
physical acceptance follows the accepted installation.

Owner methods: files.roots, files.browse, files.preview, files.resolve-link, files.pdf,
files.open and files.mutate. Opening registers only an already-authorized source reference;
navigation metadata never grants file bytes. Mutations require explicit Edit files in addition to Browse files. The operation
schema includes workspaceId/rootId, action, relative directory/name, and items with path/identity.
Supported actions: create, mkdir, rename, duplicate, move, trash. No permission is inferred from
agent folder grants, chat placement, a document approval or another device's connection.

Validation distinguishes disposable source/UI tests, simulator tests and installed acceptance.
Physical build 2611.9.3 and Build Mac ca7005e9f9c5 contain the initial browser expansion.
Later source fixes add paged move destinations, suppress stale folder/document responses and reset
the iPad split drag baseline after each gesture. Desktop interaction acceptance includes a move to
a destination after the first 200 folders. These corrections need their own package/install receipt.
Native multi-selection drag/autoscroll and physical device acceptance remain separate interaction
checks. A native row has a dedicated drag handle to avoid conflict with its long-press file menu;
the phone simulator moves a selected two-file batch with independent owner filesystem proof.
Desktop PDF rendering, thumbnails and text search pass against the actual built-in viewer.
Phone/iPad permission denial, explicit owner read grant and document streaming UI checks pass.
