# Nov 6 update plan

Status: planned successor to Nov 5 / 0.2.43, closed 2026-11-06. Requested November 6, 2026.
Version: not reserved. Nov 5 closeout is recorded; open this release only on the operator’s next instruction;
leave current.json, package versions, accepted artifacts and in-flight update jobs unchanged.
This request creates the plan; it does not claim implementation, build or deployment.

## N6-01 — Complete managed Atlassian write access

The operator must be able to update Jira tickets and use all supported Atlassian operations their
signed-in identity can perform, across authorized projects and sites. Read/search-only behavior
is insufficient. Identity permissions are the service ceiling; selected connection scopes and
explicit chat/schedule operation permissions remain independently enforced.

### Existing implementation and observed gap

Nov 5 added read/write as the new-enrollment default and requests `write:jira-work` alongside
read/offline scopes. It deliberately did not upgrade existing read-only connections or consent.
However, managed-atlassian-probes.js defines only identity, resources, issue-read and issue-search
semantic capabilities; onboarding persists those capabilities and the status text describes only
read/search verification. This is incomplete capability modeling and presentation. The runtime
broker uses the connected tool catalog, so those four health capabilities alone do not establish
that every write tool is filtered out. Real managed Jira writes have not been accepted. Trace
actual OAuth consent, server catalog, provider exposure and effective run policy separately.

### Required behavior

- Guided setup clearly offers full account-authorized supported access and read-only access.
  Discover actual server capabilities and documented scope requirements; never imply one Jira
  OAuth scope covers all Atlassian products or administration operations.
- Existing connections show requested/granted access and a deliberate Upgrade access / Reauthorize
  route when consent is insufficient. Preserve stable connection IDs, workspace bindings and
  working credentials until replacement verification succeeds; do not silently expand consent.
- Expose supported Jira creation, updates, transitions, comments, links and other available ticket
  operations through the same authenticated manager to Codex and Copilot. Do not limit runtime
  tickets to health-check sample issues or a single project. Cover other identity-accessible
  Atlassian operations where the selected server supports them; report unsupported products,
  server tools, scopes and service restrictions explicitly rather than claiming full parity.
- Show write availability separately from read/search health: requested, consented, present in
  server catalog, permitted by run policy and actually verified. Read readiness is not write proof.
- Publish semantic capability/schema and portable manifest changes, with a preserving migration.
  Provide saved exact mutation rules for authorized workflows; read-only auto-approval never grants
  writes. A full-access connection is not blanket approval to mutate every resource.
- Preserve owner/account/site isolation, revocation and expiry behavior. Reconnect must never
  replay an uncertain write. Routine health probes remain nonmutating.

### Acceptance

1. Regressions cover new read/write setup, old read-only upgrade, missing/denied scopes, tool
   catalog differences, account/site restrictions and optional-connection gaps.
2. Verify actual mutation tool exposure and permission enforcement through both provider paths;
   annotated reads alone must not authorize mutation. Test expired-token recovery and uncertain
   write delivery without duplicate effects.
3. On an explicitly authorized test ticket, perform an update and independently read it back;
   restore the agreed fixture when applicable. Exercise supported comments/transitions and more
   than one authorized project. Record exact installed build and sanitized evidence. Do not use
   production tickets as implicit test fixtures or equate a successful model turn with a write.
4. Demonstrate guided reauthorization on an existing read-only connection without losing its
   identity, bindings, saved policies or usable prior authentication. Show honest capability state
   in desktop and web, keeping initial consent and credential setup on the owning computer.
5. Coordinate resulting contract with the existing organization workflows owner and retain its separate real
   workflow/no-new-evidence acceptance. No pending agent request is approved on its behalf.

## N6-02 — Reliable remote Allow and remember

Status: requested; not implemented or verified.

The operator reports that **Allow and remember** sometimes leaves the permission dialog and
pending approval visible when controlling an Work Mac chat from Build Mac. The supplied screenshot
shows the Remember permission dialog with This workspace selected over an owner-side
`proteus_desktop` / `verify` request. It does not establish whether the permission was saved,
whether the pending request was answered, or whether only the remote display failed to refresh.
Keep machine/chat identifiers and the original screenshot in private release evidence, outside Git.

### Required behavior

- Trace the full human action: selected scope and owner, durable permission save, exact pending
  request resolution, owner acknowledgment, remote state propagation and dialog dismissal.
  Report save and answer outcomes separately when one succeeds and the other does not.
- Offer only applicable scopes. An unassigned update chat must not accidentally save a workspace
  rule against the controller's workspace or an unrelated destination workspace. Preserve exact
  tool/action matching and the user's selected chat/workspace scope; do not widen grants.
- Show immediate in-progress feedback and a visible actionable error on rejection, timeout,
  disconnect or journal-capacity refusal. Do not leave an inert dialog or require unexplained
  repeated clicks. Keep pending approvals visible until authoritative owner resolution is known.
- Reconcile uncertain saves/answers with stable operation and pending-request identities before
  retrying. A retry must not duplicate tool execution, save extra rules, answer a newer request,
  or imply success from a local button click. Recover after reconnect/reload without losing state.
- Once the owner confirms resolution, clear the modal and approval card consistently in desktop,
  web and mobile remote views and display the actual remembered scope. Preserve drafts and
  reading position. If a different request is now pending, show that request distinctly.

### Acceptance

1. Reproduce the Build Mac to Work Mac human approval flow, including `proteus_desktop verify`,
   This chat and applicable This workspace scopes, and unassigned update chats. Use authorized
   disposable approval fixtures; agents must not answer another agent's live permission request.
