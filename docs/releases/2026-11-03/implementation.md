# Nov 3 implementation

Version: 0.2.42

Mnemosyne work is excluded. Status below separates source, package and live evidence. Nothing here
claims an installed fix or sustained live stability.

## N4 — state traffic

Live diagnostics on the coordinating Mac recorded 43 GB sent in about 7.4 hours: 9,518 state pushes
(17.3 GB) and 10,422 sync replies (18.6 GB). The state shape is about 1.4 MB plaintext. Any change,
including run progress, resent all of it to every client.

- Clients that opt in through `sync` (`statePatch:'v1'`) receive versioned per-transport `state.patch`
  events, and a conditional sync (`ifStateVersion`) skips the snapshot when nothing changed. A gap or a
  patch that does not fit its baseline resynchronizes rather than presenting stale state.
- Progress-only changes are batched: at most every 2 s for patches and every 10 s for whole snapshots
  to older clients. Material changes (status, title, attention) are not held for that window.
- The tool signature, the owner's private stall detector, no longer leaves the owner in summaries.
- State no longer enters the replay journal. Its 8 MB bound held about four 1.8 MB snapshots, so
  a brief disconnect could evict the lifecycle events a reconnect must replay.
- Streaming chat deltas omit unchanged page metadata (about 70 KB per update on real chats) for
  clients that merge by field (`fieldDelta:'v1'`).
- Activity timestamps publish at minute granularity. Each scroll tick previously wrote to the owner and made every client read the tab list again. `test/project-follow-ui.mjs` now passes four of four runs with no writes during scrolling; it failed about half its runs on the unmodified baseline.
- The plain-file scan moved from 2 s to 5 s: assembling state costs about 70 ms on the main process.

Regression: 113 simulated seconds of progress churn on a 1.4 MB state costs a subscriber under 100 KB
(`test/remote-state-stream.test.js`). Wire-format vectors shared with Swift are in
`test/fixtures/state-patch-vectors.json`. The live rate has not been measured on an installed build.

## N3 — disconnects

Live counters recorded 12 abnormal closes (1006), five congestion events and 17.7 MB peak buffered.
The relay terminated any socket missing one 20-second pong, and a pong queues behind everything
already buffered, so a busy healthy link could be killed, taking every client with the host. Received
frames and drained bytes now prove life; a dead peer stops draining and is still removed. This is a
demonstrated mechanism, not a proven cause of each reported disconnect. **The relay fix takes effect only
when the relay is redeployed, which this release has not done.** Reduced traffic helps without it.

See [web performance](web-performance.md) and [iOS performance](ios-performance.md) for client work.

## N6 — retained tabs missing after startup

`refresh().then(restoreWorkspace)` had one catch: a toast. Any failure in the state read, session read,
inventory read or one browser child ended restoration permanently. `workspaceReady` stayed false, so saves
and owner sync stayed off, which is why all saved views and owner descriptors survived while the window
looked empty.

Running the same startup fault against unfixed source (three failed state reads) reproduced the
incident: 0 native browsers, 7 saved views, 2 hidden flags retained, an empty tab strip, no notice and
no retry. That proves the failure path. **The trigger of the live Nov 2 failure is not proven**: the
logs recorded no renderer detail. New `desktop.window-restore` log events record a fixed stage label
so a recurrence identifies itself.

- Children restore unloaded first, so no page, profile or network can hold the rest. The selected and
  Persisted pages load after the window is ready, independently.
- One failed or hung child stays in the saved session with its own explained view and Try again.
- Startup retries with bounded delays, then shows a notice with Try again and Reload Window. Tabs pages
  say restoration is incomplete instead of presenting a partial list as the project's count.
- Tabs opened meanwhile merge without duplicating a saved identity, and a reload adopts a child created
  by an abandoned attempt.

`test/window-restore-ui.mjs` uses real Electron restarts: startup state failure with automatic recovery, one
failed plus one hung child, a startup failure outlasting retries (saved bytes unchanged), a second window
untouched throughout, an owner-closed tab that stays closed, and Reload Window reusing every view.

## N7 — remote navigation URL mismatch

`test/remote-navigation-fidelity-ui.mjs` sends the operation fields iOS sends through the real owner to a
real desktop window. It reproduced two mechanisms:

1. A desktop mirroring a remote navigation published its own redirect landing as a new shared entry.
   Devices redirecting differently (mobile and desktop sites, cookies) could diverge for good. A mirrored
   entry now stays local until trusted input, an agent action or an explicit navigation, and a
   device-private landing does not reload. The address bar shows where the page really is; the
   shared URL and the Tabs page keep the navigated one.
2. Every title update bumped the navigation revision, so the next navigation from a client that had
   not yet read it was rejected and quarantined for review while that client showed the new URL. The
   owner now accepts a navigation or traversal whose only intervening changes are title updates. Real
   competing navigation still conflicts, and competing redirects keep their strict check.

The iOS half is in the iOS lane. Confirmation on a real device is pending.

## N5 — Windows Desktop Control

Proteus did not look in the official install location (`%LOCALAPPDATA%\Programs\Cua\cua-driver\bin`), so a
driver installed after launch stayed invisible until a restart. The setup chat directed Windows users to
macOS System Settings, omitted the background service the driver needs, and Ready was claimed from a
file existing. Steps now match each OS, and Verify proves discovery, permissions, windows and a real
window observation. It sends no input and keeps counts and fixed labels only. It passes against the real
driver on this Mac; **it has not run on Windows**, so driver discovery, UI Automation availability and a
Windows window observation remain unverified, as does input delivery on any platform.

## Validation limits

Run the Node suite with a short canonical `TMPDIR` such as `/private/tmp/...`: the default macOS path breaks
path comparisons and Unix socket length limits, independently of this work. `test/tab-followup-ui.mjs` and
`test/content-tabs-ui.mjs` already fail on the unmodified baseline and were not changed.

The Nov 2 dependency relocation left retained sets unusable through a symlink: Node resolves real paths,
so transitive imports failed, and a patched file in `electron-chrome-extensions` reaches `desktop/` by
relative path. Retained sets now live under `<name>.d/node_modules`, and a worktree that launches Electron
uses an APFS clone.
