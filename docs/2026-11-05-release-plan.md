## Closed 2026-11-06

Nov 5 / 0.2.43 is closed following verified current updates, bounded Work Mac native workflow
acceptance and main integration. The operator explicitly deferred one blocked Windows consumer
update and non-digest follow-ups to Nov 6. Historical open/hold checkpoints below are retained
as evidence. See [closeout](releases/2026-11-05/closeout.md); do not restart this release.

## Nov 6 updater repair

Bounded quiescent recovery capture, live-owner exclusion, final source/destination verification
diagnostics, stale-lock baseline recovery and a pre-owner startup gate are implemented in source.
Use a fresh ordinary supervised attempt after a terminal pre-install attention failure, retaining
its original job/copy. Source and native tests precede packaging; installed acceptance is separate.

## Nov 6 corrective scope — browser inspection and VNC

Implemented native per-client CDP sessions and explicit-certificate reuse for secure WebSockets.
Native inspection/console/network/backend-handoff and synthetic HTTPS/WSS acceptance pass.
Full validation, package publication and installed live Proxmox acceptance are recorded separately.
Slack typing and whole-page responsiveness remain distinct unresolved work.

## Bounded field diagnostics — source work

Work Mac's corrected explicit-value fill still reports retained:false on the actual Slack
contenteditable div/combobox. Missing-value rejection and own-tab cleanup work. Generic and
Quill editor fills succeed locally; neither reproduces Slack. General Playwright evaluation
is not granted by the schedule policy. Added optional fixed target-only `fill diagnostics:true`
without caller code or text export, automatic retry, Enter or broader authority. Native tests
exercise retained input, cancellation, editor reset and target replacement. Full suite: 1,688 passed,
four skipped, zero failures; static checks and the native diagnostic fixture pass. Live diagnosis and
Slack acceptance remain open; no new artifact or installed diagnostic is claimed.

Track whole-page Slack hangs separately: responsiveness, renderer stalls, background lifecycle
and verified recovery after refresh/reload. Successful load or a generic input fixture is not
proof of restored interaction. No root cause for the whole-page hangs is established.

## Nov 6 — all-device build and rollout authorized

The operator explicitly requests building and deploying all current changes to all devices through
the update process. This lifts earlier build/platform/deployment holds for Nov 5 / 0.2.43.
Freeze the implemented source, build once per native target, validate and sign on Build Mac,
publish accepted artifacts, and use fresh unassigned purpose:update coordinators on all included
desktops. Preserve idle barriers, unrelated work, recovery generations and post-install acceptance.
iOS uses the established Mac-coordinated preservation workflow; web uses its release workflow.
Unimplemented guided full-account ADO and standalone Mnemosyne work remain open, not silently
represented as shipped. Source acceptance: 1,677 pass/four skip, static and desktop/web checks pass.

## Mnemosyne operations — implemented in Nov 5 source

The operator lifted the Mnemosyne implementation deferral for this release. Desktop/web now
share Overview, Activity and execution detail, Schedules, Services, Logs and Configuration views.
Core runtime setup remains desktop-only; web receives sanitized read-only status and retains its
existing schedule controls. Native owners and working schedules are unchanged. Bounded receipt
projection preserves claim/event lineage and applied/not-applicable/delegated outcomes.
See [scope, contract and acceptance](mnemosyne-operations.md). Independent native-core extraction,
additional source/watchers and iOS-library expansion remain explicitly open. Deployment is held.

## Guided ADO scope expansion

The operator requests guided authentication and discovery with all account-accessible ADO
capabilities across projects: repositories, pipelines, work items, wikis and related features.
This supersedes the work-item-only setup target. Explicit work-item read/write PAT scopes are
supported in source without upgrading existing read-only definitions. Full-account guided setup
and CLI-assisted optional PAT issuance remain open; no successful authentication is claimed.
See docs/managed-ado-guided-setup.md for the qualified Microsoft API constraints and acceptance.
Deployment remains held.

## Nov 5 current checkpoint — site discovery and client features

The operator completed sign-in in the corrected Authentication Preview and confirmed that the
site appears. This establishes live site discovery in that preview; connection confirmation,
managed Jira reads/writes, silent renewal and organization workflows acceptance remain separate checks. Preserve
the open Authentication Preview. No real Jira ticket was modified by these tests.

The file-browser, image-viewer, Markdown properties/wiki links, larger overview, web navigation
and completion-notification corrections are implemented and validated as described in
[the client acceptance matrix](nov5-client-feature-acceptance.md). Full source suite: 1,671 passed, four skipped, zero failed;
static checks pass. Electron file/Connections tests, Chromium and WebKit phone/tablet fixtures,
authenticated Laravel/WebCrypto/two-owner web acceptance and one-tap answer focus on iPhone/iPad
simulators pass. Web assets were rebuilt. Design Preview is open separately.

Deployment remains held. No new packaged Mac candidate was produced by this feature checkpoint;
Linux/Windows/iOS production builds remain deferred. Native workspace-file navigation, physical
APNs delivery, production-network performance and full managed-auth workflow acceptance remain
open; do not label the release fully verified. Earlier checkpoints below are historical.

## Nov 5 Jira ticket read/write and callback diagnostics

The operator explicitly requests read/write access to any Jira ticket the selected account can
access. New Atlassian enrollment defaults to read/write and adds `write:jira-work`; a clearly
labeled read-only choice remains. Existing connections and grants are unchanged. The selected
site/workspace binding and each run's tool permissions still apply. Health-check issue IDs are
samples only, not runtime ticket allowlists. Setup never mutates a ticket; writes are not retried
when their outcome is uncertain. Actual service-side Jira permissions remain authoritative.

