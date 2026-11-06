# Nov 3 iOS performance and synchronization

Source lane: `claude/nov3-ios`, baseline `cbed273`, version 0.2.42. The component
measurements below use Simulator Debug. The later [source-pinned Release journey](ios-release-journey.md)
records `cbed273`, integration `245e7d0` and iOS follow-up `4cb903c`, including
the baseline accessibility failure, completed integration/follow-up journeys,
hang-count scope and executable hashes. No distribution artifact, physical
installation or publication was produced; the operator's phone remains unverified.

The later [navigation alignment](ios-navigation-alignment.md) supersedes this record's
settlement-based mirror rule and navigation-rebase proposal. Passive mirrors now remain
local until trusted interaction, and queued successors adopt actual owner acknowledgements.

## Nov 4: completed whole-app Release comparison

**The whole journey now completes on both source arms with finalized Time Profiler/Hangs
recordings.** This replaces the missing matched baseline trace in the earlier
[Release journey record](ios-release-journey.md). It does not establish that the operator's
physical-device problem is solved, and the component decode timings below are not offered
as its explanation.

App sources are baseline `cbed273086beff20ce6c7e4441813663bc87278c` and iOS follow-up
`a82cf2d62817018a933d366729e5441828f372b0`. Both are Release, arm64 simulator builds,
Xcode 27.0, on the existing iPhone 17 Pro/iOS 26.5. They use dedicated benchmark identities;
installed Preview apps, physical devices and the running desktop installation are untouched.
The baseline source export is unchanged. No supported CPU/slower-phone approximation was
available; neither animation slowdown nor host scheduling was represented as device emulation.
The requested baseline source labels itself build 2611.2.1; it is not the operator's
installed 2611.2.10 binary.

Both clients use the same real local owner/relay implementation, frozen source `568705c`,
as included in integration `245e7d0`. `git merge claude/nov3-release` was already up to date;
the requested first-delta metadata fix `ef6b3f1` is already included. No owner/desktop/web/relay
source changed. The old client receives that owner's full-state compatibility stream, with
progress-only changes batched to at most one full push per ten seconds. The new client opts
into state patches and field-only chat deltas. This is not the former owner sending 2 MB
every second. Across the fresh fixture connections the observed maximum encrypted packet
was 858,097 bytes; do not describe these captures as the separate 2,027,239-byte component test.

The fresh isolated owner contains 1,500 General chats, 200 browser tabs plus three chat tabs,
and an initially 3,000-event conversation with rich Markdown and **300 explicit completed tool
cards** (100-line outputs). One assistant event is appended each second through the actual
encrypted owner/relay path. No provider executes. The conversation keeps growing between arms;
the initial 3,000 rich events are retained, rather than replaced by the short stream tail.
Prior synthetic data and pairings were preserved. First-install warming/pairing is outside
timing. These are single observations: history sizes, cache warmth and retained draft lengths
were not reset identically. Do not infer a causal percentage speedup from these two runs.

### Journey timings

The same compiled driver visits Chats, opens General, switches through chats 1/2/0, scrolls
the long chat twice, types/verifies 210 numeric characters, opens Tabs, loads example.com,
then returns to a chat. Both XCTest cases pass: **306.375 s baseline / 146.060 s follow-up**,
including preparation and recorder-finalization time outside the individual steps.

| Step, XCTest wall seconds | Baseline | Follow-up |
| --- | ---: | ---: |
| Cold process to cached shell control | 5.993 | 3.762 |
| Open Chats catalog | 10.959 | 3.314 |
| Open General | 14.510 | 12.260 |
| Switch short chat 1 | 9.928 | 5.969 |
| Switch short chat 2 | 9.763 | 6.213 |
| Switch long chat 0 | 45.489 | 7.661 |
| Two scroll gestures | 88.106 | 23.315 |
| Type and verify 210 characters | 29.720 | 14.399 |
| Open project Tabs list | 17.757 | 12.230 |
| Browser load and return | 36.408 | 23.786 |

