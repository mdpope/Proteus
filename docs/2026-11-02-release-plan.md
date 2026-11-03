## R26 — iPad question layout and chat reading performance

The operator requests desktop parity for the iOS answer card and an in-depth correction of jumping, choppy chat scrolling and lost reading positions on iPad. Incremental deployment to the physical iPad and iPhone is explicitly authorized as fixes validate. Preserve the accepted Mac candidate; wider distribution and Mnemosyne holds remain. The updater usability change remains held pending full Mac acceptance.

The first native correction places the answer form and attachment/Clear/Send controls inside the question's message surface, adds the persistent answer label and bordered editor, and accommodates narrow action layouts. Simulator bounds and interaction acceptance precede the next paid iPad build. The scroll correction now uses one native follow owner, stable content-coordinate anchors, gesture/deceleration guards and durable reading bookmarks. Phone/tablet drag, settle, prepend, reopen, cold-launch and question-card acceptance pass, along with the bounded 1,000-event workload. Both physical clients and both Preview simulators run 0.2.41/2611.2.5; physical gestures and authenticated connection stability remain separate live-review checks. See [native scrolling acceptance](releases/2026-11-02/native-chat-scrolling.md).

## R24 — iOS and web connection stability

The operator reports both clients repeatedly reconnecting/offline against Build Mac, with web worse. Investigate on the accepted updated desktop baseline, distinguishing owner relay availability, transport backpressure/size, authenticated handshake, request timeouts and client reconnect behavior. Preserve pairing keys, drafts, selection and retry receipts; do not reset pairing or weaken permissions as a shortcut. Current cause and fix remain unverified. This follow-up does not lift wider distribution or Mnemosyne implementation holds.

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

## R22 — Mnemosyne product and operations constraints (implementation pending)

Desktop and web share one visual/interaction design: styling, layouts, content and button semantics.
Only genuine Electron/browser constraints justify different wiring. Preserve the current web
schedule-control authority while showing the same operational information; visibility does not
expand permissions. Do not build a separate web design or implement the production redesign
before operator review.

Mnemosyne is the product, iOS app and independent Mac service; Omi is one source. The generic core
must ingest/transcribe/assemble and retain a neutral review/library without Proteus, Obsidian,
operator workflows or organization workflows. Optional independent filing adapters own configured destination policy and may
later run natively without Proteus. Current semantic publication still depends on operator workflows: stage a
neutral contract and guarded adapter extraction, preserving revisions, hashes, human edits and
receipts. This direction does not authorize bulk renames, identifier/cloud-identity changes, or
immediate owner/watcher replacement.

Proposed source adapters include Stardate through its own iCloud delivery and other MacWhisper/
audio/text exports, converging into the Mnemosyne iOS library with source/revision provenance.
Already-transcribed text requires no second ASR. Do not merge unrelated recordings by text or
file similarity, or activate two producers on the same folder. Validate each new source and its
watcher handoff separately before widening library publication.

The three disabled Proteus local-process entries are prepared replacements for native jobs,
reported loaded at 60-second intervals. Represent the actual owners as service observations and
authorized controls, not as scheduling responsibility transferred to Proteus. Preserve the native
takeover gate and existing locks, claims, audio, device/cloud identity, answers and retry receipts.

Stable event IDs differ from execution claim IDs. Join source-map publication/contribution outputs
to actual claims instead of assuming event-named work directories. Keep applied, not-applicable
and delegated outcomes distinct. Retained state/receipts cannot reconstruct deleted CLI transcripts;
bounded native journaling still needs design.

The handoff reports eight audit targets mapped with current destination and ASR/job hashes verified.
Both general schedules used scoped rules without human prompts, but early completion required
continuations. Updated completion checklists have not passed a fresh unattended start. Recurring
triggers stay paused under the testing workflow. These findings do not constitute new source-ingest,
closed-Proteus health, native migration, production UI or deployment acceptance. R19 owner schedule
capabilities remain in scope and all review/rollout holds remain unchanged.

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

## R20 — clear reviewed questions from the open queue

