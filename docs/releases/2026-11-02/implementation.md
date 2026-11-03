## R27/R28 — project recents and canonical mobile tab lists

Restore project recents, counts, expansion, paging and project-scoped activation while preserving the
removal of duplicate open-tab navigation lists. Desktop source and native use historical chat summaries
and visible resource descriptors; native never polls every five seconds for this sidebar.

The native workspace Tabs page now defaults to General and exposes an explicit project choice, with
All projects available separately. Its rendered snapshot follows the shared canonical scope, refreshes
on reconnect and reacts to child-project changes. All owner reads and retries retain existing history,
pending-intent and revision protections. A serialized current-owner read may replace an older cache
incarnation only if the local revision has not changed since that read began. Malformed snapshots and
unsolicited stale responses remain rejected. Offline host actions are disabled; failed actions trigger
read-only refresh rather than blind mutation retries.

The focused actual Electron recents checks, 175 native unit tests and additional bounded-read-evidence
unit pass. Both phone and iPad live fixtures pass owner close/open during disconnect followed by
same-screen reconciliation, project filtering and restored recents. Final iPad acceptance also
rechecks both revision-race and read-evidence cases. A bounded temporary receipt records only
canonical scope, revision, tab IDs and read time for independent device comparison; it contains
no titles, URLs or message content. Combined deployment follows; wider distribution, updater
usability and Mnemosyne holds remain.

## R26 — first incremental iPad correction

Native question controls now share their message bubble instead of appearing as an adjacent sibling. The form has a visible answer label, a desktop-style bordered field and actions with a narrow-width fallback. The current iPad interaction test additionally checks that the answer field and action buttons are geometrically contained in the message card. The iPad simulator interaction/bounds test passes (choices, typing, Clear, retained draft and Return); static checks pass. Signing and incremental physical deployment follow this source freeze. The separate scroll correction and its remaining acceptance are documented in [native chat scrolling](native-chat-scrolling.md). The first signed question-card build is installed and running on iPad, with all 195 protected files hash-matched before launch, four saved destinations retained and two verified recovery generations. The combined native correction now passes final phone/tablet gesture, prepend, reopen, cold-launch and question-card acceptance. Both physical clients and both distinct Preview simulators run 0.2.41/2611.2.5; preservation timing and the remaining live-review limits are recorded in the linked report.

## R23 — scoped owner scheduler controls and targeted local update

The operator authorized finishing scheduler fixes and updating only this desktop and the physical
iPhone/iPad. Wider distribution and the broader Mnemosyne UI/source/owner extraction remain held.
Historical simulator-only holds below are superseded for these three targets only.

`proteus_schedules` is registered through the same shared owner service for provider tools and the
local stdio MCP adapter. It explicitly targets this owning computer, with separate context-bound
grants for exact schedule IDs: read, update, test, stop, source refresh and permission configuration.
Generic chat/filesystem grants do not authorize scheduler actions. Saved approval rules match an
exact normalized schedule/action scope; broad tool rules cannot mint new scheduler scopes. Grants
have a separate private store, and remembered rules use a backward-compatible custom-tool record.

Inventory is bounded and revision-aware; updates/enable/disable require current schedule revisions
and explicit future-runs scope. They preserve unknown definition fields and captured runs. Pausing
remains available while a provider is offline. Repository-owned definitions retain their source
workflow boundary. Editing future permission profiles requires its own scope and cannot introduce
blanket automatic/shell/tool approvals. No action approves a pending provider tool request.

Test start/retry has durable operation identity and run linkage written before provider execution,
source/model/tool-configuration/permission preflight, overlap protection and explicit future-versus-
captured settings. Uncertain starts reconcile an existing linked run; missing claims never replay
automatically. Exact manual/test stop is independently idempotent, never a recurring-job cancel.
Status exposes pending human approvals, bounded results and reported usage, distinguishing model
completion from verified external effects. Native service replacements cannot be started/enabled
through this tool; their existing owners and takeover gates remain untouched.

Source refresh explicitly chooses future-runs or an idle existing run and checks both schedule and
captured revisions. Earlier context/history/model choices are retained. Explicit scheduled Codex MCP
servers now survive `includeDefaults:false`; unrelated chat/workspace defaults remain excluded and
disabled sources remain disabled. Dedicated Internet Search and update coordinator isolation remain.

