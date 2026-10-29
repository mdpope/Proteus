## October 29 — Windows owner maintenance and distribution

The approved Windows workflow now has installation-bound maintenance plans, verified recovery reconciliation, a designated native builder and signed release reuse before building. See [Windows distribution](windows-distribution.md). Source implementation and live acceptance remain separate; old-client bootstrap uses the existing signed owner updater before fresh coordinator support is available.

## October 27 — fresh update sessions and retained recovery history

Each operator-started update creates a new unassigned `purpose:update` chat named for the selected version, using saved Engine Room provider/model/effort/speed defaults. There is no default existing-chat selection. The new coordinator owns prepare, checkpoint, handoff and continuation through that specific upgrade. Stable operation IDs reconcile ambiguous start responses without duplicate chats; a later upgrade creates a different chat. Existing provider capabilities, owner permissions and unrelated work remain enforced. Provider defaults stay available when update status/catalog/recovery inspection reports an error.

An older completed job may reference a generation retired under the two-generation policy. Polling must not re-register its absent payload. It can recognize supersession only when the old directory is absent and at least two newer eligible retained receipt hashes verify. Missing/changed registered receipts or an unresolved missing copy still require inspection. Do not recreate recovery JSON, erase errors or restore stale data to manufacture success. These follow-up source changes do not imply a live Windows repair or installed package acceptance.

## October 26 — actual-owner environment observation in disposable acceptance

Electron can expose no parseable entries through `/proc/<pid>/environ` even while
`process.env` and its children retain their values. The frozen Linux 39692c2 candidate's
three transition tests completed their supervisor outcomes, then failed that observation;
retain those failures and do not infer that the remaining preservation assertions passed.

The corrected test adds an ephemeral loopback Node inspector only to the exact disposable
owner launched by the real packaged helper. It validates PID, executable, data home and
browser profile before reading only the six desktop-selection values. Exact equality and
all later session/history/receipt assertions remain required. The inspector closes after
observation. No production launch path, candidate bytes or credential behavior changes.
A separate actual-Electron probe rejects a mismatched PID and verifies all six values;
fresh Linux update, rollback and pre-install-failure gates remain required. Neither this
probe nor a basic-storage rehearsal proves live protected-storage readiness.

## October 26 — preserve Linux credential-backend selection context

Update and rollback relaunches preserve existing XDG_CURRENT_DESKTOP, XDG_SESSION_DESKTOP,
DESKTOP_SESSION, KDE_FULL_SESSION, KDE_SESSION_VERSION and XDG_SESSION_TYPE alongside the bus
and display context. Chromium uses that desktop identity to choose protected credential storage;
an available/unlocked service alone does not preserve backend selection. Values are inherited
from the owner, never guessed. No password-store override, credential migration or plaintext
fallback is added. A relaunch starting from an owner that already lost its context cannot recover
missing values through this allowlist; restore the previously verified ordinary desktop launch
context separately through a reviewed graceful process.

The installed Linux 0.2.30 runtime and data-preservation checks passed, but peer access failed at
the protected-storage availability guard before decryption. The working prior owner had all six
selection values; its resumed child lacked them. Encrypted files are unchanged and the wallet
and Secret Service are unlocked. The exact failing backend is unobserved, so preserve that
qualification until the restored launch passes a real read. Do not ask for an unlock or recreate
pairings based on this failure. The source fix and actual recovery acceptance are separate.

## October 25 — All-device rollout authorized after final validation

The operator has completed Design Preview review and lifted the Mac hold. Build/test/validate the
combined 0.2.30 source and then deploy to intended connected platforms, preserving exact artifacts,
provider sessions, owner homes, two verified recovery generations and durable update receipts.
Linux explicitly uses its existing Codex chat because its old runtime lacks purpose:update.
The HC runtime also rejected purpose:update; no task was created and no implicit fallback is
authorized there. Windows is reconnecting. Current acceptance/blockers live in `handoff.md`.
No new installation or publication is claimed by this authorization note.

## October 25 — Combined Design Preview remains a review candidate (earlier gate)

The combined queue/MTPLX/Activity candidate passes source and exact-package review checks;
see [acceptance](2026-10-25-combined-preview.md). It is unsigned isolated staging, not an installed
update or published release. Wait for Operator's preview review and explicit authorization before
replacing local Proteus or dispatching update coordinators elsewhere. Completed updater cards
now suppress obsolete idle blockers while retaining their real errors/outcomes. The earlier
installed acceptance below remains a separate historical release.

## Local Mac installation and automatic continuation accepted

The authorized local Mac now runs signed `b2da2f2797b5+src.f7b3a6a8559e`. The installed
complete-bundle hash and Apple signer match the frozen tested candidate. The corrected supervised
job completed with outcome `updated`, verified renderer/owner health, and delivered one automatic
continuation into the original live Codex session. Its provider session and native transcript
location match the cold pre-update record. No installation retry or external action was replayed
on continuation. Publishing, OS defaults and other-device rollout remain held.

