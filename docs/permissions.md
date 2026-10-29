## Owner display worker

The local HTTP state view computes permission displays in a bounded background worker using
captured settings, grants and provider-home descriptors. `PermissionProjection` shares display
semantics with `PermissionStore` without disk writers or approval methods. Permission/schedule
revisions and owner changes invalidate cached and in-flight displays. Actual authorization and
mutations continue through the owner with fresh filesystem checks; a displayed result is never
an access grant. See [worker boundaries and validation](2026-10-29-main-thread-responsiveness.md).

## 0.2.28 — selected third-party Codex MCP approvals

The adapter now routes recognized native tool-approval envelopes for every selected third-party
MCP server through the normal permission handler. Existing eligible saved chat/workspace rules
match exact server/tool/action identities without being reset or widened. Ask suspends those
grants as before; active thread/turn, selected tools and revocation are checked before replying.
No native tool is executed again by this approval handler. The existing proteus_app bridge stays
separate; generic form/URL elicitation remains unsupported with an explicit adapter error.

Server enablement is distinct from operation approval. Unsupported/stale approval data does not
become a human refusal, and same-named tools on different servers do not share approval. Synthetic
stdio/HTTP selected-server and persisted-rule regressions pass; actual HC servers remain live
acceptance. See [BF-85 release evidence](2026-10-21-browser-chat-release.md).

## Production permission controls — October 18 candidate

The tested independent chat mode/read-only/folder/action controls now run in the production host.
The general `permissionControls` option selects this behavior; `desktopPreview` retains only preview
runtime isolation compatibility. Promotion does not rewrite saved permission files or chat exceptions.
Workspace defaults and remembered chat grants remain tied to their captured execution origin when
project or workspace organization changes. Read-only approval is independent of the selected mode.
Saved permissions may select native Codex workspace-write only when an explicit canonical starting
folder write grant exists. A running narrower sandbox does not widen on additive permission changes;
reductions stop it and require explicit continuation. No implicit network or temporary-folder grants
are added. Production installation and native live-provider acceptance are reported separately.

Status polling displays a saved run's captured permission context, including scheduled runs that
retain selections for future executions. It does not recapture current instructions or change the
chat's permission origin. Repeated path resolutions are shared only within a synchronous display
snapshot; authorization, grants, revocation and subsequent requests resolve current paths afresh.

In 0.2.33 this request-local sharing also covers inherited working/read-only folders, schedule
fallbacks, chat working folders, explicit schedule folders and automatic provider-folder display.
The memo retains at most 1,024 exact cwd/path pairs and expires at the next microtask. Direct
authorization still canonicalizes its actual target and matching grants freshly; no permission
file, captured origin, effective mode or rule is changed by the display optimization.

# Workspace permissions

## October 18 isolated desktop preview

The chat side panel exposes **Use workspace**, **Ask**, **Saved permissions** and
**Auto-approve tools** inline. Use workspace follows the chat's original permission workspace;
organizational moves do not change that origin. Ask suspends saved approvals without deleting
them. Saved permissions reuses eligible saved folder/action grants; other requests still ask.
Auto-approve tools retains its broad existing meaning, not bounded Autopilot.

**Auto-approve read-only tools** is independent of the mode and can return to the workspace
setting. Ask pauses it. It accepts provider-marked read-only requests and supported browser
reads; it does not infer shell-command safety or approve an entire connection or writes.
Working folders offer **Ask**, **Read** and **Read and write** without enabling their sources or
authorizing arbitrary execution. The panel distinguishes inherited access and chat exceptions.
Remembered actions can target this chat and its continuations or the matching workspace
configuration. Removal affects that scope; resetting a chat override exposes workspace defaults.
An exact command rule can still execute a script whose contents later change; a tool/action rule
does not necessarily constrain every argument or recipient.

In preview Codex Saved permissions, an explicit read/write grant covering the canonical starting
folder permits workspace-write on the next explicit turn, with only eligible granted writable
roots. An external-folder grant alone cannot make the starting folder writable. Ask remains
read-only. Native policy validation retains untrusted approvals, no implicit network access and
no implicit temporary-directory writes. Protected sandbox/enterprise requests and actual user
questions still pause. Access additions leave a running narrower turn intact; reductions or
unknown/mixed changes stop it and require explicit Continue, without replay. Revocation cannot
undo an operation already underway.

Codex selection of an MCP server enables its selected tools for that turn, but native runtimes can
also issue per-tool approval elicitations. The current adapter's third-party routing gap is queued
through the BF-2026-10-21-85 path above; server approval alone does not guarantee execution. Providers may also perform native reads
without issuing a request. These controls describe supported adapter decisions, not identical
OS containment across providers. This iteration remains preview-only; new real-Codex and exact-
package acceptance are recorded separately in [desktop preview](desktop-preview.md).