The operator's next callback reached account-discovery, establishing that token exchange and
protected storage completed, but not proving account/site access. Old timeout handling replaced
the failure message with expired. Failures now retain stage/code and bounded diagnostics, appear
when returning to Accounts & Integrations, and are shown directly on the callback page. No OAuth
codes, tokens, callback URLs or remote error bodies are included. Discovery now accepts declared
JSON Schema draft-07 as well as 2020-12 while retaining argument validation; a new regression
failed before this compatibility correction. The original live failure's exact subtype is unknown,
so this source correction is not claimed as authenticated acceptance. Deployment remains held.

## Nov 5 Atlassian registration compatibility correction

The operator reproduced `client-registration / CONFIGURATION_MISMATCH` before any approval page.
A bounded live check found authv2 DCR returns HTTP 201 and `token_endpoint_auth_method: none`
alongside an unused `client_secret`. Proteus rejected that otherwise valid public client.
The adapter now retains only public client fields and explicitly keeps auth method none; the
unused secret is discarded, never persisted or sent during code exchange/refresh. Missing or
confidential auth methods still fail closed. A subsequent live adapter check passed registration,
PKCE S256 and the pinned authorization endpoint/resource; no browser, consent or token grant was
performed by that diagnostic. Full authenticated identity/Jira acceptance remains pending.

While an editor is open, Add connection now reads Back to setup and scrolls/focuses the existing
controls without resetting drafts or retrying authentication. Startup errors load the saved failed
setup state with an explicit Try again button. Deployment remains held.

## Nov 5 — browser-first Atlassian setup

New Atlassian connections start with Connect Atlassian, not manual account/cloud IDs or scope
strings. The owner approves read identity/Jira plus offline renewal, reviews the discovered
account, explicitly chooses a returned Jira site and authorizes workspaces. No registry binding
exists before confirmation. Existing connections keep their exact account pins and advanced edit
form; no migration or sign-in is performed automatically. Deployment remains held.

## ADO alternatives source implementation

The operator requests both explicit CLI and PAT adapters without new app registration.
[Schema, migration and qualification limits](managed-ado-alternatives.md) are recorded.
CLI performs pinned process acquisition, signed token and exact resource validation, but rejects
macOS/Linux before acquisition because cache isolation is unqualified. PAT uses the distinct
pinned Basic path, protected owner entry, exact user/organization verification and expiry guidance.
No live credentials, consent, PAT issuance or workstation.example.test schedules changed. Deployment remains held.

## Local login testing authorization

The operator now authorizes testing ADO/Jira login locally before another package or Work Mac delivery.
Use the separate protected-storage Authentication Preview, not the mock-keychain Design Preview.
The fresh Atlassian setup form is open; no connection definition, consent or credential has yet
been supplied. ADO alternatives now have source implementation; live qualification remains pending. Local testing does not lift
the deployment hold or authorize modifying workstation.example.test schedules/authentication.

## Current operator scope — feature expansion; build/test only

The operator authorizes the additions below and explicitly holds ALL further deployments. This
supersedes the prior digest-first feature restriction and iterative installation authorization.
Continue on the single nov5-release branch. Build/test isolated desktop, web and iPhone/iPad
previews; do not publish, install over production apps, change live schedules/auth or dispatch
updates. Mac candidate 2 is signed locally but not uploaded/delivered/installed. Candidate 1 stays
on Work Mac. The earlier idle-blocker question is historical, not new deployment authorization.

| ID | Requested work | Acceptance |
| --- | --- | --- |
| N1 | iPhone/iPad browser performance | Measure WebKit scrolling/input/frame and payload costs on representative remote views; fix reproduced choppiness and record device/simulator limits. |
| N2 | Remote chat/tab control reliability and speed | Lost-response/reconnect/rapid-selection fixtures, stable IDs, exact-once mutations, no stale state overwrites. |
| N3 | Relay data efficiency | Measure method/byte/serialization costs; scope state and send necessary deltas only; no unrelated chats, full histories or repeated media on idle. |
| N4 | Remote update approvals | Verify purpose:update captures narrow future-operation authority once, without per-tool/chat reapproval; retain idle barrier and never approve unrelated pending requests. |
| N5 | Web feature/style/fix parity | Compare desktop and web against an explicit feature matrix; local authenticated acceptance before any later deployment. |
| N6 | iPhone feature/fix parity | Compare native mobile actions/state/recovery against desktop; shared simulators and isolated synthetic owner tests. |
| N7 | Larger desktop/web tab overview | More usable viewport area and legible previews, responsive layouts, keyboard/touch navigation. |
| N8 | Project/workspace card parity | Match desktop hierarchy, formatting and sizing across web/remote, with responsive mobile adaptation. |
| N9 | One completion notification reaching iPhone | Deduplicate by actual run completion event through owner/relay/APNs paths; verify foreground/background boundaries without claiming simulator proof of physical push. |
| N10 | File viewer images and Obsidian Markdown | Extend the existing viewer/authorization boundary for standalone filesystem image links; structured frontmatter, Markdown and wiki links with safe scoped resolution and no ambiguity guessing. |
| N11 | Workspace file browser tab | Configured workspace folders/sources only; lazy directory drilldown and bounded cancellable filter search; filename/type/size/created/modified columns and icons; open supported images/Markdown; compact margins and right-side selected-file preview; release preview on selection change and stop work when unloaded/idle. |
| N12 | Restore Proteus Design Preview | Separate data/browser identity, synthetic fixtures for new features, no production changes; validate the actual UI and retain a reviewable preview. |
| N13 | Accounts & Integrations design | Managed MCP first, generous card spacing, bundled service logos, clear account/health/actions, responsive shared styling and isolated preview verification; no deployment. |
| N14 | Reliable question navigation | First click waits for existing history loads, reveals the selected question and focuses its answer; later navigation/input cancels stale focus. Desktop and remote shared behavior. |
| N15 | iOS Answer question navigation failure | Operator reports tapping Answer question does not navigate to the question in its chat. One tap must open the correct chat, load/reveal the exact question (including older paged history), and focus its answer field. Preserve drafts and reading state; cancel stale jumps after another navigation. Verify on iPhone/iPad; desktop/web N14 evidence does not establish native iOS acceptance. |