These include accessibility lookup, event synthesis and quiescence waits. Chat-switch checks
wait for the conversation control, not an instrumented first-card presentation timestamp.
Typing includes locating/focusing the editor and verifying its value; it is **not keystroke
to display latency**. True per-key latency and display-frame scroll hitches are not obtained
from these wall times. Browser time includes external network time. The return screenshots
were inspected: **both return to short chat 2**, rather than the long chat intended by the
driver's original comment. They verify return to conversation content, not long-chat reading
position restoration. The earlier long-chat scrolling/typing measurements remain as listed.

A separate single-iteration SDK check, without Time Profiler attached, reports:

| Supplemental metric | Baseline | Follow-up |
| --- | ---: | ---: |
| First frame plus main-thread responsive, cached short-chat launch | 4.673 s | 4.391 s |
| Two long-chat drags, measured block wall time | 40.852 s | 36.366 s |
| App CPU time during that block, all app threads | 42.071 s | 37.953 s |

`XCTApplicationLaunchMetric(waitUntilResponsive: true)` provides the launch result;
the scroll helper explicitly selects long chat 0 before measurement. Its app CPU metric
targets the benchmark bundle, not the test runner. UIKit reported a 2.442-second scrolling/
deceleration interval only for the new arm; it supplied no comparable baseline animation
interval or paired hitch counts. Missing animation data is **not zero hitches**. These
supplemental results show a much smaller difference than the primary driver wall times,
and do not confirm a general performance win. They also do not measure per-key input latency.

The final driver uses the observed conversation viewport for scrolling and the visible
project Tabs control. A global Tabs label previously selected a retained hidden catalog.
Other rejected attempts stalled during baseline accessibility queries or first-install
accessibility attachment; their results are not silently counted as passing journeys.

### Hangs and main-thread symbols

Trace TOCs identify one attached benchmark app each. The Time Profiler template includes
Hangs with microhangs above 250 ms. Recordings attach after the cold-start marker, so startup
hangs are excluded. The recorder now stops gracefully at completion while its target is alive.

| Recorded window | Baseline | Follow-up |
| --- | ---: | ---: |
| Duration, seconds | 274.791 | 110.649 |
| Severe hangs | 16 | 0 |
| Hangs | 103 | 63 |
| Microhangs | 88 | 51 |
| Total potential intervals | 207 | 114 |
| Potential intervals per second | 0.753 | 1.030 |
| Main-thread weighted samples | 208,836 | 88,194 |

The follow-up has fewer severe intervals and completes sooner, but its overall interval
rate is higher. **The hang count does not establish smoother physical-device interaction.**
AX snapshot work contributes heavily: `__XCTPerformOnMainRunLoop_block_invoke` has
73.701 / 47.834 sampled inclusive seconds; accessibility snapshot calls have
70.337 / 45.324 seconds. These categories overlap. The summary tool's generic “most are
the idle run loop” text is not a finding for these traces.

[profile-symbols.py](../../../ios/tests/profile-symbols.py) resolves xctrace XML references
and weights, deduplicates inclusive symbols within each sample, and counts the **leaf** for
self time. Nominal sample weight is 1 ms. These are statistical sampled seconds, not exact
elapsed function durations; inclusive columns overlap and must not be added together.
Generic application entry/run-loop ancestors are omitted from the inclusive table.

| Main-thread leaf/self symbol, sampled seconds | Baseline | Follow-up |
| --- | ---: | ---: |
| `<deduplicated_symbol>` (unresolved ownership) | 11.938 | 6.537 |
| `_platform_memmove` | 10.866 | 5.212 |
| `swift_retain` | 9.613 | 3.288 |
| `swift_release` | 9.534 | 2.996 |
| `madvise` | 6.582 | 0.610 |
| `AG::Graph::propagate_dirty` | 5.039 | 1.108 |
| `AG::Graph::UpdateStack::update` | 4.330 | 1.072 |

