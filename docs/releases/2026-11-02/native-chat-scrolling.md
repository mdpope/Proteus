# Native chat reading position and scrolling — R26

## Findings and correction

The native conversation had several independent bottom-scrolling paths: Markdown resize,
event/live-message changes, and the UIKit probe. Layout and keyboard movement could also re-enable
following without a reader gesture. The probe now owns bottom following; a real pan pauses it,
including deceleration, and only finishing at the end resumes following. Pending native commands
and visible history prepends wait until tracking, dragging and momentum finish. History can still
prefetch into the cache during a gesture.

Per-message global geometry arrived independently of UIKit offsets. Combining an old screen frame
with a newer offset could manufacture a wrong anchor during a prepend. Message anchors now use
stable content coordinates, including the native top inset when deriving the visible reading point.
This also removes per-message geometry updates caused solely by scrolling. Native bounds changes
that only move the origin are ignored; offset, size and actual viewport-layout reports are coalesced.
High-frequency measurements remain reference state, rather than publishing the whole conversation.

A bookmark previously recorded the loaded cache boundary but omitted the rendered history-window
boundary. Reopening could choose another window and then restore its old absolute offset. Bookmarks
now retain both boundaries; raw restoration requires matching boundaries, revision and width.
Otherwise the message anchor and inset restore the reading point. Bookmark restoration no longer
uses a second SwiftUI scrollTo: its deferred completion could overwrite the native inset correction.
Explicit question navigation cancels competing bookmark restoration. Older anchor history can be
fetched before restoration, with cancellation on user interaction and retry on reconnect.

Reading bookmarks now survive a new store/app process. They are bounded to the newest 200 per local
account, use hashed scope keys, validate numeric measurements and write on completed gestures or
lifecycle transitions and acknowledged restoration. Returning to following removes the bookmark. Drafts and the remote execution
owner remain separate. Question/event and turn associations are derived once per presentation
update instead of repeatedly scanning the entire event list for each row.

## Validation and limits

The current-navigation iPad test performs a real drag, checks settled-position stability, prepends
history and reopens the chat. That sequence passes. It replaces the missing coverage from older
phone tests that silently skipped when their legacy tab bar was absent. The iPad cold-launch case and all 174 native unit tests pass. A 1,000-event
varied-rich-content scrolling workload passes with two active renderers; recorded simulator app CPU
time averages 1.048 seconds over 2.481 seconds of scrolling/deceleration, physical memory about
68.4 MB and peak 81.3 MB. These are diagnostic measurements without a prior-build baseline.
Final phone and tablet gesture/prepend/reopen/cold-launch cases pass, as do question-card
containment, choices, Clear, retained draft and Return submission. Title collisions between phone
navigation and the chat list are resolved by stable row accessibility identities. Debug diagnostic labels update natively without publishing every frame through SwiftUI.

The required Node suite passes (1,454 pass, four skip); static validation passes. Simulator metrics
will not establish a physical iPad frame rate. Physical review and authenticated remote connection
stability remain separate acceptance requirements.

## Installed review build

Both physical devices run **0.2.41 / 2611.2.5**, built once from `dd4b7db` with the established
paid identity/profile and unchanged entitlements. The accepted artifact hash is
`739b3fdbf07ceefe186ce34133d6d3575338e200fec832ee8a8b3b1471138272`.
The iPhone's 302 protected files match before first launch. The iPad launched independently during
verification; a subsequent full cold readback matches all 199 protected files, so its receipt explicitly
records verification after that observed launch. Both running processes, four saved destinations
and selection verify; exactly two verified recoveries remain per device. Physical scrolling and
reconnect/push are for live review and are not inferred from installation.

Both shared simulators now contain one **Proteus Preview**, build **2611.2.5**. Older app identities
and completed test runners are removed. In-place refresh compares 3,119 phone and 2,656 tablet
files before launch: only OS launch snapshots change, all protected data and both saved destinations
per simulator remain intact. The simulator-assigned container paths may change.

The accepted Mac build is unchanged. Updater usability, broader distribution and Mnemosyne redesign
holds remain. The separate iOS/web connection instability remains open.