### Current source checkpoints

See [the client feature matrix and evidence](nov5-client-feature-acceptance.md) for the new
file browser, image viewer, Properties/wiki links, larger overviews, completion notification
correction and native question focus. WebKit phone/tablet engine checks and native iPhone/iPad
question tests pass. Physical push and native workspace-file parity remain explicitly open.


N15 is implemented and passes one-tap answer-focus tests on the existing iPhone and iPad
simulators. Older-history/cancellation source paths preserve the exact request identity.
Physical-device acceptance remains separate. Deployment remains held.

N13 Connections redesign is implemented and exercised in disposable Electron at desktop/tablet/phone
widths; local web build and static checks pass. The final regression suite including the question
fix passed 1,641 tests with four skips using a short canonical temporary root. A default Mac temporary path
run exposed fixture alias/socket-length assumptions; no production guard was weakened.
Design Preview is open independently on Accounts & Integrations. Populated cards were tested
with synthetic accounts; no live connection or authentication changed. This is the earlier
checkpoint; the current N1–N12 source and acceptance distinctions are in the matrix above.

The operator confirms no new Entra public-client registration will be available. It is no longer a
waiting prerequisite for this workflow. [ADO alternative qualification](ado-authentication-alternatives.md)
records the explicit CLI/no-fallback route, cache protection/isolation caveats, and the pinned
server's distinct PAT/Basic path. Neither alternative is installed or live accepted; auth and
all further deployment remain held.

N14 first-click navigation passes desktop and authenticated web relay fixtures with an earlier
history read already in flight. Later input cancels stale focus; drafts, attachment consent and
uncertain-answer delivery identity are preserved. A second reproduced defect accumulated draft
status rows and polling timers on keyed web renders; replacement now retains exactly one binding.
The phone-width transcript remains usable. Long-history desktop acceptance passed 2,507 events.
These are synthetic source/UI checks, not installed acceptance; deployment remains held.

### Audit of prior scope at expansion

P3 publisher custody, P4 journal diagnostics/compaction, P5 send-display recovery, P6–P10 source
reconcile/scoped execution/catalog recapture/status and P11 allowance explanation have source
implementation and tests. Idle download rules, pollable maintenance, private Windows TEMP and
navigation difference receipts are implemented. This does not imply all-platform installed proof.
Linux document association/reopen fixes are integrated; rollback attention review and historical
window-closure attribution remain open. Windows installed terminal rendering/UIA acceptance is
unresolved. Web P1 authenticated acceptance and P2 reusable retention remain open.

P12 managed connections are implemented but NOT fully accepted: Work Mac candidate1 is healthy;
two scheduled Terra-low empty-inbox runs passed without prompts and preserved enabled/history.
Optional missing connections allowed provider continuation, but a chat-only auto-approval later
released the integration-list fixture; that is not saved-policy prompt-free acceptance. Managed
Atlassian startup failed before the browser, with cause swallowed by candidate1; candidate2 adds
sanitized diagnostics but is now held from deployment. A direct operator click also produced no
browser or popup. Correction acceptance requires visible startup stage/error feedback and a
verified browser launch, with secret-free diagnostics and no automatic sign-in retries. ADO public-client registration is unavailable; alternative CLI/PAT qualification is tracked above. Nonempty inbox, managed planning/digest and complete repeated-evidence
acceptance remain open. Track captured initial gaps separately from later registry state.

## Earlier delivery order — superseded by the build/test-only hold

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

## Nov 5 remote journal capacity source work

Owner-wide scoped chat diagnostics expose aggregate receipt bytes/counts by method, pending
counts, capacity warning and next expiry without keys or payloads. Older owners report unsupported;
no credential extraction or private-file inspection is required. Legacy methods remain unknown.
Completed large receipts now use integrity-checked lossless compression in the journal transaction,
including existing completed records at startup. Exact outcomes and unknown fields replay; unresolved
claims and retention windows remain intact. Older SQLite readers see an uncertain receipt and cannot
repeat its effect. Downgrade therefore limits replay of compacted results; retain the current reader
or use the normal verified recovery snapshot. Compaction is not secure erasure or disk-space recovery.
Work Mac live measurements and candidate installation remain pending.

## Nov 5 optional connection compatibility

Source fixes persist optional readiness exceptions and denied/missing selections as sanitized
coverage gaps exposed in selected-run integration status. Empty workspace categories capture
identity/revision without evaluating unrelated defaults. organization workflows reports 105 source tests passing;
live schedules/authentication remain untouched. Signed candidate and installed two-run acceptance
remain pending. See the managed connection contract for the unchanged export schema.

## Agent communication preference — instruction update

The operator selected guidance rather than forced automatic delivery. Shared agent orientation
and the chat tool describe explicit steering as the preferred choice for relevant updates to
running, steer-capable chats. Queue separate/deferred work, idle/unsupported destinations and
next-turn model changes. Preserve pending human approvals and uncertain-delivery receipts.
Source guidance is updated; runtime defaults, mode enum and feedback routing are unchanged.

## Nov 5 managed ADO source checkpoint

Both initial adapters now have owner controls and scoped runtime paths. ADO uses protected MSAL
public-client credentials and the pinned server envvar mode, never a CLI/developer-account fallback.
Exact corporate identity/organization and bounded capability probes are required. Full suite:
1,627 pass/four skip/zero fail; static checks and disposable Electron UI acceptance pass. Real SDK
protocol and server catalog fixtures pass without corporate credentials or business data.
Remaining: dependency advisory qualification, complete remaining release plan, signed candidate,
then actual organization workflows acceptance. Work Mac has no documented approved Entra public-client registration;
owner/admin approval is a live setup prerequisite. No package or installation exists.


# Nov 5 release plan

