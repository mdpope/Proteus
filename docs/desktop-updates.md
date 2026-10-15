# Desktop updates through a destination Codex chat

Use this workflow when the operator authorizes updating Proteus on another computer. The
October 12 performance rollout verified it on both desktop installations; see the
[release evidence](2026-10-12-remote-performance.md). The local computer uses the same build,
preservation and acceptance checks without the transfer step. This is a repeatable operating
procedure, not a new automatic updater.

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