Independent post-install checks verify all 6,346 cold recovery entries, the exact previous app,
all 37 earlier chat event prefixes (9,358 events), all 138 logical tabs and their histories/receipts,
and drafts across four saved session files. All three registered window records match exactly;
fresh native observations show three visible rendered windows, including the original chat.
Fresh browser view IDs differ while their logical content IDs, active tabs and selected children
match. The existing associated-chat parent normalization is preserved.

Permissions, browser profiles/access, connection configuration and window layouts match byte for
byte. Settings add the Keep Screen Awake preference; project source-library changes are scan
metadata only, and logical tab changes are title/last-touch refreshes only. All effective run
configurations match. Raw context hashes matched at the restart barrier; after actual Codex
resumption, 36 still match and the updating chat differs only in its normal context-supplied
timestamp. The strict post-resume mismatch is retained with this qualification, not described
as byte equality. One extra Proteus executable is the provider document MCP, not another owner.

Exactly two verified full Electron recoveries remain: the latest prior recovery and this install
recovery. Their receipts verify; the eligible oldest payload was retired, and completed candidate
staging retired normally. Native/mobile recovery sets are separate. Actual available space grew
414,527,488 bytes between preflight and final audit (about 395 MiB); concurrent activity and APFS
sharing prevent attributing that whole change to one deletion. The helper interval alone recorded
-1,515,069,440 bytes before staging retirement; candidate retirement measured +690,540,544 bytes.
Private immutable acceptance, preservation, source and original failure receipts remain locally.
Other providers, unrelated external workflows and physical iOS behavior are separate acceptance.

A minor status-display follow-up remains queued: a completed update card retains its old idle
blocker. The actual job is complete and its helper exited; that stale message is not a live block.

## October 23 local updater correction

Recovery snapshots omit only the managed home-relative `terminal-tmux/socket` when it is a Unix
socket; the running server and durable terminal files are preserved. The exception is explicitly
scoped to the application home, including when nested under the browser home. Package hashing
remains strict; unknown special entries fail with a relative-path diagnostic.

If snapshot/preflight fails after graceful Quit and before replacement, independently verify
that the installed baseline is unchanged and its former owner has released the home. Relaunch
that baseline behind the existing barrier and deliver the failure/checkpoint through the original
continuation ID. A partial snapshot is recorded separately and never registered as a verified
recovery generation. For protocol-1 compatibility the transport outcome is `rollback`, qualified
by `failedBeforeReplacement` and `preInstallFailure`; the checkpoint states that replacement did
not occur. Ambiguous sessions or delivery remain attention states without automatic replay.
The observed local failure and signed acceptance status are in the next-release implementation
record; these corrections do not imply an accepted installation or real-provider continuation.

## October 23 next release — common signed feed and local coordinators

The candidate supports a common signed downloads.proteus.example release catalog/staging contract for macOS,
Linux and Windows, with local trusted publisher keys, target/architecture/hash/compatibility
checks and no credential-bearing redirects. The local staging helper is
`scripts/stage-desktop-release.mjs`; it prepares signed allowlisted website artifacts and does
not publish them. Local Mac packaging and disposable tests are authorized; no new release
was uploaded or installed for this queue.

Engine Room → Updates configures the coordinator provider, model, intensity, speed and context
from fresh provider metadata. On an authorized push, `proteus_chats create` with `purpose:update`
captures those defaults, validates support/model availability on the destination and creates an
unassigned coordinator without workspace/project sources. Stable operation IDs prevent duplicate
dispatch. Each target uses its own updater, performs required local tests/migrations/preflight,
checkpoints remaining work before restart, and resumes the same chat after restart/rollback.
The initiating chat monitors durable task feedback; dispatch/model completion is not acceptance.
Missing capability, unavailable model, active work or approval blockers remain explicit.
iOS retains the guided Mac process. No destination coordinator has been dispatched for this queue.
The previous release's operational workflow and backup/acceptance rules remain below.

# Desktop updates through a destination Codex chat

The October 23 correction is installed/live-verified on Windows as `windows.a02de6227c89`,
alongside the accepted Mac/Linux/mobile/web rollout. Its prior native registration/recovery
blockers were resolved by direct human actions without agent deletion retry or profile migration.
The separate WTB public publication and actual installed-client full download/extraction/isolated
startup now pass. Native owner UI catalog discovery was verified separately without reinstalling
or restarting the accepted build. Historical review blocks were resolved by exact current human
approvals. Stop the completed rollout monitor. See [Windows status](windows-app.md).

Use this workflow when the operator authorizes updating Proteus on another computer. The
October 12 performance rollout verified it on both desktop installations; see the
[release evidence](2026-10-12-remote-performance.md). The local computer uses the same build,
preservation and acceptance checks without the transfer step. This is a repeatable operating
procedure, not a new automatic updater.

