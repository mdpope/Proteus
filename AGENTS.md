# Proteus

## Release scope and private device routing

Use short-date release names such as Nov 1. A release starts with requested bugs/features and ends
with verified deployment to included desktop/web/iOS targets unless the operator defers them.
At release completion, perform routine PR/commit/push/sync/merge-to-main and verified branch,
worktree, backup and temporary-file closeout without requiring separate requests.
An explicit rollout hold remains in force until the operator lifts it.

Keep device roles, host IDs and machine-specific operating paths in the operator's private project
record outside this repository. Build each OS/architecture on its designated builder once; consumers
download accepted signed binaries from downloads.proteus.example. Authorized source work can use a project-scoped
purpose:build chat capturing destination updater defaults or explicit validated build options.
Installation always uses a separate unassigned purpose:update chat with receiving-device defaults,
whether initiated locally or from the controller. Preserve ordinary source/tool approvals.

## Named release workflow

Follow [docs/release-process.md](docs/release-process.md) for every release. Resolve the current
named release/version before work; reserve its version once, keep plan/implementation/rollout
records in Git, and distinguish source, published, installed and live-verified status.
On operator closeout, merge validated release PRs/branches into main, synchronize/push and verify
remote main, then retire merged release branches/worktrees and close the record. Do not leave
another open release effort or restart a closed cycle. Public downloads retain only the current
generation; website server recovery is one backup and local website recovery is at most two.
Reuse the shared iOS simulator pool across projects. Apply the precise retention and build-first/
download-subsequently rules in that document without expanding authorization to unrelated work.

Proteus is an independent, provider-neutral local scheduler and conversation client.
Follow `docs/code-organization.md` for source placement and boundary commentary. Keep models,
state, services and feature views in their related folders; keep root files for composition
entry points. Reuse shared navigation controls across tab types and preserve owner/permission
boundaries when moving files or UI resources.
Keep workflow-specific policy in the source repository that owns a schedule. Keep app formats,
provider adapters, interface behavior, and scheduler rules here. Never commit credentials,
browser profiles, actual workplace prompts, chats, usage data, or machine-specific paths.

Schedules are versioned JSON documents. Validate before atomic replacement, and preserve
unknown fields so other clients can extend the format. Run state belongs under the user's
configured application-data directory, outside this checkout. Never silently activate imported
schedules. New providers implement the provider boundary rather than changing scheduler code.

Run `npm test` and `npm run check` after changing execution or persistence. Exercise the desktop
UI after interface changes. Mark rehearsal output explicitly and never invent provider usage.
GitHub-hosted builds are disabled by operator request because credits are exhausted and failed-run
emails are disruptive. Run validation locally; do not enable or dispatch Actions without fresh authorization.
Only one runner process owns an application-data directory. Do not permit concurrent turns in
one session. A completed model turn is not proof that an external workflow finished successfully.

Start with `docs/handoff.md` for reading order, module ownership and validation commands.
For authorized desktop updates on another computer, follow `docs/desktop-updates.md`:
reuse the authorized destination Codex chat, transfer the exact tested signed artifact and
corresponding source privately, verify hashes/signing locally, preserve current data and retry
receipts, and report installed/live-verified status separately. Carry forward existing user
authorization; do not interrupt active work or treat a dispatched chat as a completed update.
For update/recovery backups, follow the operator's two-generation retention policy in
`docs/desktop-updates.md`. Keep at most two verified full recovery generations per distinct
installation/data home or physical device, not two copies per build, attempt or backup folder.
Build-only/test-only runs do not justify a live-data backup. Reuse a still-valid snapshot on
retry; resume partial device copies rather than starting another full container copy. Verify
post-install preservation with hashes/receipts instead of keeping another full after-copy.
Keep one recovery app bundle per generation; retire duplicate rollback apps and superseded
staging/source archives once their required recovery copy is verified. A temporary in-flight
snapshot may exceed the steady-state count only until its verification/acceptance is resolved.
After verified migration recovery, retain the minimum state/script/receipt bundle instead of
indefinite whole-profile exceptions. Any exception beyond two full generations needs a named
reason, size, deletion condition and operator approval. Inventory all backup roots, budget space,
prune eligible generations as part of authorized updates, and report actual free-space change.
Before Apple signing/account checks, verify that the Mac is unlocked. A locked screen can make
Xcode or its command-line tools report missing accounts/profiles despite an existing setup.
If locked, ask the operator to unlock, then recheck the existing Xcode account, team, certificates
and provisioning before diagnosing a setup failure. Do not recreate accounts/certificates,
reset signing or uninstall an app based on a locked-screen check. See `docs/apple-build.md`.
Preserve certificates used by other installed apps. Renew the target app's provisioning profile
with the existing valid certificate; never revoke/delete shared certificates to repair one app.
Update the relevant feature documentation, `CHANGELOG.md`, and `docs/planned-updates.md` when
behavior or scope changes. Record significant design choices in `docs/decisions.md`. Distinguish
implemented, verified and deferred work; a clean build alone does not verify a live workflow.
Model effort/context choices must come from refreshed provider metadata, never a model-name table.
Schedule reload must read current disk state and preserve revision conflict protection.