Migrated from the Nov 4 plan on November 5, 2026. All queued scope and historical observation dates below are preserved. The operator lifted the build hold on November 5; the current authorization below supersedes historical holds.

## Current operator authorization — build and digest acceptance iterations

The operator explicitly lifts the Nov 5 build hold. Include every item already in this plan plus
the consolidated additional requirements from the Work Mac digest workflow. Nov 3 is closed.
Coordinate directly with that workflow owner, complete implementation and required checks, build
and publish accepted signed artifacts, deliver the Mac release through a separate receiving-owner
update coordinator, and iterate on defects or missing capabilities until the workflow passes.
Further unrelated feature additions wait until this digest acceptance cycle is complete.

Use the single nov5-release branch in the primary checkout. No additional worktree is needed
unless delegated work requires one. Existing privacy, signing, source/test, preservation and
receiving-owner installation requirements remain in force. The digest workflow owns its manifests,
schedules and business data; this coordinator owns product changes and release delivery.

Before freezing the package, reconcile Work Mac's consolidated handoff with this full plan. P6–P10
and document-origin preservation have source acceptance; the other planned items are not thereby
complete. Installation and model completion alone do not establish workflow success. Require
actual source refresh, revision-preserving source reconcile, unchanged enabled state/history,
captured scoped permissions, a complete prompt-free workflow, independent output checks and a
second no-new-evidence run. Keep one version for this release and distinguish each immutable
candidate hash and acceptance outcome. Historical holds and digest-only recommendations below
are superseded by this authorization; Mnemosyne remains deferred.

## Source integration and checkout cleanup — November 5

The single release branch is `nov5-release` in the primary checkout. All four remaining older
worktrees and two separate obsolete release clones are retired; their commits were already in
main. Small dirty patches and historical evidence are preserved privately, with the browser-sizing
fix confirmed already integrated. Unused dependency caches were retired after dependency-link and
active-process checks. No additional worktree is retained.

Linux document-preservation source `160b647` is integrated as `63bfa6f`: stale window snapshots
retain the same document origin, all saved aliases regain the binding, and explicit reopening
reuses its existing destination descriptor. The updater preservation gate and authorization remain
unchanged. This addresses the association-loss and duplicate-destination failures below; it does
not claim to diagnose every historical closed tombstone or add the other queued receipt controls.
Integrated source validation passes 1,552 tests with four skips and zero failures, plus static
checks. Disposable Mac acceptance also passes startup, Reload Window and cold restart. Packaging, Linux
installed acceptance and the existing attention/rollback receipt remain outstanding.

## Current release prerequisite — November 5 closeout

Nov 3 is now closed; see [its closeout](releases/2026-11-03/closeout.md). Its release prerequisite
is satisfied. The following hold text records earlier instructions and is superseded by the
explicit build/iteration authorization above.

## Historical operator hold — November 5, 2026

- **Nov 3 must close first.** Nov 3 / 0.2.42 remains open. Do not build Nov 5 changes or open/reserve the next release until Nov 3 closeout is verified. The November 5 operator follow-up authorizes finishing Nov 3 publication, installation checks and closeout; it does not mark them complete.
- **Wait for the daily-digest improvement chat.** Hold pending further instructions from that chat; capture any needed Proteus changes here as queued scope when its handoff arrives. The automation audit handoff has been received; its scoped unattended-execution requirement is now explicitly a hard blocker for fully automated synthesis. Only that blocker scope may use the narrow exception after Nov 3 closeout; no build starts while Nov 3 remains open.
- **Build hold stays in force until the operator explicitly lifts it.** Routine requests, a completed chat, or Nov 3 closeout alone do not lift the hold.
- **Narrow exception:** if the daily-digest chat explicitly identifies a change as a blocker on its end, record the blocker and exact required scope. The operator permits that blocker-specific exception to the digest hold; it does not lift the hold for other changes or bypass the Nov 3 closeout prerequisite.
- No implementation, packaging, publication, installation or build dispatch is authorized by this plan migration. Continue collecting planning updates while held.

Once Nov 3 is closed and the applicable hold is lifted or its explicit blocker exception applies, open Nov 5 once through `scripts/release.mjs open` to reserve the next version. Do not reserve a version during this hold.

## Update-blocking rules

The operator's rule: only a download that is actively transferring data blocks an update. A paused or interrupted download must not.

Today `desktop/main.cjs` reports "A browser operation or download is active." whenever any tab has an agent action in flight (`tab.agentActions`) or any entry in `tab.downloads`. The `downloads` set is only emptied when Electron fires a download's `done` event. A paused or interrupted download that never fires `done` therefore blocks forever.

Change, with tests:

1. Count a download as blocking only while its state is `progressing` and it is not paused (`item.getState()` and `item.isPaused()`). A download that is paused, interrupted, cancelled or completed does not block, and its file and row are left alone.
2. A hung agent operation can block just as indefinitely: on Nov 4 one Zoho Assist tab held `agentActions` for about 16 hours until a tab was closed. Add a stall timeout: an agent operation with no progress for a bounded time (propose 5 minutes) stops blocking idle and is reported as stalled rather than active.
3. Name the blocker. The idle report should say which tab, whether it is a download or an agent action, and whether it is progressing, so nobody has to hunt through windows.
4. A running chat or terminal and any other existing idle rule are unchanged. Updates still never cancel unrelated work.

Acceptance: regressions for a progressing, paused, interrupted, completed and cancelled download, and for a hung and a progressing agent operation, in a real Electron window; the blocker text names the tab and kind.

## Process issues to resolve

### P1 — Web release has no signed-in acceptance

What happened on Nov 3: the website deployed with its own audit passing, but nothing exercised the new remote web client as a signed-in person would. The new client runs its transport in a Web Worker, and the page's Content-Security-Policy and the worker file's own headers were checked only by reading them. Ordinary isolated restore also failed, as on Nov 2, and activation used the captured-state verifier instead, so what the audit proves about a restored site is limited.

