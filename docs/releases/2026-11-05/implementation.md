## Mnemosyne operations — implemented in Nov 5 source

The operator lifted the Mnemosyne implementation deferral for this release. Desktop/web now
share Overview, Activity and execution detail, Schedules, Services, Logs and Configuration views.
Core runtime setup remains desktop-only; web receives sanitized read-only status and retains its
existing schedule controls. Native owners and working schedules are unchanged. Bounded receipt
projection preserves claim/event lineage and applied/not-applicable/delegated outcomes.
See [scope, contract and acceptance](../../mnemosyne-operations.md). Independent native-core extraction,
additional source/watchers and iOS-library expansion remain explicitly open. Deployment is held.

Validation: full suite 1,677 pass/four skip/zero fail, static checks and web build pass.
Disposable Electron, Chromium/WebKit desktop/phone/tablet, and authenticated two-owner
Laravel/relay acceptance pass. No installation or native-service migration occurred.

## Guided ADO scope expansion

The operator requests guided authentication and discovery with all account-accessible ADO
capabilities across projects: repositories, pipelines, work items, wikis and related features.
This supersedes the work-item-only setup target. Explicit work-item read/write PAT scopes are
supported in source without upgrading existing read-only definitions. Full-account guided setup
and CLI-assisted optional PAT issuance remain open; no successful authentication is claimed.
See docs/managed-ado-guided-setup.md for the qualified Microsoft API constraints and acceptance.
Deployment remains held.

Validation for this intermediate scope change: 12 adapter tests and disposable Connections UI
pass; static checks pass. Canonical-temp full suite had 1,671 passing/four skipped and one
notification test teardown failure. Fixed the fixture to close its worker before deleting its
directory; all 15 parity tests then pass. The first full run used the noncanonical temp alias
and is not acceptance evidence. Full-account guided authentication remains unfinished.

## Native chat details presentation

Group chat details into labeled Activity, Loaded context, Model & session, Permissions &
continuation, Files & connections, and Chat actions sections. Use consistent inset panels,
compact runtime/token rows, readable label/value pairs, collapsible provider diagnostics and
bordered actions. Preserve permission behavior, lifecycle guards and provider-reported values.
Authentication Preview was reopened at the explicit ADO PAT setup; no credentials were entered
and no ADO connection was saved. Deployment remains held.

Validation: current iPhone simulator build and section visibility/width UI regression pass
(67 seconds). Rendered Files/permissions panels were visually inspected. The older history
fixture failed in navigation before this view; the new current-fixture test verifies each section
and scrolls according to its position. No execution/persistence behavior changed.

## Nov 5 current checkpoint — site discovery and client features

The operator completed sign-in in the corrected Authentication Preview and confirmed that the
site appears. This establishes live site discovery in that preview; connection confirmation,
managed Jira reads/writes, silent renewal and organization workflows acceptance remain separate checks. Preserve
the open Authentication Preview. No real Jira ticket was modified by these tests.

The file-browser, image-viewer, Markdown properties/wiki links, larger overview, web navigation
and completion-notification corrections are implemented and validated as described in
[the client acceptance matrix](../../nov5-client-feature-acceptance.md). Full source suite: 1,671 passed, four skipped, zero failed;
static checks pass. Electron file/Connections tests, Chromium and WebKit phone/tablet fixtures,
authenticated Laravel/WebCrypto/two-owner web acceptance and one-tap answer focus on iPhone/iPad
simulators pass. Web assets were rebuilt. Design Preview is open separately.

Deployment remains held. No new packaged Mac candidate was produced by this feature checkpoint;
Linux/Windows/iOS production builds remain deferred. Native workspace-file navigation, physical
APNs delivery, production-network performance and full managed-auth workflow acceptance remain
open; do not label the release fully verified. Earlier checkpoints below are historical.

## Jira read/write and discovery follow-up

Operator-authorized read/write enrollment requests write:jira-work, with read-only still selectable;
existing connections/grants and per-run write authority are preserved. Sample issue probes do not
restrict runtime ticket IDs. Setup performs no mutation. Callback failures retain sanitized
stage/code across expiry/navigation; identity discovery supports declared draft-07 schemas.

