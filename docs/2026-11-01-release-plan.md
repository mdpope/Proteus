# Nov 1 release plan — navigation, responsiveness and distribution

**Stage: local implementation and testing authorized; wider rollout held.** The operator
authorized local builds on October 31, including this exact Work Mac handoff, project/window
synchronization and browser surface sizing. More bugs may be added before distribution.
No installation, public publication or destination update is authorized by this checkpoint.

The isolated continuation starts from the installed combined source `08db248` plus HC handoff
`5f55c75`. The existing October thirtieth 0.2.39 release record is still open, so this checkpoint
does not close that release, reserve another version or relabel an accepted package.
The first local review build retains 0.2.39 with distinct source provenance. Assign the next
version through the named-release tool after the existing closeout is reconciled.

## Baseline and integration

- Profiled installed macOS arm64 package: **0.2.39**, build
  `08db24856fe4+src.4f3b8836cb76`, source fingerprint
  `4f3b8836cb7625e0f7b420fed424c4e5783d73fab6e3e6b76ae4d92dee75f0b6`.
- Source baseline: `08db24856fe401db9ac39ed4283b7054568555ea`, which merges Fusion/remote
  layout with R15/R16 shared models. Preserve those changes and existing October 30/31 rollout
  receipts. Main `2638e5b` is older; do not build that branch as if it were the installed source.
- This plan is separate from the [October 31 register](2026-10-31-release-plan.md). It does not
  implement or reopen other collected items. Assign the next version through the normal release
  process; a November 1 plan date does not rename the accepted October release.

## N1 — remove repeated global scans from background integration health (release blocker)

### Evidence

Read-only diagnostics from the running app show roughly **14.4–15.3 seconds of event-loop lag
at five-minute intervals**. The last retained windows ended approximately 15 seconds after the
integration timer's due time. A targeted 24-second macOS `sample` started November 1 at
02:51:03 UTC; the watchdog recorded **15,658.74 ms** of lag ending at 02:51:21.556 UTC.
The sampled main-thread stack runs through `node::Environment::RunTimers`,
`v8::MicrotasksScope` and repeated `node::crypto::Hash::HashUpdate` calls. Electron's native
symbols do not resolve every JIT frame, so the sample alone does not name the JS caller.
A separate 12-second between-stall sample mostly waited for events.

An isolated inspector CPU profile of the **installed IntegrationHealth implementation** closes
that attribution gap. Entirely synthetic runs with no live provider sessions reproduce the
scan amplification and prevent a zero-delay timer from firing until `tick()` returns. Across
the 150/300/600-run profile, self-sampled time was approximately 21.56 seconds in crypto
`update`, 8.48 seconds in the consumer identity callback and 0.62 seconds in garbage collection.
These are profiler observations, not exact production CPU percentages.

| Synthetic chats | Consumers (two/chat) | Full scans in one tick | Profiled tick elapsed | Single-scan/yield diagnostic control |
| --- | --- | --- | --- | --- |
| 150 | 300 | 301 | 888 ms | 4 ms, one scan, timer runs |
| 300 | 600 | 601 | 2,556 ms | 5 ms, one scan, timer runs |
| 600 | 1,200 | 1,201 | 29,910 ms | 31 ms, one scan, timer runs |

A repeat using the committed harness without inspector profiling took 898 / 2,563 / 24,179 ms
for the three sizes, with the same 301 / 601 / 1,201 scans and timer starvation. Its control took
3 / 6 / 24 ms and allowed the timer to run. Node was v25.9.0 on macOS arm64; the checked-out
integration module was SHA-256 identical to the installed one.

Each synthetic context contains 27,000 padding characters. Diagnostics are enabled; the provider
only reports `hasMcpSession() === false`. The control enumerates once, skips absent sessions and
uses `setImmediate` after each 16 consumers. It exercises no live checking, persistence, revision
races or recovery, so its elapsed time is a lower-bound design experiment, **not a verified fix**.
The synthetic profiling run overlapped the first approximately seven seconds of the targeted live
capture; use the earlier independently recorded five-minute stalls for baseline duration, not a
claim that this capture measures unloaded performance. Timing varies with CPU contention, runtime
and profiling overhead. Scan counts and timer starvation are the decisive reproduction.

