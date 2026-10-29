# iOS main-thread profiling — October 29

Companion to the [desktop main-thread analysis](2026-10-29-main-thread-responsiveness.md). The
same rule applies on iOS: SwiftUI view bodies, observation callbacks and `@MainActor` stores run
on the one UI thread. Declaring work `async` or putting it in a `Task` started from the main actor
does not move it off that thread; use a detached task, a dedicated queue or an actor.

## How to reproduce

1. Pair a simulator preview app with the real host. Preview bundles are
   `org.proteusapp.review.proteus.iphone-preview` / `org.proteusapp.review.proteus.ipad-preview`. A release-identity test app on
   the same simulator can claim `proteus://` links, so pass the one-time link as a launch argument
   instead of `simctl openurl` (DEBUG builds only):
   `xcrun simctl launch DEVICE BUNDLE --native-design-preview --reset-pairing --pair-link 'proteus://pair?data=…'`.
   Create the link on the host under Engine Room → Computer Connections → Create pairing code; it
   works once and expires in five minutes. Treat it as a secret and do not log or commit it.
2. Run `scripts/ios-real-host-profile.sh DEVICE BUNDLE TAG [SECONDS]`. It launches the paired app,
   runs `testRealHostTour` against it in attach mode (the app is activated, not relaunched, so
   the profiler stays attached), records a Time Profiler trace, and prints potential hangs plus
   the hottest app frames on the main thread. The tour opens a workspace, a project, a chat and a
   browser tab, does one edge swipe and opens the tab overview. It sends no messages.
3. Drill into one symbol: `scripts/ios-time-profile-summary.py TRACE --callers SYMBOL`. Open the
   trace in Instruments for full call trees.

Caveats: these are simulator Debug builds (unoptimized; Release is faster). The UI test itself
asks for accessibility snapshots on the app's main thread, so a few short microhangs during a tour
can be test artifacts. Confirm any remaining hang by hand or on a device before optimizing it.

## Findings and fixes (real Build Mac data, ~1,000 attention items)

| Main-thread cost (iPhone, 75 s tour) | Cause | Fix |
| --- | --- | --- |
| ~35%: `NativeWorkspaceTree.recents` → `NativeProjectActivity.parse` | Sidebar recents were re-sorted on every redraw, creating an `ISO8601DateFormatter` for each comparison | Shared cached parser plus a bounded memo; each item's date is computed once per sort (`NativeProjectActivity.newestFirst`) |
| ~22%: `nativeAttentionItems` (Home rows, drawer counts) | Each attention item linearly searched all runs and `allRuns` for its title, several times per render | One title dictionary per host per call |
| `NativeProjectCatalog.isValid` via `membership(for:)`/`project(id:)` | Every lookup re-validated the whole catalog; `remote.projectCatalog` built a new catalog per access, including inside per-chat filters | Validate once at init; `RemoteStore` caches one catalog until `state` changes |
| `RemoteCrypto.seal` from `saveHistoryCache` / `saveDocumentTabs` | Encrypted cache writes ran on the main thread on visits and content refreshes | Shared serial background writer (`SharedAppStore.cacheWriter`); reads wait on it first |
| `TeamBrowserView` → `browserHistory(_:back:)` | The edge swipe checked for history by building the full URL list on every render | `hasBrowserHistory(_:back:)` index check |

Result in the same walkthrough: iPhone potential hangs went from 32 (250–590 ms each) to 0, and
app-attributed main-thread samples fell about twelvefold. iPad (where the sidebar tree is always
visible) went from 1 hang to 0, with the project tree dropping from 366 to 114 samples.

Earlier, the iOS relay accepted only 1 MiB websocket messages, so a real host's ~1.2 MB state
dropped the connection ("offline · reconnecting"). It now accepts the host/relay 8 MB limit.

## If freezes or hangs remain — what to check next

Ordered by measured cost and likelihood. Profile first, and compare before/after with the script.

1. **Hidden areas still re-render.** The iPhone shell keeps every visited area mounted
   (opacity 0) to preserve state. Hidden Home still evaluates `attentionRows`/`homeRecents` on
   each state change (~600 samples per tour). Gate heavy sections on
   `nativePhoneAreaActive`, or move derivations into a cached model invalidated by host state.
2. **Content-tab polling.** `refreshContentTabs` → `applyContentTabs`/`localContentTabs` runs every
   2–3 s for each visible project/workspace and each open chat (`ChatView` also polls previews).
   Each pass diffs descriptors and may publish `browserTabs`, which re-renders strips and the
   sidebar. Check that unchanged responses publish nothing and that hidden/background scopes
   stop polling.
3. **Whole-state replacement.** Each host update replaces `RemoteStore.state` (about 1.2 MB with
   real data), invalidating every observer of `state`. If redraws still bunch up after an
   update, split hot sub-documents (runs, attention, workspaces/projects) into separately
   observed properties, or apply diffs instead of replacing the whole state.
4. **Linear scans in view bodies.** Many views look up a chat with
   `state["runs"].array.first { … }` and `allRuns.first { … }` (for example
   `NativeWorkspaceNavigation.run`, `recentChats`, shell tab titles). These are O(runs) per row.
   A per-host id→run index invalidated with `state` would remove them.
5. **Snapshots on the main thread.** Tab thumbnails (`NativePhoneChrome.captureCurrent`, every
   20 s and on navigation), `NativeScreenMemory.remember` (on leaving a project home or workspace)
   and the WebKit `takeSnapshot` per page leave all use the main thread. Watch for
   `drawHierarchy` in traces on large screens.
6. **Sidebar favicons.** `resourceIcon` decodes base64 favicons with `UIImage(data:)` while
   rendering rows; cache the decoded image by tab id if it shows up.
7. **Long chats.** Transcript rendering and Markdown layout were bounded earlier (history window,
   stable composer). Profile a long chat separately; the tour does not exercise it heavily.
8. **Physical devices.** Repeat on a real iPhone/iPad with a Release build, using Instruments'
   Time Profiler and Hangs/Animation Hitches templates. Thermal state, memory pressure and network
   conditions differ from the simulator.

Keep authorization, owner mutations and receipt ordering unchanged when moving work. Caches and
display projections never grant access.
