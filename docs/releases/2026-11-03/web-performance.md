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
dropped or merged. Shared transcript DOM reuse remains in use. No public/shared, owner,
desktop, relay or iOS source was changed.

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
