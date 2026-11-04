# Scrolling hitch correction — Nov 2 / R17

Implemented in source; desktop packaging, publication and installation remain held for simulator
review. The running 0.2.40 desktop has not received this correction. Controlled results establish
less synchronous owner work, not complete attribution of every live hitch or a deadlock diagnosis.

## Correction

Browser profile display repeatedly reloaded the same account file while projecting each tab.
A synchronous projection/reconciliation now reads one identity and reuses it within that operation.
`list()` also computes availability once. The snapshot is discarded in `finally`, rejects async
callbacks and never spans a turn or request. The next operation reads the current account again;
sign-out/account changes still lock unavailable profiles. Execution permissions and provider
catalogs receive no new persistent cache.

Reading/scrolling now coalesces affected tab IDs into timestamp-only IPC once per second, sent only
to the owning windows. It no longer constructs/transfers every tab's full history. The renderer
updates recency locally, retaining the existing fifteen-second deferred session save. Structural
updates still send full current state and supersede pending activity; a closed tab is not revived.

Chat text-only events refresh only the visible affected transcript, without the former three-second
cutoff that restarted full owner/catalog refreshes. Text-only notifications also preserve the existing
short-lived state projection cache. Real mutations, permission changes and the existing reconnect/
push-loss and fifteen-second fallback paths remain intact; the state cache age limit remains 300 ms.

Bounded diagnostics now distinguish browser projection, full-state IPC, activity IPC, remote
packet encryption and transport. The state worker reports serialized byte count without another
main-thread serialization. Reports contain source-owned timing labels/counts, never page contents,
URLs, prompts, account identity or keys.

## Controlled verification

`test/browser-scroll-profile.mjs` runs a disposable actual Electron owner, 100 dormant tabs and one
local scrolling page (103 total tabs including fixture defaults), with twelve identical profile/
state projection passes and a 16 ms wheel/input-dispatch pulse. Both runs use a synthetic file-backed
account identity of about 2 KiB; no live account, provider or owner data is used.

| Measurement | Before | Final correction |
| --- | ---: | ---: |
| Account session-file loads | 75,173 | 614 |
| Synchronous projection pass | 59–70 ms | 1.3–1.9 ms |
| Longest input-dispatch pulse gap | 128 ms | 30 ms |
| Main-process CPU over workload | 1.58 s | 0.42 s |
| Workload elapsed time | 1.52 s | 0.45 s |

Counts include incidental owner work during the run; they are not a claim that each twelve-pass
operation does hundreds of loads after correction. An earlier corrected run had 567 loads and a
23 ms maximum gap; final acceptance records the later run above. These are local synthetic timing
samples, not rendered-frame/GPU measurements or a live HC before/after benchmark.

Regression checks verify one identity read per nested display scope and immediate next-operation
revocation; burst activity sends only latest timestamps to the correct window; structural changes
retain those timestamps and full history; closed activity IDs cannot resurrect tabs. Actual Electron
stream acceptance verifies zero full-state refreshes for offscreen text after the old cutoff, one
refresh for a real mutation, retained activity/session persistence and fallback refreshes after loss
of event streaming. Visible streamed text retains composer and reading position beyond the old
cutoff, and a durable message still refreshes. The complete source suite passes 1,436 tests with
four skipped; static checks, web build and adjacent address/icon UI acceptance pass. Historical
fixture failures and their limits are retained in the implementation ledger.

## Original live baseline and remaining acceptance

A five-second read-only process sample and bounded timing report were collected from the installed
0.2.40 desktop. A separate CPU interval measured about 29% main-process CPU. The recent timing ring
showed repeated 200–500 ms event-loop delays, commonly about 1.5 seconds apart. Named synchronous
samples showed remote publication averaging about 41 ms (maximum 81 ms), HTTP state assembly about
27 ms (maximum 41 ms), and remote state assembly about 25 ms. Async heartbeat elapsed time includes
network waits and is not main-thread CPU attribution.

Most long-delay samples had no individual instrumented synchronous phase above 50 ms. Native stacks
show V8/string/array work without exact JavaScript callers. The corrected profile/activity paths are
concrete unnecessary synchronous work, but website rendering, extensions, GPU load and other owner
work remain possible contributors. Address completion already uses bounded, editing-only worker
queries and cached icons; it adds no scroll-time history scan or website icon fetch.

After the release hold is lifted and the tested desktop source is installed, compare the same live
pages/tab counts using the new phase timings and observed scrolling/input behavior. N2 live acceptance
remains open until then. Private raw samples and exact test receipts remain outside source.
