# Nov 3 iOS Release journey

The iOS-only follow-up is based on integration `245e7d0`. The production code
measured after the follow-up is `4cb903c3a6b8e9ebd45d6754945602eb423ba27d`
(`174cfd5` contains the shell projections and chrome publication guards;
`4cb903c` finishes workspace/project section reads and the manual harness).
No distribution artifact, physical installation or publication was produced.

## Build and owner definitions

All three apps use Xcode 27.0, Release optimization, arm64 only, and the same
shared iPhone 17 Pro simulator running iOS 26.5. They have separate benchmark
bundle identities and normal ad hoc simulator signatures. Installed Preview
apps were not updated. The baseline and integration sources were exported from
their exact commits into temporary build staging; the active worktree was never
checked out to another revision.

| Arm | App source |
| --- | --- |
| Baseline | `cbed273086beff20ce6c7e4441813663bc87278c` |
| Integration before this follow-up | `245e7d05a682a819bb699b88fdc02bde262be9c9` |
| iOS follow-up | `4cb903c3a6b8e9ebd45d6754945602eb423ba27d` |

Every arm used the **same local owner implementation**, frozen owner source
`568705c5b63703b5d4131fa15a9876c94ad49da7` as included in integration.
The baseline does not opt into patches or field-only chat deltas. It receives
this new owner's full-state compatibility stream, including its slower cadence
for progress-only churn. Integration and follow-up opt into incremental state
and field-only chat delivery. This is not the operator's old client paired with
the old high-traffic owner.

The synthetic-only owner is [journey-owner.mjs](../../../ios/tests/journey-owner.mjs).
It uses an isolated temporary data home and unavailable mock providers; no AI
provider executes. It contains 1,500 chats in General, 200 browser tabs plus
three open chat tabs, and an initially 3,000-event rich conversation. It emits
an assistant event once per second through the actual owner/relay/encrypted
client path. Rich-event counts at the three matched starts were **6,541 /
7,177 / 7,378**: the same owner kept streaming between arms. Pairings and cached
data were retained. The owner had been restarted with its preserved synthetic
data, so recovered/attention records are part of this workload.

These are single journey observations, not randomized trials. Histories,
draft lengths, cache warmth and network conditions were not reset to identical
snapshots. Both the changing history counts and separate app caches limit
causal percentage claims. There was no supported slower-device/CPU-throttling
approximation available; this simulator runs on the Mac CPU.

## The same journey

The manual tests use [ReleaseJourney.swift](../../../ios/ProteusUITests/ReleaseJourney.swift):
prepare pairing, terminate/relaunch, visit Chats (retained behind the project),
open General, switch through two short chats and the long streaming chat,
scroll down/up, enter and verify 210 numeric characters, open the project's
Tabs list, load a browser tab, and return to the long chat. Numeric input
avoids keyboard word correction in exact-character acceptance. Existing drafts
and reading state are preserved.

The browser is a normal HTTPS page at example.com. Unloaded tabs require the
visible **Load tab** action. Browser time includes network time. The final
content check uses the observed page link rather than assuming the document
title is exposed as a StaticText.

**Times below are XCTest wall seconds.** They include element lookup, keyboard
synthesis, accessibility snapshots and XCTest quiescence waits. In particular,
the baseline produced repeated approximately 31-second accessibility calls;
these numbers must not be called touch-to-photon or native key-handler latency.

| Step | Baseline | Integration | Follow-up |
| --- | ---: | ---: | ---: |
| Cold process to interactive cached UI | 6.10 | 6.40 | 3.86 |
| Open Chats catalog | 10.87 | 7.20 | 3.36 |
| Open large project | 14.47 | 11.02 | 12.25 |
| Switch chat 1 | 11.83 | 8.36 | 6.38 |
| Switch chat 2 | 9.23 | 6.31 | 6.08 |
| Switch long streaming chat | 101.42 | 8.42 | 7.53 |
| Two scroll gestures | 102.16 | 32.77 | 16.55 |
| Type and retain 210 characters | 37.52 | 29.60 | 14.54 |
| Tabs list | 23.24 | 13.89 | 10.54 |
| Browser load and return | Final AX assertion failed | 23.87 | 18.03 |

Integration passed the entire case in **178.94 s** and follow-up in **123.94 s**,
including preparation outside the timed steps. Baseline failed in **491.67 s**
during the final return-to-chat accessibility query. Its browser body had loaded;
the failed query is not proof of an owner navigation defect. The project-opening
step was slower in follow-up than integration; there is no across-the-board
speedup claim.

## Main-thread traces

Time Profiler targets were verified from the trace TOC: one attached benchmark
app process, with simulator identity and target PID checked privately. Raw
traces, screenshots, AX trees, process/device identities and logs stay outside
Git. Profiling begins after the cold-start marker and attachment delay, so
**cold-start hangs are not measured** by these attached recordings.

