# Sources and permissions design review — October 15

Design proposal and prototype copy only. Application implementation, live grants, builds and deployment remain under the operator's hold. Examples are synthetic. This review inspected current source; it did not exercise a live permission workflow.

## Recommended structure

Give users three separate answers: **Where can it work? What should it read? When should it ask?** Folder selection is a suitable place to grant durable access, provided the selected access is visible before saving. Avoid making the user add a working folder and then discover a second, disconnected trust form.

| Location | Card | Short helper text |
| --- | --- | --- |
| Engine Room | Source library | Reusable instructions, skills, agents and connections. Choose what to use in each workspace or chat. |
| Workspace | Working folders | Where this workspace reads and edits files. |
| Workspace | Sources | Instructions and tools for chats in this workspace. |
| Workspace | Permissions | Choose what can run without another approval. |
| New chat | Sources | Starts with this workspace's choices. |
| Chat details | Permissions | Using [workspace name]'s permissions. |

Engine Room's source library has **Add source folder**, a path/status list, and **Remove**. No load modes, Every chat toggles, write grants or per-workspace settings here. It is owner-bound discovery, shared as a catalog across that owner's workspaces; it is not global filesystem trust. Adding a folder authorizes discovery of its supported source definitions. It does not execute code or connect imported MCP servers. A source-folder row is explicitly separate from a working-folder row even when both point to the same location.

Remove dialog: **Remove from source library?** / **[Folder] is used by 2 workspaces. Their saved selections and existing chat history stay intact. It will no longer appear for new source selections.** / **Cancel · Remove**. A used item becomes a retained, unavailable reference until explicitly removed or re-added; removal must not silently delete selection/grant records, erase chat history, or revoke unrelated working-folder access. Offer affected-workspace links in expanded details. No confirmation is needed for an unused catalog item.

## Working-folder flow

Dialog title: **Add working folder**

- Folder: **[selected folder]**; show its full owner-local path and computer.
- Access: **Read & edit** / **Read only**. Make this visible, never inferred from a starting-folder control.
- Helper: **Saved for this workspace and its future chats.**
- Expandable **What this allows**: **Read & edit covers files and subfolders here, including new files. Commands and connected apps have separate permissions.**
- Buttons: **Cancel · Add with read & edit access** (or **Add with read access**).

This single explicit action both adds the folder and records its scoped grant. “Permanent” means saved until revoked, not an endless bypass of changed host/resource identity. Canonical paths and symlink boundaries still apply. Starting folder copy: **Commands start here.** Changing it cannot upgrade access.

Do not silently upgrade read-only grants when switching automation modes. Removing a working-folder association and revoking its saved access are distinct; a removal review states the exact effect and affected chats before accepting it.

## Sources and helper files

Workspace sources use compact per-item choices: **Default for new chats**, **Choose per chat**, **Off**. A single optional **Match working folders** behavior may preserve today's With workspace semantics, but explain it once as **Use when its folder is a working folder.** Never use identical “Every chat” labels for both folder accessibility and source-text loading.

New chat: **Use workspace sources** toggle, followed by the actual checked items and **Add sources**. A source row says **Selected here** or **From workspace**. Agent rows distinguish **Main agent** from **Available agent**. A star remains a favorite, not a selection. A connection says **Available · approval required** until enabled and permitted; selecting a definition does not prove connection health or authorize every tool.

For a selected skill or agent: **Allow helper-file reads** with **Read files in this source's folder when needed.** Scope the proposed grant to the selected package directory or documented narrow helper root, shown in details—not the entire repository merely because it is a discovery root. Files referenced outside that scope require an existing applicable grant or a separate access request. Reading a script never permits executing it. Helper read access never becomes project write access.

Changing sources shows only new consequences: **Adds helper-file reads in [folder]** or **Adds [connection]; tools still need permission**. Already approved unchanged resources retain their approvals. Old conversation content remains in history after deselection; use **Already read in this chat** in expanded context details rather than implying erasure.

## Automation choices

Use two visible cards and one advanced legacy choice:

**Autopilot — recommended**

**Continue with approved files and routine actions. Ask before new access or consequential changes.**

Expanded **What runs automatically** lists the actual supported categories for the selected provider, not a generic guarantee. Do not use an unconditional “safe” badge. Unknown operations ask.

**Ask for new actions**