**October 16 preview revision:** Permission management lives in the existing side panel, with
concise mode/folder/action controls and a separate Help dialog. Workspace settings are edited in
Configuration; the redundant composer Permissions button is removed. Per-request Remember
exposes only scopes actually offered by the host. Adding
Codex access in the isolated preview no longer interrupts a narrower running native sandbox.
Removing access still stops the current turn with an explicit Continue instruction and no replay.
Additive remembered rules preserve inherited grants. Profile removal says Reset to workspace
defaults; it is not a deny operation. See [desktop preview](desktop-preview.md) for scope and checks.

**October 15 historical preview (composer control and mode wording superseded above):** Chat Details and the composer Permissions action expose
the existing permission owner APIs with action/target/reason and explicit request/chat/workspace
scope. The UI calls broad mode “Unrestricted tool approval” and marks bounded Autopilot unavailable.
Ask suspends saved workspace grants; adding a working/source folder does not silently authorize
commands or connected-service changes. Moving a chat keeps its captured permission origin. These
are preview presentation changes, not a new containment policy. See [desktop preview](desktop-preview.md).

**October 15 design proposal — BF-2026-10-15-12:** The [workspace/project design](2026-10-15-workspaces-projects-design.md)
and [permissions review](design/2026-10-15/permissions-review.md) separate working-folder access,
source loading/helper reads and automation. The clickable rehearsal shows scoped once/chat/workspace
decisions, reuse/revocation of grants, retained settings after moves and unavailable command containment.
Requests sit above the chat composer; Details → Permissions and the composer mode button share
controls for captured defaults, chat-only changes, folder access and remembered grants. Approval
scope explains its future effect; decisions preserve the draft and leave readable receipts.
Bounded Autopilot needs real provider/host enforcement; it is not a relabeling of current broad
Auto-approve tools. This is a prototype only. Current implemented behavior remains described below.

**October 11 implementation — BF-15/17:** Workspace approvals are isolated by stable workspace
ID plus provider and canonical resource/integration identity. Configuration exposes its approval
mode, editable folder grants and saved exact-operation rules. Existing fingerprint-specific grants
remain visible and survive ordinary template edits. Replacing their grants/rules requires the
explicit replacement control. Local workspace Copy clones these profiles independently; copying to
another computer resets grants to Ask for review on that owner.

Chat details and eligible pending file requests offer **Trust folder for this chat**, with recursive
read or read/write scope, an exact owner-host path, and revocation. The grant covers current and
future descendants, persists through continuation/restart, and does not affect sibling chats or the
workspace. Read-only grants cannot approve writes. Paths and revision/context IDs are validated
before saving; provider/resource-context changes invalidate the old override. A chat folder exception
under Ask does not reactivate suspended workspace grants or saved commands.

Schedule-started and manually launched schedule conversations also support these run-only controls.
New auto-approval requires the exact current waiting permission request; new folder trust must
match the folder/access offered by that request. The grant persists through that conversation's
continuations, while future independent schedule runs retain their own workspace approval policy.

Proteus owns persistent tool approvals in `<app data>/permissions.json`. Workflow repositories
continue to own their business rules and schedules. Importing a schedule does not grant trust or
enable it.

Choose a mode in **Workspace → Configuration → Workspace tool approvals**, the existing Settings permissions panel, or a run's **Tool approvals** panel:

| Mode | Behavior |
| --- | --- |
| Ask each time | Show each permission request received from the provider. |
| Saved rules only | Use individually approved folders and operations. Other requests still ask. |
| Trusted workspace | Allow structured file reads/writes inside the listed roots, MCP calls marked read-only, and embedded-browser reading/navigation. Other operations need a saved rule or approval. |
| Auto-approve tools | Also allow terminal commands, configured MCP tools, URLs, custom tools, and exact Proteus chat-access scope requests without prompts. Structured file requests outside trusted folders still ask. |

Auto-approve tools is Proteus's unattended tool-approval mode. Terminal commands are not confined
to the listed folders: they have the runner's normal filesystem and network access. This setting
is not an OS sandbox. Actual user questions, sign-in, runtime-marked enterprise approvals, and
sandbox-escape requests still pause. Unknown future permission kinds also ask.

