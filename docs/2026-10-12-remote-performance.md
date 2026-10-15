# Remote command and desktop responsiveness correction

The operator authorized implementation, regression testing and in-place updates on both desktop computers. This authorization is specific to performance and retry/data preservation; the separate activity-card design intake remains held.

## Implemented behavior

- Shared descriptor semantics prevent default browser profiles, key ordering and normalized history from repeatedly submitting unchanged tab mutations. Conflict rebasing suppresses edits already applied by another client, without resurrecting remote closes or losing local changes.
- A dedicated worker stores command claims and results in indexed SQLite transactions with WAL and FULL durability. The host no longer holds or serializes the entire receipt history for each command. Legacy JSON is imported atomically and retained unchanged.
- Claims commit before side effects. Duplicate IDs with the same digest coalesce/replay, changed digests reject, unresolved outcomes remain uncertain after restart, and permission changes are checked across asynchronous boundaries.
- Completed receipts are protected for at least 24 hours; unresolved claims never automatically expire. Count/byte admission limits reject fresh commands rather than evict protected receipts. Already admitted commands can persist oversized results. Logical payload limits differ from physical SQLite/WAL allocation.
- Authenticated local `/api/remote/diagnostics` exposes bounded counters, storage sizes and timing without request IDs, command arguments, results or private paths.
- Resources and terminal status polling use asynchronous coalesced process queries. Cookie snapshot disk operations run asynchronously with ordered writes and a shutdown flush. Browsing-history retention, serialization and atomic saves run in a worker; visits remain visible immediately, explicit edits commit before success, and shutdown flushes queued saves. Workspace-session saves reuse the validated snapshot instead of immediately rereading the same file.

## Verification and rollout

Initial synthetic Electron acceptance migrated 8,675 receipts in a 45.9 MB legacy file, preserved original bytes, and verified exact replay after restart without repeating tab effects. Final source rehearsal measured ten mutations at 0.9–4.0 ms each, 5,691 bytes of new receipt payload, and a 6.4 ms maximum main-loop sampling gap. The earlier synthetic whole-file implementation measured 143–174 ms per mutation. These are bounded local experiments, not a claim about every live workload or physical disk traffic.

All 482 Node regression tests and `npm run check` pass. Focused browser profile/cookie restart, resource controls (nine checks), named-profile tab sync and terminal restart tests pass. Web remote integration verifies pairing, permissions, mutations and revocation through the unchanged host protocol. Journal cases cover interrupted migration, invalid/corrupt storage, failed completion, uncertain outcomes, duplicate commands, oversized results, grants and shutdown.

Signed-package launch, original provider signatures, browser-profile restart and journal migration/replay pass. The packaged journal rehearsal measured ten mutations at 1.0–2.6 ms each, 5,691 bytes of new receipt payload and a 6.5 ms maximum main-loop sampling gap.

Both desktop installations are verified on signed 0.2.12 `ec8b213d382e+dirty.ef08cda12e87` (193 runtime inputs, source fingerprint `ef08cda12e87130d8dc497827e7ca1a2145f2eccd481151f3eaf451feec2e3a6`). Primary installation, restored interface, online relay, exact receipt migration and preservation checks passed. Second-computer installation, restored chat, online relay and exact receipt migration also passed. Both computers recorded zero remote-command claims, results or payload bytes written during separate 30-second idle samples. This is idle acceptance, not a comparison under identical active traffic. Configuration, chats, drafts, tab identities and pairings are verified against pre-update backups. Browser view IDs are recreated on restart; preservation compares persistent content IDs and ownership, not disposable view IDs. Private computer measurements, runtime backups and installation receipts remain outside the repository.

## Recovery boundary

Do not delete the receipt database to troubleshoot a failed write. Preserve SQLite together with its WAL/SHM files while stopped, plus the original JSON. The retained JSON is a migration backup, not a live export of newer receipts. Rolling back to an older binary requires preserving newer retry protection; simply launching an old binary against the stale JSON can lose receipt coverage. Prefer correcting forward or a reviewed offline receipt export, never resetting command history.

Synthetic 10,000-row / 8.1 MB browsing-history saves previously blocked for 17–29 ms. With a warm worker, dispatch took 2.5–3.1 ms and persistence completed asynchronously in 26–30 ms. Process sampling and terminal inspection are asynchronous/coalesced; lifecycle operations and OS-bound encryption remain on their existing authorization boundaries.


## Follow-up: periodic desktop stall remains under investigation

After deployment the operator reported an approximately 30-second spinning-cursor hang and choppy scrolling on the second desktop computer. Read-only tracing confirmed subsecond API delays and ongoing main-process load, but did not capture a full spinning-cursor hang. The earlier journal fix and idle acceptance do not establish that all UI stalls are resolved. Remaining source leads include the 30-second peer heartbeat/full-state response, synchronous scheduler listing/cron computation and checkpoint writes, repeated state assembly, and encrypted peer-index cache writes. The observed trace did not show peer-cache file changes. Separate timer cadence from proven causality, and main-thread work from renderer/GPU work; retain raw profiles privately. No further runtime change or installation is claimed by this investigation.

The completed capture identified main-thread `uv_fs_fsync → fcntl` and synchronous open/read stacks, alongside nearly one scheduler-file replacement per second. Renderer and GPU main threads were mostly waiting. This supports moving scheduler snapshot persistence to a serialized background writer while preserving durable slot claims, current-disk reload and revision checks. Unsymbolicated JavaScript frames do not conclusively identify the expensive handler or establish the reported 30-second cadence. Add bounded phase timings around state assembly/publish and peer-cache encryption to resolve attribution. The active turn was preserved; no restart or settings changes occurred.