Question cards add **Clear from queue** immediately left of **Send answer**. The owner persists
review metadata separately from answer status, so the question disappears from the open queue
across clients/restart while its original transcript card and unsent answer remain. The retained
card can still be answered later through the normal owner/provider path. Clearing sends no answer,
resolves no provider wait, cancels no work and grants no approval. Actual waits/attention remain
accurate; this is not the existing terminal dismissal action. Answer delivery already in progress
cannot be hidden by the button. Old paired owners omit the action until they advertise support.

## R19 — owner-supported schedule repair and bounded unattended execution (requested)

Status: added to scope; not implemented or advertised as callable. The current registered catalog
has no schedule tool. Existing browser/native-control refusals must not be bypassed. Keep the
simulator review and rollout holds. A separate interactive mockup must be reviewed before any
Transcription UI redesign is implemented.

Expose discoverable schedule list/read/update/enable/disable and start-test-run operations through
the actual registered Proteus MCP owner boundary. Updates require current revisions. Test start
requires a stable operation ID with durable deduplication/run receipt, source/model/tool/permission
preflight and overlap protection. Expose status, pending approvals and results, plus schedule-to-run
linkage, retry and stop-test controls. Reconcile ambiguous starts before retry; cancellation remains
scoped to an exact authorized run. Never approve another agent's pending tool request.

Preserve captured run snapshots. Changes must explicitly distinguish future runs from applying a
validated refresh to an existing run. Source/context and schedule-specific MCP selection/refresh
must be owner-supported even when context selection excludes defaults; loading unrelated default
sources is not an acceptable workaround. Never repair runs by editing their JSON directly.

Unattended workflow authorization must use selected constrained tools and explicit per-tool/action
rules, or another audited bounded mechanism. Directory access does not authorize shell execution;
exact-command saved rules cannot be broadened into unrestricted cat/python/shell prefixes or blanket
autopilot. Verify the configured vault root during preflight instead of adopting an app container.

Native semantic/ASR execution stays in independent Mnemosyne services while Proteus is closed.
Future Transcription controls observe/control health, logs and statistics and display background
Codex execution records; they do not absorb native scheduling. The schedule-testing chat supplied an interactive prototype and design/ownership brief; they are
review material, not product UI approval. Wait for operator review before implementing the redesign.
Native execution receipts/state support activity projections, but successful historical CLI JSONL/
stderr were deleted: complete old conversations cannot be reconstructed. Design a native-owned,
bounded structured event journal with redaction/retention before promising chat-like history.
Do not duplicate source transcripts into another archive. Read-only background execution records
must not resume sessions or rerun plans; discussion starts a separate chat with selected permitted
context. Keep model completion distinct from deterministic validation and verified effects, and
provider-reported usage distinct from source size or verified billing cost. Preserve
its temporary serial-test pauses until that workflow explicitly reconciles them.

## R17 — scrolling correction implemented in source

Reuse one freshly read account identity per synchronous browser projection; send window-scoped
activity timestamps without full histories; avoid full owner refreshes for text-only streaming.
Permission freshness and reconnect/push-loss fallback remain intact. Controlled Electron input gap:
128 ms before, 30 ms after. See [measurements and live acceptance](releases/2026-11-02/scroll-performance.md).
Desktop publication/rollout remains held for simulator review.

## Nov 2 address completion and site icons

Browser and New tab URL fields now offer history-ranked origin ghost text. Enter opens it; Tab
accepts a canonical URL ending in `/` and keeps focus for a path. Saved site icons appear left of
history rows, using profile-scoped cache only and a globe fallback. Lookups are debounced, run in
the history worker and stop outside address editing. Native retains multiline URL editing and
supports owner history with a cached fallback. Details and verification are in the
[Nov 2 implementation](releases/2026-11-02/implementation.md).

The separate [scrolling investigation](releases/2026-11-02/scroll-performance.md) records the live baseline and implemented profile/activity/stream correction, with controlled
before/after measurements. Live post-install acceptance remains open; no deadlock is claimed. Simulator review and the release hold remain in force.

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

# Nov 2 release plan

Status: implementation started in the Nov 2 chat; **0.2.41** reserved through the release workflow.
The five live defects below carry forward from closed Nov 1. New requests remain part of this
open release. Do not reopen Nov 1 or relabel its accepted packages.

## R1 — embedded browser sometimes uses only part of its available surface

The operator still observes incorrect browser sizing on the installed Nov 1 build. Switching away
and back repairs it temporarily; manually opening a new tab has not reliably reproduced it.
Nov 1's surface ResizeObserver and toolbar stabilization regressions passed, but did not establish
that this remaining live case was fixed. Preserve that distinction.