| App inclusive symbol, sampled seconds | Baseline | Follow-up |
| --- | ---: | ---: |
| `SharedAppStore.applyContentTabs` | 35.110 | 3.859 |
| `SharedAppStore.refreshContentTabs` | 35.106 | 3.819 |
| `SharedAppStore.tabs(in:)` | 22.460 | 1.020 |
| `NativeWorkspaceTree.projectGroup` | 4.439 | 0.718 |
| `NativeWorkspaceTree.recents` | 4.163 | 0.647 |

The previous completed integration/follow-up recordings also showed sidebar recents at
3.180 sampled inclusive seconds and `tabs(in:)` at 1.767 seconds in the 95.73-second
follow-up window. That identified the additional per-resource browser-list scan fixed here.
These earlier captures are distinct from the final table, not substituted for its baseline.

### Findings, changes and limits

- **Repeated scans and projection:** the baseline spends substantial main-thread time in
  content-tab projection/copying. Earlier Nov 3 indexing removes the quadratic ordered-tab
  projection. This follow-up additionally builds the browser alias dictionary once per
  project-recents calculation, instead of filtering/copying the whole browser list per row.
- **Observation behind the open chat:** sidebar recents previously observed whole run sections
  and the entire chat dictionary, including streamed events. `sidebarRunState` now contains only
  the metadata it displays: identities, title/type, membership, archive flags and activity dates.
  Progress/text changes do not publish that projection; membership, labels and activity remain
  live. Two remaining literal context reads use section observation. Existing Home/count/title
  projections and no-op chrome guards remain. No live view was hidden to obtain these numbers.
- **Markdown/view creation:** long-history rendering is still relevant. Deepest-app attribution
  includes `WKWebView.init` at 2.067 / 0.266 sampled seconds and timestamp parsing at
  3.795 / 0.410 seconds. These are not leaf/self timings. Existing viewport admission and
  shared Markdown storage are included in the final arm. Conversation rows use stable event
  indices; these traces do not count every SwiftUI body or prove the absence of identity churn.
- **Startup/Keychain/crypto:** attached traces exclude launch. Synchronous restore/durability
  boundaries still exist; these captures cannot rule them out on a phone. A 40 ms component
  decode does not explain the long wall-time stalls above.
- **Timers:** refresh work is present in the call trees, not ruled out. Three-second tab
  refreshes and five-second notification polling remain. A post-journey synthetic diagnostic
  window contained two `notifications.list` replies totaling 898,100 wire bytes and three
  `tabs.get` replies totaling 483,126 bytes per ten seconds, versus a few KB of state patches.
  Those counters cover the fixture connections, not a per-device rate. No owner API was
  changed or timer disabled to improve a benchmark. A future lightweight notification revision/
  count response could avoid repeatedly transferring full `items`; it is not implemented or
  required by this source acceptance.

Field deltas were already integrated, not reimplemented: visible `chat.get` uses
`watch: "delta"`, `fieldDelta: "v1"` when supported, and the visibility token. `mergeChat`
merges changed metadata and retains removal tombstones across late older pages, matching
the public chat-history semantics. Old-owner whole-page fallback remains. The native field
delta/late-page regression passes in the full suite.

Final native validation: **210 tests, zero failures** on both shared phone and iPad;
the new sidebar test verifies zero observed invalidation for progress/text and live publication
for membership/activity. This is a projection regression, not a runtime count of every SwiftUI
body. Static checks and fixture syntax checks pass. Private raw traces, screenshots, AX logs,
device/process identifiers and test results remain outside Git.

After recording, sidebar compatibility fixes preserve the old `Chat` placeholder when an
owner slot arrives before its run metadata and match `NativeProjectActivity`'s legacy
`openedAt` fallback. They also exclude undisplayed legacy `updatedAt` churn. Those fallback
paths were not exercised by the profiled fixture. The phone full suite passed 210 again
after the placeholder fix; the final seven projection tests pass on both phone and iPad
after the date adjustment. The simulator executable identities below refer to the measured
`a82cf2d` production tree, not a subsequently rebuilt distribution artifact.

