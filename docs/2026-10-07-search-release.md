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
  Shift+Enter, promotion during completion and visible original permission details passed with rebuilt assets.
- Native simulator: compact composer and retained desktop-origin browser tabs passed. Software
  keyboard Send key passed for both new-chat submission and pending-question feedback.
- A real Copilot session created without the document tool was disconnected and resumed with
  the new runtime configuration. It called `proteus_open_document` once and created the expected
  descriptor while retaining the same provider session identity. Only synthetic data was used.
- Signed Mac package launch and vendor signature preservation passed; its bundled Copilot runtime
  listed live models. Mock-Keychain isolation is separate from the installed continuity checks.
- Website recovery capture is verified and registered outside the repository. Isolated restoration
  matched protected tables, schema and ledger with no production writes.

## Installation status

Source `cb1d02253c63bc0bf45eaeaf856cb0219d09d8f4` is built and published.

| Target | Verified state |
| --- | --- |
| Build Mac | Installed 0.2.6, build `cb1d02253c63+src.67bd20e9e1f6`; 151 runtime input hashes and signing matched. Seven runs, six schedules, four pairings and 22 ordered tabs preserved. Installed navigation shows the new categories and Internet Searches. |
| Website | Release `20261008T040237Z` active; 9,212 files matched, six public built assets matched, 14/14 endpoint checks passed. Runtime configuration, schema and protected data preserved; rollback release retained. |
| iPad | Installed and launched 0.2.6 (2610.7.3); six data files, preferences and both destination identities preserved. Original signer, profile and entitlements matched. |
| iPhone | Installed and launched 0.2.6 (2610.7.3) after the operator unlocked it; the same data, signing and pairing checks passed. |
| Work Mac | Still 0.2.4 when checked. Signed 0.2.6 is staged with all 151 runtime hashes verified. Installation awaits the direct approval requested in the HC chat, which cannot read this chat’s authorization. |

The operator’s old remote Copilot chat failed while executing on HC 0.2.4. The viewer’s 0.2.6
installation cannot provide tools to an older remote execution host. A temporary connection/auth
notice also appeared and subsequently cleared. Re-test that specific chat after the HC installation;
no real workplace document or transcript is copied into this repository.

The website audit's Apache error was the expected denied `.env` probe. Existing MariaDB column
statistics warnings remain present; the release does not claim to repair that unrelated server
condition. The production browser session was signed out: authenticated web interactions were
verified in the isolated full-login fixture, while live verification covers routes, assets and data.
Private installation, recovery and audit receipts are retained outside Git.

Installed verification does not certify every provider workflow. The specific remote workplace-document flow and all physical keyboard variants and long-duration disconnected-peer recovery
need explicit observations. The two warning observations from 0.2.5 remain open until reproduced
and resolved; they are not silently cleared by this batch.
