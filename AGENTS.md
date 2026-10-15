# Proteus

Proteus is an independent, provider-neutral local scheduler and conversation client.
Keep workflow-specific policy in the source repository that owns a schedule. Keep app formats,
provider adapters, interface behavior, and scheduler rules here. Never commit credentials,
browser profiles, actual workplace prompts, chats, usage data, or machine-specific paths.

Schedules are versioned JSON documents. Validate before atomic replacement, and preserve
unknown fields so other clients can extend the format. Run state belongs under the user's
configured application-data directory, outside this checkout. Never silently activate imported
schedules. New providers implement the provider boundary rather than changing scheduler code.

Run `npm test` and `npm run check` after changing execution or persistence. Exercise the desktop
UI after interface changes. Mark rehearsal output explicitly and never invent provider usage.
Only one runner process owns an application-data directory. Do not permit concurrent turns in
one session. A completed model turn is not proof that an external workflow finished successfully.

Start with `docs/handoff.md` for reading order, module ownership and validation commands.
For authorized desktop updates on another computer, follow `docs/desktop-updates.md`:
reuse the authorized destination Codex chat, transfer the exact tested signed artifact and
corresponding source privately, verify hashes/signing locally, preserve current data and retry
receipts, and report installed/live-verified status separately. Carry forward existing user
authorization; do not interrupt active work or treat a dispatched chat as a completed update.
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
Electron bridge, debugger coexistence and shared tab/action/permission ownership. BF-17 proposes
configurable agent access for extension profiles; the blanket protection remains current until
implemented. Do not install packages, lift existing grants or bypass that policy during queue-only
work. Required orientation/tool discovery must distinguish normal and developer access.

For Virtualmin/Webmin administration, use the Codex in-app browser and reuse its existing
signed-in tab. Read the deployment workspace access record for the exact origin; aliases can
have different session cookies. Do not fall back to a different browser or request credentials
before checking that session. Production access and recovery receipts stay in the deployment
workspace, outside this application repository.