Validation: 1,663 tests passed/four skipped; static checks and disposable Electron acceptance
passed. The draft-07 regression failed before correction. Live old-preview status confirms the
failed attempt reached account-discovery, but its original subtype was overwritten by expiry.
No successful live account/site discovery or Jira write is claimed; revised consent and actual
managed-path acceptance remain pending. Production deployment remains held.

## Atlassian public-client registration correction

Reproduced the operator's client-registration failure against live authv2 DCR: successful public
client response included an unused client_secret. Keep explicit auth method none and only public
client fields; discard the secret before SDK code exchange, refresh or protected persistence.
One subsequent adapter check passed live registration, PKCE S256 and pinned resource/authorization
URL construction without browser launch or consent. Full authenticated acceptance remains pending.

Back to setup now focuses the existing editor and preserves drafts; failure recovery shows an
explicit Try again button. Validation: 1,659 tests passed/four skipped, static checks and disposable
Electron interaction tests passed. No deployment or real account authorization was performed.

## Browser-first Atlassian enrollment

Implemented owner-only OAuth setup with discovered account/site review and explicit workspace
confirmation. New connections no longer require account IDs, cloud IDs or scope strings.
Initial read profile uses four advertised authv2 scopes and refresh credentials in protected
storage. Existing runtime account pins, tool permissions and deployment hold are unchanged.

Validation: full suite 1,658 passed / four skipped, static checks and disposable Electron flow
passed; 22 focused owner/OAuth/probe tests cover cancellation, duplicate starts, storage failure,
revision conflict, returned-site selection and secret-free status. The final full suite and static
checks also pass after start-race hardening. No real consent or Jira resource acceptance claimed.

## Atlassian sign-in startup diagnostic correction

Installed candidate 1's generic owner-review message is not a human-click restriction. Native
owner UI routes to the local controller, but its startup catch discarded discovery, registration,
loopback and browser-opening failures. Work Mac's existing next-action status confirms that catch
was reached; the original cause remains unknown. Do not repeat sign-in as an owner-routing fix.

Source now preserves fixed stage/error codes and bounded HTTP status in the UI error and owner
status, excluding OAuth bodies, credentials and authorization URLs. Regression fixtures cover
discovery/registration/browser failures, released loopback flows and exactly one attempted start.
No automatic registration retry, changed grants, new credential endpoint or authentication bypass
is introduced. This diagnostic correction does not yet establish or fix the underlying vendor
failure; a new accepted Mac candidate and one deliberate owner attempt remain necessary.

## Installed Work Mac acceptance checkpoint

Workflow owner reports the exact candidate installed and healthy, with zero navigation differences.
Independent inbox catalog refresh and revision/hash-bound source reconciliation preserved enabled
state, history and notifications. Its first actual scheduled Codex Terra-low run completed without
prompts against an empty inbox; second-run acceptance remains pending. Planning/digest configuration
and working authentication are preserved pending managed connection qualification.

Installed P4 diagnostics are accessible: 24 records / 16,496 receipt bytes, zero pending, no capacity
warning or over-budget state; storage bytes 269,689,104. All records are classified unknown-legacy.
These current aggregates do not establish historical cause or physical reclamation. Effective
permissions still include inherited workspace RW folders; explicit read entries do not establish
read-only repository isolation. Atlassian minimal scopes remain unqualified; the supported public
discovery and owner setup path are documented in managed-mcp-connections.md.

## Mac candidate 1 accepted for private delivery

Source `fc0b318cded97cda7fdec613261bf34b579f7b31`; build
`fc0b318cded9+src.7fff6552aef0`, darwin/arm64, Electron 44.10.2. Clean provenance records
496 runtime files. Existing Apple signing identity and vendor signatures verify; the exact signed
app launches in an isolated profile and lists 16 live runtime models. Synthetic Keychain testing
does not establish real owner credential acceptance. Official archive extraction matches the
application hash. Matching source companion verifies all packaged inputs.

