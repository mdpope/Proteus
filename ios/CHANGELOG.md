## Nov 3 — 0.2.42 source validation

- Faster heterogeneous state decoding and section-level chat observation.
- Soft-wrapped message drafts grow within the existing composer height budget.
- Ignore packets decoded across connection generations; retain offline browser navigation and resume pending intent after history hydration.
- Simulator evidence and remaining acceptance: `docs/releases/2026-11-03/ios-performance.md`.

# Native follow-up, October 29, 2026 — main-thread smoothness

Applying the desktop main-thread review to iOS: Time Profiler traces of the preview app while
navigating the real Build Mac's workspaces, projects and tabs found sidebar and Home data being
rebuilt on the main thread on every redraw. Recent-item sorting created an ISO-8601 formatter per
comparison, each of ~1,000 attention items searched the full chat list for its title, and the
project catalog re-validated on every lookup. These now reuse cached parsers, compute each date
once per sort, build one title index per host, and keep one validated catalog per host state.
Encrypted browser-history and document-tab saves moved to a shared serial background writer;
reads wait for it. On iPhone, potential hangs in the same 75-second walkthrough fell from 32
(250–590 ms) to 0, and app main-thread samples fell about twelvefold. iPad also measured no
hangs. Simulator debug builds only; physical-device profiling remains to be done. Method, tools and
next checks: [iOS main-thread profiling](../docs/2026-10-29-ios-main-thread-profiling.md).

# Native follow-up, October 29, 2026 — simulator validation

Paired with the real Build Mac (0.2.33) in both preview simulators. Relay messages up to 8 MB are
accepted; the 1 MiB URLSession default had kept real hosts offline. Chats have no header: chat actions
are on the chat tab's press-and-hold menu and the sidebar button leads the project bar on iPhone and
iPad. The project home tab scrolls with its tabs. Edge swipes are interactive in browsers, project
tabs/homes and iPad workspaces: the page follows the finger over an image of the destination and
edge swipes take priority over scrolling. Exhausted history returns to the project home, and
forward swipes reopen the last tab/project/workspace. Tab overviews start each project with a Project
home card. Simulator UI tests for project tabs, chat menus, swipes and overview pass on iPhone and
iPad; no physical device was updated.

# Native follow-up, October 28, 2026 — simulator validation

0.2.32 / 2610.28.1 opens every associated chat as a named tab inside its project on iPhone and iPad, with one saved selection per project so switching chats from Chats, the sidebar or the tab strip always shows the chosen conversation. The drawer and iPad sidebar list the active project's open tabs while the top tab strips remain. Relay payloads decode off the main thread and host state uses per-property observation for smoother scrolling while chats stream. Tabs rows fit one line; chat attachments open in Quick Look; failed agent selections offer turn-off-and-retry; notification banners show real chat text and the source computer.

# Native follow-up, October 27, 2026 — installed

0.2.31 / 2610.27.2 permits queued attachment steering when the owning provider advertises support. Native simulator compilation and all 153 units pass. Physical iPhone/iPad installs preserve all 290/260 protected files before launch; both processes launch and all four saved destinations/selection remain per device. Two verified full recovery generations remain each. Physical gestures, reconnect authentication and push delivery are not inferred from installation checks. The original paid identity and explicit push-capable profile remain unchanged.

# Native follow-up, October 22, 2026 — staged source

Project navigation now follows the current store selection while a project destination is open.
Phone browser controls remain inside the bottom safe area; nested website scrolling hides and
reveals the top navigation. Computer actions wrap as readable buttons and label the selected host.
Chat / Live browser mode links sit opposite Connected without a standalone toolbar or extra
editor, preserving both drafts. Messages use a colored left edge. Simulator acceptance is recorded
in PARITY-VALIDATION.md; no physical app update occurred in this round.

# Native follow-up, October 21, 2026

0.2.28 / 2610.21.1 displays owning-file Created/Modified metadata in authorized Markdown views,
uses owner capability for steering controls, and clears stale workspace project selection after
a same-ID owner move while retaining stable resource scopes. Simulator compilation is separate
from physical installation and live paired-owner acceptance. See the desktop 0.2.28 release ledger.

# Native follow-up, October 20, 2026

0.2.27 / 2610.20.6 consolidates the separate iPad app overview, newly inserted tab reveal, persistent mirrored-load protection through redirect/KVO chains, and deliberate link/form/history/SPA navigation. iPhone browser controls remove the extra footer padding and nested bottom safe-area gap, retaining 48-point touch targets. Build, simulator and physical acceptance are tracked separately.

0.2.27 / 2610.20.5 adds an independent App tabs overview immediately left of + in iPad's main strip. It lists the device's top-level roots across connected hosts and keeps workspace/content pinch overview separate. The shared renderer retains iPhone's existing defaults.

0.2.27 / 2610.20.4 adds automatic expansion when a workspace or project name is selected. The full label row responds to taps, including its spacing around short names. Chevron actions still collapse explicitly. This follows the installed 2610.20.3 browser-selection, tab-underline, workspace spacing/divider and plain Engine Room navigation corrections. Source, UI and physical acceptance are recorded separately in PARITY-VALIDATION.md.
