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