R23 source acceptance: the full local suite passes **1,454 tests, four skipped**, and static checks pass. Registered stdio MCP acceptance exercises the actual scheduler start/status boundary. Native validation passes 171 unit tests, the iPad queue-clear/draft/Return interaction, both phone navigation/safe-area interactions, and the isolated 100-tab/30,000-history-entry overview stability/cold-restart case. The overview rehearsal now explicitly ignores another test's saved selection on its first launch, only under the separate Debug simulator test identity; the second launch still restores ordinary saved navigation.

The additional iPad browser test reaches and passes pinch overview, dismissal and persistent navigation, then fails its landscape-window assertion on the current simulator: the reported window remains portrait after device rotation. This is retained as an unresolved rotation acceptance limitation, not a passing full test. No physical rotation result is inferred. Existing device data, signing identities and profiles remain untouched until separate update receipts verify them. Local Mac package acceptance and physical preservation/launch verification follow this source freeze; no broader distribution is authorized.

## R21 — scoped next-turn model settings through chat control

`proteus_chats` send can explicitly select model/effort/context/service settings with
`modelScope: "next-turn"` and queue mode. The captured provider stays fixed. The sender refreshes
the destination catalog; the executing owner validates again and rechecks run identity, provider
and project after asynchronous preflight. Steering, replies and cancellation cannot change model
settings. Older destinations without the scoped-send capability are refused rather than silently
ignoring options.

The durable task freezes the requested settings and returns `modelSelection` with `state: requested`.
This is not proof that a model executed. `read` exposes bounded `modelState` with the captured
settings and queued selections. An active turn retains its original settings; the queued message's
settings apply when that next turn starts. The initial captured schedule and model history remain
available. No saved future schedule, sources, tools or permissions are edited. Future schedule
updates and source/context refresh remain separate owner operations in R19, not part of send.

Retry reuses the same operation ID and frozen selection without another message. Changed arguments
with the same ID are rejected. Older uncertain/prepared tasks that never captured model settings
must be inspected before submitting a new operation; the fix does not retrofit their prior sends.
This is source-only for Nov 2. Do not claim changes through the currently installed send path took
effect, and do not relabel prior runs with newly saved future schedule settings.

Both dropped-option sites are corrected: the controller send payload and destination agent send.
Focused synthetic acceptance passes 31 chat-control cases plus the actual registered stdio MCP
catalog/tool-call test. Coverage includes paired/local dispatch, durable restart/retry, conflicting
operation IDs, unchanged active/future schedules, later captured selection, unsupported options,
provider/steering restrictions, older-owner refusal, policy revalidation and project movement during
preflight. Required source suite passes **1,445 tests, four skipped, zero failed**; static checks pass.
No UI changed, so this acceptance uses owner/protocol/execution tests rather than a UI redesign. No live intake test,
schedule edit, deployment or UI redesign is performed by this source work.

## R20 — clear reviewed questions from the open queue

Question cards add **Clear from queue** immediately left of **Send answer**. The owner persists
review metadata separately from answer status, so the question disappears from the open queue
across clients/restart while its original transcript card and unsent answer remain. The retained
card can still be answered later through the normal owner/provider path. Clearing sends no answer,
resolves no provider wait, cancels no work and grants no approval. Actual waits/attention remain
accurate; this is not the existing terminal dismissal action. Answer delivery already in progress
cannot be hidden by the button. Old paired owners omit the action until they advertise support.

Owner HTTP and encrypted human-client routes share the same queue-review service. UI changes cover
local desktop, remote desktop/web and native cards. Pure projections retain reviewed question IDs
and answer controls while excluding them from the queue. Required suite: 1,440 pass/four skip;
owner tests cover restart, later answer, unchanged events, unresolved blocking waits, rejection of
permission IDs, human-only remote access, authenticated HTTP and paged projection. Browser UI checks
cover left-of-Send placement, disappearance, retained draft, later answer, uncertain-answer identity
and narrow layout. Native model/compilation and static checks pass. The final iPhone interaction test passes
clear-button placement, queue removal, draft/card retention and a later Return answer against the
current owner. iPad uses the shared controls; its new interaction case has not run at this checkpoint.
The first native interaction attempt passed clearing but failed on an offscreen XCTest keyboard-key
tap; the final case sends Return to the focused editor. Initial fixture timing/projection and native
model edit errors are retained in private failure receipts. Deployment and simulator Preview refresh remain separate under the hold.

