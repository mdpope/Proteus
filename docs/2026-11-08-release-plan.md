# Nov 8 release plan

Status: open successor to closed Nov 5 / 0.2.43. Renamed from Nov 6 by operator request.
Version: reserved by the named release tool.
Authorization: implement and validate all carried scope plus the items below. Build Mac 0.2.44,
web 0.2.44 and iPhone 2611.8.2 have accepted rollout receipts. Later iOS attachment changes require
completed simulator acceptance and a requested physical installation. iPad and other desktop rollout
holds remain. Current acceptance and process follow-up are consolidated in
[the November 9 review](releases/2026-11-08/review.md).
Historical N6 identifiers remain stable for cross references. Prior acceptance limits remain valid.

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

Status: source acknowledgment/dismissal correction implemented; full cross-owner acceptance remains open.

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
or silently move its unfinished work. The November 8 operator instruction opens this successor as 0.2.44. New items are N8-09 through N8-13.

## Operator closeout boundary — after Nov 5 acceptance

The operator explicitly moves non-digest features/fixes, including Proxmox, into this successor
plan rather than another Nov 5 build. Finish existing updates and Work Mac digest acceptance first.
Historical prerequisite satisfied: Nov 5 is closed; Nov 8 is now open. Tested
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



### N6-08 — Answer questions in remote Windows chats

Status: ordinary-question transport correction implemented and regression-tested. Installed Windows acceptance remains open.

The operator reports that answering a question in a remote chat from Build Mac to the
Windows Proteus owner fails with the message **"unsuported desktop peer command"** (reported
wording). Preserve exact owner/client build identities and sanitized command/error evidence in
private release records. This is an ordinary question-answer failure, separate from N6-02's
remembered tool-permission flow; the underlying cause is not yet established.

Required behavior: trace remote answer dispatch, peer command support/version negotiation,
exact pending-question identity, destination acknowledgment and remote UI refresh. Route answers
through the supported owner command; preserve the typed response and show an actionable error
when the destination cannot accept it. Reconcile uncertain delivery before retrying so an answer
cannot be duplicated or applied to a replacement question. Do not substitute a new chat message,
steering or a tool approval for answering the pending question.

Acceptance: reproduce Build Mac to Windows with authorized disposable ordinary-question
fixtures, covering text and choice answers, supported/mismatched peer versions, reconnect,
double clicks and stale questions. Verify the exact question resolves once, the original run
continues, and the pending card clears on owner and controller without repeated clicks. Confirm
unrelated permission requests remain protected. No live pending request is answered as a planning
side effect, and this item does not reopen Nov 5 or start the successor release.


## Explicitly deferred Windows rollout

The operator explicitly carries the additional Windows consumer's blocked update into Nov 6.
Its old runtime remains installed and its original prepared job/package/failure evidence stays
intact. Read-only package verification did not return a complete result, so no integrity success
or safe handoff was established. Diagnose through supported owner operations; do not retry blindly,
raw-edit the journal or duplicate the coordinator. Private routing/revision receipts remain in
the release ledger. This deferral permits Nov 5 closure and does not itself authorize a new run.

## N8-09 — Mnemosyne operations and workflow audit

Verify native capture/ASR/library processing and migrated Proteus intake/follow-up schedules on
Build Mac using current receipts, schedule configuration and output evidence. Model completion
alone is insufficient. Show measured total storage and GB by file extension under Audio, with
explicit coverage, unavailable roots and bounded-scan limits. Explain library metadata versus
phone delivery evidence. Implement guarded native-owner pause/start/restart only where the native
contract can protect in-flight work; never kill a worker or substitute disabled alternatives.
Render sanitized logs as expandable records with human-readable dates and named fields.

## N8-10 — Desktop/web Chats layout

Keep Chats within the available window with one scrollable list. Collapsible filters use four
columns at desktop widths and responsive narrower layouts. Progressively reveal/load rows near
the list bottom; remove More chats. Preserve filters, reading position, keyboard navigation and
host-scoped paging. Show provider/model/effort/speed together immediately left of the computer,
using captured run options and explicit unknown values. Match desktop and web behavior.

## Implementation checkpoint — November 8

- N6-03/N6-04: hash-verified preserved ADO/network source integrated. Source/disposable
  acceptance passes; live Proxmox, account writes and PAT lifecycle acceptance remain open.
- N6-02: remembered approval dialog now closes after the exact reply acknowledgment instead
  of waiting for a subsequent remote view reload. Dialog submissions show progress and inline
  errors. Full cross-owner fault/reconnect acceptance remains open.
- N6-08: desktop peer transport now admits existing ordinary-question answer/clear commands.
  Exact question arguments are preserved; no permission mutation or reply substitution added.
  Transport regression passes; installed Windows acceptance remains open.
