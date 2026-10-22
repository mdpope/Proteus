# Workspace Markdown picker

## 0.2.28 — source-file dates

Markdown viewers display Created and Modified from the owning source file's birth/modified
metadata, returned with the same validated content snapshot. Local, Team, paired desktop, web
and native readers retain their existing root/version/approval boundaries. Unknown creation time
stays Unknown; ctime/frontmatter/cache/tab dates are not substituted. Content refresh rereads dates,
and reading never writes source metadata. Native values retain explicit ISO UTC; browser clients
format the source instant with date, time and timezone. See [release evidence](2026-10-21-browser-chat-release.md).

## Next release intake — October 19, queued only

BF-2026-10-19-19 in [planned updates](planned-updates.md) records the reported jump to the top
when returning to a Markdown tab. Preserve each document tab's reading position independently
across tab switching, document refresh, renderer/web-page reload and app quit/relaunch, including
unchanged files, harmless rerenders and delayed image layout. Save during reading as well as
supported exit transitions, so a still-selected document resumes after restart. Restore the same
paragraph/offset after content mounts without overriding a newer user scroll or tab selection.
Keep the source-refresh and remote approval rules below; shorter changed documents use the
nearest valid position. Source inspection finds outgoing capture but no `restoreView` call in
the local Markdown rendering path; the position helper's in-memory Map also cannot survive reload.
Queue durable bounded position metadata through the owner state boundary, independently of the
multiwindow feature, with stable document/window identity. Exact live reproduction, persistence
checks and UI acceptance remain pending;
no implementation or build is authorized yet.

## Next release intake — October 15, queued only

BF-2026-10-15-01 in [planned updates](planned-updates.md) requests checking the original file on
disk when the user returns to its Markdown tab and refreshing the rendered page if saved content
changed. BF-2026-10-15-02 adds **Refresh** to the tab's right-click menu. Both use the same
authorized source reader, preserve the existing tab and retain remote host/version approval
boundaries. Both automatic and menu refresh must preserve the user's scroll position instead
of jumping to the top; unchanged content retains its rendering and reading position. This queued
return-to-tab behavior extends the earlier manual-refresh design below; it does not request
continuous background replacement. No implementation or build is authorized yet.

## Current picker behavior

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

## Generated documents from chat — October 5 queue

Source review confirms local chat `.md` links already use `openMessageLink` to open the rendered
Markdown in a document tab. This is separate from the picker. Remote desktop currently shows
“Open links on the destination Mac” instead; website file links also lack this in-app reader.
Do not claim local support establishes parity or that every generated document is linked today.

The operator requested consistent titled links for generated/updated Markdown artifacts. Open a
normal document tab only on click, retain the chat and its state, and activate an existing tab for
the same host/file rather than duplicating it. No automatic opening, focus change or split view.
Desktop/web/iPad use the top tab bar; iPhone uses a document view with return navigation.

Remote preview must be a bounded, authorized read from the owning Mac, with safe rendering and
current file/root checks. It is not native file Open, context editing or arbitrary remote filesystem
access. Broader tab organization is awaiting the operator's next design input. See
`planned-updates.md` for the queued requirements and acceptance; no implementation is claimed.

### Approved remote-document transport and lifetime — queued

The executing Mac keeps the source file and registers a document ID associated with its chat.
Clients address host/chat/document identity; they never supply an arbitrary path as authority.
A separate **View chat documents** connection grant permits read-only previews without general
resource access or file editing. Check that grant, peer authorization, chat association and current
canonical file/root/type/size boundary on every read, including related images. Existing peers
must not gain the new capability silently. Reuse the encrypted relay transport, not a public URL
or unrestricted forwarding of the local `/api/markdown` reader.

Return bounded content, title, modification time and a version identifier matching the delivered
bytes. Fetch the latest saved version when opening; preserve a reader's current version until
Refresh when the source changes. Reads do not require an AI turn or plaintext document storage
in the website database. Safe Markdown rendering remains mandatory; scripts are not executable.

Keep content in memory for the open tab initially. Restored tab descriptors require a new authorized
read. An already-loaded document remains visible during a host disconnect, labeled with its
last-read time; an unloaded document requires reconnection. Persistent offline caching is deferred
to an explicit option. Clear retained private content on sign-out/account change. Revocation blocks
future reads but cannot recall content already disclosed; the browser receives the displayed
content and its website trust boundary remains relevant. Missing/moved/denied files stay explicit.

This design is approved and queued, not implemented or accepted on live clients. Interactive
HTML/JavaScript previews are now approved as a separate queued extension; a Markdown viewing
grant must not implicitly execute generated code.

### Interactive artifact extension — approved queue

Accept standard HTML/CSS/browser JavaScript from any supported provider through the same artifact
identity and authorized delivery. Start with an isolated static preview. Trusted Proteus chrome
provides Enable interactive preview for scripts in that artifact's exact version and current
preview session, plus Stop scripts to destroy its execution context and restore the static view.
Include bundled executable dependencies in the version identity. Rerenders retain approval;
changed code/dependencies and restored sessions require a new approval. Generated content cannot
approve itself or impersonate the trusted permission controls.

Approved browser scripts remain isolated from Node, shell, filesystem, credentials, other chats
and app APIs. Network/resources and privileged actions require separate narrow permissions;
self-contained previews should work without them. A `.cjs` file is not a visual document and is
not executed by preview approval. Keep content/state in memory initially, expose stop/unload in
Engine Room and clear on close, sign-out/account change or revocation. See the interactive-artifact
entry in `planned-updates.md` for acceptance. No renderer or live permissions changed in this queue.