## R19 — newly requested owner schedule boundary

Requested scope is recorded in the [plan](../../2026-11-02-release-plan.md). No schedule MCP tool
or Transcription UI redesign is implemented by this checkpoint. Owner API/preflight/idempotency,
schedule-specific MCP selection and scoped unattended action rules require their own validation.
Existing test cancellation/temporary pause receipts remain private with the testing workflow.

## R18 — iPhone overview jumps while scrolling

The operator reported repeated overview jumping. The running Preview logged SwiftUI's
`Bound preference PhoneTabRects tried to update multiple times per frame` diagnostic. Tile
geometry was written into parent view state on every preference update, feeding layout back
into the lazy grid. Consume that geometry directly through an overlay preference instead.
Initial selection centering now runs once per presentation rather than twice from `onAppear`.
The new native regression checks idle tile position and retained position after scrolling, in
addition to existing large-history width bounds. The large-history native UI test passes (one test, zero failures), including idle and post-scroll
stability, width bounds, Done and restore. Static checks pass. The separate iPhone Preview is
installed/launched with its executable hash verified and all eight protected files retained before
launch, including existing connections; pairing was not reset. The iPad Preview remains the prior
R15 build. Physical builds and desktop rollout remain held. Native desktop screenshots were blocked
by older unresolved control state; this diagnosis uses the actual simulator runtime diagnostic and
separate native test acceptance, not a claimed live visual capture.

## R17 — reduced scrolling/state-update work

Browser profile display/reconciliation reads account identity once per synchronous operation and
releases it immediately; account changes are fresh on the next operation. Scroll recency uses
coalesced, owning-window timestamp IPC instead of full history projection. Full structural updates
supersede queued activity. Text-only streaming no longer falls back to repeated full owner/catalog
refresh after three seconds; real changes and reconnect/push-loss fallback still refresh. No broader
permission cache or timer shutdown was introduced. Added bounded phase timings and worker-side
payload bytes to identify any remaining live stalls.

Controlled actual Electron workload: 75,173 → 614 account-file loads, 59–70 → 1.3–1.9 ms per
projection, 128 → 30 ms maximum input-dispatch gap. Separate actual Electron acceptance passes
zero offscreen-stream full refreshes, mutation refresh and push-loss fallback. Profile revocation,
window isolation, closed-tab handling and activity/full-state timestamp regressions pass.
Final required validation: **1,436 tests pass, four skipped, zero failed**; static checks and web
build pass. Actual Electron acceptance verifies activity IPC/session persistence, zero offscreen
stream reloads, visible streaming past the old cutoff with composer/reading-position retention,
durable-message refresh, push-loss fallback, and browser Enter/Tab/history icon behavior. The old
rich-chat harness stops on obsolete list/lazy-activity/fixed message-count assumptions before its
streaming section; it remains unchanged. Its failed receipts are retained, and the focused current-
navigation streaming/scroll fixture passes without weakening those old assertions.
See [the detailed report](scroll-performance.md). The live desktop remains 0.2.40 and release
packaging/publication/installation remain held; synthetic measurements are not live HC acceptance.

## R15/R16 — history ghost completion and saved site icons

Address fields in loaded browsers and New tab pages suggest the most frequently visited matching
website origin from retained Proteus history for that browser profile. Count distinct visits across
retained history, break ties by the latest visit and then URL, and update counts after deletion,
retention pruning or redirects. The derived index lives in the history worker; no UI history scan,
search-engine suggestion request or external favicon fetch runs while editing.