Private data was inspected only for aggregate scale: about 600 saved chats, about 16 MB of captured
context, and more than 1,400 saved integration observations. Saved observations are historical,
not a count of currently selected/live connections. No workplace prompts, chat titles, identities,
MCP definitions, credentials, raw live stacks or app data belong in this repository.

### Cause in source

1. [server.js](../src/server.js) schedules `integrations.tick()` every `300000` ms.
2. [IntegrationHealth.tick](../src/services/integrations/integrations.js) enumerates every
   consumer and awaits `check(row.id, {background:true})` for each due row.
3. `check()` calls **global** `consumers().find(...)` before checking `hasMcpSession(run)`.
   Thus even a deferred/no-session result repeats sorting, MCP projection, context serialization
   and identity hashing for all chats. Successful checks can also request a global `snapshot()`.
4. Each `await` of an immediately resolved deferred check continues through the microtask queue;
   it does not yield to timers or native desktop input. The nominally async loop can monopolize
   Electron's main thread for seconds.
5. The 1,024-entry identity LRU can thrash when enumeration exceeds its capacity. Every lookup
   still serializes and hashes the context to form its cache key; a larger cache alone cannot
   remove repeated global enumeration. The synthetic 1,200-consumer case crosses that boundary.
6. Per-phase rings retain only recent samples, and many individual scans are below the 50 ms
   slow threshold. The watchdog can therefore report a long stall with no correlated slow phase.
   An empty `synchronousPhases` field is not evidence of an idle thread.

### Required implementation

- Build one background candidate pass, preferably filtering runs by the provider's existing
  `hasMcpSession(run)` **before resolving MCP selections**. Preserve the provider/session boundary:
  a timer must never start a provider, resume a chat, launch OAuth or send a model turn.
- Pass an internal run/consumer locator into a shared scoped verification path. Recompute the
  target run's current selection and exact identity before effects and again after awaited provider
  work. A retained row is a candidate, not authorization. Do not accept a caller-supplied row or
  ID as proof of ownership. Keep manual/agent checks scoped to the authorized run where available.
- Avoid global `consumers()`/`snapshot()` inside each background check and recovery step. Return
  a small background result; assemble an explicit UI/API inventory separately when requested.
  Preserve existing response contracts for callers that require a full snapshot.
- Yield to a real event-loop turn (`setImmediate` or equivalent) on a bounded time/item budget,
  including no-session, skipped, rejected and recovery branches. `await Promise.resolve()` is
  insufficient. Keep the initial candidate enumeration bounded as well; do not move a large
  global synchronous scan in front of an otherwise yielding loop.
- Retain `ticking` coalescing, provider serialization, active-turn protection, configuration-change
  rejection, three-attempt recovery cap/backoff, authentication semantics and close/drain behavior.
  Recheck close and due state after yields. Session disappearance must defer safely.
- Keep current exact identity bytes/bindings and persisted observations compatible. Batch repeated
  per-run serialization within a pass where safe. Never retain raw context/configuration secrets
  in a cross-turn cache, bypass fresh source validation, or key only by mutable object identity,
  file size or mtime. Address N1's algorithm before considering more cache capacity or a worker.
- Add fixed-label diagnostics for the whole tick and bounded background batches, plus aggregate
  candidates/skipped/probed/global-enumeration counts. Distinguish async elapsed time from main-
  thread blocking. Bound memory/file size; exclude run IDs, server names, paths and payloads.
  Follow [performance diagnostics](../src/services/telemetry/performance-diagnostics.js).

## N2 — reduce routine state projection cost (secondary measured target)

The same live diagnostic rings show approximately 60–90 ms synchronous full-state assembly or
publication, with integration consumer enumeration contributing roughly 33 ms on average.
These nested phases **must not be added together**. They explain smaller responsiveness costs,
not the 15-second periodic stall by themselves.

After N1, profile `http.state.assemble`, `remote.state.context`, `remote.state.attention` and
`remote.publish` again. Reuse projections within one request/publication revision or invalidate
explicitly on relevant run/context/integration changes. Do not introduce an indefinitely stale
inventory cache or remove history, observations, chats or source checks to meet a benchmark.
Keep independent state-projection work separate if it cannot be verified in this release.
Starting tests: `test/remote-state-performance.test.js` and
`test/remote-state-performance-ui.mjs`.

## Reproduction and acceptance for the personal Mac

