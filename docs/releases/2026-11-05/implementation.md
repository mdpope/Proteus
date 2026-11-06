# Nov 5 implementation

Version: 0.2.43

The operator lifted the build hold and authorized the existing full plan plus the Work Mac digest
requirements, delivery and two-way acceptance iterations. Work stays on nov5-release.

Implemented before version reservation: P6–P10 schedule controls and document-origin preservation
(63bfa6f). Combined source validation: 1,552 tests pass, four skip, zero fail; static checks and
disposable Mac startup/reload/cold restart acceptance pass. These results apply to source before
the version-only reservation; no package or installed workflow acceptance is claimed.

Remaining: full plan implementation/verification (including P12 managed connections), reconcile
the complete Work Mac requirements, immutable package/signature/publication checks, receiving-owner
installation and actual two-run workflow acceptance. Record each candidate pin and result here.

## P12 foundation checkpoint

The complete Work Mac requirements are reconciled in docs/managed-mcp-connections.md. Implemented
internal foundations: revision-pinned owner/workspace connection registry with dependent-reference
guards; protected encrypted credential persistence with no plaintext fallback; account/audience/
issuer/client/adapter-bound in-memory tokens and one renewal per credential reference; durable
rotation uncertainty and saved replacement credentials before token release. These modules are
not yet wired to provider execution, schedules or UI and are not a usable managed connection.

Official ADO MCP 2.11.0 archive integrity verified. Source inspection confirms documented azcli
uses a fallback chain, so it is not yet qualified for the required corporate-account isolation.
No connector was installed/executed and no live credentials accessed. Exact connector auth
qualification, broker/provider wiring, OAuth/setup/migration, health lifecycle, UI and installed
acceptance remain required. Signing-authority transition awaits the operator's pending choice.

Foundation validation: full suite 1,563 pass/four skip/zero fail and static checks pass.
The final adapter-cache isolation refinement passes all eleven focused foundation regressions.
These tests use synthetic credentials and injected storage; they do not establish native keychain
adoption, actual ADO/Atlassian authorization, provider brokerage or installed workflow success.


## P12 broker/provider checkpoint

Shared connection runtime, health dimensions/coalescing, run-scoped MCP bridge, exact-endpoint
credential-injecting HTTP transport and Codex/Copilot attachment now pass source tests. Optional
connections do not block independent work. Captured binding revisions join permission identity;
competing native definitions fail explicitly. Actual annotations govern reads and only explicitly
idempotent reads retry once; uncertain mutations never replay. Rotation now retains a newly
returned credential in protected quarantine before identity validation, preventing its silent loss.

Full Node suite: 1,583 pass / four skip / zero fail. Static checks pass. No native vendor sign-in,
production runtime/UI composition or installed workflow acceptance is claimed. Remaining P12 work:
qualified secure connector setup/adoption, owner configuration/status tools and UI, scheduled/wake
maintenance, exact supported migration contract and installed HC workflow acceptance.

The operator selected a new Build Mac publisher key and then reaffirmed that Build Mac
must be source authority and signer for all built software. Native builders supply unsigned
accepted artifacts. Complete the trust transition without retaining builder signing authority;
no key has yet been generated, moved or retired at this checkpoint.


## P3 signing authority source checkpoint

New publisher public key 705abc96f9f4d01b07488fac is bundled beside the legacy key for a verified
rotation transition. The new private key was generated only on Build Mac outside all checkouts.
Windows custody metadata confirms the old key ID and no active signing/build job; encrypted
one-time transfer is in progress, and Windows key retirement has not happened yet.

Native Windows builds no longer receive a publisher key. Legacy policies remain readable while
the new worker discards their signing reference; new policies require only source/toolchain paths.
Windows distribution exports exact unsigned payload and source companion. All production signing
CLIs require Mac; payload signing preserves native target and exact accepted bytes. Unsigned
payloads cannot pass updater signature verification. Full source suite: 1,586 pass / four skip /
zero fail; static checks pass. Encrypted custody tests bind signer, recipient, checksum, expiry and
exclusive output and reject tampering. No new package or installed trust rollout is claimed.


## P3 partial platform publication

Staging accepts explicit prior signed folders through repeatable `--retain`. Each prior package
must have an older version and pass the normal signature, expiry, target and artifact checks.
Its manifest and package bytes remain unchanged. Catalogs/current descriptor/download pages
separate pending targets from the new version; retirement preserves the verified prior payloads.
Updates exposes this publication state and leaves the selection blank until the owner explicitly
chooses the previous version. Catalog hints never alter publisher trust or exact manifest digests.
Focused source tests and disposable Electron selection/uncertain-dispatch checks pass. Full suite: 1,589 pass/four skip/zero fail; static checks pass. No public catalog has changed and no new package exists.

Mac custody import and signing proofs for both publisher IDs are verified, with local protected,
non-synchronizing Keychain recovery readback. Windows active key and signing reference retirement are verified after those proofs.
The old installed builder fails closed; the new source reader accepts the preserved unsigned policy. Private custody details stay in the operator ledger.


## P12 Atlassian owner/runtime checkpoint

Implemented the owner-side Atlassian authv2 OAuth flow, protected persist-before-verify rotation,
actual account/site and distinct Jira read/search probe qualification, shared runtime composition,
selected-workspace integration API, explicit standalone-schedule workspace binding, model-free
near-term preflight and durable health/recovery evidence. The Connections panel uses that same
owner service and preserves edits on revision conflict. No model can retrieve tokens or invoke
consent through the agent API. Public SDK discovery qualified the selected endpoint without auth.

Full suite: 1,608 pass/four skip/zero fail; static checks and disposable Electron UI acceptance pass.
ADO, complete chat-create/manifest tool selection plumbing and the other full-plan items remain.
No candidate was built. No HC authentication, schedule, approval fixture or business source changed.

## P12 managed selection checkpoint

Chat create, remote transport and schedule tools carry portable managed connection requirements
and the explicit captured workspace. Older destinations fail before dispatch; existing runs cannot
be retargeted by send/reply. Source recapture retains original bindings. Schedule preflight validates
provider support and capabilities, then reports cached readiness without auth/network operations.
Full suite: 1,609 pass/four skip/zero fail; static checks pass. Source acceptance only.
