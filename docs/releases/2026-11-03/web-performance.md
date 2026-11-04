# Nov 3 web client investigation

Version 0.2.42; web branch based on `cbed273`. This is source and isolated synthetic
acceptance evidence, not production stability, publication or an installation receipt.

## Workload and measured results

Run `NODE_OPTIONS=--preserve-symlinks node test/web-performance.mjs` from the checkout.
The harness serves only generated test code on loopback and uses headless Chromium at
1440 × 1000. Each arm receives twelve 2,039,592-byte synthetic JSON states, one per
second: 500 chat summaries, 200 browser descriptors, a retained 1,000-event conversation
and its 24-event visible window. Streaming text advances every third push; intervening
pushes are identical. A 20 ms timer edits the focused textarea throughout. Both arms
use the production WebCrypto decoder and shared chat DOM reconciler. The improved arm
executes that decoder in a worker and uses the production state equality guard.

This isolates transport decoding and DOM reconciliation stages; it does **not** exercise
the entire workspace renderer, socket, Laravel authentication or Markdown renderer.
The streaming fixture is deliberately bounded and does not simulate every tool card.
Typing delay is timer scheduling delay, not hardware key-to-paint latency. Decode
round-trip includes async WebCrypto waiting and worker transfer; it is not a CPU-time
measurement. Parse-only is an additional separately timed JSON.parse of the same text.

One sequential before/after run on this builder produced:

| Metric | Before | Worker + state guard |
| --- | ---: | ---: |
| Renders / 12 pushes | 12 | 4 |
| Added/removed DOM nodes | 330 | 90 |
| Main-thread long tasks (>50 ms) | 12 | 1 |
| Total long-task duration | 1,200 ms | 50 ms |
| Mean decode round-trip | 93.82 ms | 95.41 ms |
| Mean worker decode (after only) | — | 93.64 ms |
| Mean main-thread parse-only | 0.32 ms | 0.28 ms |
| Mean state/render application | 1.78 ms | 2.30 ms |
| Maximum typing timer delay | 106.9 ms | 6.9 ms |
| Mean typing timer delay | 2.18 ms | 0.31 ms |
| p95 typing timer delay | 1.2 ms | 1.2 ms |

Equality serialization adds work: application time increased in this small DOM fixture.
The substantial improvement is moving base64 decoding, decrypt/parse and wire serialization
off the page thread. Total decoding and transmitted bytes have not decreased. These are
single-run observations without a statistical confidence claim.

## Implementation and mechanism boundaries

Established web pairings now run the existing shared BrowserRemoteClient inside a module
worker. The page passes the nonextractable CryptoKey by structured clone; it is never
exported or stored by the worker. Pairing callbacks remain on the page. The worker uses
the original sequence checks, bounded queues, acknowledgements and immutable request
envelopes. The bridge bounds pending calls, forwards transport errors, and rejects all
uncertain calls on shutdown without replay. Worker failures surface a reconnect notice.
Environments without Worker retain the direct implementation.

Identical authenticated state pushes advance the replay cursor but skip cache encryption,
workspace invalidation and rendering. Changed pushes render at most once per animation
frame. State processing remains ordered; acknowledgements and lifecycle events are not
dropped or merged. Shared transcript DOM reuse remains in use. The initial implementation
changed no public/shared, owner, desktop, relay or iOS source; the later shared history
helper correction is recorded in the visible-chat follow-up below.

Composer submission previously regenerated its request identity when the user edited
after an uncertain send. The web draft now retains the prepared command, original identity
and issue time in its existing encrypted draft store before transmission. An explicit
retry uses that exact envelope; acknowledgement preserves a subsequently edited text
draft. Preparation is shared during concurrent submits. No timeout automatically sends
another mutation. This is an identified retry defect, not proof of the reported Nov 2
disconnect's cause. No causal diagnosis of that production disconnect is established.

Workspace sync and mutation responses previously assigned tab snapshots directly, bypassing
the revision checks already used for navigation responses and pushes. All now use one
guard against older scope or history revisions. Its change detection also includes
visibility and other descriptor fields. Tests retain newer redirected, traversed and
same-document URL descriptors when older responses complete late. The browser navigation
helper preserves its operation identity on a definite revision conflict and does not
retry uncertain errors. Concurrent navigation can still be explicitly rejected by the
owner's revision check; the web does not silently coalesce it.