SHA-256 of the two arm64 simulator executables (not published or physical-device artifacts):

- Baseline: `1e977d0982bbaac6a8ff5139d882a727f85594f4d71c374e7be089d139e8b3b0`.
- Follow-up: `17ee7b702004cc1a37c47704d54c46d328033659e143fc31881ed41751f4124e`.

Physical-device feel, thermal/memory pressure, real relay/LTE latency and exact input-to-display
latency remain unverified. The operator's phone is still needed for N1 acceptance. No signed
release build, publication, physical installation or change to shared simulator definitions
or the operator's local tool installation was made.

## Reproducible workload and measured results

Run `npm run ios:test -- --device SIMULATOR --only ProteusTests/Nov3PerformanceTests`
with the existing shared simulator. The original symlinked dependencies required
`NODE_OPTIONS=--preserve-symlinks`; final validation uses the operator-authorized APFS
dependency clone. Build output and raw diagnostics stay outside Git.

`testLargeStateCPUProfile` generates 1,500 chat summaries with markdown-like text and
200 browser descriptors, totaling **2,027,239 JSON bytes**. Ten iterations decode,
AES-GCM decrypt/decode and apply an identical state, with one-second pauses. No live
owner, pairing, message or user data is involved. Before and after use the same test,
iPhone simulator, iOS 26.5, Debug configuration and payload. Wall times include executor
scheduling; decrypt/decode includes parsing, rather than measuring AES alone.

| Mean per snapshot | Baseline | Changed source |
| --- | ---: | ---: |
| Detached JSON decode | 39.06 ms | 14.49 ms |
| Detached decrypt + decode | 39.53 ms | 15.41 ms |
| Main-actor state application | 1.70 ms | 2.09 ms |
| Maximum state application | 1.91 ms | 2.54 ms |

The decoder cost fell about 62%. State application did not improve; it now additionally
compares the sections subscribed to by presentation. These measurements do not establish
that decoding caused the reported physical-device slowness.

`testPushInvalidationsAndInputLatency` mounts two SwiftUI probes in a real hosting window:
one reads raw state, the other the host-name section. Ten approximately 1.9 MB pushes
change streaming text/tick at roughly one-second intervals while a native text view
receives 200 insertions. For identical pushes in the same process, raw observation
executes the body **10** times and section observation **0** times after initial layout.
The 10 ms input scheduling probe measured **5.35 ms p95**, **6.43 ms maximum** excess
latency and **zero samples above 250 ms**. The earlier implementation of the section
cache leaked one raw-state subscription on initial creation; that regression is fixed.
These are focused body/input probes, not full-app Instruments hang counts or keyboard
hardware latency. The input probe does not render a long conversation.

The same changed-source probes on the shared iPad/iOS 26.5 measured 14.81 ms decode,
14.88 ms decrypt/decode, 2.07 ms mean / 2.39 ms maximum application, 10 versus zero
body evaluations, 6.11 ms p95 / 8.31 ms maximum input excess delay and zero samples
above 250 ms. There is no pre-change iPad timing baseline.

`testCacheLifecycleCPUProfile` separately creates a roughly 2 MB, 1,500-chat encrypted
cache and verifies exact restoration. On the iPad its main-actor lifecycle flush measured
13.14 ms and synchronous cold cache restoration 12.61 ms. These boundaries remain
synchronous; there is no before/after cache comparison or claim that their I/O moved.

## Changes

### Rich-message startup and actual typing

Time Profiler identified synchronous WebKit creation during chat opening. The before
render policy forced a WebKit renderer for every unmeasured realized row, even outside
the viewport. Source `07830a4` records the content-free Debug probes before that policy
change. Source `3f64e34` admits renderers from the native scroll owner's content-coordinate
viewport. Only per-message visibility transitions publish through Observation; offset and
frame samples remain reference state. Standalone message surfaces retain rich rendering.