The committed [synthetic probe](../scripts/profile-integration-tick.mjs) reads no live app data,
starts no providers, writes only an isolated temporary directory (removed afterward), and can
optionally save an inspector profile to an explicitly supplied, new private file.
After installing the checkout's locked dependencies with the supported Node version:

```sh
node scripts/profile-integration-tick.mjs 150 300 600
node scripts/profile-integration-tick.mjs --cpu-profile /tmp/proteus-nov1-new.cpuprofile 150 300 600
```

Do not use a real `PROTEUS_HOME`, attach a second runner to live data, or commit CPU profiles.
Use fresh output filenames. Compare before/after on the same machine and runtime; the lower-bound
control is not production acceptance. Keep the probe useful after the fix rather than asserting
that the old bad scan count must always persist.

Required regression and build gates:

1. Extend `test/integration-health.test.js` with at least 600 dormant synthetic runs, at least
   1,200 consumers and substantial captured contexts. Assert bounded global enumerations per
   tick (not one per consumer), no provider calls for dormant sessions, and that a timer/input
   sentinel progresses **during** multi-batch work. Include enough live synthetic sessions to
   exercise the actual probe/recovery path; an all-skipped benchmark is insufficient.
2. Cover due/future rows, removed runs, changed context/configuration between yields and provider
   completion, session loss, same-provider concurrency, active turns, failed checks, recovery
   limits/backoff, overlapping ticks and close mid-batch. Preserve existing manual and run-scoped
   agent behavior and privacy assertions in `test/integrations-api.test.js`.
3. Add diagnostics tests for tick/batch visibility, bounded counters and no dynamic sensitive
   labels. Run focused integration/diagnostic tests, **`npm test` and `npm run check`**.
4. Use disposable Electron data and mock Keychain as documented in [Apple build](apple-build.md).
   Rehearse typing, selecting tabs and a loopback request while repeated synthetic background
   batches execute. Record max/p95 loop gaps, total batch duration, scan count and allocations.
   On the approximately 600-chat fixture, target no attributable gap over 100 ms and no input/API
   freeze over one second. Keep deterministic structural assertions separate from timing gates.
5. Package/sign on the personal Mac using the normal exact-source process. Verify the actual
   packaged reproduction, signatures/provenance and restart behavior. Packaging alone does not
   prove the fix. Preserve saved context, approvals, drafts, histories, tabs, retry receipts,
   pairings, provider sessions and existing recovery generations.
6. After authorized installation, observe the affected HC desktop for at least **two complete
   five-minute intervals** under normal use, without synthetic CPU load. Confirm the previous
   periodic stall is absent and ordinary integration status/recovery still works. Report installed
   health and actual input responsiveness separately from synthetic/build success.

## Handoff status

Completed here: live watchdog review, between-stall and targeted native CPU samples, inspector-
profiled synthetic reproduction, diagnostic control, reusable synthetic harness, and release plan.
Raw captures remain private on the diagnosing host; only sanitized aggregate evidence is committed.
Checkpoint validation: the committed harness completed all three sizes and both controls;
14 existing integration-health/diagnostics tests, `npm run check`, Markdown link validation and
`git diff --check` passed. No full production regression or packaged
UI acceptance is claimed for this documentation/profiling checkpoint.

The production algorithm, new regression cases, signed candidate and post-install acceptance are
**still required on the building Mac**. This checkpoint is not an installed performance fix.

## N3 — project membership and Close across windows

One owner project has one ordered logical tab collection, independent of its parent workspace
and every window displaying it. URL/current entry/Back/Forward history and order converge in
active and inactive local windows. Selection, scrolling, drafts and reading positions remain
window-local. Paired clients retain the existing owner-scoped remote follow behavior.

Implemented locally:
- Document resolution failures materialize an unavailable tab with Retry and Close, allowing
  the rest of the scope to establish its baseline. Saved-window projection uses the same rule.
- Owner Close/move records retain compact logical IDs and closing revisions. Plain opens,
  passive metadata, stale windows/outboxes and old clients cannot revive retired identities.
  Records do not expire; each scope has a 16,384-record limit and writes fail without replacing
  the registry at that limit. The existing 16 MB total-store bound still applies.
- Explicit reopen carries the reviewed closing revision; a later Close invalidates it. Explicit
  retained-window recovery can reopen reviewed identities without replacing current histories.
