# October 7 search and chat release — 0.2.6

The operator authorized implementation, build, deployment and validation after initially holding
BF-29. Later requests add approval details, Markdown tab tools, rename repair, Enter sending and
conversion from queued delivery to steering. BF-29–40 in `planned-updates.md` are the acceptance scope.

## Implemented

Desktop, web and native distinguish user chats, scheduled runs and Internet Searches. Search
creation uses host-configured provider defaults and only workspace-default context. Promotion is
one-way and persists on the execution host. Scheduled runs remain available in Chats but are
excluded from the regular sidebar list. User/search recents have seven entries and no More link.

Chat controls use Enter to send and Shift+Enter for multiline drafts. Queued steering is serialized
by message identity; failure retains the message and successful delivery removes it once. Provider
support still applies: steering is available for active Copilot/Codex turns, not Claude turns.
Attachment queue conversion remains unsupported and returns a clear error without losing files.

File searches expose their pattern; approvals retain short intent and expandable redacted request
details. Agent runtime guidance describes the real `proteus_open_document` tool. Copilot receives
a session tool; Claude and new/resumed Codex sessions receive a per-turn MCP bridge with a random,
run-bound capability. The bridge checks current workspace roots, rejects escaping symlinks and
reuses document descriptors. It cannot open arbitrary browser file URLs or grant new filesystem roots.

Rename caches track title revisions. Closing a main chat unloads its browser children while
retaining their scoped descriptors and order. iPad popup creation updates selection. Dialog
spacing, assistant right insets, lowercase runtime units, web model controls, icons and filters
are aligned with desktop.

## Validation

- All 385 backend tests and static checks passed, including real MCP process negotiation,
  document authorization, queued steering and promotion during unrelated streaming updates.
- Desktop isolated UI: type filters, seven recents, search defaults and simplified dialog,
  promotion, repeated rename, dialog spacing, Enter/Shift+Enter and unloaded browser restoration passed.
- Web isolated UI: existing connection/action/attachment cases and new search creation, defaults,
  Shift+Enter and promotion passed. Manual approval rendering received a final correction.
- Native simulator: compact composer and retained desktop-origin browser tabs passed. Software
  keyboard Send key passed for both new-chat submission and pending-question feedback.
- Website recovery capture is verified and registered outside the repository. Isolated restoration
  matched protected tables, schema and ledger with no production writes.

## Installation status

No 0.2.6 target is certified installed yet. Build Mac, website, iPhone and iPad remain on the
previous release until their separate deployment receipts are recorded. HC's preceding staged
update remains blocked by that chat's independent approval gate; no bypass is authorized.

Installed verification does not certify every provider workflow. Live provider-authenticated
Markdown opening, all physical keyboard variants and long-duration disconnected-peer recovery
need explicit observations. The two warning observations from 0.2.5 remain open until reproduced
and resolved; they are not silently cleared by this batch.
