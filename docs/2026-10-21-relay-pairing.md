# Existing relay pairing configuration — October 21

The operator requests connections between this Linux computer and Personal/Work Macs, plus access
from the existing iPhone and iPad, automated through proteus.example and coordinated with the existing
Codex chat on Build Mac. Preserve existing Mac/mobile destinations, keys, approvals, histories
and retry receipts. This authorizes work toward those named connections, not enrolling arbitrary
future devices, replacing accounts or resetting existing pairings.

## Existing behavior and observed blockers

Pairing invitations originate in Proteus on the destination computer, not on the relay website.
The relay only routes encrypted protocol-1 traffic. Incoming host registration and outgoing
desktop pairing are independent; a desktop does not need incoming access to pair to another host.

The public relay health endpoint is reachable. Current Linux incoming transport repeatedly
disconnects; the operator reports its live error as “Unexpected server response: 403.” This confirms host
registration rejection, without distinguishing unknown host, token mismatch or duplicate host route. A configured token is
not proof that this Linux host is registered in the relay's protected map. Preserve its identity
and use distinct registration material, never another Mac's token. Fresh code creation requires
a live relay connection on the computer whose code is being generated.

The operator explicitly corrected scope: configure the existing pairing workflow; do not
redesign authentication or implement an account-enrollment bridge. The previous proposal
was withdrawn. Website sign-in is now verified; Build Mac reports Connected and HC is
listed. Native desktop/mobile pairing stores remain independent of website sign-in.
No keys or tokens are extracted from website storage.

## Implemented local repair, not installed yet

The current-version source is isolated under `.runtime/relay-pairing-027-source`, based on the
tested Linux controls source. Matching reviewable changes also exist in the main checkout.

- Put outgoing desktop pairing before incoming relay settings, with exact directions for where
  to create a code and a distinction between pairing codes and registration tokens.
- Refresh incoming transport status without replacing forms; enable code creation when the relay
  actually becomes online. Check connection refreshes status without applying settings.
- Keep pasted codes on failed pairing and display inline errors; clear only after success.
- Keep connection errors visible during reconnect attempts, explain 401/403 registration rejection,
  and clear stale errors after a successful connection or changed configuration.
- Stop status polling when Connections is no longer mounted. Status checks never issue codes,
  register hosts, pair devices or widen grants.

All 847 runtime tests and static checks pass in matching 0.2.27 source. An actual isolated Linux
desktop fixture verifies pairing direction, automatic readiness, draft/code retention, manual
error recovery and stopping polling on navigation. These use synthetic responses and disposable
profiles; no real cross-host/mobile enrollment is claimed.

Linux package `linux.6e7363ef1a86` is staged with fingerprint
`6e7363ef1a86e84645db0a37868e06bf61fa61a47e7610867276630f2271c03d` and 285 verified runtime files.
Exact-package structure/privacy/hash checks and the same pairing UI fixture pass. The package,
source companion, source patch and local verification receipt live under
`.runtime/relay-pairing-027-build`. It is not installed; the running controls build remains intact.

Actual Linux host registration and desktop/mobile pairing are still pending; no real pairing
has yet been added or replaced. The existing Build Mac Codex conversation is reachable
through the signed-in website. Coordinate setup there using the existing workflow, preserve
working pairings, and report message delivery separately from completion.

Linux native observation works, but background pointer delivery fails and the owner rejects
foreground delivery. Do not bypass that restriction. The operator was asked to open Connections
so its actual relay error can be observed. No direct application-data editing is authorized as
a substitute for configuration tools.


The existing Build Mac Codex chat acknowledged the October 21 coordination request and is
checking relay registration for the existing Linux host. This confirms dispatch, not successful
registration or pairing. Invitations are deliberately deferred until Linux is ready.


The Build Mac coordination reports no active Linux route, while its own host remains online
with existing pairings preserved. Protected-map inspection is blocked on that chat's access to
the private deployment workspace; paused Webmin tabs were not accessed. The operator has been
asked to identify or grant the existing deployment workspace. No registration, token transfer,
new pairing or production restart is claimed.

The reviewed main-checkout changes pass 820 runtime tests and static checks before repository
publication. These checks are separate from the previously verified current-version package.