This is similar to the permission levels in
[VS Code](https://code.visualstudio.com/docs/agents/run/approvals), but does not reproduce VS Code's
Autopilot planning/continuation behavior or automatically answer questions. Proteus does not import
VS Code's trust database. Runtime-marked enterprise requirements are never auto-approved; Proteus
does not claim to independently fetch all enterprise policies.

At an individual prompt you can **Approve once**, **Deny**, trust the displayed folder, trust the
whole workspace, or **Always allow** the displayed operation. Command rules match the complete
command exactly. MCP/custom-tool rules match the tool plus its `action` when one is supplied, so
allowing a multiplexed tool's `get` action does not allow `update` or `delete`. URL rules match the
origin. An individual saved rule does not implicitly trust other tools or folders.

Authorizations are scoped to the owner-local workspace ID, provider, canonical working directory, complete set of workspace
roots, skills, and MCP configuration. Renaming a schedule or changing its prompt does not erase
trust. Adding a repository or changing a server configuration creates a fresh permission context.
Symbolic links and new-file ancestors are resolved before checking file access.

Use **Revoke** in Settings to remove an authorization, or choose **Ask each time** to suspend it.
Policy is re-read for every request and queued requests are checked after the previous reply.
Changes from either the Mac or mobile chat details, or the plain file, immediately recheck a waiting
permission request in the same chat. Revocation applies
to future decisions; it cannot undo an operation already running. Human-created browser tabs
still require their separate **Agent access** toggle.

The versioned JSON format is documented in `schemas/permissions.schema.json`. AI tools can edit
existing folder grants/rules in this host-local file. Create contexts through the UI rather than
inventing their computed IDs. Keep the file, its machine paths, run history, and browser profiles
out of Git. UI saves use revision checks so stale forms cannot overwrite external edits.

The provider adapter returns the current SDK's `approve-once` decision for every authorized
operation. Proteus remembers the rule itself, so revocation takes effect without a hidden provider
cache of permanent grants. History records automatic approvals and their policy reason; only a
direct approval response is attributed as interactive.

## Chat-only auto-approval

An individual chat can opt into Auto-approve for this chat only without changing
`permissions.json` or any other chat or schedule. The override is stored with that
chat on its owning Mac, survives continuation and app restart, and can be revoked
back to the inherited workspace mode. Each change requires the current chat
revision and permission-context ID. Changing provider, workspace roots, skills or
MCP configuration permanently invalidates the override; switching back does not
restore it. New chats do not inherit it.

The override auto-approves supported operation requests within existing resource
grants. Structured file reads and writes still require the same canonical-path
folder authorization, and the Codex sandbox keeps its existing writable roots.
Managed enterprise approvals, sandbox-bypass requests and unknown request kinds
still ask. A changed override rechecks a waiting permission request in that chat.
Automatic approval history records whether the source was chat or workspace.

Proteus chat-access requests use a separate owner-created permission kind. The fresh effective
Auto-approve setting can approve the requested host, project/chat IDs and read/dispatch/answer/cancel
actions, then save that exact context-bound grant. Ask, Saved rules and read-only trust still ask;
a remembered `proteus_chats` invocation cannot grant new scopes. A waiting request is rechecked
when approval settings change. The originating turn, context, peer availability and automatic
decision are checked again before the grant is saved. Request arguments cannot broaden while
approval is pending. Grants retain their existing explicit revocation lifecycle; changing the
approval mode controls future requests and does not erase already approved scopes.

Direct grant/revoke remains an operator action. Chat access never approves a destination agent's
tool request, bypasses a paused/revoked peer, or grants browser/terminal sharing. Mandatory provider,
enterprise and sandbox approvals remain separate and still require a direct response.

Legacy partial grants previously labeled Trusted workspace now display as Saved rules only; no
authorizations are broadened during migration. Duplicate SDK checks for the identical active tool
call share its one-time decision; the decision expires when the tool completes. Approval waits do
not consume the provider turn's active execution timeout.

## Enable chat approval from a pending request

A chat’s permission prompt offers **Auto-approve this chat and future continuations** beside
Approve once and Deny. It uses the same chat-scoped override as the details panel. It rechecks
the pending request using existing grants, leaves workspace settings and other chats unchanged,
and preserves any request that still requires approval with its reason visible. Questions do
not offer this action. An already enabled chat choice is disabled at the prompt.

Prompt actions bind the exact pending request ID as well as the permission context and chat
revision. A changed/resolved request rejects the action without creating a grant. Remote clients
show this shortcut only when the host advertises `chat.permissions.pending.v1`; older hosts
retain their existing details-panel controls until updated. Native behavior is covered by the October 11 simulator suite.


## Provider folder scope

Chat-only grants reach Claude and Copilot native additional directories on subsequent turns;
Copilot reconnects when that set changes. The stored workspace configuration is not broadened.
Codex exposes granted chat folders as runtime roots and includes eligible external write folders
in an already trusted native sandbox. Outside the isolated preview, Ask/Saved rules mode retains
the native read-only sandbox and existing write-approval routing. The October 18 preview exception
above requires an explicit starting-folder read/write grant for Saved permissions; adding an
external folder alone cannot implicitly trust the starting folder. Folder trust never approves arbitrary shell/MCP operations or protected sandbox expansion.
Outside the preview, active Codex policy changes trigger the existing interruption/revalidation
path; preview additions/reductions follow the next-turn rules above. No adapter claims
that granting a folder restricts all provider reads at the OS level.

## October 26 schedule and delegated scope

Schedules can persist `executionPermissions` independently of placement and inherit explicit categories from `workspaceSources`. The owner resolves references afresh at run start, records source revisions, rejects missing/conflicting sources and preserves schedule-specific persistent approvals. Explicit folder grants are canonicalized on save, retaining read-only access and preventing a selected symlink from authorizing a different target later. Imports remain inactive unless deliberately enabled.

Delegated work retains the parent's captured provider, model, account, context and permission profile. Native Codex approvals accept only provider-proven active descendants, including the current `subAgentActivity` protocol. Host-managed children stop with their parent; profile changes or ended turns invalidate their scope. Rejection of missing/expired adapter scope is distinct from a human decline. A queued parent follow-up does not stop active children.