Ghost text leaves the typed value untouched. Enter accepts the displayed origin; Tab accepts its
canonical base URL ending in `/`, leaves the caret at the end and keeps focus so a path can follow.
Typing a path, query, credentials or search terms stops base-origin completion. Explicit recent-row
selection, middle-of-text editing, Escape and IME keep native editing precedence. Scheme and ports
are preserved; omitted scheme/`www.` can be hidden in the ghost but accepted URLs stay canonical.
Desktop requests are debounced and limited to one in-flight lookup per field. Unfocused fields do
not keep querying. Native uses the owner index when available and retained local history offline.

Address-history dropdowns and New tab history rows show saved PNG site icons on the left with a
globe fallback. The owner reads its existing account/profile-partition cache, with bounded response
size; displaying the list never loads a site or requests a favicon. Native displays these cached
owner icons without embedding repeated image payloads in its durable history cache. Icons remain
decorative so they do not repeat the URL for accessibility.

Actual desktop UI acceptance passes Enter, Tab plus continued paths, live prefix changes, cursor/
Escape behavior, unchanged typed values, and native-popup icon placement. Full source suite:
1,433 passed/four skipped; static checks and web build pass. Native parity plus actual iPhone/iPad
New tab and address-editor Enter acceptance pass. iPhone multiline editing, tab swipes and compact
bottom-row/scroll recovery also pass. Failure receipts retain the iOS focus-loss correction and
an obsolete test selector/height expectation rather than reclassifying them as live acceptance.

R17 scrolling correction: see [implementation and controlled measurements](scroll-performance.md).
The live instance has recurring main-loop stalls and remains unchanged; post-install acceptance
is pending and no deadlock is proven. Deployment and physical-device builds remain held for
simulator review.

## R13/R14 final local validation

- Required source suite: 1,431 passed, four skipped, zero failed; static checks and web build pass.
- Actual Electron: two-window setup/reply text and retained conflict choices; actual WebAudio,
  tab-menu mute/unmute, speaker position, visual alerts and sound intent; existing page notification
  deduplication and click activation pass in disposable owners.
- Native: owner revision/conflict parity passes. Final phone/tablet project setup UI passes,
  including locked-project preservation, exact canonical slot, inbound/outbound text and shared close.
  Full phone/tablet suites from the preceding R13 pass retain their original receipts and qualifications.
- Final distinct iPhone and iPad Preview apps are built, installed and launched on the shared pool,
  with installed executable hashes matching their staged apps. Normal/physical apps are unchanged.
- Initial failures and corrections remain in private evidence: an obsolete duplicate test setup
  method, old browser-view setup echo, ambiguous test New chat selection, tapped caret assumptions,
  phone hidden toolbar Cancel and the real locked-project initialization bug. A long noncanonical
  temporary directory also failed recovery/path fixtures; canonical short-path full rerun passed.
- No Slack live acceptance, worker notification integration, LAN acceptance or new release rollout
  is claimed. See the rollout hold and prior-request audit for remaining platform acceptance.

## R13 — shared setup slots and composer text

The operator confirmed syncing both setup text and ordinary unsent replies. Shared project and
workspace setup forms use one canonical blank browser descriptor with only a safe setup-kind marker.
Converting a blank page preserves its logical ID and order; native conversion retires the old local
browser view without publishing Close. Workspace-root setup creation resolves the default project.
The owner consumes a setup once on explicit Send; simultaneous attempts cannot create two chats.

Composer text uses a separate human-only owner API, never tab inventory or chat history projections.
Desktop, web and native clients periodically synchronize idle text with revision checks and durable
operation IDs. Concurrent edits require an explicit choice and keep recovery copies. Accepted replies
clear only the exact sent text. Attachment selection, provider/model/source choices and permissions
stay on the sending device. Window-local app setup tabs stay local. Canonical project-associated
local previews are discoverable without recreating a chat child strip; denied profiles stay denied.

Actual encrypted owner tests cover two clients, restart/retry/conflicts, one-time setup consumption
and absence of text from inventory. Two real Electron windows verify setup/reply text and conflict
recovery. Native checks cover owner revisions and the real project setup UI on both simulator sizes.
These are isolated fixtures; they do not claim live desktop/mobile data repair or physical deployment.

## R14 — website notifications and tab audio

