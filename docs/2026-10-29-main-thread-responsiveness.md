# Desktop main-thread responsiveness — October 29

## Evidence and scope

The operator reports continuing typing/scrolling pauses and occasional full use of one CPU
core on the second Mac. Its last verified installation is 0.2.32; the first Mac is verified
on 0.2.33. Earlier diagnostics on the second Mac correlated 28 of 32 recorded owner-loop
delays with synchronous HTTP state assembly (median delay 963 ms, maximum 1,276 ms).
Two older 13-second delays had no attributed phase. These observations identify a real
bottleneck but do not attribute every reported gesture freeze.

Electron's owner/main process and each Chromium renderer have separate event loops. The
owner also serves state and coordinates native views, input, providers and IPC. Blocking it
can make otherwise idle renderers wait. Aggregate machine CPU can be low while this one
thread is saturated. Declaring a function `async`, using a Promise or moving synchronous
work into a timer does not move that work to a different thread.

## Work placement

| Work | Convention and status |
| --- | --- |
| Permission-display path resolution, context hashing and full HTTP state JSON serialization | Now runs in one lazy `worker_threads` worker under `src/services/state/`. Receives a captured display snapshot and returns a string. |
| Schedule scanning/checkpoints, source scanning, browser history, retry-journal database work, package inspection | Existing dedicated workers already own these responsibilities. Do not create a second writer or bypass their queues. |
| Chat saving during streaming | Existing async filesystem writes and coalescing avoid repeated synchronous writes. JSON serialization and immediate durable boundary saves still have synchronous portions; measure them before changing receipt/ordering guarantees. |
| Owner state capture, authorization, mutations, native windows and provider lifecycle | Remain with the single owner. Authorization still reads current grants and resolves paths freshly; display results never grant access. Further async authorization requires explicit revision/TOCTOU handling. |
| DOM updates, layout, paint, selection and input | Must remain in the renderer. Existing bounded history windows, stable composer nodes and incremental message updates should be retained. Pure Markdown parsing is a possible later worker task if a renderer profile establishes it as a long task; no speculative DOM rewrite is included. |

## Implementation boundaries

`PermissionProjection` contains shared display logic; `PermissionStore` retains disk
validation, mutations and decisions. Both use the same provider-folder calculation, so
workers do not instantiate providers or discover accounts. Permission inputs omit prompt
and source text. The state endpoint retains its existing payload/visibility contract.

The owner posts a structured clone synchronously before yielding, giving the worker a
coherent snapshot without sharing mutable application objects. One persistent lazy worker
handles at most four pending requests. Equivalent windows share an in-flight result. A
15-second timeout rejects outstanding reads and terminates the worker; a replacement is
allowed only after exit. Failures return a retryable 503, never a synchronous fallback.
Shutdown rejects pending reads and awaits worker termination.

The 300 ms display cache compares owner generation, current schedule contents and current
permission revision before and after worker execution. Obsolete results are discarded;
one retry is allowed, then a retryable error prevents an unbounded refresh loop. External
permission edits also invalidate cached displays. Streaming does not become a new permission
mutation. No worker owns live data, starts a second runner or writes grants.

Diagnostics distinguish `http.state.assemble` (synchronous capture), `http.state.transfer`
(synchronous structured clone/post), and `http.state.project` (asynchronous elapsed time,
including queueing). Worker operation/failure/duration counters are exposed separately.
An async duration is not counted as owner CPU blockage. Labels/counters contain no paths,
prompts, URLs or credentials.

## Validation

The same isolated Electron fixture uses 500 synthetic saved chats and 12 inherited folders.
No provider turn or operational app-data directory is used.

| Measurement | Installed 0.2.33 baseline | Modified source |
| --- | ---: | ---: |
| Maximum synchronous state assembly | 72.58 ms | 7.52 ms |
| Maximum observed owner timer gap | 84.55 ms | 13.13 ms |
| Maximum snapshot transfer | Not separately instrumented | 1.85 ms |
| Maximum worker projection/serialization | Not applicable | 52.10 ms |

All synthetic chat records remain unchanged. This is about 90% less measured synchronous
assembly and 84% less maximum observed timer gap in these bounded runs. End-to-end refresh
latency includes worker startup and is not claimed to improve by those percentages.

Regression coverage compares all 500 permission displays against owner semantics, including
read-only overrides, schedule permissions and automatic provider homes; detects any owner
path resolution; checks immutable input capture, worker queue limits, timeout/crash recovery,
shutdown, external revocation, shared refreshes and mutations during an in-flight result.
A blocked worker fixture proves owner timers continue before the worker is released.

The final full suite passes: 1,244 tests passed, three platform skips, zero failures; static
checks pass. Focused desktop acceptance types into the actual composer while 500-chat state
refreshes run against a 2,507-event conversation. Draft text, composer identity/focus and
reading position (2,773 px before and after) remain intact; 27 worker operations complete
with no failures. The older `chat-ui.mjs` stopped at its obsolete chat navigation selector;
`composer-stability-ui.mjs` passed its desktop portion but stopped at its separate web CSS
injection. Neither is reported as a full pass. The new focused desktop test is
`test/state-projection-responsive-ui.mjs`; original failure logs remain in private evidence.

This source correction has not been packaged or installed on either Mac. An HC rollout and a stall-correlated live
owner/renderer sample are still needed to establish improvement for the reported real workload.