2. Verify the destination's saved rule, resolution of the exact pending request, exactly one
   resumed tool action and prompt removal without an extra click. Confirm the next matching
   request uses the saved rule while nonmatching tools/actions/scopes remain protected.
3. Cover slow responses, disconnect/reconnect, journal-capacity rejection, save-success/answer-
   failure, double clicks, stale/replaced requests, and owner resolution from another client.
   Preserve protected/uncertain receipts. The recently observed journal capacity issue is a
   possible failure path to test, not an established cause of this reported UI symptom.
4. Verify desktop/web/mobile rendering against owner state, with useful sanitized diagnostics
   distinguishing saved, answered, acknowledged and displayed states. No permission bypass,
   blanket approval, unrelated cancellation or raw-store edit.

## Release boundaries

Nov 5 outstanding rollout/acceptance remains in its existing records; this plan does not close it
or silently move its unfinished work. Add further Nov 6 items explicitly as requested. Reserve the
successor version once, after Nov 5 closeout, using docs/release-process.md.

## Operator closeout boundary — after Nov 5 acceptance

The operator explicitly moves non-digest features/fixes, including Proxmox, into this successor
plan rather than another Nov 5 build. Finish existing updates and Work Mac digest acceptance first.
Do not reserve a new version or start this release until the current release is closed. Tested
preparatory ADO/network source changes are preserved as a checksum-verified private patch and
original files, outside the active Nov 5 checkout; they are not shipped or silently discarded.

### N6-03 — Proxmox and website network access

Native CDP session isolation and same-profile secure WebSocket certificate reuse shipped in
Nov 5. Live Proxmox remains open: the host resolves and accepts TCP, while the embedded browser
reports address-unreachable for both hostname and IP; public browsing works and the operator
confirms macOS Local Network is enabled. That does not establish a certificate or URL cause.
The current Electron website permission handler also silently denies its new local-network,
legacy local-network-access and loopback-network types. A prepared correction surfaces exact
origin/type/profile Allow/Block requests with local-only persistence, retaining OS permissions,
certificate decisions and agent-sharing boundaries. Focused source tests pass; installed native
permission delivery, Proxmox page load, actual noVNC connection and DevTools responsiveness must
be verified before claiming resolution. No VM input or session/certificate changes were performed.

### N6-04 — Guided full-family Azure DevOps and agent pools

Prepared source removes manual GUID entry from new PAT setup, discovers the actual identity,
organization and bounded paginated project list, and requires account/workspace/family review.
The official pinned MCP supports core, work, work-items, search, test-plans, repositories, wiki,
pipelines and advanced-security. Existing connections retain their four-family defaults; explicit
changes can preserve the existing PAT through a verified protected reference while keeping rollback
credentials. The issuer-managed profile does not invent granted scopes. Actual PAT rights and run
permissions remain independent limits, and unsupported service operations must be named honestly.

The official catalog has no agent-pool tools. Prepared owner-managed read/write pool operations
use fixed documented endpoints, share the same credential/organization binding, withhold registration
secrets and agent environment/capability dictionaries, and never replay an uncertain mutation.
Source/disposable UI acceptance passes, including real vendor catalog exposure and protected mutation
annotations. The full prepared source suite passed 1,711 tests with four skips; two native connection
UI suites and static checks pass. No new package, HC migration, authenticated full-family read,
agent-pool mutation or write acceptance is claimed. No new PAT, app registration or scopes were created.

Finish qualified full-account CLI/optional PAT-lifecycle design without unsafe cache adoption,
client-ID substitution or automatic fallback. Existing working PATs must not need recreation to
select tool families. Publish final schema/migration/rollback guidance, test both native providers,
and use explicitly authorized disposable resources for live mutation checks.

### N6-05 — Independent Mnemosyne follow-up

The shared Proteus desktop/web operations interface is implemented and shipped in Nov 5. The
separate native core/library extraction, bounded native event journaling and guarded service
controls, additional sources/watchers and neutral iOS library synchronization remain future product
work. Load that product's source and ownership instructions before implementation; preserve current
native service ownership, working claims, publication boundaries and data. Do not label the shipped
Proteus observer as completion of the independent product redesign.

### N6-06 — Remaining parity and production acceptance

Track physical mobile question gestures/reconnect/APNs, native workspace-file/image navigation,
signed-in production web interaction and representative network/performance measurements. Preserve
existing simulator/source/disposable acceptance; it is not physical or production proof. These are
follow-up scope and limitations, not failed organization workflows historical content coverage.

### N6-07 — Updater diagnostics and recovery exceptions

Prepared-job/helper readiness failures need bounded, sanitized, pollable owner diagnostics rather
than an attention-only reconciliation endpoint. Investigate readiness verification latency against
legacy deadlines without weakening integrity, idle or preservation gates. Keep original failed and
uncertain receipts. Recovery exceptions need supported owner reconciliation and precise retention
conditions; do not raw-edit journals or delete unresolved copies to make maintenance green.


## Explicitly deferred Windows rollout

The operator explicitly carries the additional Windows consumer's blocked update into Nov 6.
Its old runtime remains installed and its original prepared job/package/failure evidence stays
intact. Read-only package verification did not return a complete result, so no integrity success
or safe handoff was established. Diagnose through supported owner operations; do not retry blindly,
raw-edit the journal or duplicate the coordinator. Private routing/revision receipts remain in
the release ledger. This deferral permits Nov 5 closure and does not itself authorize a new run.