Web navigation opens a separate local browser page and submits an owner tab operation.
That separate page's subsequent redirects and same-document changes are not observable
to this client across origins. Owner/desktop convergence for remote navigation, including
iOS-shaped operations and redirects in the owner's actual page, remains the coordinator's
acceptance responsibility. The stale web-response mechanism does not establish the cause
of the operator's iOS observation.

## Composer and validation

The existing shared composer already implements growth, a viewport-derived cap and internal
scrolling. No composer implementation change was needed. `test/web-composer-ui.mjs` uses
the actual shared composer and web CSS. At 1440/390 px widths it measured a 48 px short
editor, 320 px at twelve lines, and 397/402 px for 150 lines (3,632 px scroll height).
Transcript scrollTop stayed 80 and editor scrollTop stayed 120 through another edit;
the full long message was submitted in both layouts.

- Web Node tests: eight pass, including frozen retry/reload/concurrent preparation,
  worker bridge error/close behavior, coalescing and stale tab response regressions.
- PHP suite: 106 pass, 926 assertions with isolated storage and synthetic keys.
- Vite build: passes, output outside the repository. Relocated dependencies require
  Node `--preserve-symlinks`, Vite native config loading and `resolve.preserveSymlinks`.
  No dependencies were installed or modified. Initial default resolution failed.
- `npm run check`: passes.
- Full `npm test`: 1,478 pass, 11 fail, four skipped. Failures are in context projection,
  recovery SQLite copying, shared inference, managed tmux recovery and update recovery
  receipts/readiness. Those modules are outside this lane; a baseline comparison has
  not been performed, so these are not claimed as proven pre-existing failures.
- Full web browser acceptance was attempted: authenticated pairing, state delivery,
  chat start and question acknowledgement succeeded, then the legacy find-highlight
  assertion timed out. Its provider and question selectors were updated to the current
  UI; forced setup refreshes now change synthetic state rather than require a no-op render.
  The separate project harness stops at outdated expired-pairing wording before project
  acceptance. Neither full harness is reported as passing.
- Focused built-web acceptance passes with `PROTEUS_WEB_NOV3_SMOKE=1
  NODE_OPTIONS=--preserve-symlinks node test/web-remote-ui.mjs`: authenticated worker
  reconnect after synthetic owner transport interruption, retained exact device pairing,
  repeated-push DOM suppression, chat creation and question acknowledgement.

No production owner/data or server was used. No release package, publication, push, PR,
merge or installation was performed. Sustained real-owner connectivity, background/sleep
worker behavior, hardware typing latency, real-owner full-tree rendering, physical mobile
feel and actual desktop URL convergence remain unverified. The owner can further reduce
the remaining clone/transport cost by reducing full-state push volume; no protocol change
is required for these web changes.

## Incremental-state integration preparation

The coordinator is implementing the wire patch/conditional-sync protocol separately.
No `src/` transport code was edited here. Its full merged states and run pages are treated
as read-only, including references retained in local caches. The following web writes now
replace their owning roots/arrays/rows rather than mutating transport objects:

- Provider usage: the appearance flag and providerUsage result.
- Provider catalog refresh: providerStatuses and the selected provider entry.
- Selected chat loading: storage metadata added after chat.get/history merging.
- Failed-chat review: the matching run summary, including cached/archived aliases.
- Chat rename: matching state, cached and archived summaries.
- Chat lifecycle: selected-run metadata and deletion from state.runs.
- Run pagination: both the conversation-list and aggregate-list paths.
- Workspace sync, project selection/move/catalog refresh and configuration edits.
- Workspace copy/create/delete and project mutation results.

`mergeChatHistory` itself already creates new arrays/metadata when merging and can return
its input on the initial page; the selected-chat storage assignment was therefore unsafe
even though the history merge code needed no edit. Local drafts, host credentials and
locally constructed child-tab descriptors are separate mutable presentation records.
The shared shell, running-count and workspace-tree consumers were audited; they do not
write owner snapshots. No web consumer depends on `progress.toolSignature`; the remaining
shared conversation DOM property named toolSignature is unrelated to run-summary progress.