**Use saved permissions; ask for actions without a matching grant.**

This is proposed grant matching at the host/provider request boundary. It does not promise interception of every tool call; reviewing every action requires a stronger execution boundary first.

Advanced existing mode: **Unrestricted tool approval**

**Commands and connected tools may change files or services beyond these folders.**

Keep any existing broad auto-approval visible as an existing setting; never migrate it into the proposed bounded Autopilot silently. Likewise do not activate Autopilot for previously untrusted users as part of a label migration.

### Proposed Autopilot action categories

| Action | Automatic only when | Otherwise |
| --- | --- | --- |
| Read/search files | Actual resolved target is inside an approved read/edit/helper scope | Ask for narrow read access |
| Create/edit project files | Actual target is in an approved edit folder; action is bounded/reviewable | Ask; irreversible or broad deletion gets a consequence review |
| Local inspect commands | A trusted host operation or enforced runtime policy establishes read-only effects and target scope | Ask; command names alone are insufficient |
| Tests/builds | Explicit permission for project code execution exists and enforced runtime boundaries cover its writes, environment and network | Offer a scoped execution grant; describe missing enforcement |
| Read connected data | Trusted host adapter or independently enforced service scope establishes the actual read operation and destination | Ask; MCP annotations are evidence, not authority |
| Change connected data | The user already authorized the exact workflow action or an applicable narrow saved rule matches its effects and resource | Ask with target and consequence |
| Send, publish, deploy, purchase, change access, delete durable data | Existing user authorization covers the concrete action, target and scope and has not been consumed or invalidated | Review the prepared result and ask once |
| Sign-in, mandatory enterprise approval, sandbox expansion, unknown operation | Never automatically bypass the required boundary | Pause for the required response |

Neither terminal cwd nor a command such as `npm test` establishes safe effects: scripts can read credentials, use the network or delete files. A terminal grant needs real containment or a clearly stated broader execution permission. If a provider cannot enforce a promised boundary, show **This provider requires approval for commands** rather than silently using broad approval. A file grant by itself does not authorize arbitrary execution.

MCP tool names such as `get_*`, `readOnlyHint`, self-described safety, and a model's claim are not sufficient to auto-approve. Bind durable rules to owner, authenticated server/configuration identity, operation/effect, destination/resource and relevant arguments. Multiplexed tools require action plus the consequential argument constraints. The same action against a different customer, recipient, environment or deletion scope may need a new grant. If an adapter authorizes an entire server instead of individual calls, disclose **Enable all tools from [connection]**; do not render this as a read-only action. Bounded Autopilot is unavailable for that integration until its boundary supports it or a genuinely read-only server/account is enforced.

## Approval prompt pattern

The final prototype pass places this request **inside the originating chat, immediately above
the composer**, matching the existing product's pending-permission placement. Details → Permissions
and the composer mode button open the same control surface. It shows captured workspace origin,
chat-only mode changes, folder access and each remembered rule's scope with Revoke. A chat move
cannot silently substitute destination permissions. Advanced broad approval stays labeled separately.

Once approved or denied, the request becomes a readable Activity receipt. The draft stays intact.
Repeating a request covered by the same saved grant adds an allowed-by-rule receipt without another
prompt. The sample action picker rehearses file access, bounded tests, source helper reads, connected
reads, unbounded commands, sending and deletion; it performs no actual action. Workspace revocation
affects the displayed workspace rule; it is not presented as a chat-only change.

Always show **action + target + why this is asking** above scope controls. Raw command/tool detail belongs in an expandable area, but consequential destinations and breadth remain visible.

Example A:

**Read supporting files?**

**The selected skill needs files in [helper folder].**

**Read only · Outside current access**

Scope: **This request** / **This chat** / **This workspace**

Dynamic helper: **This chat and its continuations, until revoked.**

Expanded **Access details**: full canonical path, owner, recursive scope, requested file, grant origin. Selecting workspace scope says **Future chats and applicable schedules in this workspace can read this folder.**

Buttons: **Deny · Allow for this chat** (matches selected scope).

Example B:

**Run project commands?**

**Run the test suite in [project].**

Visible consequence when enforced: **May read and edit approved project files. Network access stays blocked.** If not enforced: **This command runs with the computer account's access.** Do not hide this change in an expander.

