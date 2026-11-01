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
Native app build is 2611.1.1. Initially accepted application source is
`4a36d701265d2665cf209aff481c513d983ca27f`; the newly diagnosed shared membership race requires
a superseding desktop source/package. Later ledger edits do not relabel earlier packages.
The complete macOS source suite passes 1,406 tests with four skips; static checks pass.
Native Windows passes 1,404 tests with six skips, and native Linux source passes 1,406 with
four skips. Windows package acceptance passes; Linux package promotion remains blocked by
a reproducible selected-terminal replacement during the synthetic refresh test. Its causal
diagnosis must finish before treating either the fixture or runtime as corrected.
Synthetic extension acceptance does not claim real vault credentials were exercised.