Audit confirmed that permitted page `Notification` events already enter the shared Proteus
notification history and optional system presenter, preserving site silent intent and exact click
routing. Page audio remains ordinary Chromium audio. System sounds require system notifications to
be enabled; operating-system sound settings still apply. This audit does not establish Slack's live
site permission, workspace sound preference, push delivery or service-worker notification ingestion.
The existing bridge intercepts the page constructor; background worker delivery needs separate
acceptance and must not be advertised as verified Proteus inbox integration.

Browser tab menus now offer Mute tab / Unmute tab in app, project/chat and Team Tools strips. Actual
Chromium audibility drives a speaker immediately before the close button; muted tabs retain a muted
indicator. Muting silences page audio and that tab's bridged notification sound while retaining visual
history. State survives unload/reload and saved window sessions; muting an unloaded tab does not
load it. It remains window-local and is excluded from shared project descriptors. A real Electron
WebAudio/page-notification rehearsal verifies menu actions, indicator position, sound intent,
unload behavior and saved state. It does not claim audible output was heard or live Slack tested.

# R12 — navigation foundation retained in R13

R12 supersedes the initial R10 preview and changes desktop/owner runtime too. The older R9
accepted source/package below is historical, not an R12 distribution candidate.

Window app tabs stay local. iPhone lists them in its sidebar with an app-tab overview;
iPad/desktop use their top app strip and overview. Sidebar trees show workspace/project destinations,
never project resource tabs. Projects have one owner-shared ordered content set, preserving stable
IDs, order, hidden state and history. Chats have no nested resource strip. Phone shows the project
row, then Chat | Live browser with overview/actions only; the project plus creates tabs. Browser
links, documents and previews use parent project descriptors and retain their authorization origin.
Selection and scroll stay local. R13 supersedes the earlier private-draft assumption: shared-project
New chat/Internet Search slots synchronize empty setup markers, setup text and unsent reply text.
Attachments and provider/model/source/permission choices remain local to the sending device.

Unloaded pages retain top navigation without loading to switch tabs. Browser/composer spacing uses
the actual safe area. Native sync applies membership despite history paging failure, handles
authenticated tab notices and reconnect, and waits for overlapping reads before fetching newer
owner state. Empty legacy outboxes no longer suppress reads; orphan receipts and private legacy
resources remain retained without manufacturing project membership. Unchanged offscreen scopes use
a one-minute fallback; sidebar resource polling is removed. Broader N2 profiling remains separate.

Review hold: both shared simulator Preview apps must be reviewed before any new physical-device
build/installation, desktop release package, publication or rollout. Old accepted packages retain
their historical identity and cannot be promoted as R12. Related superseded Windows/Linux builder
turns are verified cancelled; queued old-source requests remain retained and require reconciliation
before reuse. No unrelated work was cancelled.

Recovered request details are in [the updated audit](prior-release-audit.md). Attachment-only input
requires verified consented dispatch; the provider instruction never replaces exact human text.
Question cards own answers and retain durable retries/files; general composer queues another input.
Ordered file viewers expose optional dates with inert previews. Continuation settings use owner
capability/version immediately above allowance. Submission origin controls placement only.

Validation: actual two-window Electron origin fixture and lazy attachment gallery checks pass.
Required final Node/static/website and phone/tablet tests are in progress; final counts follow.
Initial fixture failures and actual focus/read-race corrections remain in private evidence.

No physical/cache data edits, new release package or deployment. R9 website restore qualification
and outstanding final asset/retention closeout remain unchanged.

---

# Nov 2 implementation

Version: 0.2.41

Current checkpoint: desktop R9 application/source pin is
`4456aea8837171ba60f82775859d9ce7f4ec0810`. Its signed Mac package, six exact-package UI checks,
unchanged integrity, official extraction and all 1,522 corresponding-source hashes verify.
Publisher/destination approval remains pending. The R9 website is deployed with passing activation
and endpoint audit, but its new ordinary restore failed; captured-state verification passed with
live-state comparison not performed. Final asset/retention closeout remains separate.

R10 mobile changes are simulator-only pending operator review. The new phone row, encrypted
owner empty-project/nine-tab resynchronization and orphan-receipt retention tests pass. The same
tablet sync and existing Live Browser/composer draft retention checks pass. No further physical build
or installation is authorized until this review. Existing physical 2611.2.1 stays unchanged;
2611.2.2 was prepared before the hold and is not installed.

