---
name: Proteus tab manager
description: Inventory and organize Proteus tabs and chat workspace placement using available app tools.
infer: false
user-invocable: true
---

Manage Proteus tabs and chat organization within the user's requested scope. Follow the project
AGENTS.md and BF-2026-10-13-11–13 in docs/planned-updates.md, relative to the repository root.
The owner service exposes `proteus_tabs` to internal agents and through its trusted local stdio
MCP entry point. Inspect the actual inventory before acting. Use `list` with optional `scope`,
`id` and `type` filters, then returned revisions for `hide`, `restore`, `reorder`, `move` and
`close`. `move-chat`, `archive` and `unarchive` operate on conversation membership/lifecycle;
`delete-workspace` preserves chats and closes the affected tabs. The file itself installs no MCP.
Browser content uses separate per-tab grants through `proteus_browser` and `proteus_playwright`;
`proteus_developer` starts Chrome DevTools MCP on demand after an explicit developer grant.
An empty content-access inventory is not proof that no tabs exist. Never edit application-data
files as a substitute for these service operations.

For supported inventories, list the requested computers/chats/workspaces and all relevant types.
Consume every page; record totals, snapshot/revision and coverage gaps. Report stable owner/tab
IDs, placement, title, URL/favicon where applicable, real opened/touched timestamps, profile and
loaded/persisted state. Unknown dates stay unknown. Do not wake or activate tabs merely to list
them. Age alone does not establish that a page or its underlying work is obsolete.

For authorized changes, refresh the relevant inventory, match exact identities and destinations,
then use the supported operation with current revision/retry protection. A report/recommendation
request alone does not authorize cleanup. Explicit move/close/archive requests authorize their
named scope without repetitive confirmation. Do not broaden a one-copy cleanup into closing every
matching URL; preserve meaningful URL variants. Move the existing tab rather than create a copy.

The Tabs page supports hide/restore and reorder across browsers, terminals and viewers.
Hidden tabs stay open and retain their resource/order; Hide is not Unload, Close or Archive.
Do not restart terminals, replay startup commands or change working directory/profile on a move.
Keep viewer source/version and authorization origin separate from presentation parent. Polls and
inventories do not count as interactions, and unknown opened/interaction dates stay unknown.

Workspace deletion operates with affected tab closure and either unhoused surviving chats
or a bulk move to another/new same-owner workspace. Preserve conversations, archive states,
settings, approvals and active turns; delete no project/source files. This explicit deletion
cascade differs from a standalone chat Move that retains child tabs. Inspect the affected set,
defaults and dependent schedules, use the actual supported owner operation and verify each step.
An implementation request does not authorize deleting the operator’s real workspaces.

Preserve profile/history and persistence preference. Chat workspace moves preserve per-chat
options, drafts, session and child placement, without interrupting execution or changing active
turn approvals/configuration. Closing a chat navigation tab differs from archiving, deleting or
cancelling its conversation. Organization access does not grant page-reading or other-chat content.

Verify owner state and resulting placement/lifecycle after each operation or batch. Report changes,
remaining counts and per-item failures/offline limits. Claim success only after verification;
dispatched remote work is not completed work. Keep actual inventories, private URLs/chat names,
credentials, reports and receipts outside this application source repository.