Capture the affected surface, parent bounds, selected native view, scale and layout/selection
revisions before switching tabs. Trace the writer that applies stale or incomplete bounds.
Exercise normal opens, restored tabs, project/window changes, extension popups and resizing on
Mac/Windows/Linux. Require a deterministic failing preceding-source reproduction and passing
exact-package verification without using a tab switch as the repair.

## R2 — Bitwarden authentication return and autofill

On the installed Nov 1 Mac build, Bitwarden unlocked but its native action popup remained at
**Loading vault**. Earlier synthetic extension authentication-to-fill tests passed; the real
extension workflow still failed. The operator previously needed to close/reopen the popup after
authentication to get passwords offered.

Trace popup/window/tab identity, focus, runtime messaging, authentication return and extension
lifetime against Chrome expectations. Preserve the existing profile and vault. Never read or
log passwords, PINs, tokens or vault contents. Verify real unlock-to-ready behavior and authorized
autofill on a controlled login form, with private live evidence outside source. Do not install a
different profile or weaken sharing/permission boundaries to make the fixture pass.

## R3 — desktop input broker cannot resolve an action that closes its target

An Escape action closed the extension popup. A fresh observation reported that exact window no
longer existed, but the broker kept its uncertain target and refused observations/input on other
windows. Stop released the control lease but intentionally retained uncertainty. This blocked
further native observation of R1 and R2.

Investigate `src/services/remote/desktop-control.js`: uncertain input state is cleared only after
a successful same-target observation. Add a supported, authoritative closed-window result that
can settle uncertainty while preserving host arbitration, process/window identity, permissions
and the requirement for a fresh exact-window observation before any subsequent input. Discovery
alone must not authorize input. Do not bypass the broker through another driver, shell capture,
new agent or direct input. Test target closure, PID/window reuse, denied observations, lost
responses, Stop and a legitimate new-window observation.

## R4 — machine-specific local model choices and understandable provider presentation

The physical iPad acceptance check failed. Its New chat provider list shows **MTPLX**, **llama**
and generic **Shared local models**, while the shown model pickers offer only **Choose model**.
The operator expects each entry to identify the machine that actually runs it, and wants the
presentation decisions worked out in Nov 2 rather than treating adapter-name parity as success.
Two operator screenshots establish the live presentation; keep their private URLs and device
details outside source. This is a reported failure, not a verified end-to-end local-model workflow.

Inventory actual owner-advertised inference endpoints, machines, models, capability/availability
metadata and the existing route identity. Decide how to group and label machine/model choices,
including adapters available on more than one machine, unavailable/offline machines, an empty
catalog and saved choices. Avoid a generic Shared bucket that obscures execution location or
duplicate routes that look like independent models. Preserve provider/model/host identities,
saved selections, defaults and permission boundaries. Document the chosen design before building
it; do not hardcode the screenshot's machines or a model/effort table. Verify selection and an
authorized real inference on the intended machine from desktop, web, iPad and iPhone.

## R5 — iPad New chat belongs in a tab

The operator's physical iPad screenshots show **New chat** as a centered modal over the existing
browser tab. Match the desktop's New chat page inside a new tab, retaining normal navigation,
workspace/project placement and execution-owner controls. Preserve unsent prompt, attachments,
provider/model choices and retry identity when switching tabs. Cancel/close must not start a
conversation or cancel unrelated work. Verify iPad and iPhone layouts as well as desktop/web
consistency; do not infer the physical layout fixed from a simulator screenshot alone.

## R6 — current GPT and Claude catalogs, including missing GPT-6.1 Terra

The operator requests current GPT-6 Astra/GPT-6.1 Terra choices and a Claude catalog review.
Use refreshed executing-owner metadata for model IDs, efforts, context and speed. Check all
model pickers, preserving saved selections and defaults. Diagnose missing choices across runtime,
host cache, remote projection and mounted controls; do not replace metadata with a name table.
Official OpenAI model documentation confirms Astra and Terra, but account/client availability
requires a runtime observation. Keep account identities and raw catalogs in private evidence.

## R7 — Copilot Fusion versus Auto