## Supervised self-update and chat continuation — BF-2026-10-19-21

The operator selected this helper-and-handoff approach for the next release, with automatic
same-chat continuation after successful restart **or rollback**, without clicking Continue.
The operator subsequently lifted the intake hold. Protocol 1 is implemented in 0.2.26 and its
exact signed successful update and compatible rollback both automatically resume the original
real Codex session once, preserving prior events, complete history and operation receipts. The
first 0.2.26 installation uses the external procedure because installed 0.2.25 lacks this protocol.
See the [current rollout](2026-10-19-next-release.md); this document does not authorize unrelated updates.

The final October 20 signed follow-up explicitly disconnects/unrefs the temporary readiness IPC
before host shutdown. Actual signed successful update and injected-health-failure compatible
rollback both pass with a real Codex session automatically continuing once, original event prefixes
and complete navigation/operation receipts intact. The portable harness retires disposable app/data
payloads after success and retains compact acceptance/journal/log evidence. This acceptance does
not authorize interrupting unrelated work on an installed host.

### Original baseline behavior and target

In the original 0.2.25 baseline, the Electron host owns the service lifecycle. Its quit handler closes the service;
`Engine.close()` aborts active turns, and engine startup marks unfinished work interrupted without
silently replaying it. `SchedulerWorker` is a worker thread and cannot supervise a dead host.
Thus an updating chat cannot keep running after that baseline app quits. Existing persisted
provider sessions, durable state and retry receipts can support a future deliberate continuation.

The target experience is one visible chat: prepare changes and test a candidate, hand off an update,
show restart progress, reopen that chat in the new build, then continue remaining verification and
report the result. A deterministic supervisor owns the period when no agent/app process is running.
Keep installation, independent health verification and chat continuation as separate outcomes.

### Runtime identity and bounded control

Provide fresh host-owned facts about the installation: stable installation/owner and window IDs,
running build/source fingerprint, packaged versus source mode, platform/architecture, update state,
service generation and actual capabilities. Match the authorized checkout's source to the staged
artifact; a workspace named Proteus or a matching version string is insufficient. Resume context
must obtain the new runtime facts after launch rather than trust the old turn's cached version.

Proposed narrow operations cover identity/status, candidate preparation/verification, durable
checkpoint/yield, authorized installation, recovery status and scoped UI verification. Their names
and schemas remain design work. Internal tools, any external MCP and UI use one host-owned service
boundary with fresh revisions, identity binding and existing authorization. Never give website
content the trusted app preload, unrestricted Electron evaluation, signing keys or a generic
privileged updater shell. Building code in the source checkout does not modify the installed bundle.

### Independent supervisor and durable handoff

Start with a small signed updater/recovery helper whose executable/runtime stays outside the app
bundle being replaced. It must survive normal app exit and recover its journal after a helper/OS
restart, operate only on its bound installation, and avoid update/relaunch loops. It is not a second
runner and must not execute model turns or contend for the live app-data writer lock. Upgrading the
helper itself needs a separate verified transition. A future independent host service can reduce
UI-only interruptions, but full runner updates still require the same durable handoff.

Before shutdown, atomically persist a versioned private update job containing:

- Update ID, owner/installation target, source fingerprint, immutable staged artifact hash/signing
  identity, old/new build identities, state revision and authorization reference/scope.
- Original chat/provider session, workspace/project placement, captured effective configuration,
  context/permission references, queued-message order and a concise completed/remaining-work record.
- Independent test/health criteria, window/selection/reading-position restoration references,
  migration compatibility, consistent backup/recovery references and a bounded failure policy.
- A unique continuation ID and its claim/delivery/completion receipts. Store private prompts and
  receipts in application/operator data, never the source checkout or a shared update feed.

The initiating agent checkpoints and yields its turn. Persisting a request must not terminate the
host inside the requesting tool call. The owner waits until that turn is settled and takes an
update barrier that prevents new turns/schedule dispatch from racing the final active-work check.
Let existing unrelated work finish; show blockers instead of cancelling work or answering approvals.
Preserve messages arriving during the barrier and expose their ordering; incompatible new user input
invalidates/defer the pending transition rather than silently running alongside the update.

Use journal phases such as prepared, waiting-for-idle, checkpointed, stopping, installing, launching,
verifying, awaiting-chat-resume and complete, with failed/recovering states. Advance only on durable
evidence, reconcile ambiguous phases against actual processes/artifact hashes after a crash, and
do not repeat a completed replacement or continuation merely because an acknowledgement was lost.

### Installation and original-chat recovery

Stage and verify the candidate while the old app is available. After the final barrier/checkpoint,
quit gracefully, confirm service/runner exit and lock release, take the consistent current recovery
generation and replace/relaunch the exact tested signed artifact. Reuse the existing installation,
pairing, credential/signing identity and application data. Follow the two-generation policy below.
Distinguish update shutdown from explicit window Close so BF-11's window restoration entries survive.