The unchanged 1,000-event rich fixture creates **12 → 3** renderers during opening/editing;
synchronous creation time falls **116.21 → 54.73 ms**. After-policy native input p95 is
**1.91 / 1.81 / 1.99 ms** for 1 / 100 / 1,000 events; TextKit sizing p95 is **0.08 / 0.07 /
0.08 ms**. All three enter 210 characters with **zero history passes**. XCTest wall times
are **4.67 / 4.66 / 4.25 s**, dominated by automation. An earlier 12.53 s heavy-case result
was not reproduced; it is not presented as an app-input measurement. The final runs require
actual rich renderer creation, and scrolling acceptance requires a nonzero live count.

Two matched 30-second heavy-case Time Profiler recordings show **five → four potential
hangs**. The chat-opening interval falls from **680.56 to 365.39 ms**, and inclusive main-thread
WKWebView-initialization samples fall **122 → 44**. The after trace still includes a
432.92 ms navigation/layout interval. Its other 626.44 and 278.78 ms intervals are dominated
by XCTest snapshot queries, confirmed by sampled stacks; they are not attributed to normal
typing. The raw count is not a claim of zero hangs, nor a physical-device latency guarantee.

Profiling exposed a second issue: synthetic 100- and 1,000-event workloads reused one chat
identity and its durable bookmark. A saved presentation start near 980 could clamp to the
end of a 100-event history, displaying no messages. Workload identities are now distinct.
The extracted `NativeHistoryWindow` also displays a bounded nonempty page for an out-of-range
boundary while retaining the requested boundary for restoration if later history arrives.
Valid bookmarks retain their original behavior. Regression tests cover this case and native
offset changes without a geometry change; phone/tablet prepend/reopen/cold restoration pass.

Initial viewport-gating experiments that accidentally removed rich rendering are rejected
evidence, not improvements. Debug geometry and failure screenshots established the bookmark
collision; the accepted policy uses the native content-coordinate owner and the strengthened
real-renderer checks. Raw traces, screenshots and device identifiers remain outside Git.

### Incremental owner state (coordinator follow-up)

Merged owner source `79ab7e4` through merge `549a821`. Every native `sync` now opts in
with `statePatch: "v1"`; `ifStateVersion` is sent only with a retained wire baseline.
The dedicated state-stream actor owns that baseline separately from the presented state
that retains older run pages. Full states replace it; unversioned legacy states clear
the version. An unchanged reply with no state preserves it. Duplicate patches are ignored;
a version gap or invalid patch suspends patching and requests sync without `ifStateVersion`.
Monotonic local delivery receipts prevent an older actor result from replacing newer
presentation, and connection-generation checks also apply after the actor handoff.
Concurrent refresh callers await the shared read rather than proceeding with incomplete
state. On reconnect, retransmission of exact retained envelopes runs concurrently with
refresh: an old sync cannot block the very retry needed to complete it. Mutation identities
and issuedAt are never regenerated for this recovery.

The XCTest bundle loads the actual repository `test/fixtures/state-patch-vectors.json`;
there is no copied Swift fixture. All 16 vectors pass, including explicit null versus
missing/removal, id-array edits and reorder, and a null patch meaning no change. The isolated
owner integration verifies conditional sync, separately retained older run pages and
encrypted patch delivery. The owner-specific JavaScript suite passes all 27 cases.

Cache writes now debounce for three seconds, bounded to fifteen seconds during continuous
changes; ignored patches and unchanged sync replies schedule no cache write. Lifecycle
flushes retain their existing durability boundary. No patch re-encrypts the full cache
inside receive handling.

The same 2,027,239-byte baseline and ten one-second iterations are also exercised through
a one-run progress patch: **117 bytes** of patch data, **0.35 ms** mean detached decrypt/decode,
**3.03 ms** actor patch application and **1.56 ms** main-actor presentation. The array patch
traverses the 1,500 ids, while unchanged large text remains shared. These are plaintext data
sizes excluding the event/encryption framing, not total live traffic. The tablet repeat
measured 0.36 / 2.81 / 1.33 ms respectively. There is no physical-device throughput claim.