| Recorded window | Integration | Follow-up |
| --- | ---: | ---: |
| Duration | 151.70 s | 95.73 s |
| Severe hangs | 9 | 0 |
| Hangs | 68 | 44 |
| Microhangs (>250 ms) | 73 | 50 |
| All potential intervals | 150 | 94 |
| Potential intervals per recorded second | 0.99 | 0.98 |

The lower raw count accompanies a shorter recording; the interval rate is
essentially unchanged. It is not evidence that phone hang frequency fell.

The Release recordings contain substantial SwiftUI graph and accessibility
work. Of 135,452 / 73,444 target main-thread samples, 68,111 / 41,308 contain
accessibility frames and 54,114 / 33,987 contain XCTest frames (overlapping
inclusive categories). AttributeGraph update-stack leaf samples are
3,062 / 980. ProviderAllowance.date deepest-app samples are 4,034 / 458.
These counts are samples, not body-invalidation counts or exact CPU milliseconds.

Do not use the summary script's generic “most are the idle run loop” sentence
as a finding for these captures. They differ from the earlier Debug traces.
Residual app work includes sidebar project recents, tab descriptor projection
and SwiftUI layout; automated AX traversal is also substantial. Further
changes need a non-automation/phone profile to establish their practical value.
The operator's device problem is **not established as solved**.

Baseline trace finalization failed when the original runner aborted. A
failure-tolerant recapture then failed before its cold-start marker: the
pairing-field absence query itself timed out in XCTest accessibility. There
is no valid matched baseline hang count, and none is invented from the failed
export. The baseline step table above remains the original attempted journey.

Two additional 60-second controls launched the baseline and follow-up directly
with simctl, without issuing XCTest queries. Baseline recorded **9 hangs and
3 microhangs**; follow-up recorded **31 hangs and 45 microhangs**. These controls
did not normalize restored visible content, cached history or reading position,
so they cannot establish a regression or an improvement. They also do not
confirm a general performance win. Follow-up still sampled message-body work,
timestamp parsing and WebKit construction. This evidence rules out attributing
all remaining stalls to the journey driver. Performance acceptance remains
open; a normalized non-automation capture and the operator's phone are needed.

## What changed

- Shell and workspace/project consumers read independently observed state
  sections instead of the full snapshot. Workspace identity lookup uses the
  context section too.
- Home attention rows and attention-title lookup use stable projections.
  Unrelated run progress and streamed text do not publish changes to those
  projections. Attention transitions, labels, timestamps and renames remain live.
- Exact navigation badges subscribe to count fields, retaining old-owner
  fallbacks. They do not subscribe to every run on owners with exact counts.
- Repeated assignments of the same drawer/chrome visibility value no longer
  publish. Actual transitions still publish.
- Models/projections stay outside views; no retained live view is hidden to
  obtain these measurements. Draft, reading, pairing and retry ownership is
  unchanged. Field-delta and navigation-alignment work supplied by the
  coordinator was merged, not reimplemented.

Observation regressions prove zero invalidation of the watched Home/count
projections for unrelated progress, zero title-index invalidation for streamed
text, live publication for attention/rename changes, and two publications for
two real chrome transitions with none for repeated no-op assignments.
These are focused Observation tests, not a count of every SwiftUI body in Release.

## Validation and identities

`npm run ios:test` passes **206 tests with zero failures** on both shared phone
and iPad simulators at the follow-up source. This includes shared state-patch
vectors, field-only metadata, reconnect/retry, browser history, drafts and
projection regressions. The integration and follow-up Release journeys pass.
The manually gated baseline failure is retained as an outcome. `npm run check`
passes; no source-wide Node green result is claimed.

SHA-256 of the local arm64 simulator executables:

| Arm | SHA-256 |
| --- | --- |
| Baseline | `136e2a8d24671e9c01a346781a2f9b3607b895111819f4c50276ea2f5c487ade` |
| Integration | `6c6fd4c2bc73771cb9da7c1ec435f75f484a95179a4749d8298f192fc5b159a3` |
| Follow-up | `00730a6a8fc1abf6c01560d659744e767dd60aad5541921811368a4941692935` |

These identify test artifacts, not signed physical-device or published releases.
The requested source baseline reports build 2611.2.1; it is not a claim to have
tested the operator's installed 2611.2.10 binary.

To repeat, export the two reference app snapshots, build all arms with
`Release`, `ONLY_ACTIVE_ARCH=YES` and separate journey bundle identifiers,
then start the synthetic owner with build output/data outside the repository.
Compile the native test target, set `PROTEUS_RELEASE_JOURNEY=1` in its generated
test environment, and explicitly select the three Release journey tests.
[record-release-journey.py](../../../ios/tests/record-release-journey.py)
takes the simulator, bundle, XCTest log and external trace-output path.
Use the full Xcode developer directory and coordinator-approved temporary
directory. Default test runs skip these separately installed manual apps.

Physical-device feel, real-relay latency/loss, sustained live send/disconnect
behavior, and remote-view/control frame rate remain unverified. Startup cache
restore and lifecycle durability flushes remain synchronous boundaries; the
earlier focused measurements are recorded in [ios-performance.md](ios-performance.md).
No additional owner/protocol change is required by this follow-up.
