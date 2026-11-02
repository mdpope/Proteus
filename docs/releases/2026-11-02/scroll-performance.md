# Scrolling hitch investigation — Nov 2

The live installed desktop shows recurring main-event-loop stalls. Periodic application work is
the leading hypothesis; the captured evidence does not identify a single blocking function or
establish a deadlock. No performance fix or desktop update has been applied to the live instance.

A five-second read-only process sample and the app's bounded timing report were collected while
it was running 0.2.40. A separate CPU interval measured about 29% main-process CPU. The latest
timing ring recorded repeated delays around 200–500 ms, commonly about 1.5 seconds apart.
That is substantially longer than a 16.7 ms frame budget and can delay native input dispatch.
Website rendering, GPU load and extensions have not been independently eliminated as contributors.

Named synchronous phase samples show remote publication averaging about 41 ms (maximum 81 ms),
HTTP state assembly about 27 ms (maximum 41 ms), and remote state assembly about 25 ms. These are
bounded recent samples, not cumulative CPU attribution. Async heartbeat elapsed time includes
network waits and must not be treated as main-thread CPU. Most recent long-delay samples had no
single instrumented synchronous phase above 50 ms, so uninstrumented work or chains of smaller
tasks still need attribution. Native stacks include V8/string/array work but do not resolve its
JavaScript callers. No claim that a mutex, history database or specific timer caused the stalls
is justified yet.

The installed renderer has a 1.5-second full-state fallback poll. Healthy event streaming normally
suppresses it until the last refresh is 15 seconds old. The timing cadence makes this a useful
lead, but the active stream state was not captured; cadence alone does not prove that poll ran.
Browser activity also publishes full history-bearing tab projections; remote publication builds
and serializes general state. These are concrete paths to profile before broad changes.

Recommended correction and acceptance:

1. Instrument browser state projection/IPC, publication/encryption and renderer refresh/commit
   separately, recording only source-owned timing labels and payload sizes. Correlate the next
   hitch with these phases and capture stream health.
2. Use revision-based, narrowly scoped updates for unchanged browser/activity state. Reuse cached
   catalogs/projections, separate activity timestamps from full history transfers and keep expensive
   nonurgent work out of native input handling. Keep reconnect/push-loss fallback and immediate
   permission revocation; stopping timers indiscriminately would break those contracts.
3. Verify before/after using the same scrolling page and tab/window counts: event-loop delay,
   frame intervals, input latency, unchanged-state work and reconnect/revocation behavior. A source
   build or idle CPU number alone does not establish smooth scrolling.

The new address-completion feature takes a separate bounded path: retained origins are indexed in
the history worker, requests are debounced and tied to field editing, desktop fields allow only one
in-flight lookup, and saved suggestion icons come from cache without fetching websites. These
choices prevent that feature from adding background per-keystroke scans or scroll-time lookups;
they are not presented as a fix for the existing live hitch.

Private raw samples and timing receipts remain outside source. This is the remaining N2 profiling
acceptance item in the prior-request audit, with a concrete live baseline rather than a claimed fix.