- Human Close uses a durable independent queue before navigation hydration or quarantine.
  Native browser Close reaches the owner directly; window disposal and passive mirror cleanup
  retain owner membership. Owner removal wins over concurrent title/metadata updates.
- Explicit chat reopen settles its queued Close and restores the new selection only if no
  subsequent human selection intervened. Chat aliases share one child-scope baseline. Closing
  a chat view releases its browser/document views without closing the owner's child records or
  ending terminal sessions; reopening and restarting restore those same child identities.
  Native child Close resolves the current window's chat alias before interpreting project
  prefixes, and never mutates another owner's scope.
- Missing local views never imply shared deletion or reorder. Only the durable explicit Close
  queue deletes membership. Legacy pending deletion envelopes are quarantined for review with
  their original request bytes/receipt intact. This also closes the remount race exposed by
  the first packaged chat-child restart test; that superseded candidate is not accepted.
- Document materialization gives each parent/container its own view identity. A repeat restart
  test exposed a global file-path ID collision between project and chat views of the same file;
  the regression now requires both identities/parents to remain present together.

Acceptance includes missing documents at the front of the owner list, first-baseline failure,
navigation quarantine, delayed opens, stale reopen, native Close, two-window independent
selection/scroll/drafts, concurrent opens/reorder, close-window/named restore, restart, and all
451 history entries including Forward. The existing encrypted follow fixture remains a separate
cross-owner gate. No physical iOS or affected-HC soak acceptance is claimed.

## N4 — browser fills its content area without a tab switch

The renderer observed the outer workspace, but nested browser surface dimensions can change
without changing that outer box. A resize observer now tracks the actual mounted browser area,
disconnecting the previous surface when replaced. Existing native selection/revision checks
and geometry validation remain authoritative.

The same disposable Electron reproduction fails on unmodified combined 0.2.39 when the toolbar
changes height without changing the outer workspace, and passes with the correction. Both local
windows reclaim the full surface after expansion/contraction without selecting another tab.

The Team browser also remounted its toolbar during unrelated refreshes if native layout advanced
the selection revision while control initialization awaited IPC. Recording the mounted form
before that await preserves the same toolbar/surface, address draft and scroll. The existing
Team-refresh reproduction fails on the unchanged installed baseline and passes with this fix.

## Local implementation checkpoint

N1 now enumerates runs once, skips absent sessions before MCP/context projection, resolves and
validates current run-scoped identities before effects and after awaits, and returns compact
background results. Every sixteen candidates or eight milliseconds it yields to a real event-loop
turn. Recovery caps/backoff, provider holds, active turns, session loss, close/drain and overlap
coalescing remain enforced. Whole-tick async timings, synchronous candidate timings and bounded
fixed aggregate counters are available in performance diagnostics.

Packaged acceptance also exposed a separate synchronous persistence stall: one integration
registry write took 315.07 ms of a 319.25 ms timer gap while consumer projection stayed below
one millisecond. Background writes now use asynchronous restrictive-temp-file/fsync/atomic
replacement with asynchronous Windows sharing-violation retries. Concurrent manual producers
join the same ordered snapshot queue, the save API awaits durability, and shutdown drains writes
and reports an outstanding failure. A delayed-replacement regression proves input-loop progress,
manual/background ordering, permissions and Close/drain behavior. Manual-only writes retain their
existing immediate durability when no asynchronous writer is active.

N2 routine state-projection optimization remains deferred; it is independent of the fixed
repeated-scan background algorithm and needs a separate measured invalidation design.
No broad inventory cache or weaker source/identity validation was introduced.

Final source verification including explicit-only closure, container-scoped document views and
asynchronous persistence: 1,403 Node passes, four skips, no failures, and static checks pass.
The failure-path regression verifies rejected replacement leaves old bytes and fails Close.
Exact-package results and artifact/source pins
are recorded in the private acceptance receipt.
The extended real Electron multiwindow fixture and chat Close/reopen/restart fixture pass.
The original default macOS temporary path exposed
symlink/Unix-socket fixture failures; the complete successful run uses canonical `/private/tmp`.

