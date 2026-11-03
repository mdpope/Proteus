# R32 — subscription traffic correction in validation

The R29 Mac's aggregate outbound traffic remains several megabytes per second in observed
intervals despite no recorded host closes/congestion. That is not accepted as stable bandwidth.
Source inspection found that native views retained full chat watches after leaving them, while
one full watcher caused summary subscribers of the same chat to receive full pages too.

R32 sends full/summary/indexed delta updates per authenticated transport. Native visible-view
leases end hidden/disappeared chat watches through a negotiated, token-checked owner operation;
old owners retain full-page compatibility. Delta cursors remain transient and bounded. Native
merging preserves retained history, changed event positions and stale-response ordering, including
a push arriving before its initial page. Pending mutation receipts and execution ownership do not
change. Per-kind counters cover actual encrypted routing-frame bytes at queue transmission, with
six fixed labels and bounded ten-second windows. They retain no content or arbitrary labels.

A synthetic million-byte history update changes one event: its incremental representation is
under one percent of the full page. Encrypted mixed-client relay acceptance verifies separate
summary/full/patch delivery and conditional unwatch; this is not an overall production bandwidth
claim. The full Node suite passes 1,466 tests with four skipped. All 184 native units and visible-view phone/tablet
subscription checks pass. Final phone prepend/reopen, heavy-scroll and repeated switching pass;
the corrected iPad prepend/reopen check passes separately. Installed measurements remain separate. General membership on iPhone build9 is independently
verified at 12 matching IDs/revision3535; broader sustained authenticated acceptance remains open.

# R31 investigation — retained retry can suppress the owner read

The operator confirms the iPhone still shows a different General list after build8. A fresh
build8 device receipt has 57 recent scopes but no successful read for Build Mac’s exact
General project; the Mac remains at 12 tabs / revision3534. This is not accepted as synchronized.

Inspection found a separate failure path: a saved tab mutation suppresses ordinary reads while
its original request is retried. An authenticated terminal expiry rejection previously left
that envelope in the active outbox indefinitely. The follow-up preserves the exact original
request and operations in the existing encrypted review store, then permits a fresh owner read.
A timeout or uncertain failure retains the original active request unchanged. No new mutation
identity is created, and later reads do not authorize replaying those retained edits.

Private reconciliation evidence now distinguishes offline, invalid-project, pending retry,
requesting, received, failed and expiry-retained states using fixed labels and counts only.
It remains bounded to 64 scopes / one megabyte, excludes titles, URLs, draft text and keys, and
clears on account reset. This diagnostic is needed to establish the live cause rather than
assuming the missing successful-read receipt proves an expiry. Validation and rollout are pending.

# R30 follow-up — membership before history

The operator still observes mismatched iPhone General tabs and disconnects while sending after
mobile build 2611.2.7. The Mac component remains prepared behind a human-only coordinator approval,
so the combined transport correction is not yet installed or accepted end to end.

A further client delay is corrected: a fresh tab snapshot previously waited for optional complete
browser-history paging before it replaced obsolete membership. The app now applies the owner list
first, then hydrates Back/Forward history. A matching complete local history is retained, and a
concurrent owner update or local intent prevents a stale history completion from overwriting it.
The open-tab list repaints this authoritative membership even while history hydration is loading.
The private, content-free membership evidence retains at most 64 recent scopes under its existing
one-megabyte bound so background reads do not immediately evict the project being investigated.

The synthetic iPhone reconnect test passes with a deliberately unavailable 30-second history
request: the replacement tab appears within ten seconds, before history finishes, and obsolete
membership disappears. The complete-history preservation test and native networking tests pass.
Full iPad/native acceptance is in progress. This reproduction does not establish that delayed
history explains every live General mismatch or disconnect; physical and Mac verification remain.

The desktop draft sync/status and conflict details are moved beside the chat heading and new-chat
heading. Two actual Electron windows verify setup/reply synchronization and conflict recovery, with
no status inside the composer. These source changes are not in frozen R29 installed packages.

## R29 — transport stability and visible project owners

The operator reports continued iPad disconnects and an obsolete iPhone General tab cache. A physical
iPad read matches all 12 desktop General IDs in order and revision, independently confirmed by the
operator. The iPhone still displays an older 13-tab cache; no successful General read was captured
in its bounded diagnostic sample. The Mac owner log independently confirms repeated shared relay
transport loss, rather than a conclusion drawn from a client offline label.

A controlled reproduction sends two 3.5 MB plaintext snapshots: each becomes approximately
4.67 MB on the encrypted wire, and the former sender closes the entire shared host socket when
the second frame exceeds its 8 MB buffer ceiling. This demonstrates a failure mechanism, not yet
a measured explanation of every live outage. The installed diagnostics did not record close codes
or byte rates; the new bounded private report counts actual encoded bytes/packets, peak packet and
buffer size, congestion, close-code buckets and twelve ten-second traffic windows. It records no
message text, URLs, titles, request IDs, pairing keys or arbitrary labels.

The host now uses one ordered bounded writer, waits for socket capacity, respects relay byte and
packet windows, and lets other clients proceed when one exhausts its own budget. It retains a
16 MB queue plus a small bounded control reserve. A negotiated relay capability closes only an
overloaded client with temporary code 1013, preserving its pairing. Old relays remain compatible
with ordinary paced traffic, but exceptional isolation requires their upgrade; the fallback is an
explicit temporary host disconnect, never a false authentication rejection. Reconnect sync omits
obsolete full state events because it returns the current state once, while retaining lifecycle
and other replay. No uncertain mutation is automatically restarted under a new identity.

Identical in-flight scope reads share history work without retaining a completed-result cache or
overwriting a different membership revision. Initial remote tab reads carry a 32-entry history window;
existing paging retains access to the full backstack. Native requests allow four concurrent wire
operations and bound pending work, preventing history-worker admission overload. The reconnect
retry set is captured before authentication completes, excluding new requests submitted afterward.
Native request bursts now pace below the relay's 100 packets / 32 MB per ten-second client limit,
with bounded pending requests and checks that expired queued actions cannot transmit. A visible
project can resume its own suspended computer without changing selected-computer state, keys,
drafts or reconnect backoff. Existing host-switch handling for unconfirmed commands remains.

Observed source polling: host state comparison every two seconds (transmit only on change), visible
project refresh every three seconds, main-tab refresh every three seconds, known-scope fallback
roughly once per minute (checked every five seconds), and notifications every five seconds per
connected owner. Live bytes/second must be measured after the instrumented build is installed;
these intervals alone cannot establish bandwidth or the cause of disconnects.

Source checks: final Node suite 1,463 pass / four skip; static checks pass. Actual two-client relay
acceptance proves isolated overload, another client's continued sync, and successful reconnection
with the original device pairing. Native visible-owner and host-switch unit cases plus phone
same-screen tab reconnect pass. The full native suite passes 179 cases, including an actual 110-request burst without a new
authentication generation. Final source checks and all live rollout/stability checks follow; do not report source success as an installed fix.

The operator now authorizes all configured platform deployments and release closeout after these
fixes. Wider distribution hold is lifted; broader Mnemosyne implementation remains deferred.
Updater usability remains separately gated on completed local acceptance.