Why it matters: a worker blocked by policy, or a client that fails to connect after login, would look healthy to every automated check we run and fail for you first.

To resolve:
1. A repeatable authenticated acceptance step the deploy runs or a person runs in minutes: sign in with a disposable test account or the operator's own session, load the remote page, confirm the worker starts, the client pairs with a synthetic owner, state arrives, a message round trip works, and the browser console shows no policy errors. It must not read or print credentials.
2. Run the same check against the local build before deploying, so a policy or asset problem is caught before production.
3. Find out why ordinary isolated restore fails (the recorded ValueError) and fix it, or decide in writing that captured-state verification is the permanent standard and say what it does and does not prove.
4. Record the result in the website release record, separately from "deployed".

### P2 — Server cleanup is manual and tied to one release's exact files

What happened on Nov 3: the deploy added a server code generation and a server recovery, so the server probably holds more than the policy allows (one verified backup, current code and one previous). Retiring the older ones needs the server's root shell with hashes pinned for specific releases. The Nov 2 retirement script names Nov 2's exact generations, so it cannot be reused, and the deploy client only cleans local recoveries. The local build tool also refuses to build when more than two code archives exist, which forced a manual deletion of an archive on Nov 3.

Why it matters: server disk was exhausted once before (October 23, causing an HTTP 500), retention is policy, and a manual root-shell step after every release is where mistakes happen.

To resolve:
1. First, inventory the server now (code generations, recovery directories and transports, free space) and record it without deleting anything, so the cleanup is reviewed against facts.
2. Make server retention a reviewed, repeatable step: it takes the live and previous release from the receipt rather than hard-coded names, verifies each retained item's hash first, retires only older ones, writes a receipt, and refuses to run if any check fails. Dry-run output first, then an apply step bound to the exact plan, the same shape as `desktop-publication.mjs`.
3. Do the same for local code archives and build folders: retire on acceptance as part of the deploy, so the next build is never blocked and nobody deletes files by hand.
4. Report actual free-space change separately from logical bytes.

### P3 — The Build Mac must be the release authority, not a Windows builder

Operator rule: the Build Mac, not any builder, is the authority for releasing packages. No release may depend on a Windows build, or on a Windows machine being reachable, for signing, staging or publishing.

Nov 3 starting state: the Ed25519 publisher private key (public key ID `92b49fc0…`) exists only on the Windows builder. The build operation configured there signs at the end of its own build, so a platform build and the release authority are the same chat. On Nov 3 an unanswered approval prompt on that machine, then a Windows build that stopped itself rather than sign, left the already built and accepted Mac package unpublishable for hours, and pushed Work Mac onto a one-off private transfer. The reason the key lives on Windows is not recorded; it appears to be history.

