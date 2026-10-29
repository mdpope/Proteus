# Windows distribution acceptance — October 29

## Installed maintenance bootstrap

Source `66997755244f7be02b719ab656df04294311d385` produced 0.2.34
`windows.23aae039d780`, package hash
`95d9d17cd13a096c3e9a267e76adebd41950242e35ff0f1dfe3450a9b511f996`.
Native tests passed 1,250 / six skips, with static checks, official extraction,
packaged UI/PTY/restart, post-startup identity, legacy readiness and recovery
failure/retirement regressions. Local source tests passed 1,253 / three skips.

The actual older owner imported the signed release, waited for idle, installed
per-user, verified health and resumed the same chat. Installed registration and
package/source identities match. The installed full tree differs from staging
only by the installer-created uninstaller; all other rows match. The supervisor
verified two chats, 2,255 pre-restart events and their contexts, and both drafts.
Permissions, projects, saved window sessions/layouts and browser sessions match.

The helper verified the new full application/data recovery before retiring the
oldest generation. Exactly two fully verified generations remain. Original policy,
retired receipt, survivor identities and observed space changes remain in private
operator records. Cua observes the current native app; its lease is released.

The prior unclassified extra-file failure and later rollback remain preserved.
The accepted package does not relax hashes or turn signature/network errors into
missing releases. Earlier superseded candidates are not eligible for activation.

## View-preservation follow-up

The cold saved session selected a top-level local chat view whose conversation
already belonged to a project. That project had a nonzero content-tab revision
but no descriptor for this view. After reparenting, the first authoritative sync
removed the untracked local view. Its chat/history/draft remained; the selected
view and remembered project child did not. Browser runtime IDs regenerated while
their stable content IDs, profiles, placement and histories remained equivalent.

`test/restored-local-chat-ui.mjs` reproduces the exact selected-view loss in a
disposable synthetic Electron profile. The fix applies the existing peer-alias
preservation rule to local chat aliases too. It does not publish an owner reopen.
Once the owner actually exposes the descriptor, its closure becomes authoritative
and remains so across renderer restarts. The same UI test then passes view ID,
project selection, draft, reload and owner-close checks. Unit cases cover both
local and peer identities. The original failed assertion is retained privately.

The initial 0.2.35 view-fix source suite passes 1,256 tests / three skips / zero failures;
static checks pass. Its native package and live installation must be verified
separately. Do not claim the installed 0.2.34 already includes this correction.

The first genuine installed `build-release` invocation correctly resolved the
missing exact source but stopped in npm's dependency postinstall because its
worker PATH did not contain the configured Node executable. Its failed operation
and log remain intact. Source now passes a configured Node/Git child PATH through
worker launch and prerequisites, normalizing Windows environment-key casing.
A real lifecycle subprocess test reproduces failure with the stripped inherited
PATH and succeeds with the configured environment. Further native validation is
required before claiming the owner-managed build workflow is accepted.

The combined view and worker-environment correction passes 1,258 source tests /
three skips / zero failures and static checks. Native bootstrap uses the exact
reviewed source module with the existing bound policy because the installed
0.2.34 worker predates this correction; no installed file or global PATH is edited.

That first source-module adapter exited immediately after launch. Its worker PID
was later absent, the log was empty and the journal never advanced from starting.
Module loading and the configured Node binary passed separate read-only checks;
the actual exit cause is not established. The original receipts remain intact.
Source now recognizes a recorded exited launcher PID as attention even before a
worker progress write. A real subprocess regression fails before this change and
passes afterward; missing or live launch identities remain protected. The next
bootstrap keeps the adapter alive for the worker's terminal receipt rather than
assuming children outlive a one-shot command context.
The combined follow-up passes 1,259 local source tests / three skips / zero
failures and static checks. Exact native build and installation remain pending.

## Distribution and coordinator boundaries

The 0.2.34 immutable WTB artifacts pass independent full HTTPS hashes/signature
and the actual installed Windows verifier/extractor without credentials or
redirects. The stable Windows feed and page remain on the preceding release while
the view-preservation follow-up is prepared. The existing verified full website
backup is reused with a compact two-entrypoint checkpoint; no extra full backup.

A genuine new unassigned coordinator was created using the initiating Mac's saved
Codex / GPT-6.1 Terra / High options, validated on Windows. Bound updater calls are
authorized automatically. Its first native desktop status request awaits a human
app-tool approval. Saving the operator-approved Windows defaults is still pending;
captured coordinator options alone do not prove those defaults were saved. No agent
may approve or bypass that request. Routine backup/build/install work uses the
owner updater; Cua and Zoho Assist are not substitutes for those operations.