- N8-09: bounded metadata-only configured-root storage measurement with file types and partial
  coverage indicators; readable expandable logs; Library phone-delivery evidence explanation.
  Drain-first native service controls are implemented in source; native product extraction remains open. Audit confirms
  recent native processing and firing Proteus schedules, with incomplete output reconciliation.
- N8-10: desktop/web single list scroller, collapsible four-column responsive filters,
  progressive rows and provider/model/effort/speed columns implemented and UI tested.
- N6-01, N6-05 native redesign, N6-06 outstanding production/device acceptance and N6-07
  recovery-exception acceptance remain open; bounded readiness phases/timings are implemented. This checkpoint is not release completion.
- No local installation, web deployment or physical-device deployment performed.

## N8-11 — Agent-requested chat folder access, all clients

Requested November 8 after mobile source setup blocked native service work. Add a run-bound
`proteus_folder_access` tool. The agent specifies one existing owner-local absolute directory,
read/read-write access, a reason and stable operation ID. A human approves the exact request on
desktop, web, iPhone or iPad. Save only a chat grant; preserve workspace defaults, other chats,
source selections and instruction policy. Delegated/scheduled runs cannot widen their captured scope.
Never infer permission from Auto-approve or saved generic tool rules. Reconcile repeat/uncertain
requests without another prompt or scope change. Expose whether provider access needs the next
explicit turn; never claim an executing sandbox was widened. Approved roots appear in the next
turn's provider context while native sandbox revocations still stop work.

Source checkpoint: implemented, with approval/denial/idempotency/stale-context/ended-turn and
managed Codex additive-versus-reducing permission tests. Installed cross-client acceptance remains
part of local release acceptance; no new live folder grant was performed by tests.

## N8-12 — Reliable mobile notification and question destinations

Requested November 8: tapping a notification or question must open the owning chat and exact
answer/approval controls. Wait for that particular computer's foreground authentication instead
of reporting disconnected immediately. Preserve cached offline reading and drafts; never fall
back to another online owner's chat. Carry question identity through push, banners, notification
history and Needs attention. Make history entries actionable. Selecting a question must expose
its answer card and focus its editor after layout, including earlier history. A schedule opened
from a notification must have a working dismissal path on the standard iPhone layout.

Source checkpoint: implemented. Validation uses the existing shared simulators and a distinct
synthetic test app identity. No physical device installation or website deployment is authorized.


## N8-13 — Predictable iPhone chat scrolling

Requested November 8: chat scrolling is jumpy and unpredictable. Give the native pan ownership
through deceleration, discard cancelled/acknowledged restoration identities so delayed SwiftUI
updates cannot replay them, and keep late history responses from revealing an old reading position
after a new gesture. Preserve deliberate question focus, follow-latest selection and saved reading
positions. Verify real native offsets plus simulator gestures, variable-height history loading,
prepending and reopening. Physical-device acceptance waits for the operator's deployment request.

Source checkpoint: scroll-command lifecycle and history-response guards implemented. Three native
offset regressions pass. iPhone simulator checks preserve the point within a long message across
momentum, prepend, reopen, another pan and cold launch; variable-height repeated paging reaches
the real bottom. iPad initial-bottom/upward-loading acceptance also passes. Physical-device
performance and real-chat acceptance remain deferred with the deployment hold.


## N8-14 — Native project tab parity

Requested November 8: compare the iPhone/iPad General project's list with desktop. The project
sidebar must retain hidden resource tabs, open archived chats and owner descriptor metadata while
chat metadata loads. The visible strip uses owner membership and order, excluding hidden slots;
old device navigation drafts cannot add closed chats or unregistered browser aliases. The explicit
Tabs management page includes hidden tabs. Opening a hidden resource restores the exact owner slot
through the durable revision-checked outbox; uncertain restoration remains unconfirmed.

Two focused native regressions pass for hidden/archive membership, metadata retention and cached
owner membership before navigation adoption. Simulator sidebar/scroll acceptance is in progress.
Actual physical-phone count parity remains separate from this source diagnosis.

## Targeted iPhone update authorization

The operator explicitly requests an iPhone build/install now to evaluate the scrolling fixes.
This lifts the physical iPhone hold only. Preserve data/pairings/signing, verify the release build
and install in place through the existing Mac-coordinated preservation workflow. Web, iPad and
other desktop deployments remain held; the full Nov 8 release remains open.


## N8-15 — Overview and navigation share visible membership