The final matched-state comparison additionally decrypts and decodes every resulting
state through the former full-state AES-GCM/Codable algorithm in the same process. On
the tablet this reference measured **40.97 ms**, versus **0.42 ms** patch decrypt/decode,
**5.57 ms** actor application and **1.08 ms** main-actor presentation. The decoded full
reference equals the patched result on every iteration. Fixture encryption is outside
both timed receive paths; timings include executor scheduling. This is a controlled
algorithm/transport comparison, not an installed old-build versus new-build UI trace.

The corresponding final phone run measured **41.81 ms** for the old full-state receive,
**0.32 ms** patch decrypt/decode, **2.72 ms** actor patch application and **0.91 ms**
main-actor presentation. The patch uses a synthetic progress counter; fixture encryption
and assertions are outside timing. The actual-owner title-change regression separately
proves encrypted patch transport and native presentation convergence.

### Earlier measured corrections

- Parse heterogeneous wire JSON with Foundation's parser and explicit JSON-value conversion,
  avoiding repeated throwing Codable type probes at every object node. Preserve booleans
  separately from numbers; verify scalar/nested equivalence and malformed-input rejection.
  Network decoding/decryption remains detached and serially ordered.
- Add independently observed state sections. Chat screens subscribe to the sections they
  actually read; project catalog and host metadata also use section reads. Raw state remains
  for serialization and older consumers. Project catalog invalidation follows catalog changes.
  This is an incremental migration; shell consumers of raw state can still invalidate broadly.
- Extract the growing editor into its own view module. Measure actual TextKit wrapping at
  proposed width and Dynamic Type size. Grow to the existing viewport/card budget, then retain
  native internal scrolling, selection, keyboard avoidance and existing draft/reading ownership.
  Soft-wrapped messages now grow, as well as messages with explicit line breaks.
- Recheck transport generation after outer decoding and after authenticated decryption. A packet
  from a previous connection cannot apply state or acknowledge a new connection's work. Existing
  request IDs, issuedAt, uncertain command envelopes and pairing credentials remain unchanged.
- Persist browser navigation when owner identity is known but the transient transport binding is
  absent. Previously only the latest in-memory operation/history visit survived this path; the
  owner mutation itself could be lost. Preserve ordered operations and exact IDs through restart.
- Resume the outbox when new intent arrives during optional history hydration after an acknowledged
  mutation. Its initial flush observes `contentBusy`; completion must schedule that pending work.
  The existing delayed-write/revoke test exposed this race during full-suite validation.
- On first owner assignment, adopt the final URL and complete local history of navigation that
  had no owner identity. Previously its in-memory operation suppressed the descriptor URL but
  was never queued for delivery, so adoption could open a blank owner tab. This changes only
  never-sent, ownerless navigation; uncertain owner envelopes retain their exact identities.

## Browser protocol and owner review

Native navigation uses `tabs.mutate` operations with `action` (`browser-navigate` or
`browser-traverse`), `tabId` (contentTabId, falling back to the stable local ID), `operationId`,
`eventId` (same identity), `baseRevision` (prior history revision), `entryId`, final committed
`url`, `title`, `visitedAt`, `profileId`, `sourceHostId`, and optional `requestedURL` for redirects.
The request envelope separately retains `id`, `issuedAt`, `scope`, `id` of scope,
`expectedRevision` and ordered `operations`. An uncertain envelope is replayed exactly.
Current native call sites emit those two actions only: redirect completion emits
`browser-navigate` with the original `requestedURL`, not a separate `browser-redirect`.

