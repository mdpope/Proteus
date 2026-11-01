# Nov 1 implementation

Version: 0.2.40

N1–N7 retain the earlier local acceptance for integration scan/yield/persistence, project-owned
membership, unavailable documents, durable Close/reopen, browser geometry, native build/default
coordination, release dates and iOS shared/local providers. See the plan's historical checkpoints.

Added corrections implement canonical iOS organizational membership and durable offline intent,
exact uncertain-request replay, causal close/reopen and legacy inferred-deletion quarantine.
Notification delivery retains original occurrence time and suppresses stale/read/resolved events;
native persistent deduplication and five-second coalesced banners prevent historical replay.
Extension adapter records capture concrete native windows, preserve per-window active tabs,
filter sender/current/last-focused queries and create/close authentication windows gracefully.
User-started update coordinators persist a versioned owner-scoped preflight grant.

Focused acceptance: 44 iOS tests pass; synthetic extension authentication-to-fill and existing
install/activation/profile-isolation/disable/update UI pass; web 106 tests/926 assertions and changed
PHP formatting pass. The full PHP formatting check reports four pre-existing unrelated files.
Native app build is 2611.1.1; source freeze/package pins and actual device acceptance follow.
Synthetic extension acceptance does not claim real vault credentials were exercised.