The synthetic Electron 600-live-session rehearsal completes three passes / 1,800 probes with
three run inventories. Observed maximum timer gap 66.28 ms, p95 16.59 ms, maximum combined
typing/loopback-request latency 232 ms, elapsed batch time 13.41 seconds and heap delta
46,778,400 bytes. Heap delta is not total allocation or a leak measurement. Timings vary by
runtime, disk and contention; structural and responsiveness assertions are separate.
The packaged artifact must run this same rehearsal and restart checks before acceptance.
Affected-HC observation over two five-minute intervals remains a post-install gate under the
rollout hold.

The superseded local Mac artifact used application commit `0aa63b6cf907` and source fingerprint
`cb568287dc4f5190a4cdd587bed18d3404882c948a8e92be74c3d804e47e275b`,
with local ad-hoc signing; publisher/notarized distribution is not claimed. Its packaged
instrumented responsiveness rehearsal passes with three scans /
1,800 probes, max/p95 timer gaps 37.89 / 16.46 ms, maximum typing/API latency 221 ms, and peak
synchronous registry write / consumer projection 20.45 / 3.04 ms. Elapsed time is 13.71 seconds;
heap delta 60,972,576 bytes is not a leak measurement. An earlier exact-package attempt recorded
a 336.16 ms maximum timer gap (p95 16.50 ms) and failed its 100 ms gate. Its cause is unconfirmed;
the failure receipt is retained alongside the instrumented pass. Do not infer a guaranteed
production latency ceiling from a passing synthetic run. The affected-device soak remains open.


## N5 — coordinated distribution and stronger preservation

The private device/role and project process record is created in the configured private notes vault;
no personal device routes or local paths are copied into source. Standing release guidance now
requires short-date naming, all-target rollout unless deferred, and automatic routine source/
PR/main/backup/temp closeout at release completion. The current rollout hold remains unchanged.

Implemented candidate: project-scoped `purpose:build` chats capture the designated builder's
saved updater options, or validate explicit build options. They retain project authority and
get no installation-tool grant. The new capability gates older destinations. Installation
remains the existing fresh unassigned `purpose:update` path used by both local and controller
starts. Feed resolution remains OS/architecture-specific, signed, pinned and download-first.
Windows has its existing owner-native build operation; Mac/Linux use their native source workflow.
Source tests verify all three coordinator providers and explicit build overrides.

Automatic update receipts now compare canonical navigation identities/order/descriptors and
saved window selection/drafts as well as chat prefixes/configuration. Corruption prevents
barrier release. Complete backup and full history/pairing/reading-state checks remain required.
An old owner lacking this capture requires explicit first-upgrade navigation comparisons; do not
report enhanced coverage retroactively.

## N6 — release date in desktop/web/iOS Home

Package metadata carries the release's ISO date and short name. Desktop and web share a UTC-stable
short-date formatter; website metadata/route/view passes the same date. Native Home reads its own
bundle release date, with the normal Apple build workflow supplying it from package metadata.
Unknown historical dates remain absent, not guessed. The current provisional candidate displays
its inherited 0.2.39 / Oct 30 lineage; opening the next named release assigns its own version/date.

## N7 — shared local provider parity

| Feature | Finding and local disposition |
| --- | --- |
| New-chat and schedule provider choices on iOS | The fixed three-provider list hid MTPLX, llama.cpp and Shared local models. It now derives choices from the executing owner's advertised catalog and retains unavailable saved choices. |
| Model/effort/context/service tiers | Existing native picker consumes advertised model controls, including Fusion effort labels. Reused for every advertised provider; no model-name table. |
| Remote tool-created chats | Catalog validation now accepts the actual advertised provider rather than a fixed cloud-provider list. Permissions and fresh model/options validation remain required. |
| Attachment and MCP capabilities in remote state | Project from all actual owner adapters rather than the original three providers; do not advertise unsupported media or login. |
| Fusion phases and attribution | Present in the combined source baseline. Preserve this implementation; no replacement provider/session. |
| Other October 31 collected items | Separate research register remains authoritative. This parity checkpoint does not claim every collected question, layout or device issue implemented. |

iOS build succeeds and the existing shared iPhone simulator passes 31 NativeParityTests,
including the new owner-advertised local-provider case. A first focused run selected zero tests
and is not counted as a test pass. Web assets build and five Home/remote-workspace feature tests
pass (37 assertions); Pint passes. No physical mobile device or website is deployed.