Release ID `0.2.43-darwin-arm64-c791f4cc7610d0670d07e3e6`; manifest digest
`69fb06aab30762e0ba79023180a2a21d6c752d7738b0f6bb8e8642c7ba31095e`.
Build Mac signed with the legacy transition publisher key, while the app bundles both trusted
public keys. The private draft and all four assets were downloaded and hash-verified. No public
publication or other-platform build occurred. Work Mac installation is dispatched through a separate
owner coordinator. The established isolated GitHub route resolved a default-context 404; Work Mac
independently verified all four assets and prepared the candidate. Restart now waits for an existing
digest run awaiting input; no unrelated work was cancelled. Installed/workflow acceptance is pending.
Private routing and full transfer receipts remain outside Git.

## Mac candidate source freeze validation

Final source suite: 1,639 passed, four skipped, zero failed; static checks pass. Disposable
Electron 44.10.2 Connections, lost-send-response/overview-failure and real-download idle tests
pass. This is source/native fixture acceptance; signed packaging and Work Mac installation/workflow
acceptance follow separately. No Linux, Windows or iOS build was started.

## Current delivery order — Mac digest candidate first

The operator now holds Linux, Windows and iOS builds until the Mac candidate is delivered to
Work Mac and its digest workflow is exercised. Build/sign the current validated Mac source and
use a separate receiving-owner update coordinator. Keep the release open for further additions
and fixes before the full build/publication. Web P1/P2, Linux rollback attention reconciliation,
historical window-closure attribution and other-platform installed acceptance remain tracked;
they do not delay this expressly prioritized Mac candidate. No new platform builds are dispatched.

Navigation verification now records bounded expected/found differences and hashed inventories
for the exact update job, including failed preservation checks. Status restores this diagnostic
after restart. The acceptance gate and old rollback outcome are unchanged.

## Nov 5 updater and provider prerequisites

Maintenance accepts an optional stable operationId and returns a durable inspection receipt;
maintenance-status reads it by id. Repeated IDs do not repeat work, interrupted receipts do not
silently restart, and completion retains the exact maintenance plan for the existing digest-bound
apply flow. Status exposes active/queued inspection and busy state. Shutdown waits for receipt
persistence. Existing synchronous callers remain compatible.

Windows builder jobs now own protected temporary directories and set TEMP/TMP/TMPDIR only in
the child environment. Source tests use four workers and a two-minute per-test timeout. Native
Windows acceptance remains required. Claude rate_limit explains provider/model/sign-in scope,
separates unknown throttling from provider-reported exhaustion and copies only fresh reset evidence.
It does not select another provider. Electron is pinned to patched 44.10.2; the remaining upstream
ADO/Zod 3 advisory is constrained by the managed adapter's explicit input/collection limits, not
claimed fixed upstream. Actual managed ADO acceptance still requires approved owner Entra setup.

## Nov 5 browser update idle rules

Only progressing, unpaused downloads block update idle. Paused, interrupted, completed and
cancelled items remain untouched. Browser agent activity carries a progress timestamp; after five
minutes without observed progress it is reported stalled and stops blocking idle. Current input or
a new operation resumes progress tracking. Owner status exposes browserActivity with tab ID/title,
kind and state, and blocking messages name the tab. Running chats, terminals and other idle guards
remain unchanged; no operation is cancelled or counter cleared by observation.

## Nov 5 message display and refresh recovery

Accepted composer sends update the chat from the owner receipt before refreshing the overview.
An overview failure reports that the message was accepted, retaining visible history. Concurrent
send clicks coalesce; an uncertain response retains the same message ID/payload for retry within
the current renderer session. A proven pre-delivery rejection releases that attempt for editing;
a recorded uncertain delivery does not. Reload recovery still uses the owner's durable receipt.
Same-view state projections wait for the in-flight generation before capturing a newer one;
renderer refresh callers share one request. Content-free error codes and active queue counts are
exposed in performance diagnostics, distinguishing cache pressure, churn, worker timeout/exit and
assembly failure. The historical live cause remains unproven until installed diagnostics observe it.
Validation: 1,635 pass/four skip/zero fail; static checks pass. Real disposable Electron acceptance
forces an overview 503 and loses the first accepted send response: the retry retains its ID,
the message is visible and the owner contains exactly one copy. Two fixture setup issues were
corrected (invalid synthetic chat ID and startup ordering); no live data was involved.

## Nov 5 remote journal capacity source work