[The prior-request audit](prior-release-audit.md) identifies missing/partial October requests.
All old committed branch work is already in main. Prior branch refs are retired; dirty detached
worktrees and hashed patches are preserved. A recovered browser-host resize regression passes.
Earlier package/deployment checkpoints below retain their original identities and qualifications.

R10 validation: two native owner/cache tests pass on each shared simulator; the phone navigation
UI case passes, and the tablet Live Browser/composer/draft case passes. Complete Node suite remains
1,421 passes/four skips; static checks and the recovered Electron host-resize regression pass.
The first test build exposed fixture-only class selection and private-state access errors; the
corrected tests use observable behavior and the actual NativeParityTests class. The failed build
is retained separately and is not counted as acceptance. Production device-cache cause remains
unconfirmed; the legacy empty-outbox failure has a targeted owner-protocol regression and correction.

R9 was added after the earlier application freeze. Its source fixes restore inline question
Enter/Send and omit card headings already present in the transcript. The preceding UI fixture
fails on the repeated heading; corrected shared desktop/web tests, complete Node suite and static
checks pass. Native unit and iPhone/iPad software-keyboard Send checks pass; replacement
package acceptance is tracked separately. Multi-question events retain distinct card headings
so each answer field stays identifiable. Earlier accepted/published/installed R1–R8 artifacts
retain their original pins and do not contain R9. Desktop build/publisher tasks have a hold on
promoting those earlier bytes while the replacement pin is validated.