The worker/page bridge now projects changed paths recursively, including array entries,
and reconstructs new containers only along those paths. Merely posting the full merged
state would otherwise destroy the coordinator's structural-sharing guarantee. Sync replies
and state events share one ordered bridge baseline. Other commands with a `state` property,
such as project-follow results, cannot replace it. This is an internal worker message
format, not another owner/relay protocol.

State acceptance checks section reference identity before serializing changed sections;
unchanged large subtrees do no serialization work. Only changed run sections rewrite the
encrypted chat index, only context/project changes invalidate workspace state, and recents
skip DOM rebuilding when their section references and view/selection inputs are unchanged.
Both selected and aggregate connections now use the same push handler. Provider-usage-only
changes do not rebuild the conversation.

Twelve web Node tests pass, including deeply frozen state/cached-run regressions, a worker
projection retaining an unchanged two-million-character subtree while emitting under 500
JSON characters for one progress change, deletion/truncation, non-sync baseline isolation,
and a check that unchanged references do not call a section's serializer. The final source
also passes the PHP suite (106 tests/926 assertions), Vite build and static checks. Focused
built-web authentication/reconnect, retained-pairing and no-op DOM acceptance passes for
this bridge against the existing full-state synthetic owner.

The earlier table remains evidence from the original full-state stage run. Patch-cadence
measurement was pending at this preparation checkpoint; the completed measurement follows.

## Negotiated protocol acceptance after coordinator merge

Coordinator source `79ab7e4b431110998d19045cb8dc54e38088c159` is merged into the web branch.
The web lane made no direct edits to the coordinator's `src/` implementation. The original
copy-on-write policy remains, with the refined contract documented: each delivered root
and runs array is consumer-owned, while individual run objects and other nested subtrees
are shared and read-only. The worker bridge now reproduces that same contract. Section
checks compare individual run references instead of the runs array reference. Index-only
state churn updates recents/counts/tab titles without rebuilding an open conversation;
the visible run watch still renders independently and immediately.

Run `NODE_OPTIONS=--preserve-symlinks node test/web-state-patch-performance.mjs` from the
checkout. This serves an isolated synthetic WebSocket owner with the actual coordinator
`RemoteStateStream`, AES-GCM wire encoder, BrowserRemoteClient and production web worker
bridge. No relay, TLS endpoint, account or real owner is contacted. The synthetic owner
performs the challenge/authentication exchange with a disposable test key.

Both arms use a 2,073,121-byte initial state with 500 chat summaries and 200 tab descriptors,
an owner history of 1,000 events and a 24-event visible page. Every second for twelve
seconds, one run's progress/updatedAt changes and its visible run watch delivers a growing
reply. Both arms perform three sync reads, immediately after seconds 4, 8 and 12. Initial
authentication, snapshot and rendering are warm-up and excluded from steady-state totals.

The before arm simulates an older full-state owner (ignoring patch opt-in) and decodes on
the page thread, rendering on each state/run/sync. The after arm uses the actual merged
negotiation, default two-second volatile cadence, conditional sync and production worker.
This compares the old workload with the merged path; it is not an assertion that the
entire historical application binary was benchmarked. The earlier frozen stage evidence
is retained above. The run-watch traffic is deliberately the same full visible page in
both arms; incremental chat-history transport is not credited to this state change.

The page uses the production chat DOM reconciler with synthetic navigation/sidebar and
transcript markup, rather than the entire Laravel workspace and Markdown/tool-card tree.
Typing uses Playwright's real keyboard API against a focused textarea throughout the run.
Its round-trip timing includes controller/browser scheduling, not hardware-to-paint latency.
A separate 20 ms page timer samples event-loop delay. A five-parse full-state calibration
runs before measurement in each arm; it is not extra parse load during patch reception.
Receive/decode timing includes async WebCrypto waiting and dispatch preparation, so it
must not be interpreted as isolated AES CPU time.

The final isolated run produced these steady-state observations:

| Metric (12-second workload) | Full-state/page-thread before | Negotiated worker after |
| --- | ---: | ---: |
| Full state pushes | 12 | 0 |
| State patches | 0 | 6 |
| Encrypted state routing-frame bytes | 33,172,160 | 2,556 |
| Maximum encrypted patch frame | — | 429 bytes |
| Three sync-reply routing-frame bytes | 8,293,207 | 782 |
| Conditional sync replies | 0 | 3 |
| Visible run updates | 12 | 12 |
| Visible run routing-frame bytes | 1,865,924 | 1,865,923 |
| Conversation renders | 27 | 12 |
| Observed node additions/removals | 798 | 348 |
| Main-thread long tasks | 16 | 0 |
| Total main-thread long-task time | 1,611 ms | 0 ms |
| Mean decode before event dispatch, main thread | 48.28 ms | off-thread |
| Mean decode before event dispatch, worker | — | 4.02 ms |
| Maximum decode before event dispatch | 93.9 ms (main) | 7.5 ms (worker) |
| Mean render time | 1.31 ms | 1.37 ms |
| Mean keyboard API round trip | 3.00 ms | 1.90 ms |
| p95 keyboard API round trip | 6.22 ms | 4.29 ms |
| Maximum keyboard API round trip | 139.22 ms | 23.77 ms |
| Maximum 20 ms input-timer delay | 122.9 ms | 14.7 ms |
| Mean 20 ms input-timer delay | 3.80 ms | 0.87 ms |
| Initial full-state JSON.parse calibration, mean | 0.42 ms | 0.36 ms |

Frame bytes include the actual AES-GCM/base64 routing JSON, excluding WebSocket/TLS/IP
headers. Initial snapshots are excluded, not eliminated. Tiny patches here reflect one
synthetic run's three changed fields and must not be generalized to every owner change.
The decode averages mix the state and visible-run event sizes in each arm. Parse calibration
is still a full-snapshot parse and occurs only during warm-up; steady-state patch decoding
occurs in the worker. Slight render-time variation does not support a per-render speedup
claim. The improvement is less decode/dispatch work on the page and fewer renders.

The after arm received its first visible-run update at 1,014.9 ms and its first state
patch at 2,015.7 ms, demonstrating that the visible update did not wait for the state
cadence. All six state applications retained the unchanged tab-section identity. This
is one sequential before/after run without a statistical confidence claim.

Validation after merge: 55 focused protocol/web tests pass (including all 14 web Node
tests), 106 PHP tests/926 assertions pass, Vite builds outside the repository, and static
checks pass. Built-web acceptance verifies actual state.patch negotiation, authenticated
worker reconnect, retained device pairing and no-op DOM suppression. The initial merged
Node run had 1,508 pass, 11 fail and four skip; the environment follow-up below supersedes
that result. The earlier full-browser/find-highlight and project-harness limitations remain.

The benchmark asserts six patch deliveries, three conditional replies, all twelve visible
run updates, and the first visible-run update preceding the first state patch. Sustained
real-owner use, real network/TLS costs, background/sleep behavior and physical input/paint
latency remain outside this evidence. No deployment, publication or release package is
part of this work.

## Dependency/environment validation follow-up

After the coordinator supplied the dependency-layout correction, the root node_modules
symlink was replaced with an authorized local APFS clone of the existing dependency set.
This preserves package contents while allowing patched modules' repository-relative
desktop imports to resolve. The web dependency symlink was left unchanged.

The previous failure logs also exposed temporary-directory canonicalization mismatches
and overlong Unix socket paths. With the local dependency clone and the short canonical
temporary directory (`TMPDIR=/private/tmp npm test`), the complete Node suite passes:
**1,519 passed, zero failed, four skipped, 1,523 total**. All 14 web Node tests and static
checks pass as well. No application source fix was needed to resolve the previous eleven
failures. This follow-up changes validation evidence only; it does not replace the earlier
measured performance run or establish production/native Electron acceptance.

## Visible-chat history and metadata deltas

