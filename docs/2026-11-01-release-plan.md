# November 1 release plan — desktop responsiveness

**Stage: profiled and planned; production correction not implemented.** The operator requested
profiling of recurring Work Mac hangs and a committed handoff for the personal Mac to implement
and build. This checkpoint contains the diagnosis, synthetic reproduction and acceptance plan.
It does not change the running app, provider sessions, permissions or release version.

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