Default scope: **This request**. Offer chat/workspace persistence only for an express execution policy with accurate boundaries; otherwise label **Save this exact command** and explain that the command's scripts or inputs can change later. Reusable raw command text is not a permanent proof of safe behavior.

Example C:

**Send this message?**

**To [recipient] using [account].**

Show the prepared message or a review link. Buttons **Cancel · Send message**. A broad workspace “always allow this tool” shortcut is inappropriate. A separately configured automation can retain a specific workflow authorization; existing explicit authorization must suppress a redundant confirmation here.

Example D — already granted:

No prompt. Activity detail: **Allowed · Read & edit access from [workspace]** or **Allowed · Approved earlier in this chat**. Provide **View permission**, not another approval question. Deduplicate retries by actual request/operation identity without reusing a one-time decision for a materially different operation.

## Inheritance, changes and moves

Use **From [workspace]**, **This chat only**, and **Saved for [workspace]** as visible origin labels. Put chat-only controls in the primary chat details surface; editing workspace-wide policy requires an explicit **Edit workspace permissions** action. Never put a workspace-wide mode selector directly beside a chat action without showing its broader effect.

Workspace defaults seed new chats. For existing chats, show which settings still follow the same workspace and apply changes between turns; captured overrides and running-turn snapshots remain explicit. Persistent grants follow their authorization owner/resource identity, not whatever workspace name the navigation currently displays.

Move dialog one-line copy: **Moves this chat's location. Its files, sources and permissions stay the same.** After a move show **Permissions retained from [original workspace]** and optional **Review destination settings**. Adoption of target defaults is a separate, reviewed action; removal of an original workspace must not destroy the captured execution/approval scope.

Context changes should re-evaluate only affected grants, preserving unchanged authorized resource scopes where technically valid. Never silently relax existing provider/context protections. Prototype explanation: **One connection changed. Review its access; your folder permissions are unchanged.** This selective revalidation is proposed architecture, not current fingerprint behavior. Revocation applies before subsequent operations and cannot undo work already executing.

## Current implementation facts and hazardous ambiguities

- `src/services/settings/permissions.js` currently exposes ask/custom/trusted/autopilot. Autopilot approves known shell/MCP/URL/custom-tool requests after protected-request checks; structured files retain canonical-folder checks. It is not the bounded Autopilot proposed above.
- `PermissionStore.setMode` grants current roots read/write for trusted/autopilot. `src/server.js` save-workspace additionally promotes planned source-entry roots to read/write. This couples selected reusable sources to write trust and must not underpin the proposed separation.
- Current trust accepts `request.readOnly === true` for MCP. Copilot passes provider request metadata; Claude's normalization does not establish verified per-tool read-only effects. Codex asks to enable a selected MCP server with `toolName: '*'`, then the native runtime manages tool execution. UI cannot promise a universal per-operation MCP safety policy yet.
- Current saved shell rules match full command text; MCP/custom rules match tool plus optional `action`, without general argument/resource constraints. “Always allow this operation” can therefore be broader than users infer.
- Current permission context includes provider, canonical cwd, roots, skills/agents and MCP fingerprints. Changing sources may invalidate chat overrides even though an unchanged folder remains conceptually trusted. Selective grant retention needs design and validation, not copy alone.
- `src/services/workspaces/context.js` currently stores library folders, modes, favorites and defaults per workspace. An Engine Room shared catalog is a proposed storage/UI change. `public/features/workspaces/context-plan.js` and capture code can add selected source roots to provider-accessible roots; loading, read permission and write permission need separate representations.
- Current public controls use long, overlapping mode explanations and expose workspace mutations inside chat details. “Trust workspace”, “Always allow”, “Every chat”, and “Set as starting folder” are dangerously ambiguous without scope/effect labels.
- Current provider adapters differ in enforceable filesystem/command boundaries. A global checkbox cannot honestly promise identical autonomy until capabilities are verified for each provider.

## Prototype acceptance

Demonstrate Engine Room catalog add/remove; workspace working-folder add with explicit durable access; workspace selection from the catalog; source helper read grant; inherited new-chat sources; chat override; once/chat/workspace prompt scope; a non-prompt already-granted activity row; unavailable bounded execution for one provider; changed connection review; and moved-chat retained permissions. Keep **Design preview — no permissions changed** visible. Every persistent action must show its actual scope before the click. No mock interaction may write application data or send real commands.