After merging coordinator branch `claude/nov3-release` at `65d4fc2`, the visible web chat
requests `chat.get` with `watch:'delta', fieldDelta:'v1'`. The five auxiliary read paths
now explicitly use `watch:'none'`: attachment-send preflight, older-history prefetch,
workspace-routing lookup, promote/action preflight, and move/context preflight. These
reads cannot move the transport's selected chat, downgrade its mode or reset its cursor.

One page-owned watch controller reuses the current lease during visible refreshes.
When `chat.watch.v1` is advertised, it adds a UUID watchToken and releases the matching
id/token on section/chat departure or document hiding. Returning to the page reacquires
with a new token; reconnect binds to the replacement transport. Subscription and release
are serialized, so hiding during a slow read releases after that subscription rather
than clearing first and accidentally subscribing afterward. A late response cannot
paint a chat that has since been left. Page teardown also closes the transport, releasing
its owner-held watch. Legacy owners receive no token/unsupported release operation;
without the release capability their last watch can remain until selection or disconnect.

One small **shared renderer change** was necessary in
`public/features/chats/chat-history.js`: a field removed by a delta could be restored by
a late older history page. The merger now retains removal tombstones across subsequent
deltas and stale pages, while an explicit newer value restores a field. A deterministic
web regression covers multiple removals, stale history, restoration and read-only inputs.
No owner, desktop, relay or iOS implementation was edited in this follow-up.

### Real-owner traffic measurement

Run `TMPDIR=/private/tmp node --test test/web-chat-delta.test.js`. Unlike the preceding
synthetic page benchmark, this test starts the actual server/engine, RemoteHost and
encrypted loopback relay. Two authenticated browser-protocol transports subscribe to
the same synthetic chat: the former full-page behavior and the production visible-watch
controller. Its real captured-context projection contains 100 source records; captured
context plus schedule metadata measures **74,695 bytes**. The initial history has 100
roughly 900-character assistant events. Twelve deterministic engine.stream/event updates
pass through the actual owner publication path; each next step waits for both clients
to receive the previous step. This is a bytes-per-update test, not a timed twelve-second
provider or latency measurement. No model or production data is used.

The measured encrypted owner-to-relay routing JSON includes clientId, sequence and AES-GCM
base64 payload, excluding WebSocket/TLS/IP overhead. Received update counts verify all
measured frames completed delivery. The initial chat.get response and first published
update are separated from steady-state costs:

| Delivery | Former full page | History + metadata delta |
| --- | ---: | ---: |
| First published update after chat.get | 229,873 bytes | 102,789 bytes |
| Twelve steady updates, total | 2,762,750 bytes | 26,328 bytes |
| Mean steady update | 230,229 bytes | 2,194 bytes |
| Steady update range | 229,957–230,502 bytes | 2,121–2,262 bytes |

The first delta still repeats captured metadata once: the owner's initial chat.get
seeds event hashes without the field hashes used by omitUnchanged. Subsequent updates
omit context/schedule and carry eventPatches plus changed metadata. An optional owner
follow-up is to seed those field hashes on the initial fieldDelta-enabled chat.get;
this lane leaves that owner code unchanged and does not hide the first-delivery cost.
Initial snapshots and later genuine metadata changes still have their ordinary cost.

Regressions verify unchanged metadata remains available after merging, streaming content
matches the full subscriber, non-subscribing reads of both older history and another chat
retain the current watch token/mode/cursor, removed fields stay removed after a late page,
and stale-token cleanup cannot clear a replacement watch. Both older-owner modes pass:
ignoring all watch options and returning full pages, or supporting history deltas while
ignoring fieldDelta and repeating full metadata.

Validation: all 19 web Node tests and four existing history tests pass; the three new
real-owner tests pass. The complete Node suite passes **1,532 tests, zero failures and
four skips** with `TMPDIR=/private/tmp`. The PHP suite passes 106 tests/926 assertions,
the Vite build and static checks pass, and built-web acceptance verifies delta/fieldDelta
subscription, hidden-page release/new-token resume, section-leave release, reconnect,
retained pairing and no-op DOM suppression. The earlier full-browser/find-highlight
limitation remains. These tests do not establish sustained production connectivity,
real-provider latency, or physical device acceptance. Nothing was published or deployed.