Explicit Back/Forward queues the selected stable history entry. WebKit completion, URL KVO and
same-document observations update logical history; repeated observations do not enqueue duplicate
visits. Native history-position changes recover traversal to existing entries. Redirects retain
original requested URLs. Mirrored owner loads deliberately retain canonical owner history and
Forward entries across passive device-specific redirects/authentication; the local displayed URL
can differ in that intentional case. Trusted navigation intent releases that mirror guard.
After WebKit's mirrored load finishes, repeated observations of that settled URL remain
local, but a later different URL releases the guard even without recent trusted input.
This fixes delayed SPA/JavaScript navigation; immediate redirects inside the initial load
remain local. The didFinish delegate explicitly marks settlement.
Do not blindly export every passive redirect as a new owner navigation.
Device-local main tabs deliberately do not enqueue owner tab mutations; their history visits
still use the history outbox. The new disconnected-binding path preserves this boundary.

No additional navigation wire-schema change is required by these fixes. The coordinator must verify owner/desktop
consumption of these exact fields and convergence after navigate, redirect, SPA push/replace,
traverse and reconnect. The new owner-adoption regression verifies final URL/history in the
queued open descriptor; passive mirror differences still need end-to-end review. These focused
regressions do not prove desktop-window convergence.

### Coordinator URL leads, verified individually

- **Revision drift:** confirmed. Navigation/traversal advanced local revision after a rejected
  enqueue. Queueing now reports success and owner revision advances only for an operation in
  the ordered owner outbox. An ownerless descriptor imports its complete history at adoption.
  Observations during `applyingContent` are deferred and checked against the actual current
  WebKit URL instead of appending history while owner mutation is prohibited.
- **Indefinite mirror guard:** confirmed; corrected by the explicit settlement boundary above.
- **Last-operation overwrite:** confirmed in `browserOperations` when no transport binding was
  present. Bound-owner navigation is now persisted in the ordered outbox regardless of binding;
  first owner assignment adopts the complete descriptor for never-sent ownerless navigation.
- **Conflict presentation:** quarantine does retain a separate local branch, but source already
  presents the root-shell `Browser navigation changed` alert with `Use owner history` and
  `Open local destination in new tab`. Thus silent presentation is not proven from this source
  alone; whether another sheet suppresses that alert in live use remains unverified. Original
  operations and uncertain request receipts remain retained, with no automatic replay or rebase.

**Owner proposal, not implemented:** negotiate `browser.navigation-rebase.v1` and permit an
explicit `conflictPolicy: "append-current"` only on `browser-navigate`. On a stale base,
the owner would resolve the current tab/profile/owner, append the original `entryId`/URL onto
its then-current history, journal the original `operationId` once and return the actual
history revision/current entry. Retain `eventId`, requestedURL and visit metadata. Do not apply
this to traversal, redirects, moved/closed tabs or profile/owner mismatches. An uncertain
request must remain byte-for-byte identical; changing policy is only permissible before first
dispatch or after an authenticated terminal rejection, under the owner's journal semantics.
This avoids silently reinterpreting a Back/Forward operation while allowing deliberate forward
navigation to converge despite unrelated owner activity. The coordinator owns that policy decision.

## Earlier coordinator takeover and Debug profile

The iOS agent's Codex session lost authentication partway through. Its uncommitted work (indexed tab projection, cached row timestamps, reconnect refresh ordering, the combined push-and-typing fixture) was committed unchanged as `85ddd63`, and the coordinator finished the lane: field-only chat deltas, a static release-date label and these traces. At takeover the suite was **203 tests, none failing** on iPhone 17; the later 210-test validation above supersedes that count.

Time Profiler traces of the whole app on the iPhone 17 simulator, iOS 26.5, Debug:

- `testTypingDuringLargeGeneralStatePushes` (1,500 chats, 200 tabs, about 2 MB state, full-state then patch delivery, 880 typed characters): 12,746 main-thread samples, mostly idle. The largest app frame is UIKit text insertion (1,632 samples); 1 hang and 3 microhangs. `NativeHome` and `AggregateChatsView` still re-evaluate behind an open chat (about 300 samples).
- `testProjectChatsOpenAsProjectTabsAndSwitchRepeatedly`: 17,043 samples, mostly idle, with 5 potential hangs. The busiest app frames are small, and XCTest automation accounts for part of the hang time.

