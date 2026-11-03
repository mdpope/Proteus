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
The final phone and tablet reruns remain in progress; title collisions between phone navigation
and the chat list are resolved by stable row accessibility identities. Debug diagnostic labels update natively without publishing every frame through SwiftUI.

The required Node suite passes (1,454 pass, four skip); static validation passes. Simulator metrics
will not establish a physical iPad frame rate. Physical review and authenticated remote connection
stability are separate acceptance requirements. The independently signed first question-card build
is installed and running on iPad: all 195 protected files hash-match before first launch, four
saved destinations/selection are preserved, and two verified recovery generations remain.
The operator additionally authorizes the iPhone; the combined correction will update both devices
after final native acceptance. The accepted Mac, updater usability hold, broader distribution hold
and Mnemosyne redesign hold remain unchanged.
