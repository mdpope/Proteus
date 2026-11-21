# Scratchpad

Workspace/project destinations appear in the file browser before they exist on disk.
Registration and indexing create no empty workspace/project directories; saving the first note
creates its parent directories as part of saving. New workspace-only notes live directly under the
workspace directory, and globally unassigned notes under the Scratchpad root. Existing legacy
Unassigned folders/files remain in place. User-created folders are merged into the same browser.

New directories use the workspace and project names. New scratches use the note title as the
filename, with a numbered suffix for a duplicate. Proteus retains the scratch ID in frontmatter
and its SQLite index. Title changes update the filename with revision checks. For a single legacy
filename, use **Use title as filename** in the desktop editor. The owner can preview and migrate
registered legacy workspace/project folders and indexed note filenames in the configured root.
The migration checks the preview digest, preserves note bytes and IDs, chooses numbered names
for collisions, and keeps old Scratchpad links readable in Proteus. External apps use the new
disk paths. On desktop, Super+P searches
scratch titles and indexed metadata, including scratches with closed tabs.

The workbench redesign uses Markdown only in its UI, with CodeMirror 6 Live Preview/Source and
the existing read-only Preview. Legacy `format` wire metadata is retained for compatibility; new
editing uses Markdown and fenced code blocks. Workspace/project selection is separate; project
choices are limited to the selected workspace. Category is a single frontmatter property, while
search also matches custom frontmatter, tags and filenames inside other active filters.

Desktop scratch tabs have independent view identities and a shared Workspace Files browser in
compact mode. File selection stays inside that tab; image/PDF viewing uses the existing file viewer.
Attachment reads remain root-bound, reject symlinks and traversal, and enforce bounded payloads.
Switches flush the outgoing model and reject obsolete reads. Returning to a scratch tab restores
its chosen note or file, preview mode and reading position. The Document size slider beside
Delete scratch and trackpad pinch scale content from 75% to 200%. Wrap controls line wrapping in
source and preview. An enlarged image scrolls independently inside its viewer.
The selected-file title and file-tree highlight update together. Compact controls use the shared
refresh artwork and theme-readable filter text. Carets use the current palette's ink in both modes.
These UI reads do not widen captured-project agent access or ordinary device sharing grants.
Native rich editing is bundled offline; full cross-client folder/tab parity remains in active review.

Scratchpad stores editable Markdown files on the selected owning computer. The operator chooses
an existing folder in setup; Proteus creates `Scratchpad` beneath it, or uses it directly when
the selected directory already has that name. Configured library/memory folders are offered as
choices. No vault is selected automatically. A root README explains directory management,
explicit synchronization, stable identities and recoverable `.Trash` deletion.

Storage suggestions read the current Source Library registrations, including folders that are not
selected in a workspace. A source change refreshes an open setup picker; returning to the window
or opening the picker also refreshes its choices. After setup, a gear opens storage settings.
Changing roots keeps the old files and root-bound drafts untouched. The new root is reconciled
on the background worker; list reads remain available between scan/index batches and rows appear
as they are indexed. Large roots show progress. Old-root edits and grants cannot target the new root.

Files live in workspace/project directories with readable names. Frontmatter contains
`scratch_id`, `title`, `workspace_id`, `project_id`, `format`, `category`, `created` and `updated`.
Unknown properties and body text survive normalization. Markdown, text and code are presentation
modes over the same portable Markdown container. Changing a category changes its frontmatter;
moving a scratch changes its registered project directory. Closing an editor does not delete it.

The main Scratchpad uses the shared feature content strip, with its persistent master, individual
scratch tabs, a universal New Tab page and overview. Ordinary auxiliary resource tabs retain their actual owner,
profiles and permissions. Chat creation is excluded in these workspaces. Native/web capabilities
remain explicit rather than substituting an ungranted host shell or private browsing session.

The host keeps a SQLite metadata index and mutation receipts in its private app-data directory,
separate from the user's files. A dedicated worker owns SQLite and filesystem operations.
Reads load a selected file on demand; list/filter queries use the index. Saves coalesce typing,
retain expected file revisions and operation UUIDs, and keep newer typing separate from an
in-flight save. Failed or uncertain saves retain the draft and original request for review/retry.
Only owner-confirmed rejection before recording any file intent releases a retry identity.
Interrupted file/index writes remain bound to the original request. Files are atomically replaced after checking their indexed content hash. An interrupted file/index
commit reconciles with its original operation without duplicating or overwriting external edits.

Synchronization is explicit, from the button or chat tool. No filesystem watcher scans a vault.
Sync imports manually created files, normalizes missing metadata, refreshes changed records and
tombstones index records whose files disappeared. Duplicate IDs, invalid frontmatter, symbolic
links, replaced roots and concurrent edits produce errors rather than choosing a winner. A scan
is bounded; large roots can be synchronized per project. An unchanged sync does not rewrite files.
Project association comes from registered owner directories, never an untrusted frontmatter claim.

`proteus_scratchpad` is an internal chat tool using the same owner service as the UI. The chat's
project is captured at provider-turn start. Scratches in that project are available automatically;
other project/unassigned scopes require explicit human-approved actions for that chat and root.
Moving a running chat does not widen its access. Moving a scratch requires authority to remove it
from the source and create it at the destination. These grants do not change shell/folder permissions.
The external operator MCP does not expose a Scratchpad tool with unrestricted operator authority.

Connections has a separate **Read and edit Scratchpad** switch per ordinary paired device, off
by default. It permits all scratches in that owner's selected root, streamed on demand. Revocation
is checked before each read/write and after asynchronous replies. The Mnemosyne `mnemosyne.ask`
pairing cannot gain this permission or call these methods. Web clients retain unsaved drafts per
account, owner and root; native clients use encrypted, device-protected draft storage. Storage-root
identities bind requests so switching roots cannot redirect an older edit.

Source status: owner storage, scoped tools, desktop/project UI, website view and remote opt-in are
implemented and have focused qualification. Native encrypted-draft restoration and lost-acknowledgement recovery pass against a disposable
relay/owner. Native visual cold-launch saving/reopening passes on the shared iPhone simulator. No real storage directory or sharing grant has been selected by the implementation
work. Physical-device, full offline acceptance and final release acceptance remain open.