For tab/chat management work, read BF-2026-10-13-11–13 in `docs/planned-updates.md`,
`docs/browser.md`, `docs/workspaces.md`, `docs/context-loading.md` and
`.github/agents/proteus-tab-manager.agent.md`. This feature is queued under the operator's
build hold; these instructions do not authorize implementation or claim new tools exist.
Use one host-owned service boundary for internal tools, external MCP and interface actions.
Distinguish tab placement/close from chat membership/archive and browser page access; preserve
stable identity, history, effective per-chat configuration, approvals, drafts and retry receipts.
Inventory with real available tools, match fresh IDs/revisions, act within existing authorization
and verify the resulting owner state. Never substitute direct app-data edits for missing tools.
Apply associations/placement to terminals/viewers as well as browsers. Hide, unload, close,
archive and terminal detach/end differ; moves must not recreate sessions, replay startup commands
or rewrite viewer authorization origins. BF-12's synthetic preview is design context, not live
feature verification or permission to build the application.
Queued workspace deletion closes its affected tab tree but preserves chats as unhoused or moves
all associated chats to a selected workspace. It does not delete project files or cancel model
turns. Follow BF-13 for typed resource closure, defaults, dependent schedules and approval/context
preservation; never interpret this planning scope as permission to delete a real workspace.

BF-2026-10-13-15 queues visual browser control through existing Playwright. Image tool-response
transport is required alongside screenshot capture and coordinate input; current ARIA/text output
is insufficient for remote-desktop canvases. Preserve the scoped tab/profile boundary, handle
capture-to-CSS scaling/stale observations and verify actual provider image delivery and input.
Keep remote session keys/screenshots out of source and do not treat queued work as implemented.

BF-16 selects default Playwright/MCP and optional on-demand Chrome DevTools MCP, plus human
built-in DevTools for the selected embedded tab. Test package compatibility against the private
Electron bridge, debugger coexistence and shared tab/action/permission ownership. BF-2026-10-15-08
supersedes BF-17's extra extension-profile opt-in as the desired behavior: authorized agent tab
creation/loading/reading/control across all profiles with consistent ordinary tab scopes. The operator authorized this removal on October 18: ordinary website tabs now use every configured
profile without extension or per-tab sharing opt-ins. Preserve the host/account boundary and actual
backend availability. Do not install packages or change live settings/grants during queue-only work. Required orientation/tool discovery
must distinguish actual current capability from queued normal/developer access changes.

For server release work, use the deployment SSH alias and the audited root wrapper described in
`docs/release-process.md` ("Server access and root operations") before any browser route. For
Virtualmin/Webmin administration that SSH cannot do, use the Codex in-app browser and reuse its
existing signed-in tab. Read the deployment workspace access record for the exact origin; aliases can
have different session cookies. Do not fall back to a different browser or request credentials
before checking that session. Production access and recovery receipts stay in the deployment
workspace, outside this application repository.