Status: signed Mac candidate accepted locally; publisher signature and destination approvals
remain pending. No desktop package publication or installation yet. Draft review: [PR 29](https://github.com/mdpope/Proteus/pull/29).

Frozen application/source: `f75f98f7f2e623acdb77adedb2a0da7e09785fa7`.
Validation-only harness correction: `3926aec`; it does not relabel accepted application bytes.
Mac build: `f75f98f7f2e6+src.4c95b6884b99`; Apple signature verifies. Complete package hash:
`7b5579cfd8a1d3c4c352c7cbbd9c222b867f47f0f4511f2c1dab0b5fce56cdb6`.
Official extraction and all 1,521 corresponding-source file hashes verify. Exact-package browser
redraw, external-link selector, draft/restart/placement, extension contexts/profile isolation and
synthetic authentication/autofill pass. Complete installation hash is unchanged afterward.

The signed iOS candidate is 0.2.41 / 2611.2.1 with its existing paid profile and physical identity.
The website is deployed from the frozen source: all 9,221 file hashes and fourteen endpoints
pass, with schema, runtime configuration and protected application data preserved. Its new
recovery, central copy and ordinary isolated restore verify. The first activation rolled back
because three existing code generations exceeded the two-generation guard. After retiring the
exact verified oldest code copy, the guarded retry reused the same archive and recovery capture;
both activation and audit completed. Native Windows/Linux build chats await ordinary
destination-owned preflight approvals. Both physical mobile devices received the earlier frozen
0.2.41 / 2611.2.1 build in place after the operator unlocked them. All 350 phone and 186 tablet
protected files match before first launch; both processes and all four saved destinations on each
device verify. Signing and keychain entitlement identity are unchanged. Exactly two verified
recoveries remain per device. Physical gestures, authentication/reconnection and push remain
separate acceptance checks. These installations do not include the subsequently requested R9.

All nine served HTTPS assets match the accepted website archive. Final retention verifies two
local recovery dates, one server recovery date and two code generations. The bounded final server
retirement removed 1,260,495,148 logical bytes; observed available space increased by
1,285,296,128 bytes, which can include concurrent filesystem activity. Retained checksums,
environment identity and shared storage identity remain unchanged. Production inference and
authenticated browser workflows are separate acceptance checks; aggregate log audit is not a
claim that every existing system log is clean.

| Request | Implemented behavior | Evidence and remaining acceptance |
| --- | --- | --- |
| R1 | Restore browser layout on every browser redraw, independently of toolbar reuse. | Prior-source geometry assertion fails; corrected Electron redraw/sidebar/resize case passes without switching tabs, including the exact signed Mac package. Installed HC source and screenshot match the diagnosed conditional. Other platform and installed/live acceptance remain. |
| R2 | Add extension/session-scoped runtime contexts for host-created extension windows/popups; rotate context identity per navigation; disable vendor API payload logging. | Native popup context test changes from an empty list to POPUP. Synthetic authentication-to-ready and autofill pass without reopening the popup or touching the other window. Real Bitwarden unlock/autofill remains unverified. |
| R3 | Corroborate an exact missing-window observation with complete process-scoped inventory before settling uncertain input; require a new observation before subsequent input. | Closure, reuse, partial/denied/lost inventory, Stop and unrelated-error regressions pass. Installed owner still needs the new package and live closed-popup acceptance. |
| R4 | Group inference choices by source host/adapter, show availability and preserve source/model identity; omit empty generic buckets and duplicate local routes. | Shared JS/native identity and offline tests pass; desktop/remote form tests and web build pass. Real inference endpoints were unavailable during inventory; no successful cross-client inference is claimed. |
| R5 | Device-local New chat tabs with independent draft/attachments/placement and durable exact start-request identity; retry reconciles uploaded attachments after local bytes disappear. | Native parity tests and iPad/iPhone tab-switch/retained-draft/cancel UI tests pass in separate simulator test apps. Physical layouts remain unverified. Desktop setup also retains its replacement position after owner synchronization. |
| R6 | Hydrate mounted model controls from refreshed owner state even during a fresh network-cache TTL. | Real owner catalogs contain Astra/Terra and current Claude choices. Mounted-control regression preserves model/effort and adds newly advertised IDs with zero network reads. No model capability table was added. |
| R7 | Explain actual Fusion availability in model/provider screens; keep Auto separate. | Pinned Copilot SDK 1.0.28/runtime 1.0.105 advertises Auto without Fusion tiers. Advertised-tier routing/attribution regressions pass; real Fusion execution is unavailable and unverified. |
| R8 | Keep the external-link selector through focus loss without a default; remove arbitrary-window fallback; read source-app icon resources without the crashing native file-icon worker. | HC has no rules/default bypass. Disposable native icon lookup reproducibly terminates Electron with SIGTRAP; replacing that lookup passes the actual picker/filter/focus/project/rule/cancel test. Internal-link placement remains separate. HC Outlook acceptance remains. |
| R9 | Submit inline question answers with Enter/Send through the existing form; preserve alternate newlines, composition, held-key/empty/busy guards and retry identity; omit a repeated single-question prompt while retaining labels for multiple questions. | Prior-source duplicate-heading failure reproduced. Corrected shared card and built website tests pass with choices, draft preservation, consent and identical uncertain retries. Native question/Return unit tests and iPhone/iPad software-keyboard Send pass. New package/live acceptance remains separate from earlier R1–R8 artifacts. |

Two initial packaged extension fixtures accepted an unrelated website WebContentsView as the
next Electron window event. Captured failure state identifies the controlled HTTP form, with no
extension API, rather than the requested popup. The validation-only correction matches extension
ID and document path before observing readiness/authentication. Corrected exact-package checks
pass; the initial failures remain in private evidence. This is separate from real vault acceptance.

Validation checkpoint: complete Node suite passes **1,421 tests, four skips** using a short,
canonical temporary path. Static checks, the web production asset build and 106 web tests with
926 assertions pass. Native parity
passes 37 cases; the focused New chat UI case passes on both shared iPhone/iPad simulators.
Mac UI fixtures use disposable profiles and synthetic source/form data. Raw catalogs, screenshots,
crash reports and detailed logs remain outside Git. Later source changes receive focused checks
and the required final suite before package promotion.

The default macOS temporary directory produced unrelated canonical-path/socket-length failures;
that run is retained separately. One extension-notice test double needed the new context adapter
stub. The canonical-path rerun passes. No live vault material was read or logged and no build-only
live-data backups were created. Immutable source/package pins above retain their exact accepted
bytes; later validation and release records do not relabel Nov 1 or the frozen Nov 2 artifacts.