The operator sees only Auto and expects the already-requested Fusion option, with a different
presentation in VS Code. Trace actual runtime/version/account metadata and supported session
configuration before deciding these are equivalent or that the account lacks entitlement. Keep
Auto and Fusion distinct. Show Fusion availability/reason in the picker and provider screen;
verify advertised tiers, execution configuration and provider attribution. Synthetic routing
tests alone do not establish real Fusion availability or successful execution.

## R8 — restore the SafariSelector-style incoming-link destination selector

The operator reports that the project/window selector no longer appears and tabs open in
unexpected windows. Trace OS link delivery, picker focus, rules/defaults and destination-window
selection. Preserve configured routing and existing window/project/tab identities. Verify warm
and cold links, multiple windows, focus changes, cancellation and explicit destination selection
in an isolated fixture, followed by exact-package and live acceptance.
Confirmed scope: workstation.example.test links opened from Outlook. Internal website links retain their originating
project and do not invoke the external destination selector.

## R9 — quick question answers and repeated prompts

The operator reports that Enter still inserts a newline in the question-answer box, despite the
earlier O1 request, and that the same question is rendered as assistant prose and again as a card
heading. Restore Enter-to-send through the existing submission path. Shift+Enter and Alt/Option
newlines, IME composition, held-key suppression, empty-answer guards, choices, attachment consent
and durable uncertain-delivery identity must remain intact. Omit a redundant heading only when
the same prompt is already present in the event's prose; retain distinct questions and all choices.
For a multi-question event, retain each card's label so its answer field remains identifiable.
Apply the shared desktop/web card behavior and native return-key handling. Verify the preceding
failure and corrected keyboard/choice/draft/retry behavior, including native software-keyboard
Send. Earlier accepted R1–R8 artifacts do not contain this addition and must not be relabelled.

## R10 — first mobile preview (navigation superseded by R12)

The first preview repaired empty legacy outboxes and retained orphaned request receipts. The
operator clarified the navigation contract after reviewing it. R12 supersedes its extra plus,
chat children and sidebar resource placement; do not restore that initial design.

## R11 — prior request and branch audit

See [the audit](releases/2026-11-02/prior-release-audit.md). All seven prior remote heads were
strict ancestors of main; they and three old local branch refs were retired with exact-head
checks, leaving main and Nov 2. Dirty detached worktrees and hashed patches retain original edits;
one unique browser-host resize regression was recovered and passes. No extra merge was necessary.
The earlier unimplemented/partial request register remains visible in the audit; it is not a
claim that every collected October item was delivered. Further product changes remain tracked
in the open Nov 2 effort.

## R12 — clarified navigation and recovered requests

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

Implement recovered October O2/O4/O6/O8/O9/O10/O12/O13 and A2/A4/A5/A6/A8: session expansion,
intranet parsing, verified attachment-only input, concise question cards/shared Return handling,
ordered attachment viewers/dates, submitting-window origin, continuation controls, trusted-gesture
autoplay and native question attachments. O5 actual LAN access, A7 Linux compositor and N2 broader
projection profiling remain live acceptance/follow-up. Preserve separate inference/Fusion/vault/
Outlook acceptance. Test mechanisms do not establish the physical screenshot's exact cache cause.

Review hold: both shared simulator Preview apps must be reviewed before any new physical-device
build/installation, desktop release package, publication or rollout. Old accepted packages retain
their historical identity and cannot be promoted as R12. Related superseded Windows/Linux builder
turns are verified cancelled; queued old-source requests remain retained and require reconciliation
before reuse. No unrelated work was cancelled.

## Handoff and acceptance

Start with `docs/handoff.md`, `docs/release-process.md` and the Nov 1 closeout. Private project
documents contain exact live tab/window IDs, artifact pins, user confirmations and recovery
receipts. Refresh current tool catalogs and identifiers before using them. A temporary browser
tab was left open at the operator's request to catch R1; inventory it rather than duplicating or
closing it as cleanup. No further work on these defects is required in the Nov 1 chat.

Build and validate locally without GitHub Actions. Preserve active chats, tabs/history/order,
drafts, credentials and verified recovery generations. Follow the designated per-platform build
and owner-managed update workflow, then complete publication, rollout, main integration and
eligible cleanup under the standing release authorization. Record implemented, synthetic-tested,
live-verified and deferred results separately.