Keep explicit provider executable/configuration locations from the launching process on both
update and rollback (`CLAUDE_CONFIG_DIR`, `PROTEUS_CLAUDE_PATH`, `CODEX_HOME`,
`PROTEUS_CODEX_PATH`, `COPILOT_HOME`, `COPILOT_CLI_PATH`). They select existing provider-owned
authentication stores; silently dropping one can appear to sign the user out. Do not add tokens
to journal fields or widen the helper's environment allowlist to arbitrary secrets. Isolated
candidate smoke tests must replace these locations and disable real provider executables.
For sign-in continuity acceptance, record non-secret availability before/after restart and the
selected runtime identity; a retained credential-file hash or Keychain item is insufficient.
If the provider was already unavailable, report continuity as unverified, not newly broken or
successfully preserved. Never repair this check by deleting native credentials or restarting
an unrelated active provider chat.

The new host acquires sole ownership, reconciles the update journal and verifies its actual build,
migrations, required service endpoints and restored durable state. A bounded external verifier checks
startup and relevant UI before marking installed/healthy. Then the owner claims the continuation once
and queues a host-labelled update-recovery message in the original chat, with its checkpoint and
verification receipts, reusing the existing provider session where supported. Preserve effective
permissions/context and recheck revocations; do not revive old pending approval request IDs or replay
earlier shell/MCP effects. Do not create a replacement chat or widen permission scope silently.

Dispatch this continuation automatically; reopening a chat tab or displaying a Continue button
does not satisfy the requirement. If the provider is temporarily offline, keep the durable job
pending and resume automatically when ready, with bounded retry/backoff and no duplicate delivery.

Resume delivery needs durable deduplication and provider acknowledgement/reconciliation. If delivery
is ambiguous, pause and surface that state rather than claiming exactly-once execution or dispatching
again blindly. If the provider is offline, retain a pending continuation while the usable app shows
the installed/health result; model availability must not determine whether installation succeeded.
Ordinary crash recovery remains explicit for chats without an authorized update handoff.

On failed startup or health timeout, retain evidence and attempt only a bounded compatible rollback.
An older app must not open incompatible migrated data/receipt stores. Prefer migrations that retain
a verified recovery path; otherwise stop for repair with a usable recovery status surface. Never
restore an old snapshot over post-update user work. Keep a minimal helper status/recovery window or
local receipt available even when neither the new app nor its model provider can report success.

After a successful compatible rollback, automatically resume the **same original chat** with the
failed-build, rollback and current-runtime receipts. The helper's handoff and delivery journal must
survive the rollback, including any necessary data recovery, without losing its current claims.
Require a tested rollback baseline that understands recovery jobs, or a narrow authenticated
compatibility adapter to the older host's existing chat-resume API. Current source exposes a local
run resume route, but older-artifact authentication/session/deduplication compatibility is untested;
the route alone does not prove automatic rollback continuation. Bootstrap this compatibility before
depending on it. Never require ordinary Continue after successful rollback or loop into reinstalling
the failed build. Unresolved delivery ambiguity, revoked access and genuine sign-in failures retain
explicit error states rather than replay or broaden authorization.

### Test and interface contract

The agent first runs source/regression/static checks and disposable packaged-app UI tests using
separate data/profile storage and the existing test credential isolation. The exact artifact later
installed must be the one verified. No test build may share the production runner directory or
silently copy live credentials into its fixture. After installation, an external driver performs
bounded non-destructive acceptance against the actual build and restored state. Use synthetic
records for create/move/delete tests and distinguish fixture acceptance from live acceptance.