**These traces do not reproduce the operator's report.** The simulator has far more CPU than a phone, and a Debug fixture is not the operator's data over a real relay. The largest measured load on the installed build is the owner traffic recorded live (about 2 MB per push, about 3 MB/s). The patch path removes that load from this client's receive and render work (88.89 → 8.85 ms mean encrypted receive per push in the combined run), which makes it the leading explanation but **not a proven cause**. Whether the app now feels acceptable needs a physical device, with a new client and a new owner together. A remaining migration target is the raw-state consumers behind an open chat.

## Earlier acceptance limits

The initial product implementation is `db526f8a05851d5251dea3d8e7e138d2326e67ac`;
`cce1557` corrects test interaction, `ed3afb8` fixes ownerless adoption, `549a821` merges
the coordinator's exact owner pin, `8cc4082` adds incremental native state, and
`188c223` fixes revision drift and settled mirror guards.
`03673b2` makes coalesced refresh callers await completion without blocking exact reconnect
retries; `07830a4` adds opt-in Debug profiling. The final runtime source pin is
**`3f64e349124365fc6c6c4b169baf39aadeac1d79`**. Phone and tablet final unit runs pass
**199 tests** each, including the visibility and stale-window regressions.
Phone heavy-chat scrolling,
momentum/prepend/reopen/cold-launch reading restoration, Live browser navigation and
structured question-session acceptance pass. `npm run check` passes. The broader
Node suite, after the authorized APFS dependency clone, reports **1,508 pass, 11 fail,
four skip**; failures include provider-path projection, recovery-copy inspection,
cross-desktop inference and desktop recovery receipt checks, outside this iOS lane.
The earlier symlinked-dependency attempt had 1,476 pass / 13 fail / four skip before
the owner merge and dependency correction. These are not source-wide passing results.
The dedicated `test/remote-state-stream.test.js` suite passes all **27 tests**.
Shared vector SHA-256: `c3ff92cc180c87d70ce71d859adb876b1ea33e35d8e2569d6287ad7514831ccf`.

Initial phone/tablet composer UI attempts passed growth and draft/send checks but
failed a later inline-question assertion. Their extra coordinate-based keyboard dismissal
could hit live question content after the layout changed. Padding-based retries failed
to collapse consistently; their experimental hit-area change was removed. Successful
submission already dismisses the keyboard, so the final helper omits the extra content
tap. Corrected phone and tablet tests pass growth, bounded cap, retained draft, send and
same-session inline-question delivery. The tablet tests a long soft-wrapped draft and Return
submission. Question-specific workflows also pass separately.
The old `testContentEdgeSwipesReturnToChatsAndNavigateBrowser` entry fails at setup because
it targets the removed phone tab bar; that failure is retained, not called a browser
regression or a pass. The current project-browser history/edge-swipe workflow passes.

The CPU benchmark, body probe and existing thousand-event scrolling test are separate workloads.
The later Release journey adds an actual streaming local owner and large-project navigation;
its production owner uses paged summaries and negotiated/batched delivery, so it does not
recreate the old installed owner's one-second 2 MB full-state traffic. The earlier encrypted
push-and-typing rehearsal stresses that larger receive path separately. Do not call N1 fully
accepted on the operator's phone from these simulator workloads. Startup cache reads/decryption and lifecycle durability flushes
remain synchronous main-actor boundaries; ordinary snapshot encryption/I/O already runs on the
serial background writer. Their physical-device cost remains to be profiled before changing
lifecycle durability. Existing unchanged-text Markdown memoization is retained; the measured
new rendering improvement is viewport admission. Remote viewing/control frame rate, sustained
live send/reconnect behavior and physical-device feel remain unverified. No signed release
artifact, physical installation, publication, push or PR was produced; the coordinator retains
integration and frozen-source build ownership.