How verification works, which constrains the fix: installed apps and the website verify a release manifest against public keys bundled inside them (`resources/desktop-release-keys.json` and the app's own copy). An app only trusts keys it already shipped with, so a new key cannot be used until a release containing it has been installed everywhere that must verify the next one.

Target design:
1. **Builders only build.** A native builder produces the package, its source companion and an unsigned manifest payload, runs acceptance, and hands the exact bytes over. It never holds the key and never signs or publishes. The Windows build operation's signing step is removed or disabled by default.
2. **The Build Mac signs, verifies, stages and publishes.** It holds the key, runs `sign-desktop-payload.mjs` and `stage-desktop-distribution.mjs`, verifies the result against the bundled trust, and deploys to downloads.proteus.example. It also keeps the release ledger.
3. **Hand-over is a private draft with hash checks,** as the Nov 3 HC transfer did, not text in a chat. Chat-returned base64 corrupted a signed envelope on Nov 2.
4. **Platforms publish independently.** Today staging a subset gives every other platform an empty catalog, so one late builder blanks everyone else's updates. Replace that with an explicit "pending" state per platform that keeps the previous valid entry, so consumers can neither select a superseded version silently nor lose updates entirely.

Key custody decision: the operator chose Option 2 (new Build Mac key), then reaffirmed that
Build Mac is source authority and signer for all built software. Builders must not remain
signing authorities. Complete a trust-preserving transition with signing on Build Mac; any
legacy-key transfer is a protected one-time custody operation, never chat text or Git. The older
options below explain the tradeoff, not an outstanding approval request.

Current source/custody checkpoint: both Mac keys pass signing proofs and protected local recovery
readback. Windows active legacy key and signing reference are removed with a verified owner receipt;
its installed old builder fails closed. Unsigned builder exports and Mac-only signing helpers pass
source tests. Pending platform catalogs retain explicitly supplied prior signed artifacts without
changing their bytes, and the UI requires an explicit previous-version choice. Full suite: 1,589
pass/four skip, static checks and disposable Electron acceptance pass. A full signed release and
consumer transition remain pending; these checks do not establish installation acceptance.

Original options:
- **Option 1, move the existing key.** A one-time, operator-authorized move of the current private key to this Mac's protected storage (an owner-only file outside every checkout, with a Bitwarden recovery record), then verify it signs a test manifest that the existing trust accepts, then retire the Windows copy and record that it was removed. No release needed and no trust change. The cost is that the key travels once, and copying a signing key is exactly the risk to avoid.
- **Option 2, rotate to a new key generated on this Mac.** The private key never leaves it. Ship the new public key in a release signed by the old key (one last use of Windows or of Option 1), wait until every target runs that release, sign with the new key from then on, and retire the old one. Nothing is copied, but there is a transition period and a release to ship first.
- Recommendation: Option 2 if the old key can be used once more under supervision, because it ends with a key that has only ever existed on the authority machine. Choose Option 1 only if rotation cannot wait.

Acceptance:
1. A full release (Mac, Linux, Windows) signed on the Build Mac with the Windows builder powered off.
2. Staging and verification pass against the bundled trust, and a consumer completes a real update from the published release.
3. A subset publish, such as Mac only, leaves the other platforms' catalogs valid.
4. The private key's location, permissions and backup are documented without its value or path details in Git.
5. Nothing in the release process names a builder as an authority; `docs/release-process.md` is updated to say so.

### P4 — A remote computer's command history fills up and blocks dispatch

On Nov 5 Work Mac refused every command, including an authorized update, with "Remote command history is busy: 268,496,545 / 268,435,456 bytes; 0 unresolved". It keeps every received command's receipt for 24 hours and caps the total at 256 MiB. Receipts of large results, such as tab-list replies with long browser histories, evidently fill it, and nothing drains until entries age past 24 hours. This blocks dispatch and probably also tab sync to that computer.

To resolve: find what dominates the bytes, using the diagnostics the journal already exposes, and measure it on a real owner rather than guessing. Keep retry protection but do not store full large results in each receipt (store a digest and size, since a retry needs the outcome, not the whole tab list). Warn before the cap is reached, so it shows in the owner's status and in a dispatch error that names the cause and the time until space frees. Test that existing claims still complete and retries still return the original outcome. Also confirm the activity-write change in 0.2.42 actually reduced this on a live owner.

### P5 — Sending a message shows "State display is temporarily unavailable", and the message is missing for a while

Reported by the operator on Nov 5, on the Build Mac running 0.2.42: every time a message is submitted in a chat, a toast reads "State display is temporarily unavailable. Retry the refresh." and the submitted message does not appear in the history for some time. It happens on every submit, not occasionally. Whether it began with 0.2.42 or earlier is unknown.

What the code shows: the text comes from one place, the `/api/state` endpoint in `src/server.js`, which returns HTTP 503 from a catch-all around building and serializing the whole app state. That state is assembled by a projection worker (`src/services/state/state-projection-client.js`) that has a 15-second timeout, a bounded number of pending snapshots and deliberately no synchronous fallback. So any error, timeout or overflow in that path becomes this same message.

Two facts that make it hard to diagnose today:
1. The catch discards the underlying error. No log entry records it. A search of this owner's log found no related entry, so the cause cannot be read back from it.
2. After a send, the app asks for the full state again. If that refresh fails, the chat is not updated from the send's own result, so the user's message stays invisible until a later refresh succeeds. The message was presumably sent; that has not been checked.

Not yet established: whether the worker is timing out, refusing a pending snapshot while another is in flight (a send triggers several refreshes at once), or failing on something in the state. This owner holds 148 chats, 8 workspaces and 239 tabs, so size is a suspect but unproven.

To resolve:
1. Log the real error, with its cause and the worker's pending count and elapsed time, content-free, before changing anything. Reproduce on a copy of a large owner, not guess.
2. Find the cause and fix it, for example coalescing overlapping state refreshes so a send does not queue several full snapshots, or keeping the worker from rejecting while a prior one runs.
3. Make a send independent of the full refresh: show the submitted message immediately from the send's own response (optimistic display with its retry identity), and reconcile when the refresh arrives. A failed refresh should never hide a message.
4. Make the toast useful: say what failed, retry automatically with backoff, and clear itself when the retry succeeds.
5. Regression: submit messages in a large synthetic owner, with the state worker forced to fail and to be slow, and verify the message appears at once and that no duplicate is created on retry.

## Carried forward

- Linux renderer-crash recovery fails on the unmodified baseline and is unexplained (see the Nov 3 Linux qualification).
- iOS physical-device responsiveness, gestures, push and reconnect remain unverified.
- Mnemosyne work stays deferred.
- Any Nov 3 item left open at closeout, including the relay deployment and server retention.


## P6 — Schedule configuration inspection and preview

The automation-audit workflow reports saved-only reads, opaque permission/workspace-reference
schemas and no source discovery or change preview in the schedule tool. Source inspection
confirms these gaps. The workflow owner explicitly says this is not a hard blocker requiring
a build; the existing hold and Nov 3 closeout prerequisite remain unchanged.

Source work is isolated on branch nov5-schedule-visibility. It adds saved/resolved configuration
inspection, scoped source metadata paging, typed permission/reference schemas, non-writing
change preview, start-preflight configuration in test receipts, and consistent list/read revisions.
The current supported schema and installed-version workaround are documented in
schedule-tool-configuration.md on that branch. Workflow manifests, customer data, live schedules,
enabled state and unrelated runs remain with their existing owner.

Acceptance: synthetic revision/permission/preview/history tests plus the required full source
suite and static checks; future installed acceptance must verify actual captured runs and workflow
outputs separately. No packaging, publication, installation or real workflow acceptance is claimed.


### P6 source validation

Ten focused schedule-control tests pass. The full suite passes 1,542 tests with four skipped
using a short canonical temporary root; static checks pass. The initial default-temp run had
11 path-alias/socket-path failures, all independently reproduced on unchanged Nov 3 source.
No package was built, no installation changed and no real unattended workflow was tested.
These historical results apply only to P6; the later checkpoint below records implemented P7/P8.


## P7 — Source-aware schedule reconciliation (implemented in isolated source)

The workflow owner confirmed that editing and validating its canonical manifest still leaves
tool update blocked by source ownership. The installed CLI refresh validates exported schedule
JSON and matching source.system/source.manifest, captures its own save revision, preserves
history, and always pauses. It has no caller-supplied expected revision or keep-enabled option.
The local editor supports revision-checked exported-record saves, but does not verify provenance;
the remote editor refuses source-managed writes. None satisfies the complete requested contract.

Add a supported owner reconciliation path shared by tools and UI/CLI: accept the workflow's
validated export with explicit source identity and manifest/export hashes, require the caller's
exact current schedule revision, preview the proposed changes without writing, and reject stale
or mismatched evidence. Foreign manifest validation remains with its workflow owner; Proteus
must verify its declared provenance without invoking arbitrary exporters or claiming to understand
foreign schemas. Preserve current enabled state by default, unknown fields, prior runs, captured
settings and history; require an explicit separate choice to change enabled state. Permission
changes retain schedule-configure-permissions checks and ordinary owner authorization. Return
a durable reconciliation receipt and resulting revision, then verify a real captured test run.

Do not work around the source guard with raw app-data edits or a generic schedule API call.
No live organization workflows schedule mutation is authorized for this coordinator. The latest acceptance
handoff identifies source reconciliation as a hard unattended-workflow blocker, alongside P8.
Nov 3 closeout and the existing build hold remain release prerequisites.

## P8 — Scoped unattended workflow execution (implemented in isolated source; hard workflow blocker)

The current Codex adapter fixes native approvalPolicy to untrusted and network access to false.
Native trusted reads may proceed, but explicit filesystem grants do not authorize dynamically
generated shell commands. Custom mode matches exact operation rules; no workflow-scoped dynamic
shell execution mode exists. Do not promise unattended synthesis from a list of exact commands.

Define an explicit workflow permission profile that supports normal read/edit/research work
inside reviewed filesystem and network boundaries, with enforcement by the actual provider
sandbox and owner, capability checks, inspectable effective settings, and captured-run evidence.
Distinguish working roots, read/write grants, selected tool/action rules, network destinations and
workflow execution authorization. Fail closed for unsupported provider capability, changed
workflow/source identity, scope escalation or access outside approved boundaries. Prove that
variable commands within scope work while writes/reads/network access outside scope cannot gain
permission from their executable name. No blanket interpreter/prefix approval, sandbox bypass,
automatic approval of pending requests, or weakening of protected credential boundaries.
A constrained workflow entrypoint is an interim option only when it performs the complete
authorized operation; it is not a general dynamic-command approval policy.

Workflow/manifests and customer-local testing remain with the automation owner. The later operator handoff identifies this as a hard blocker for fully automated synthesis. The narrow blocker exception remains subordinate to verified Nov 3 closeout; no build or deployment is authorized while Nov 3 remains open.


## November 5 — scoped capability implementation checkpoint

P7 now has preview-reconcile and reconcile operations. They validate exported Proteus JSON,
matching source identity and exact manifest/export hashes; the foreign manifest validator remains
with the workflow owner. Caller revision, permission-configuration scope, preview digest and
durable operation receipt gate the write. Enabled state, unknown fields and prior runs/history
are retained. Source files are reread after asynchronous preflight.

P8 adds explicit executionPermissions.sandboxedCommands for Codex custom mode with explicit
folder grants. Native on-request approval lets variable commands run inside a restrictive
permission profile; root/temp access is denied except granted paths and public runtime reads.
Command network access stays disabled. Research uses separately authorized MCP connectors.
An exact named tool grant or explicit readOnlyTools policy permits its selected server connection.
Native calls use actual connected thread-scoped catalog annotations; only unambiguously annotated
non-destructive reads qualify for read-only authorization. Writes and unknown tools retain approval.
No interpreter/prefix grants, auto-review or pending-request approvals are introduced. Runtime
profile identity, selected roots, approval policy and network state are checked before a turn.
Changed permission mode or conflicting native profile configuration fails closed.

The real Mac native sandbox probe (no model turn) permits an in-scope write and rejects outside
read/write, a symlink escape, read-only child writes, .git writes and a live local test connection.
This is source/native-boundary acceptance, not a real organization workflows workflow run or cross-platform proof.
Other operating-system and installed end-to-end acceptance remains required before claiming it.

### P9 — Real catalog rescan and unsent-create recapture

Partial discovery previously reused a stale hash when a shared source remained under another
root. Discovery now rereads the bytes. Schedule refresh-catalog rescans the base and referenced
workspace catalogs without changing schedule selections; refresh-sources uses that same rescan.
A chat recapture action requires an ordinary create task and stable new operationId. The owner
must retain the exact settled pre-create source-hash rejection; pending, absent or successful
original receipts are refused. It rescans, captures fresh sources, and claims one durable logical
create before delivery. Original task/error/attempt evidence stays retained. Both encrypted
transport retry and lost-reply recovery verify one created chat. A genuinely uncertain claim
requires review and is never silently replayed. No existing live task is recaptured by this work.

### P10 — Bounded schedule run status

Status now sorts newest creation time first and honors limit/cursor with a stable snapshot guard.
An exact runId still returns that run. No pending permission, enabled state or unrelated run is
changed by reading status.

### Workflow acceptance handoff

Workflow source tests and real managed connector reads establish preparation and credential
availability. They do not satisfy installed acceptance. Existing schedules remain enabled on
their original provider settings, and the planning fixture's native approval remains unanswered.
After authorized installation, verify real catalog refresh, revision-preserving reconciliation,
retained enabled state/history, complete prompt-free Codex workflow execution and a second
no-new-evidence run. Verify workflow outputs independently of model-turn completion.

Final isolated-source validation: 1,548 tests pass, four skip, zero fail; static checks pass.
Native synthetic Mac sandbox and MCP-catalog probes pass without a model turn. No installed
workflow success, cross-platform acceptance, build, publication or deployment is claimed.

## Carried over from the Nov 3 closeout

Found during the Nov 3 rollout on November 5. Planning only; scope is recorded, nothing is authorized.

- **Linux 0.2.42 install rolled back (needs a product fix first).** The preservation check timed out
  twice on "Saved tab membership, order, descriptors or closed identities changed during upgrade".
  The local diagnosis: a document tab's registry entry carried `chatId` and `associationChatId`, the
  saved window descriptors did not, and restore rewrote the registry entry without them (revision
  33 to 34). Required: (1) restore must not strip registry-only descriptor fields from document
  tabs, with a regression that restores a window whose saved markdown descriptors lack them;
  (2) the update preservation receipt records the found inventory and the specific difference, not
  only expected scopes and a generic error; (3) a rolled-back job left in `attention` needs a
  supported review-and-clear path (the owner currently refuses reconciliation and maintenance
  reports `canApply:false`); (4) reopening a document should re-associate an existing tab instead of
  failing with "Destination already contains this tab or is full."; (5) explain the unattributed
  closure of a window on that computer (three closed tombstones, no actor in any log). The Linux
  package built at `568705c` stays deferred until a fixed build ships.
- **Mac and Linux are not published to downloads.proteus.example.** Their publisher signatures can only come from the
  Windows builder; only the Windows 0.2.42 release is published. This is the same authority problem
  as the Build Mac authority item above, and it blocks `current.json` from advertising one
  consistent release.
- **Windows owner single-flight.** The owner rejects an update call while another (for example a
  maintenance inspection of 25 to 60 seconds or more) is running with "Another update operation is
  running", `status` does not expose the busy flag, and the Codex provider shows only "dynamic tool
  request failed". Expose the busy operation in `status`, make a rejected call return the real
  message, and give maintenance a progress or wait handle instead of a yielded cell.
- **Windows owner builds cannot override TEMP.** The default TEMP carries extra access grants that
  the private-storage check rejects, which hung the source suite when a fixture created its home with
  a plain temp directory. Add a private-temp override to the owner build request, and a source-suite
  per-test timeout so a rejected start fails fast instead of hanging. Audit remaining fixtures that
  create homes without the private temporary directory helper.
- **`desktop-package-ui` fails on the Windows extraction.** The terminal canvas was not visible
  (second run, line 108; the Nov 2 baseline fails earlier at line 91, so the comparison is
  incomplete). Both Windows computers reported health verified, but terminal rendering in the
  installed app was not confirmed. Investigate whether the terminal renders in the installed app.
- **Desktop Control Verify on a remote Windows session.** On one computer Verify passed discovery,
  permissions and window listing but the observation returned no UI Automation tree; on another the
  update chat's tab inventory returned zero tabs for the owner window. Determine whether these are
  session or scope effects and make the update coordinator's post-install receipt include the
  preservation counts it needs.
- **Server access.** The release identity now reaches root-only work through an audited, hash-bound
  wrapper over SSH and `sudo` (documented in `docs/release-process.md`). Replace the per-release
  retention helper with a reviewed, reusable one in the private deployment workspace, and add the
  Webmin zero-width-tab and Command Shell quirks to the operator runbook.

## November 5 transcript reconciliation and digest-first sequence

Reviewed the complete Nov 3 coordinator transcript through its final rate-limit failure and
compared it with commit 2519241. The final carry-over list was saved before the failure; it is
now also retained in the isolated Nov 5 implementation branch. P1–P5 and the update-blocking
rules already cover the earlier requested follow-ups; the carry-over section preserves the
later Linux, Windows, publication and server-process findings.

Fresh receiving-owner evidence confirms the second Windows consumer installed 0.2.42 with
verified health. Its independent post-install check still reported zero visible owner tabs,
no exposed expected/found preservation receipt, no UI Automation tree and unverified terminal
rendering. Treat this as an unresolved acceptance discrepancy, not proof of data loss or full
acceptance. Publication also remains incomplete: the public current descriptor still advertises
Nov 2 / 0.2.41, and the Nov 3 PR remains open. Finish these before closing Nov 3.

Recommended first Nov 5 package: the already implemented P6–P10 digest controls only, rebased
onto closed Nov 3 and validated before packaging. P7/P8 block unattended acceptance; P6/P9/P10
provide configuration visibility, real source refresh and run evidence needed to verify it.
Publish the accepted Mac artifact once and install it on the digest owner through its update
coordinator. Then its workflow owner reconciles the prepared canonical exports and verifies
a prompt-free workflow plus a second no-new-evidence run. Keep unrelated feature work queued
until this acceptance is complete. No Nov 5 package or installation has started.

### P11 — Explain provider allowance failures

The Work Mac verification continuation failed immediately with Claude rate_limit. Source inspection
confirms this is a native Claude assistant error passed through by Proteus, not a locally imposed
release throttle. The transcript exposes neither the allowance window nor reset time. Improve
the displayed cause, account/model context and provider-supplied reset/retry details; distinguish
subscription exhaustion from temporary request throttling. Preserve retry identity and completed
external work. Provider fallback must be explicitly selected/authorized, never silent. Keep
this diagnostic work outside the digest-only first package unless needed for its acceptance.

## P12 — Managed MCP connections and authentication

The digest workflow handoff adds a provider-neutral connection manager. Proteus owns versioned
connection definitions, credential adapters, auth renewal, bounded reconnection and health;
organization workflows declares portable logical names, required semantic capabilities and expected account/resource
bindings. Initial connections are ADO and Atlassian; Slack remains browser-only.

Required product boundaries: immutable connection IDs separate from labels; explicit owner/workspace/
account binding; captured configuration revisions; pinned connector launches; a host-managed
authenticated transport actually used by both Codex and Copilot; per-chat tool policy isolation;
no token tools or secrets in prompts, logs, argv or ordinary configuration; no replay of uncertain
writes; OS-protected storage by default with optional Bitwarden, failing closed when unavailable;
serialized rotation and durable rotated-token save before publishing a new access token;
separate per-owner grants or an explicit single writer for cross-machine refresh credentials.

Expose connection, identity, authentication, capability and resource-access evidence separately
in visible status. Use bounded/coalesced health work and actionable human sign-in requirements.
Preserve current working credentials during local adoption or verified new consent. Do not
retire organization workflows helpers until the managed route passes live acceptance. No credentials or business
evidence transfer to the release coordinator is needed. The full Work Mac handoff is reconciled in [the managed-connection contract](managed-mcp-connections.md),
including connector-specific, migration and outage/repeat-run acceptance criteria. Existing integrations documentation describes older capabilities and does
not establish that this manager is already implemented.