[Playwright's experimental Electron automation](https://playwright.dev/docs/api/class-electron)
provides a possible external fixture driver; verify it against the exact packaged runtime and
hardening. Do not turn that test driver's main-process evaluation into an ordinary agent capability.
[Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater) is a possible native
installation backend: its macOS mechanism uses Squirrel.Mac and requires code signing. It does not
supply Proteus chat checkpointing, health acceptance or safe data rollback. Validate current package,
feed and signing compatibility, and explicitly flush before updater window shutdown; the documented
`quitAndInstall` event order differs from ordinary Quit. No updater dependency/feed is selected or
installed by this design review.

Engine Room gains an Updates page with current/candidate build, source/test receipts, blockers,
restart timing and recovery status. The originating chat gets the same durable update card with
Prepare/Test, Restart and resume when authorized, Defer and stage-appropriate Cancel. Show the
exact tested candidate before requesting any missing installation approval; reuse authorization
already granted for that target/scope. An optional saved update policy must be explicitly configured,
not inferred from general workspace write access. Once shutdown starts, cancellation/recovery must
respect the journal phase instead of abandoning a partly replaced app.

After launch, restore the chat/window and show installed, independently verified and chat resumed
separately, with retained links to private evidence. Never mark the workflow complete solely because
the build passed, a process launched, a model turn ended or an install request was dispatched.

## Ownership and authorization

One coordinator owns the release artifact, validation and final status. Reuse the existing
authorized Codex chat on the destination computer. Discover its current thread/host identity;
do not hardcode chat IDs, computer names, paths or credentials in this repository. Only create
a new chat when the operator explicitly requests one. Destination installation runs locally
so its operator can inspect current processes, application data, signing and UI directly.

Carry forward the user's existing authorization for the target, private transfer and install.
Do not repeatedly ask for the same permission. This procedure itself does not authorize a new
target or disclosure destination. Tell the destination chat the authorized scope, exact artifact,
verification requirements and any active-work hold. Honor user-requested model/effort settings
for delegated work; do not make a particular model a permanent deployment dependency.

## Prepare and transfer

1. Run the required regression/static checks and relevant UI or migration rehearsals. Package
   and sign once, then test that signed package. Follow [Apple build instructions](apple-build.md)
   where applicable. Freeze runtime inputs after packaging; runtime changes require a new build
   and artifact identity. Never rebuild independently on the destination and call it the same
   tested artifact.
2. Produce the corresponding source with `scripts/package-source.mjs`. Verify that the source
   matches every runtime hash in the bundle's `build-source.json`, including relevant uncommitted
   changes. Version alone is insufficient: record build revision, source fingerprint, runtime
   file count and SHA-256 archive/manifest hashes.
3. Use the authorized private repository/transfer route. Large archives may use an authenticated
   draft release in the already-authorized private repository, avoiding binary Git history. Verify
   repository privacy and draft status, pin the numeric release ID, fixed asset IDs, byte counts
   and SHA-256 digests, and have the destination independently verify downloaded bytes. Keep the
   matching source and manifest alongside the signed app; publication is a separate operation.
   Do not overwrite assets on an ambiguous result: reconcile their existing IDs/hashes first.
   The earlier proven route is a dedicated transfer branch containing the signed app archive,
   source companion, notices and manifest.
   Split archives only when transport limits require it, recording part and reconstructed hashes.
   Pin an immutable commit and deliver expected hashes through the coordinating chat. Never
   include application-data homes, chats, browser profiles, credentials or private receipts.
4. The destination downloads into isolated staging, verifies all hashes and the app signature,
   compares signing identity with the installed app, and matches bundled runtime files against
   corresponding source. Investigate mismatches before replacement. Preserve the existing checkout
   and local work; a transfer branch is not permission to reset either.

## Install with current data intact

1. Immediately before stopping the app, recheck active, queued and awaiting-input work, drafts,
   and the relevant UI. An earlier idle observation can become stale. Stage while work continues;
   do not interrupt active work or answer its approvals just to install. If interruption becomes
   necessary, obtain the operator's specific direction. Verify an unlocked session before Apple
   signing/account checks; never repair certificates based on a locked-session failure.
   An interrupted chat may retain dormant follow-up messages without a running turn. Distinguish
   these from queued/running/awaiting work using the full owner state. A reviewed guard can permit
   an interrupted record only when it has no pending input, deferred turn or queued-message count;
   preserve its exact saved messages/run file in the cold snapshot and verify them after launch.
   Never clear, replay or cancel these messages just to install. Completed records with saved
   queued messages, active statuses and uncertain states still require an active-work hold.
2. Quit gracefully and confirm the runner has stopped. Only one runner may own the application
   data directory. Preserve a consistent backup of the existing app and current application data
   before replacement. Retain backups and hash/continuity receipts in private durable storage,
   outside the checkout and temporary-only storage.
3. Replace the application in place. Do not uninstall, reset pairing, copy another computer's
   configuration over the destination, or revoke shared signing certificates. Preserve the latest
   folders, approvals, browser profiles, chats, drafts, workspaces and retry receipts.
4. Relaunch and allow bounded startup time. Handle an actual OS verification prompt through the
   operator; a temporarily absent connection file is not proof of failed installation.

## Verify and close the loop

- Recheck installed build/signature/runtime hashes, visible restored UI, a single owning runner,
  and expected relay/peer connections. Verify provider readiness when the update affects it.
- Compare saved configuration, approvals, chats, drafts, workspace membership and pairings with
  the destination's own backup. Compare persistent content-tab identities and ownership; browser
  view IDs normally change at restart. Explain legitimate migrations/navigation changes instead
  of either ignoring differences or requiring all mutable runtime files to remain identical.
- For receipt-store changes, verify database integrity, exact protected receipt migration and
  original JSON preservation. Claims must still commit before side effects; duplicate retries
  must not repeat effects. Exercise failure/restart/replay against isolated fixtures.
- For performance changes, collect a bounded post-startup sample of relevant counters and process
  usage. State whether it was idle, startup or active traffic. Logical payload bytes, allocated
  storage, physical disk writes, worker heap and total process RSS are different measurements.
- The destination returns a concise receipt: artifact identity, checks passed, retained data,
  backup location kept private, live state, measurements and any remaining limitation. The
  coordinator waits for completion using compact status snapshots and records each target as
  staged, installed, live-verified or blocked. Sending the instructions is not completion.

## Recovery

Keep the previous app and consistent data backup. Check migration compatibility before rollback.
In particular, after new remote commands the retained legacy JSON is stale: do not launch an old
binary against it or delete SQLite to clear an error. Preserve the database and WAL/SHM together
while stopped. Prefer a forward correction or a reviewed offline receipt export that retains
newer retry protections. Do not restore an old data snapshot over subsequent user work.

Keep machine-specific transfer/install receipts private. Update the release ledger and handoff
with verified status and limits; do not put runtime data or private paths into project docs.

## External native transcripts in manual deployments

Inventory the provider session paths referenced by Proteus runs before claiming recovery coverage.
A shared provider home can be outside both app-data and browser-profile roots. In that case, an
external deployment driver may add only the referenced existing transcript files to the SAME
current generation, with a private original-path/stored-path/size/hash manifest and stable
before/copy/after checks. Keep private modes; verify the supplement when auditing/retiring that
generation. Missing references are recorded as pre-existing coverage gaps, never fabricated.
The October 22 Linux capture implements this bounded manual supplement; it does not add shared
provider-home backup support to the automatic helper. Index/auth/config remain explicit external
dependencies. Never interrupt unrelated provider/Codex chats or copy their whole home merely to
make a backup claim. Do not restore older transcript/data copies over newer user work.

Preserve strict failed receipts when live metadata legitimately changes. A separate source-bound
classification can accept only proven lossless fields/operations while keeping identity, URL,
ownership, context, approval and original receipt protections. Encrypted derived caches require
actual-owner logical evidence; their ciphertext alone does not establish content preservation.
Distinguish evidence captured at a stated time from current opaque cache inspection.

## Two generation backup retention

For website delivery, apply the same ceiling to inactive code and local package/build copies.
Count failed/incomplete extraction directories. Block another build when prior package copies
remain unresolved; keep the accepted current/previous code, resolve a temporary third after live
acceptance, and preserve the failed transaction rather than resetting its retry receipt.

October 23 operator clarification: two means the latest verified recovery plus **one previous**,
per installation/service and per applicable local/server location. Do not accumulate additional
historical payloads through calendar tiers, old migration pins, retry folders or transport copies.
The owning website project uses this same ceiling; its former three-generation and permanent
migration-pin exceptions are superseded. Do not transfer expired generations merely to retire
them. Keep minimal evidence after cleanup; any extra full exception requires fresh operator
approval with a reason, size and deletion condition. A working service alone is not verification
of its backup: check the retained recovery manifests before retiring older known project sets.

The operator requires only a couple of full recovery backups at one time. This policy applies
to Proteus updates on each distinct installation/data home and each physical device. Desktop
Electron, native Mac, iPhone and iPad have different data; do not replace one target's recovery
with another's. A release directory containing several before/after/retry copies is not one
backup for counting purposes: inventory the actual complete snapshots inside it.

- Keep at most **two verified full recovery generations per target** in steady state. Include
  their corresponding previous app/source identity and compact validation receipts. A newer
  generation becomes eligible after its backup and installation/preservation acceptance pass;
  retire the oldest eligible generation in that same authorized update workflow.
- A single temporary in-flight snapshot may exceed that count while acceptance is unresolved.
  Do not leave an unbounded chain of exceptions after success or failure. Report the hold and
  its exact recovery condition; do not delete the only verified recovery copy to meet a count.
- Build, signing, packaging, simulator and disposable UI tests do not require copying live app
  data. Keep one frozen tested artifact for the release; do not produce another staging/app copy
  for each check. Remove superseded disposable staging artifacts after acceptance.
- Take one consistent pre-update app/data snapshot. Reuse it on retry only while it still matches
  the required current state. Resume partial physical-device copies and retain per-file progress;
  do not restart whole-container backup into a new attempt directory. If state changed, replace
  the snapshot through a verified generation transition, not by silently using stale data.
- Post-install verification should keep hashes, coverage/mismatch results and receipts, not a
  second full after-install/after-launch container. Existing validation mirrors and failed-attempt
  duplicates can retire after the accepted snapshot/receipt proves their necessary files covered.
- Keep **one app bundle per recovery generation**. Once its exact bytes/signing are retained
  inside the recovery set, a duplicate rollback app under Applications is eligible immediately,
  provided no process is using it. Signed staging is not an additional long-term recovery tier.
- Full backups protect durable chats/settings/approvals, profiles/session state, keys/pairings,
  and databases with their consistent WAL/SHM state. Do not omit durable profile files to make a
  size target. Reproducible-cache exclusions need an explicit allowlist and restoration validation.
- After a one-time repair is verified, replace a broad migration exception with the smallest
  original state, exact helper and recovery/acceptance receipts needed to explain or repeat it.
  Record dependencies on retained run/database state. Do not automatically replay old navigation.
  An extra full migration backup needs an operator-approved reason, size budget and deletion
  condition; the word "unique" is not a permanent exemption. Retire compact evidence when the
  related versions/data format and investigation no longer need it.
- Before capture, inventory the configured backup root, legacy roots, Applications rollback
  bundles and device subfolders. Estimate space for retained recovery plus one in-flight artifact
  and small audit metadata. Prune eligible old generations before accumulating another release;
  stop for real headroom/recovery blockers instead of enlarging a budget or copying elsewhere.
- Preserve small private audit receipts and a deletion inventory; compress large historical hash
  manifests/logs where useful. Do not retain whole profiles merely to keep an audit trail. Report
  creation time, contents, logical/listed size, retention role and actual free-space change.
  APFS copies can share extents, so summed directory sizes are not unique physical usage.

This operator policy authorizes routine retirement of redundant/expired Proteus update backups
within the above bounds as part of an authorized update or cleanup. It does not authorize deleting
live data, deleting the only verified recovery generation, changing other projects' backup policy,
exporting private data elsewhere, or scheduling recurring deletion. Carry forward that authorization
rather than asking again for the same routine retention action.

## October 19 helper implementation checkpoint (not deployed)

`src/services/updates/updates.js` and the independent `desktop/updates/update-helper.cjs` implement protocol-1 preparation,
isolated candidate UI smoke acceptance, a turn/terminal/download idle barrier and helper-readiness
acknowledgement before graceful Quit. The signed staged Electron runtime survives target replacement;
source checkouts report unavailable rather than restarting a source process as an installed update.
Compatible baselines preserve signer, source/package hashes and data protocol. Interrupted backup,
replacement, verification and rollback phases reconcile from the private journal. Recovery input
queues durably; the original chat continuation uses one deduplicated message ID and automatically
waits for provider availability. The Updates panel and original-chat card report real phases/errors.

The installation workflow must initialize `<per-installation update root>/recovery-policy.json` after
inventorying **all** existing recovery roots. Its schema-1 record binds canonical home/installation,
audit time and verified generation directory/receipt hash/date/eligibility entries. Handoff refuses
an absent/mismatched inventory. The helper counts imported generations as well as its own; it verifies
receipts, refuses deletion while an app is in use and retires eligible oldest generations before
another full snapshot. Partial copies resume in the same generation. No generic backup folder is
silently exempt. Private paths, prompts, journals and receipts stay outside this repository.

Eight synthetic protocol/supervisor regressions pass, including waiting for the initiating turn,
new input ordering, one same-chat continuation after rollback, permission/session changes, readiness
failure, retained post-update data and interrupted atomic replacement. Real signed candidate smoke,
crash/rollback packaging, live-provider continuation, imported recovery inventory and device installs
remain acceptance gates. Existing installed 0.2.25 is not a helper-capable rollback baseline; initial
0.2.26 deployment still follows the authorized external exact-artifact procedure above.

Later synthetic acceptance also verifies every pre-restart chat's event-prefix/configuration
receipt, permits appended queued input, budgets each distinct staging/installation/recovery volume,
and uses Linux's actual lowercase `proteus` executable. An attention state offers **Resume ordinary
work** only after current package/UI identity verification; it preserves the failed update receipt
and never replays its ambiguous continuation. This is separate from the automatic healthy restart
or compatible-rollback continuation. Twelve synthetic updater cases pass; signed supervisor and
real-provider acceptance remain pending.

## October 22 package and storage hardening (implemented; not deployed)

Mac and Linux packaging now share the versioned source-provenance implementation. The updater
accepts both historical schema-1 fingerprints: the original runtime/build-input encoding and
the later Mac encoding that also included `appBundleId`. New `fingerprintVersion: 2` manifests
retain the source digest expected by protocol-1 updaters and additionally bind the declared
bundle identity in `identityFingerprint`. Unknown fingerprint versions fail closed. Package
inspection verifies the runtime files and actual Mac signature; compatibility requires the
candidate to retain the **installed** bundle ID and Apple team. A hardcoded legacy ID no longer
rejects another valid installation, and this does not authorize switching identities or signers.

An old installed updater that already rejects its own bundle-ID-bearing source manifest, or
hardcodes a different application identity, cannot bootstrap itself from a candidate it never
accepts. That initial transition uses the existing authorized external exact-artifact procedure.
The new candidate's source digest is backward readable for otherwise compatible protocol-1
baselines. Synthetic digest/identity tests do not prove a signed old-binary-to-new-binary update;
that remains a real package acceptance gate.

Package inspection, hashing, private candidate copying and storage enumeration run in a worker
away from the service event loop. Each owner permits one active package operation and at most
four pending operations, and shutdown waits for pending work to settle. Initial runtime identity
can report `identityPending` while inspection runs. The independent post-exit helper continues
to own recovery copying and replacement.

Cancelled-before-replacement candidates and completed candidates with a registered verified
recovery receipt are eligible for staging retirement. Retirement checks the helper PID/lock,
preserves unresolved phases, verifies the registered recovery receipt and deletes only that
job's `candidate` directory. Job/checkpoint/preservation receipts remain. Cancellation attempts
during another updater transition must wait. Candidate cleanup also runs before another prepare,
so abandoned cancelled generations cannot accumulate full app copies. The retirement receipt
records logical bytes, filesystem-reported allocation and observed free-space change. Active
helpers, provider-waiting continuations and attention states retain their dependencies; they
are not silently declared complete to recover disk space.

Recovery copies flush bytes through a writable temporary file handle on Windows and Unix, then
restore the source mode before snapshot verification, including for read-only source files. Source
permissions remain unchanged and durability is not skipped when Windows rejects a read-only flush.

Recovery snapshots use a restartable copy manifest with source-tree identity, cache policy and
bounded progress checkpoints. Retry hashes existing target files and reuses matching files;
changed source generations, symbolic-link parent escapes and changed recovery bytes stop without
overwriting the retained generation. Final verification checks both source and destination.
There is no additional after-copy of live data, and no data is restored over post-update work.
The two-full-generation policy above is unchanged.

Cache policy 1 applies **only inside the configured browser home**, including when that home
is nested inside the application-data root. At its root, `Default/`, and `Partitions/<profile>/`,
the explicit ordinary-cache allowlist is `Cache`, `Code Cache`, `GPUCache`, `DawnCache`,
`DawnGraphiteCache` and `DawnWebGPUCache`. All `Service Worker/CacheStorage`, cookies, IndexedDB,
local storage, extensions, session/history files, approvals, credentials and retry receipts are
retained. Identically named directories elsewhere in application data are retained. Existing
journals without the new cache policy keep their original full-data verification contract.
Only recovery copies omit these caches; live profile files are never cleaned by this mechanism.

The desktop owner's `storage` update action is read-only. For a broader operator inventory,
run the following against exact canonical targets, adding each known legacy/build/release root:

```sh
node scripts/update-storage.mjs --home /absolute/data-home --installation /absolute/app-directory \
  --artifact-root /absolute/release-artifact-root
```

This command never deletes anything. It reports candidate/recovery/artifact logical and allocated
bytes, matching staged-package hashes, eligibility and errors. Recovery accounting includes all
generation directories registered in `recovery-policy.json`, including external roots. Explicit
artifact roots are accounting-only; they are never automatic deletion targets. Unregistered
roots must still be supplied/inventoried by the operator. Overlapping roots and APFS shared
extents mean these totals are not unique physical disk usage; retirement receipts separately
record the actual observed free-space difference. Keep the output private because it contains
installation paths and receipt locations.

Focused synthetic regressions cover historical/new provenance, production Linux-inspector byte
checks, signer identity compatibility, nonblocking worker copies, bounded queues, cancellation,
helper locks, changed/missing recovery receipts, interrupted copy reuse, nested cache boundaries
and retained website/offline data. No live backup, cleanup, application install, signer check or
provider continuation was performed for this checkpoint. Validate the signed package and live
restored profile in the existing authorized deployment workflow before marking a target verified.
## Windows distribution integration (acceptance in progress)

See [Windows desktop](windows-app.md) for the authenticated signed-manifest distribution, cached NSIS installer, fresh-home recovery inventory and exact-package commands. Engine Room may hand off without selecting a chat; original-chat handoff still requires its checkpoint and retains its one durable continuation ID. Existing recovery inventories remain mandatory for established homes. Windows installer/update/rollback acceptance is tracked separately from earlier signed Mac/Linux acceptance.

## Public archive identity and layout

The signing recipe uses a package-hash-based public release ID, independently of punctuation in the full signed build revision. Archive app contents at the extraction root, so the official extractor inspects `Contents/Resources/app` directly on Mac. Verify the exact finished archive through `extractRelease` before asking the protected publisher to sign. A generic tar extraction or signature alone does not establish updater compatibility. Preserve rejected private drafts as superseded evidence; never activate them.

Mac 0.2.30 and this 0.2.31 candidate accept the corrected common static feed. Windows 0.2.29 accepts its own static Windows feed but rejects a Mac static manifest by target/distribution policy; that does not invalidate its cryptographic publisher trust. Older unsupported consumers require the documented helper-capable baseline, with an actionable upgrade rather than relaxed trust or redirected credentials.
