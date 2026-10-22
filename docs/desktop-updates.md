# Desktop updates through a destination Codex chat

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
3. Use the authorized private repository/transfer route. The proven route is a dedicated
   transfer branch containing the signed app archive, source companion, notices and manifest.
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

## Two generation backup retention

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

`src/updates.js` and the independent `desktop/update-helper.cjs` implement protocol-1 preparation,
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