Owner-wide scoped chat diagnostics expose aggregate receipt bytes/counts by method, pending
counts, capacity warning and next expiry without keys or payloads. Older owners report unsupported;
no credential extraction or private-file inspection is required. Legacy methods remain unknown.
Completed large receipts now use integrity-checked lossless compression in the journal transaction,
including existing completed records at startup. Exact outcomes and unknown fields replay; unresolved
claims and retention windows remain intact. Older SQLite readers see an uncertain receipt and cannot
repeat its effect. Downgrade therefore limits replay of compacted results; retain the current reader
or use the normal verified recovery snapshot. Compaction is not secure erasure or disk-space recovery.
Full source validation: 1,634 pass/four skip/zero fail; static checks pass. Focused encrypted
owner-scope, restart/replay, integrity and legacy-compaction tests pass. Work Mac live measurements
and candidate installation remain pending.

## Nov 5 optional connection compatibility

Source fixes persist optional readiness exceptions and denied/missing selections as sanitized
coverage gaps exposed in selected-run integration status. Empty workspace categories capture
identity/revision without evaluating unrelated defaults. organization workflows reports 105 source tests passing;
live schedules/authentication remain untouched. Signed candidate and installed two-run acceptance
remain pending. See the managed connection contract for the unchanged export schema.

Validation: full bounded-concurrency suite passes 1,630 tests with four skips; static checks
and 18 focused checks pass. The initial default-concurrency run failed one unrelated heartbeat
timing assertion; its ten-test suite and the full bounded rerun pass. No runtime heartbeat code
was changed.

## Agent communication guidance

Updated shared orientation, chat-tool description/mode help and agent-control documentation to
prefer explicit steering for relevant active-work updates, with queue exceptions and unchanged
approval/retry boundaries. This supersedes the proposed automatic runtime default; no execution
or persistence code changed. Existing orientation/chat-control checks: 36 pass, zero fail;
JavaScript syntax and diff checks pass. The first sandboxed attempt could not create temporary
fixtures; the authorized rerun passed. Source guidance only, not an installed release.

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

## Nov 5 managed ADO source checkpoint

Both initial adapters now have owner controls and scoped runtime paths. ADO uses protected MSAL
public-client credentials and the pinned server envvar mode, never a CLI/developer-account fallback.
Exact corporate identity/organization and bounded capability probes are required. Full suite:
1,627 pass/four skip/zero fail; static checks and disposable Electron UI acceptance pass. Real SDK
protocol and server catalog fixtures pass without corporate credentials or business data.
Remaining: dependency advisory qualification, complete remaining release plan, signed candidate,
then actual organization workflows acceptance. Work Mac has no documented approved Entra public-client registration;
owner/admin approval is a live setup prerequisite. No package or installation exists.

See [the connection contract](../../managed-mcp-connections.md) for schemas, qualification and remaining advisory/installed acceptance limits.

## Nov 5 Atlassian site discovery

The local Authentication Preview reached authenticated account review but displayed no sites.
Discovery incorrectly filtered every resource without the exact classic `read:jira-work` scope
label. Retain bounded, validated resource candidates regardless of optional scope metadata;
deduplicate repeated IDs only when their origin agrees and reject conflicting origins. Resource
discovery does not establish Jira capability or grant mutation authority. Exact identity/site
verification and distinct Jira probes remain required.

Owner setup status exposes only resource/site counts and unchecked Jira access alongside the
existing account/site projection. Empty-list guidance now distinguishes successful account
authentication from missing resource discovery. Regression tests cover absent/granular/other-product
scope metadata, duplicate identities, empty results and conflicting sites. The original live
response was not retained, so filtering is a confirmed code defect, not yet a proven explanation
of that specific empty list. After restarting the corrected local preview, the operator confirmed
that the site appears. All 23 Atlassian tests and the disposable Electron connection UI test pass.
Connection confirmation and actual Jira read/write acceptance remain separate; deployment remains held.

## Client feature expansion checkpoint

See [the client feature acceptance matrix](../../nov5-client-feature-acceptance.md). Source and
isolated UI/build work is implemented; live rollout and physical notifications remain held.
Native workspace-file parity is recorded as an outstanding gap, not silently marked complete.