The operator clarifies that hidden tabs belong only on the project's Tabs management page.
The iPhone/iPad overview must match visible project navigation, not aggregate every project in a
workspace or append stale browser-cache aliases. Use the shared ordered navigation projection for
the active project (including its home), excluding hidden, navigation-closed and paused slots.
Resolve active workspace selection before a stale browser chrome selection. The Tabs page retains
all owner rows and its existing restore/load/close actions. This supersedes N8-14's earlier broad
interpretation of exposing hidden resource tabs in sidebar recents.

Source implementation is complete. iPhone and iPad simulator tests verify four visible navigation
children and exactly those four overview cards plus project home. Hidden browser/chat rows remain
on the Tabs page, while hidden, sibling-project and orphan browser entries stay out of overview.
The existing large-history/browser overview restoration test also passes. The installed 2611.8.1
build predates this correction; no additional physical installation yet.


## N8-16 — Workspace-wide grouped overview and shared project ordering

The operator restores the workspace-wide grouping on desktop/iOS: workspace-level resource tabs
first, followed by project sections in owner-persisted catalog order, including project home cards.
Do not promote the current project or sort alphabetically. Center the active navigation tab when
entering overview; late inventory reads may finish positioning until a real user pan takes over.
Hidden/closed/paused tabs and orphan cache aliases remain excluded. Project Tabs management retains
hidden records and actions. This supersedes N8-15's active-project-only overview interpretation.

Desktop Projects already supports pointer drag and keyboard reordering through the owner contract;
retain and verify it. Add native iPhone/iPad drag handles and row drop targets using the same
revision-checked reorder mutation. All clients consume that catalog order for sidebar and overview;
chat membership, defaults, permissions and execution ownership are unchanged.

The operator authorizes immediate iPhone and Build Mac deployment for this work. Web, iPad and
other desktop deployments remain held. Physical delivery and local owner installation use their
existing preservation/update workflows; tests do not establish installed results.


### N8-16 implementation qualification

Desktop project drag and shared owner order pass persistence/restart acceptance. Native Move up/down
continues using that owner contract. The optional native drag prototype did not pass simulator
interaction acceptance and was removed from the shipping source, with prototype/failures retained
privately. Workspace-wide overview grouping, workspace-first placement, saved project order and
navigation-based selected-card centering pass phone/tablet UI acceptance. Visible unloaded tabs
remain included, as clarified by the operator; hidden and closed records remain excluded.

## N8-17 — Repeated iPhone notification banners

The operator reports repeated iOS notification/lock-screen banners for the same message. Normalize
UUID identities across owner/APNs feeds and persisted receipt migration, and use one configured
account-push background path rather than also scheduling local mirrors. Preserve fallback local
notifications without an account push subscription and keep accounts scoped independently. Unit
coverage verifies case-variant/restart deduplication and transport choice; real APNs repeat acceptance
remains separate. The operator supplied a screenshot of the exact question alert repeating a dozen
times. Persist the native push device UUID across launches and merge duplicate same-account Apple
token registrations within their environment; remove queued retired copies. Endpoint tests pass.
The operator lifted the web hold; deploy through the established recovery/activation workflow.

N8-17 also includes the reported jump to the top while typing an answer. Focused question/reply
editors must block automatic bookmark restoration and history reveal, including late responses.
Verify incoming history/layout updates while typing without losing focus, text or the visible editor.

## N8-18 — New-chat attachments and spelling suggestions

Make file/photo attachments discoverable beside the iOS new-chat prompt, retaining supported-provider limits, draft preservation, exact upload consent and retry identity. Restore spelling suggestions on right-click in desktop editable fields and browser pages; retain system spelling/edit menus on web and native iOS. Validate new-chat picker cancellation/attachment review and originating-editor spelling replacement.

Build Mac retry is authorized after failed 0.2.44 recovery verification and rollback. Retain both failed attempts, add secret-free categorized owner-request diagnostics, validate a fresh signed candidate and use the separate update coordinator with existing idle/preservation checks. Other desktop/iPad holds remain.

## N8-19 — Browser and iPhone iteration after local acceptance

The operator authorizes fixing and testing Reddit media, intermittent page scrolling stalls, history-menu traversal, background-link menu order, iPhone idle/restoration/foreground screen awake, bottom safe-area layout, tab favicons, text-safe chrome gestures, URL editing/Return behavior, certificate parity, download-start feedback, isolated profile/link-menu parity, image export to a chosen folder, and authoritative cross-device project tab membership. Include the review's release-helper/decision follow-up and Mnemosyne workflow acceptance. Deploy accepted changes to Build Mac and iPhone promptly, then iterate with operator feedback before wider rollout. iOS background suspension/eviction remains controlled by the OS; preserve state and use quiet suspension/restoration. Acceptance must distinguish source/simulator/actual device and published/installed state.
