# Scheduler responsiveness and stall diagnostics

The operator authorized the scheduler blocking correction, timing instrumentation, regression tests and updates on both desktop computers through the existing private transfer process. Other feature intake remains held.

## Implementation

Periodic schedule reads, validation, cron calculation and checkpoint serialization/fsync move to a dedicated worker. Ticks serialize and coalesce rather than building a queue. The worker reads current schedule bytes and revalidates due revisions before claims; unchanged-file validation caching must not hide external edits. Five-field cron cannot produce another occurrence inside one minute.

Run creation remains durably persisted before provider effects. Persisted runs prevent duplicate execution if checkpoint writing fails or the process stops before its checkpoint. In-memory poll progress advances only after successful checkpoint persistence. Shutdown drains a started checkpoint and closes the worker. Existing scheduler extension fields, skip/coalesce semantics and remote-command retry receipts remain intact. Failed initial run saves remove the unsaved in-memory queue entry. Unchanged invalid schedule errors are deduplicated. Schedule-list previews reuse validation and cron calculations only when exact file bytes and the preview minute match; every read checks current file contents and returns isolated copies.

Bounded timing instrumentation distinguishes synchronous phase work, asynchronous elapsed time and event-loop lag. Fixed phase names prevent chat content, paths, URLs, command arguments or error text from becoming diagnostic labels. Local authenticated `GET /api/performance/diagnostics` supplies timing aggregates and scheduler-worker counters. Current and previous diagnostic snapshots stay in the application-data diagnostics directory; diagnostic saves are best-effort background I/O, not a new main-thread flush. Event-loop records correlate recent phases but do not prove causation, and sleep/clock discontinuities are identified separately.

## Verification and rollout

All 502 Node regressions and static checks pass. Focused tests cover delayed worker writes without main-thread schedule reads, overlapping ticks, failed initial claims/checkpoints, stale-checkpoint restart, changed revisions, shutdown, current-disk edits preserving size/mtime, and unknown fields. Diagnostic tests cover privacy/bounds, sync versus async attribution, discontinuities, write failures and lifecycle cleanup. Source Electron acceptance detects an intentional synthetic blocking phase and retains its private report through shutdown. Signed-package acceptance also passes: launch/provider signatures, synthetic scheduler/stall capture, exact retry replay after restart with the large legacy fixture, and isolated browser profile/cookie/storage persistence. The retry fixture retained all 8,675 records in its 45,935,619-byte original journal; ten mutations wrote 5,691 logical payload bytes, with a 6.6 ms maximum main-loop gap. These are synthetic measurements, not physical-disk write totals or proof of HC responsiveness. Signed build `ec8b213d382e+dirty.b1dd22a19b42` has 196 matched runtime files. The primary desktop is installed/live-verified on that build: the original signing certificate, all runtime hashes, one runner, connected UI/relay, protected SQLite receipts, original legacy JSON, settings/approvals, chats/schedules, drafts, saved tab identities/profiles/ownership and pairings passed continuity checks. A consistent previous app/data backup and receipts are retained in private durable storage. Its 72.6-second post-startup idle sample showed no new event-loop events above the 100 ms threshold, no scheduler failures, no retry-journal writes, and diagnostic API latency 2.98 ms median / 20.52 ms maximum. This is bounded idle acceptance, not physical scrolling or HC verification. The second desktop is also installed and live-verified on the exact same signed build through the approved private transfer. Restarting both Codex instances restored delivery. Destination verification checked original signing, all 196 runtime/source hashes, protected SQLite receipts and legacy JSON, saved tabs/workspaces/drafts/pairings, one owning runner, and online relay/peers. Full private durable backups were retained; later user work was distinguished from installation changes. A naturally due scheduled run completed and its advanced checkpoint matched the durable run claim, with schedule definitions and enablement unchanged. Raw runtime profiles, deployment backups and per-computer receipts stay private. The previously reported approximately 30-second spinning-cursor hang has not yet been conclusively attributed; instrumentation is intended to capture the next occurrence without claiming it already fixed.


## Remaining responsiveness evidence on the second desktop

Its 70.287-second post-startup sample included an active provider turn, which completed during
the window. It is not an idle benchmark and must not be compared directly with the primary
computer's idle sample. All 70 API probes succeeded: median 4.742 ms, p95 302.638 ms,
maximum 409.43 ms. The scheduler worker reported zero failures.

The new instrumentation captured 47 event-loop delays above threshold, maximum 381.17 ms.
Ten overlapped recorded slow synchronous phases. `remote.state` had 43 slow samples,
average 121.19 ms and maximum 140.4 ms; its enclosing `remote.publish` had 41 slow samples,
average 122.26 ms and maximum 141.25 ms. These nested durations must not be summed.
Remote-state assembly remains a measured main-thread responsiveness target. A full reported
periodic spinning-cursor hang was not captured, and this rollout does not claim it eliminated.
Future work should isolate expensive snapshot components and reduce repeated assembly while
preserving fresh state, publication ordering, privacy and command retry protections. No further
runtime changes were made during destination installation. The separate feature-intake hold
remains unchanged.
