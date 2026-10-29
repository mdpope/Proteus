## October 29 — bounded maintenance instead of elevated updater shells

Keep maintenance and native source builds behind the owning updater service. A plan digest binds recovery changes to full verified evidence; absent historical backups remain unavailable records rather than fabricated receipts. Only the designated Windows builder holds private source/toolchain/key references, and it checks the signed feed before building. Consumer machines use conventional per-user NSIS updates. Do not require an interactive test account for an unchanged installer recipe; qualify changed installer behavior separately. Native control supports acceptance, while the independent helper owns restart and recovery.

## October 28 — complete request-local permission display reuse

The existing display snapshot memo covered context construction but inherited permission display
still canonicalized the same roots inside each chat's working-folder checks. Production owner
diagnostics correlate repeated roughly one-second delays with state assembly; an isolated 500-chat
fixture reproduces 124,129 repeated path resolutions despite using a snapshot. Route every display
path through the same bounded synchronous memo, including provider-folder display via an optional
resolver. Expire it at the next microtask and leave actual authorization target/grant checks fresh.
This reduces demonstrated repeated filesystem work without retaining a cross-request trust cache
or adding another owner process. Longer uninstrumented delays and real HC gesture acceptance
remain separate from this correction.

## October 28 — 0.2.32 ownership, persistence and visibility choices

**Chat persistence.** `RunWriter` owns chat record files. Provider narration during a running turn is coalesced to at most one save per 250 ms; serialization stays on the owner thread, the write and fsync use the libuv pool, and a per-chat generation check plus synchronous rename guarantees an older background save can never replace a newer immediate one. User input, delivery receipts, questions, approvals, attachments and status changes stay synchronous and durable before callers continue. A crash can lose at most 250 ms of narration that the provider session also retains. Records are now compact JSON.

**Change fan-out.** Engine `change` events carry `{stream}` for live text and `{stream, activity}` for coalesced narration. Owner SSE events are coalesced and name affected chats; windows refresh only a visible affected conversation for streaming-only bursts and fall back to full state every 3 s. All windows share one assembled `/api/state` per generation (also invalidated by mutations, scheduler errors and on-disk schedule fingerprints, maximum 300 ms). Device publish skips stream-only changes for unwatched chats.

**Native navigation.** An associated chat is always a tab of its workspace/project; only unassigned chats use top-level tabs. The saved `<kind>-navigation:<id>` draft is the single selection owner for the tab strip, iPhone drawer and iPad sidebar. `RemoteStore` uses Observation so views track only the host values they read; typing drafts publish through an explicit revision only when controls need refreshing.

**Approvals.** A chat's captured base working folders are working folders exactly like the workspace's, in every mode; folders contributed only by selected sources stay gated, explicit read-only folders stay read-only. Chat-only autopilot is unchanged (it does not add roots). Update coordinators carry `updateAuthorization` at creation and auto-allow only `proteus_update`; protected requests still prompt; the desktop-control setup chat does not inherit it.

**Steering Claude.** Claude Code 2.1.308 accepts a stream-json user message mid-turn and applies it at the next step. Steering writes the message without interrupting; if a result arrives before Claude reads it, the turn remains open for the follow-up result. `steerMode:'interrupt'` preserves the previous behavior.

**Notifications (operator option B).** Notifications carry the chat title, a bounded plain-text preview and the source computer through downloads.proteus.example to APNs. Transport remains HTTPS; Apple can read alert text. Prompts and URLs are still not forwarded. End-to-end encrypted alerts would require a notification service extension and remain a later option.

**Attachments.** Files actually delivered to a provider are kept read-only and content-addressed under the chat's attachment history, readable only when a message in that chat references the hash, and deleted with the chat. Clients render inert previews (images, text as text) or offer a saved copy; the owner serves raw octet-stream bytes so markup cannot execute at the app origin.

**External applications.** Links to non-web schemes ask before opening with the registered application's name; "always allow" is remembered per profile, HTTP(S) site and scheme. Dangerous and internal schemes are never offered. **Link picker** windows already displaying the destination project win over a focused window that merely has it open; an untouched picker dismissed by clicking away opens the default destination, otherwise an ordinary tab, never dropping the link.

## October 27 — each update owns a fresh coordinator; attachment steering follows provider capability

Manual update UI never chooses an existing chat. Its owner service validates the signed selected release and saved current provider metadata, then durably claims a new unassigned coordinator for that upgrade. Persist the operation ID in the run so uncertain HTTP responses can reconcile after restart. The coordinator's own run owns staging/handoff/continuation; a later upgrade receives a new chat. Keep provider configuration mounted if update-journal inspection fails.

Nonblocking answers use the same exact-file/provider/device consent as ordinary replies. Native input references a current-turn question attachment reader; structured asynchronous answers use the existing provider attachment steering/queue transport. Do not force capable providers to queue merely because files exist. Check advertised media types, retain original bytes and current turn identity, serialize steering, and never replay an uncertain consumed attachment delivery. Remote/native projections expose capability without exposing send proofs.

## October 26 — Own Windows terminal processes before starting commands

The existing node-pty natural-exit cleanup cannot enumerate a console after its root exits;
actual tests leave descendants alive and reach a delayed numeric-PID fallback. Enabling the
included ConPTY DLL removes a warning but fails bounded process exit. Neither behavior is an
acceptable ownership boundary.

A build-time compiled guardian assigns its own current process handle to an anonymous,
noninheritable kill-on-close Job Object before starting the Electron broker or any user command.
The job owns the complete inherited tree; natural exit preserves the shell exit code and output
before teardown. Forced termination has an unknown shell exit code. The broker never calls the
vendor kill path. The only bounded stuck-guardian fallback uses its retained ChildProcess handle.
Unsupported job/runtime policy fails before command startup; it never chooses a weaker backend.

Keep lifecycle confirmation separate from a bounded close request. If termination cannot be
confirmed, reject the request while retaining its update/disposal blocker; only actual guardian
closure confirms cleanup. Reserve the entire asynchronous create operation before its first
await so update idleness and terminal capacity cannot race module import or guardian startup.

Compile only on the Windows build host, verify unchanged source/compiler bytes across compilation,
then hash the exact executable as runtime and its source/build recipes as build inputs. The source
companion and acceptance receipts must preserve those identities. No compiler, SDK installation,
vendor patch, trust change or runtime download occurs on an end-user computer. This decision is
source integration; exact packaged and real installer acceptance remain distinct gates.

## October 25 — Combine queued corrections behind the existing preview review gate

The latest operator handoff authorizes implementation, isolated build and tests for items 28–37.
It does not authorize replacing the installed app. Preserve the merged MTPLX pilot as preview-only
and keep historical installed acceptance separate from the new candidate's synthetic evidence.

Move placement uses authoritative owner project navigation metadata, without execution roots or
permission grants, so a stale renderer catalog cannot convert an already-committed move into an
unacknowledged first attempt. Save placement before acknowledging; acknowledge before unrelated
painting. Do not retry an uncertain mutation. Visibility preflights target their source scope.

Allowance continuation is per-chat persisted owner intent, not a scheduled-task rerun or a
replacement chat. Only a recognized allowance failure and authoritative applicable reset may arm
it. Recheck quota after the latest exhausted window plus five seconds; unknown quota waits with
bounded checks. Preserve the original session, effective permissions, context, queue and stable
delivery ID. Changed inputs/configuration cancel intent; ambiguous delivery becomes attention.
The checkbox is off by default and persists independently of a one-shot wait. Copilot's inferred
monthly reset is unsuitable for automatic continuation.

Remote UI reuses local presentation/binding while owner catalogs, mutations, paths and filesystem
authority remain remote. Unknown older capabilities are disabled with an explanation. Only the
specific permanent legacy ordinary-chat rejection permits a reconciled manual-send equivalent;
a timeout cannot select another delivery method.

Resources attributes each process once, including shared app renderers, and lists cold canonical
browser descriptors without instantiating them. Hover preview is display-only. Copilot's automatic
root is its own resolved working directory, not the home directory or a configurable workspace
grant; it approves file requests without broadening command/tool approval.

## October 25 — Capture observable activity with explicit provenance; preview before installation

The operator approved default targeted grouping, removed the format switcher and requested the
full Activity capture work before a Design Preview review. Keep raw reasoning/signatures out of
the event journal. Capture only observed lifecycle intervals, provider-reported usage and explicit
public summary channels. Codex summaryTextDelta/item.summary is such a channel; MTPLX's reasoning
content, Claude thinking blocks and Copilot reasoning text establish phases without being stored
as summaries. Do not synthesize summaries from that text. Ordinary assistant prose stays inline.

Store activity as separate structured journal records, never as provider replay input. Show phase
source/agent, interruption, observed start/end and scoped usage. Session totals, complete-turn
aggregates and individual-request usage are distinct; show unavailable counts rather than zero.
Claude input/cache fields are disjoint; reconstruct total input only when all components exist.
Do not add cache/reasoning subsets to totals or claim observed wall time is exact inference time.
Missing starts/ends in older or crash-interrupted records remain unknown. Bound summary storage
and activity counts, and issue a visible notice if capture hits the per-turn limit.

Provider activity heartbeats advance only when actual events arrive; UI elapsed-time repaint must
not conceal stalled work. Keep questions, pending approvals, warnings, failures and material
context loss visible. The shared renderer defaults to this presentation with no format controls.
The MTPLX adapter remains preview-only; enabling its production registration is not implied by
merging shared Activity support. The latest operator checkpoint is Design Preview review before
any local installed-app update or wider distribution. Carry that hold into the release handoff.

## October 25 — Compare projections of real saved chats (historical)

The event journal stores normalized provider messages, status notices, tools and permission
records. The conversation renderer builds message rows/Activity from that journal. Provider
session input and transcript replay remain owned by the adapter and engine; a display toggle
must not rewrite or feed projected events back into those histories.

Expose Current / Grouped activity only in local Design Preview. Current remains the default.
The second view groups exact saved MTPLX thinking notices
with adjacent tool events. Preserve original text, ordering and event keys for drill-down.
Never classify Claude/Copilot or ordinary MTPLX text using first-person words or message length.
Keep warnings, questions, final answers and unclassified text as messages; pending approvals
retain the existing separate UI. Tool failures retain their existing failed group indicator.

Keep selection and disclosure caches in the renderer, per loaded chat; they reset on restart
or cache eviction. Preserve draft/composer, loaded history window and reading anchor when
switching views. Historic notices prove only that a status event was recorded: do not infer
phase duration, recover discarded reasoning or invent usage detail from their timestamps.
Collecting richer provider events remains a separate implementation decision.

## October 24 — MTPLX owns a bounded approved tool loop

Reasoning modes and effort are independent controls populated from the loaded server's model
policy. A request-level opt-in is required for MTPLX to honor them. Provider default leaves the
field omitted; explicit Auto follows the model's default mode, On/Off supplies a boolean.
Off preserves the saved effort choice but omits effort from the wire.

Use the official MCP SDK for selected connections, not a cloud provider runtime. Load schemas
through a paged/searchable gateway to limit local prompt size. Validate inner native arguments
and exact server/tool/agent scope, then route execution through the engine's existing permission
flow. Stdio receives the SDK's default environment plus explicitly configured environment;
HTTP/SSE authentication stays with the selected definition. No implicit login/account fallback.

Persist tool intent before dispatch and each result before advancing. Run calls serially,
reject duplicate identities and stop on uncertain MCP delivery without retries. Interrupted
unmatched intents are closed as uncertain transcript entries, never re-executed on restart.
File helpers resolve authorized folders, block protected metadata writes, verify expected file
hashes and replace atomically. Arbitrary shell execution is not introduced; shared terminals
retain their existing live human grant.

Use the established immutable attachment/one-use provider consent boundary for MTPLX images.
Check the fresh model's vision capability before sending bytes. Context fitting evicts complete
older user turns with a notice and leaves the event journal intact. Text UTF-8 bytes plus image
reserves are a conservative estimate, not a tokenizer; MTPLX still owns exact admission.
Thinking content is not displayed/retained in this iteration. Native steering, OAuth sign-in,
production and remote/mobile registration remain distinct future work.

## October 24 — local MTPLX pilot uses a direct, preview-only adapter

Use MTPLX's existing OpenAI-compatible loopback server; do not automate its native chat UI,
start a second model, or route through a paid provider's runtime. Refresh model IDs/context
limits from the actual server. Effort tiers and image input are not enabled merely because
a model name or underlying endpoint suggests support.

Use Proteus's captured selected text sources and core guidance on each request. Persist the
actual delivered message sequence independently of queued UI events so restart/queue ordering
does not duplicate or deliver removed prompts. No tool definitions or MCP secrets enter this
phase. Selected MCPs fail explicitly before credential resolution. Stop aborts the request;
interrupted streams preserve partial text and fail without automatic request replay.

Render generated SVG only as isolated image data after validating a small static element and
attribute subset. Preserve original code; reject active HTML, scripts, events, styles, external
references, entities and animation. This is generated vector code, not raster image generation.
The pilot has no production adapter registration or remote/mobile release.

## October 23 follow-up — canonical chat homes and independent local windows

An organizational chat home governs presentation entry points as well as the project index.
Reuse the same saved chat view under that home; do not recreate its children, provider session
or approval origin. Resolve fresh remote membership without replacing the active subscription.
Explicit null membership remains unassigned. Registry migration retires only housed main aliases,
preserving order, child registries and revision protection.

Native Menu callbacks outlive the IPC scope in which they were constructed; re-enter the source
window before asynchronous effects. Content events and presentation events have separate purposes:
passive descriptor synchronization continues during local typing, while sibling windows on the
same computer keep independent selection/reading state. A rejected sibling presentation must not
seed a replacement selection over it. Paired-computer follow remains available.

## October 23 — shared navigation and explicit live terminal authority

All move entry points use a shared destination control grouped by workspace/project and start
at the current location. The UI delegates to typed owner operations: moving chat membership
does not change captured execution folders/options/permissions; moving a live resource does not
restart its session or rewrite its source authority. Current-location selection is a no-op.

Terminal agent access is an explicit, process-local human grant for the exact PTY identity.
Do not persist it in history or restore it with tmux. Internal tools and authenticated local
MCP use the same host boundary; metadata inventory alone grants no output or input. Snapshot
observations are owner-bound and expire, input receipts prevent duplicate delivery through
uncertain outcomes and off/on sharing, and revocation blocks the next read/input. Closed or
exited sessions cannot be restarted by agent tools. Shared shells retain their OS permissions.

Question attachments remain exact-file/provider/device/question consent, delivered through a
run-bound tool when a provider's native question answer is text-only. Unsupported media fails
before delivery. Neither attachment receipt nor model completion proves external success.

High-frequency native descriptors use immutable snapshots on a serial utility queue; frequent
scroll measurements do not publish whole-history changes. Source organization follows
[documented boundaries](code-organization.md), preserving stable entry points and packaging.

## October 23 local / October 24 UTC — installation and public-consumer acceptance remain distinct

Accept the exact Windows correction after the native updater, installed identity and actual UI
verify. Preserve native and packaged-context data homes separately; human-run bounded repairs do
not authorize profile migration, re-pairing or agent retries of previously rejected deletion.
Cached preservation evidence is not native full-profile equality or cross-device acceptance.

Treat public static publication as its own transition: verify the private artifact/source, reuse
valid full recovery, checkpoint the two entrypoints, preserve every current file and exact symlink,
then verify immutable HTTPS bytes/signature before activating catalog/page. If automatic approval
review rejects that production step, retain preparation/receipts and request exact authorization;
do not reroute the command or equate installed Windows acceptance with public availability.

The operator subsequently approved the exact production publication and separately approved the
Windows-chat consumer instruction in the current chat. Both steps passed through their original
routes. Public verification is complete: full binary hashes/signature before activation, actual
rendered page, installed-module public download/extraction/isolated startup and separate native
owner catalog discovery. No redundant reinstall or new native-owner preparation job was needed.

## October 23 — acknowledge navigation before the next batch

A successful navigation response and the last response of a multi-batch reconciliation are
not interchangeable. Metadata can race another desktop's new navigation between those responses.
A narrow callback consumes each navigation's exact accepted branch before subsequent metadata
requests. It only acknowledges an identical profile/URL/current entry and complete ordered local
history. Native guards recheck the observed identity at execution. The ordinary full-descriptor
apply and changed-during-I/O guard retain their existing responsibilities and do not relax to
make stale native pending flags disappear. Uncertain request IDs and strict navigation conflicts
remain durable. Tests must include a real native link followed by an immediate reverse address edit.

## October 22 — explicit chat recovery and provider input boundaries

System failures belong in chronological message boxes, not collapsed Activities. Continuation
uses the existing owner/session and failure identity, leaving queued inputs for normal successful
completion. Capacity retry is explicit per chat, serialized, one minute apart after settlement,
and never silently restored after app launch. Effective configuration/permission changes invalidate
the policy; update/lifecycle guards treat a waiting retry as work. No model fallback or automatic
approval is introduced. Buttons live inside the failure message rather than replacing the draft.

Steering media support is an adapter capability, separate from ordinary file acceptance. Use
native structured input shapes, existing exact consent, immutable bytes and message deduplication.
Codex temporary images outlive steering acknowledgements and retire with the native turn.
Claude retains its acknowledged interrupt/drain/continue semantics. Unsupported inputs fail before
delivery; an ambiguous acknowledgement never authorizes replay. Existing queued-file promotion
requires separate receipt-aware design and stays unavailable; fresh attached steering is supported.

Update relaunch preserves explicit provider executable and configuration *locations*, not arbitrary
tokens. Do not rebuild credential stores or infer a valid login from file/Keychain existence.
The local default-profile Claude sign-out predates this correction and is not explained by the
custom-location bug; preserve that distinction through live acceptance.

Deep workspace selection uses the existing saved child-selection map with a virtual same-owner
workspace/project edge. It changes navigation memory, not resource parentage or execution authority.
Connections wrapping/spacing remains scoped to that screen. A narrow pending question yields
height to the composer footer once the editor reaches its minimum; its body already scrolls.

## October 22 — follow publication requires a new interaction

A saved or hydrated presentation difference is insufficient evidence that a person chose it.
The follow controller keeps that passive baseline locally and publishes only after fresh input,
or once to seed an empty owner scope. Native pending-entry changes bridge actual browser
navigation outside the shell document. No-op input settles without authorizing later passive
changes. The owner suppresses identical normalized updates while renewing sequence and lease.
An explicit asynchronous address submission holds authority through native completion and
releases on success/failure; stale pre-navigation observations cannot consume that action.
Existing pending-position precedence, human cancellation, full-history and scope boundaries apply.
This prevents an idle desktop from repeatedly taking selection control; a new remote interaction
still applies. Source, exact-package and installed acceptance remain distinct.

## October 22 — selected-entry metadata intent can converge without execution

A browser title observation is satisfied when the authoritative currently selected entry has
the exact intended entry ID, URL and title. Dropping that redundant local intent does not assert
that its operation executed or has a durable server receipt. Reconciliation may skip it before
dispatch, including after an uncertain reply. For an explicit `NAVIGATION_CONFLICT` on a single
redirect request, hydrate once and test the same condition; do not retry or rewrite the operation.
This recovery applies only to one redirect, optional metadata opens for that same browser tab
and profile, and optional reorder. Navigation/traversal intent cannot be certified by matching
present metadata. Rebase only the unsubmitted metadata tail against the fresh snapshot, preserving
concurrent tab additions/closures, then use the normal request protocol. Do not replay an
acknowledged prefix. Preserve original pending/request state when proof fails.

Keep server revision and operation-digest validation strict. A pending Back/Forward operation,
different selected entry/URL/title, closed tab, operation-ID collision, journal refusal or uncertain
transport response cannot use this stale-conflict recovery. Do not create a server receipt for
an operation that was only settled locally. Full history, visits and existing receipts are retained.

## October 22 — follow input freshness across descriptor latency

Treat a pending owner presentation and a passive local read as different sources of authority.
For the same tab/child/page/URL/history-entry identity, a passive positionless update must not
advance the owner revision ahead of an already received scroll presentation. Preserve newer
human changes and distinct navigation identities, including native navigation without a shell
input callback. An unchanged read settles a no-op human signal instead of blocking later events.

Descriptor hydration is a barrier for navigation identity, not for every newer position on that
same page. Re-read after the barrier and coalesce current positions only while scope, generation
and identity remain unchanged. A different entry, including one with the same URL, needs its own
barrier. Preserve presentation pacing. This correction covers events pending during reads and
hydration; it does not introduce a new server conflict protocol for updates already dispatched.

## October 22 — follow synchronization completion and account read coalescing

Keep durable navigation and ephemeral presentation on their existing service boundaries.
The presentation caller must await every reconciliation already queued behind its navigation
request; detaching that pass can publish a selected browser before its URL/history seed exists.
Do not mask this race by adding fixed sleeps or bypassing navigation conflict checks.

Coalesce only concurrent account-bound website reads, with immediate disposal on settlement.
Do not cache authorization/credential responses or raise rate limits to accommodate duplicate
panel requests. Account identity and transport form the in-flight isolation boundary.

## October 22 — bounded external transcript coverage for manual Linux update

The current Linux provider uses a shared home outside Proteus app/profile snapshot roots. The
manual deployment captures only the existing referenced native transcripts in the same current
recovery generation, with stable per-file hashes and an explicit missing-reference/external-state
manifest. Shared account/index/config and unrelated chats remain dependencies. This avoids claiming
whole-provider recovery or restoring stale shared state. It is a manual recovery procedure, not an
automatic-helper feature. See desktop-updates.md and the October 22 Linux acceptance.

## October 22 — integrate Windows releases at existing service boundaries

Keep release streaming and token refresh in AccountSession, so the extracted shared account
service and its legacy Life alias use the same authenticated transport. Combine Windows installer
recovery and atomic file replacement with the worker-based inspection and resumable recovery
design, retaining strict versioned package provenance. The standalone Linux relay uses built-in
owner/mode checks; load the Windows ACL helper only on Windows so its minimal container does not
acquire a dependency on the desktop source tree. Source integration does not rebuild or republish
the exact Windows artifact already accepted on the installed owner.

Flush copied recovery bytes through a writable temporary handle on every platform; Windows
requires it. Temporarily make only the new copy owner-writable and restore the original file mode
before snapshot verification. Never change the source permissions or skip the durability flush.

## October 22 — adopt the mobile pairing transport

Promote the pending native RemoteStore into the saved destination after its credential/index
write succeeds. Move its encrypted cache to the host-specific path after draining pending writes;
retain the old destination's history on re-pair. Do not create a second socket or rely on a
Task.yield handoff during authentication. Keep persisted pairing separate from authenticated
connection success: an ephemeral completion event routes the UI only after `ready`, and ordinary
reconnects cannot reissue that event. Failure still preserves durable keys and cached history.

## October 22 — video gestures and extension placement

Keep the existing native website WebContents in the detached video window. Isolated frame preloads
forward only trusted numeric drag/pinch gestures; the host checks current player/frame/focus and
applies bounded work-area geometry. Playback controls remain interactive. Do not mirror video or
recreate the media stream. Keep pin/order preferences in the existing per-profile local extension
registry, with cached icon metadata and explicit change notifications, rather than adding account
sync or fetching installed files on every browser-state update. Hide reuses existing lifecycle
operations, and new-tab gestures delegate to the existing scoped creation actions.

The operator rejected the earlier Home URL/search entry. Remove it from both normal and error
states, keep browsing in existing browser tabs, and make Proteus the primary Home heading.

## 2026-10-22 — preserve durable state; synchronize visible presentation separately

Keep durable tab/history ownership in ContentTabs and introduce a small ephemeral follow service
for the selected owner project/workspace. Bind browser positions to navigation identity, use stable
chat anchors, and coalesce replaceable gestures. Never transmit browser sessions or page contents.
Join/read on entry; do not hydrate inactive scopes. Validate the existing document/resource boundary
and avoid replaying old gestures after reconnect. The operator chose to keep terminal output local.

Preserve full histories, native find, drafts, and selection: reduce layout work and reuse DOM instead
of removing arbitrary loaded rows. Bound inactive history by count and serialized-byte estimate,
while pinning active provider references. Keep atomic synchronous durability and remove only a
proven duplicate save; do not introduce a new event format in a performance refactor.

Use versioned updater provenance with installation-bound identity and worker I/O. Recovery follows
two verified generations per installation/device, narrowly excludes disposable caches, and resumes
verified partial copies. Storage accounting is read-only by default; cleanup retains active helper
and unresolved recovery dependencies. Shared-account auth is independent of Life, preserving the
existing vault/consent while adding optional projections. Leave the root license unchanged.

## 2026-10-22 — host-owned agent chat authority and durable feedback

Use one `ChatControl` service for internal provider tools and external local MCP, layered on
existing encrypted peers and retry receipts. Pairing is transport trust, not an internal agent
grant. Bind grants to origin chat/context and host/project/chat scope; leave destination tool
approvals human. Use separate observer connections so old single-watch peer implementations
do not replace the user's selected chat. Persist task identity and feedback delivery before
returning acceptance. Explicit notification may queue a continuation, but never revive a
stopped/interrupted origin. Treat all returned content as untrusted and model completion as
separate from external workflow success. Require owner capability for atomic project-scoped
mutations rather than weakening scope during mixed-version operation. Develop in isolation
from concurrent source edits, integrate only the feature delta after review, and hold
installation/deployment for operator review.
## 2026-10-22 — Windows reuses Linux desktop chrome

Use the existing shared frameless shell and native popup menu on Windows, including sender-bound
window actions and menu command routing. Preserve native accelerators and F10 access instead of
adding a separate menu implementation. macOS retains its native traffic lights and menu.

## 2026-10-22 — Windows distribution and recovery use the existing owner protocol

The operator selected a conventional per-user installer and an initially unsigned Windows
executable. The latest distribution authorization selects downloads.proteus.example, superseding the initial
proteus.example choice for Windows. Pin an independent Ed25519 publisher public key in the client;
keep the private key outside checkout and server. Bind the WTB origin, exact archive, installer,
platform/architecture and package/source identities in the signed manifest. Keep account OAuth
credentials separate from the static WTB channel and reject redirects. Require explicit operator
or chat handoff after download and isolated acceptance; do not add unattended updates. Preserve
existing trust keys and compatible offline manifests; download channels cannot replace trust.

Windows replacement uses the registered cached NSIS installer rather than renaming a running
application directory. Keep one exact previous installer in each verified recovery application;
restore application bytes without overwriting newer data or retry receipts. Preserve the existing
protocol-1 idle barrier, helper journal and same-chat delivery ID. A standalone Engine Room update
needs no model chat. New homes may initialize empty recovery policy; existing homes require the
operator inventory and the established two-generation retention procedure.

## 2026-10-22 — Preserve Apple request continuity in Proteus

The operator requested all Apple links, form contents and steps in the Proteus project, then
submitted the restored browser request personally. Apple confirmed **TGNRQJ22PP**. Keep a tracked
process/status record and an ignored owner-only `local-records/apple-browser-review/` receipt with
the private URL, last observed narrative and confirmation screenshot. This preserves operator
continuity without committing the bearer link or credentials. Canonical hosting, protected signing
material and deployment recovery remain in the WTB website project. Mirror the receipt there.
Do not submit a duplicate request or treat submission/notarization as entitlement approval.

## 2026-10-22 — Separate signing authorization from browser entitlement review

The operator explicitly authorized Developer ID issuance, explicit App ID registration and
notarization of the private evaluation package. Complete these distribution prerequisites and
verify the exact hosted artifact before final review. Keep the browser entitlement request
unsubmitted. Preserve all existing certificates and installed app identities. Signing credentials
remain in the protected WTB delivery project and local Keychain, never source or hosted payload.
Earlier signing/registration holds below are superseded by this authorization.

## 2026-10-22 — Private evaluation delivery belongs to the WTB website

The operator chose downloads.proteus.example rather than proteus.example. Keep the expiring, unlisted read-only route
separate from public navigation and application accounts. Anyone possessing its private link can
read the five review files; this is capability-link access, not authenticated Apple-only access.
Canonical delivery/configuration and protected URL/signing preparation live in the WTB website
project. Do not store the access token or signing key in Proteus source. Prepare signing with
existing identities intact, and retain operator review before Apple issuance/registration,
notarization and entitlement submission. Development/hardening acceptance is distinct from final
Developer ID distribution and genuine iCloud integration acceptance.

## 2026-10-22 — Private Apple evaluation and domain-aligned browser identity

The operator selected `org.proteusapp.review.proteus.desktop` for the Apple browser application, matching the owned
domain and native identifier. Keep that development evaluation candidate separate from existing
installed signing and Keychain identities until migration is independently verified. The request
form permits protected evaluation access, so a public launch/download website is deferred. A usable
Apple-accessible evaluation route is still required before submission. No development-only exemption
is assumed. Registration, entitlement submission and notarization remain held for operator review.

## October 22 — identity review and native navigation

Prepare `com.wtbtech.proteus.desktop` in the Apple forms and a separately named output directory via
an explicit review packaging flag. Do not rename historical IDs or weaken updater identity checks:
a bundle/team migration needs OS permission, Keychain and update acceptance before live rollout.
The selected-computer indicator describes routing selection, independently of transport readiness
or computer-control support. Native project destinations must observe selection at the rendered
boundary, not rely on a captured presentation closure. Browser chrome follows a simultaneous
one-finger vertical gesture, including nested website scroll containers.

## 2026-10-22 — Browser eligibility and Apple review evidence

Use the existing host browser service for OS website links, with a bounded startup queue and a
renderer-restoration readiness signal. Preserve callback URL handling, independent tab history,
existing workspace selection and default browser preferences; external URLs grant no agent access.
Expose browsing on desktop Home instead of replacing restored chats/workspaces at startup.

Keep synthetic Chromium WebAuthn evidence separate from native iCloud integration. Hold Apple
entitlement/account/distribution submissions for the operator; stage a development candidate and
review page without implying that development signing passes Gatekeeper distribution assessment.
Do not migrate installed apps' signing team as part of review preparation.

## October 21 — preserve player and configuration ownership

Video fullscreen uses a temporary Electron window containing the original Chromium view. This
meets exact source-window geometry without extracting media URLs, copying credentials or relying
on Chrome's PiP size clamps. The host owns its close/drag overlay; website controls remain native
to the player. Session identity and history are unchanged when the player returns.

MCP configuration grouping is presentation only. Each provider/chat retains its existing approval,
account evidence and recovery identity. Other-computer displays are informational; source-owned
vault/OAuth helpers remain external and are not automatically executed by refresh/status views.

## October 21 — owner-global source favorites

Use one canonical root favorite list with an explicit migration marker and compatibility
workspace projections. Merge active legacy lists once, rather than unioning on every read,
so removing a favorite cannot resurrect it from a stale workspace copy. Workspace imports
explicitly merge remapped IDs; new empty scopes do not replace the shared list. Keep loading
policy scoped, including when a shared favorite exposes a source from another workspace.

Integration inventory versus connection evidence remains a design proposal, documented in
integrations-design.md. Display grouping must retain per-owner/session/account verification;
no remote credential sharing or combined-view default has been selected by the operator.

## October 21 — implemented BF-74–85 design choices

Whole-project movement changes organization while preserving execution/authorization identity.
A catalog move receipt precedes per-chat membership writes and is replayable after interruption.
Moving a source default atomically creates a new General project rather than requiring a separate
replacement-selection mutation; the UI explains this and leaves destination defaults unchanged.
New-chat workspace choices reset while text/attachments remain. Schedule source is untouched.

Native extension recovery is connection-local, with bounded framing/queues and lifecycle handlers,
not a global uncaught-exception suppressor. Patch the pinned adapter reproducibly in source and
packaging, failing closed when its version changes. Optional consent is profile-local; popup identity
includes profile/session and parent. No signing, vault or biometric boundary is bypassed.

Browser observations strip decorative image bytes into content hashes without changing host/UI
icons or full history. No model-visible asset-fetch API or history-delta protocol is introduced.
Claude steering explicitly uses interrupt-and-continue and UUID replay acknowledgment; unconfirmed
input is never automatically resent. Codex selected-server tool approvals use existing saved-policy
identities through the normal permission path, without duplicating tool execution.

See the [0.2.28 release ledger](2026-10-21-browser-chat-release.md) for validation and live limits.

## October 21 — window renderer recovery, independent of host execution

A shell renderer failure is a window presentation failure, not a host/session restart. Subscribe
per app WebContents to Electron's renderer-loss event; defer reload until after teardown and use
only the known local app URL. Preserve the BrowserWindow/window ID, atomic saved session, owner
history/receipts, native browser WebContents and active provider/terminal lifetimes. Do not retry
or replay an unacknowledged tab-management operation; reject its window-local waiter explicitly.
The original operator EXC_BREAKPOINT/SIGTRAP trigger is unknown; recovery does not diagnose it.

Require a current-generation readiness acknowledgement after workspace restoration. Skip ordinary
background-page unloading during crash recovery, clear dead renderer overlay/overview state and
retain all live page/form state. Limit automatic attempts to three until a stable minute; failures
then show a local, script-free recovery document whose preload calls fail the existing origin
checks. Native View → Reload Window resets the retry budget and retries the original app URL.
An unresponsive report alone does not force-kill a possibly shared process. Close/Quit can use the
last saved checkpoint for an unavailable renderer. Never activate or duplicate a turn on reload.

The brand's fixed slot starts just after the native controls (74px) and ends at the unchanged
first-tab boundary (212px), placing its visual center at 143px independently of sidebar width.
Restored tab inventories seed reveal tracking without creating insertion events. Reveal the saved
selection after strip layout; ordinary new background tabs still reveal without changing selection.

## October 21 — passive browser loads and actionable inbox records

Browser errors and history conflicts use the existing notification store and preferences. Keep
recovery IDs local to their original window; do not publish them as account activity or place
recovery controls over a website. Explicit actions recheck the original owner and pending state.
An unavailable or stale action stays unresolved; do not discard receipts or silently replay it.

Native mirrored loads with saved history retain their guard through redirects and repeated
observations. Real link/form/history/address actions and recent trusted main-frame SPA input
release it. Legacy local descriptors without saved history suppress only their initial visit;
there is no canonical forward stack to protect. Main navigation stays device-owned.

New tab reveal belongs to the strip's identity inventory, covering every creation path. Wait
for right-side chrome layout before measuring the full tab wrapper. Metadata/reorders preserve
manual scrolling and background insertions do not change selection. Follow a newly inserted tab's
initial title-width changes briefly, stopping on manual strip input; do not recreate a resize
observer on its own callback. iPhone browser controls
remove redundant bottom padding/container insets while retaining keyboard avoidance/touch targets.

Top-level content without a real child scope has no secondary label/control row. Top App overview
and + remain available. Text selection in content is independent of explicit tab selection.
The extension adapter calls its selection callback for host bookkeeping as well as extension API
requests; suppress only synchronous host reflection so it cannot enqueue stale selections back
to the renderer. Genuine extension-initiated activation keeps the normal host-owned action path.

Saved palette ownership is installation-local: desktop atomic settings, native app preferences,
and versioned browser-local web JSON scoped to the signed-in account. Web revision checks and
storage events handle concurrent tabs; web editing never writes a connected desktop's settings.

## October 20 — native selected content and stylesheet delivery

A container's selected browser identity is the rendering authority. Pass it directly to the browser
pane in main navigation, project/workspace, chat and Team containers; scoped remembered selection
is reconciled to it rather than deciding which unrelated page is displayed during restoration.
Preserve the cached WKWebView and its own coordinator/history. Native Engine Room choices reuse
plain vertical desktop-style hierarchy; device navigation remains independent.

Workspace/project name selection expands the selected tree path; chevrons remain explicit toggles.
Give plain sidebar buttons a rectangular touch shape across the label row so a short title does
not leave untappable spacing. Expansion belongs to user navigation, not background polling.

Palette CSS is an ordinary bundled self-origin stylesheet. The strict content policy stays in
place; successful CSS-variable persistence alone is insufficient visual acceptance. Test actual
grid/swatches and inspect the rendered app in addition to preference round trips.

## 2026-10-20 — permanent local palette and read-only certificate observation

Keep palette editing in Engine Room and apply it to the real UI. Save one named device/host
palette in normal validated preferences; retain desktop unsaved drafts only in that window.
Use portable versioned JSON for explicit transfer rather than implicitly changing other devices.
Only surfaces receive global lightness/saturation adjustments. Preserve OS traffic-light colors.

Capture TLS metadata before navigation and preserve Chromium's default verification (-3) in a
bounded observer. Do not open a second TLS connection, override trust, detach a foreign debugger,
or present a hostname cache without matching the current document's subject and validity.

Desktop windows own presentation and download-list lifetime; mobile devices own their single
main navigation and session-only downloads. Shared container content remains service-owned.

## October 20 — browser reply ownership, ephemeral downloads and explicit sharing

Navigation completion belongs to its captured tab, independent of the UI selection at reply time. The renderer preserves actual redirected URL/history, and native shared-history writes compare the navigation the caller observed before applying an owner response. Find cancellation and layout deduplication do not replace that ownership check.

Downloads use a sandboxed, sender/frame-bound child window rather than hiding the embedded native website for a renderer dialog. File/history operations stay in the same host-owned download manager, scoped to the owning window. Metadata is ephemeral; file retention and saved destination preferences are separate. Restart is an explicit new HTTP(S) download, not POST replay.

The operator reverses implicit browser access: persisted explicit logical-tab grants and revocations replace default access for human tabs. Agent-created tabs receive a host-created grant. A native consent request is separate from model/workflow approval and must receive an actual human decision; a pending or declined request cannot turn access on. Background automation continues on shared pages without changing UI selection.

Global autoplay uses a website-frame preload, so turning it off can take effect on already-loaded pages without changing profiles or reloading forms. It blocks video before activation but permits user playback; it is not an enforcement boundary against malicious website scripts.

## October 20 — Apple-owned Passwords integration

Use the official iCloud Passwords extension on Electron Mac, with Apple’s existing native messaging
host and ordinary per-profile extension installation/permission review. Keep pairing and unlock in
Apple’s UI. Do not export credentials or substitute an app-owned password vault. Offer system AutoFill
settings on native iPhone/iPad, whose WKWebView already handles website credential challenges.
Do not describe Electron’s local Secure Enclave Touch ID credentials as iCloud passkey support.
Validate helper compatibility independently of a successful extension install. On this Mac the
Apple helper is killed with a code-signature error even outside Electron, although its on-disk
signature verifies. Do not bypass that protection or infer that re-signing Proteus fixes it.
Native AutoFill settings belong in device Browser settings outside account-gated profile sync.
Human credential fill/save, biometric approval and physical-device acceptance remain separate.

## October 19 — verify desktop image delivery at the real provider boundary

Keep Cua/Peekaboo host ownership and permission checks independent of provider transport. The
installed Codex runtime accepts dynamic image response fields but the real model reports no
screenshot; use native MCP image blocks for desktop observations on new and resumed chats. A real
canvas-only challenge verifies delivery. Route native proteus_app tool-approval elicitations into
the existing exact Proteus permission decision, consumed once by its protected host bridge. Unknown
elicitation forms/servers remain declined; never infer a persistent grant from the native prompt.

## October 19 — empty history still has authority; conflicts retain scope — queued P1 decisions

BF-2026-10-19-23/24/25 record the operator's installed-0.2.25 failure report. Treat an empty saved
navigation stack as versioned owner state, not absence of a revision. Keep first pending operations,
native empty-history acknowledgement and outbox resolution consistent so retries converge while
pending intent remains recoverable. A move must select the authoritative source rather than copy
an empty stale stack over it. Never bypass optimistic concurrency or rewrite live history to mask
the defect. Conflict presentation must preserve healthy scopes and the newest desired selection/
bounds while native views are hidden. The report's synthetic/live-read evidence is attributed;
this intake adds no reproduction or implementation. BF-26's observed black text rectangles remain
a separate unproven rendering symptom. All release implementation/build/installation remain held.

## October 19 — self-update survives its originating host — queued decision

BF-2026-10-19-21 selects an independent, narrowly scoped updater/verifier and durable original-chat
handoff instead of relying on a model/tool process to survive app termination. Begin with the current
single owner service plus helper; separating the runner into a persistent service can follow later.
Checkpoint/yield before shutdown, fence new dispatch during the final idle check, verify the exact
installed artifact and durable state, then claim the authorized original-session continuation with
delivery receipts. The operator requires automatic same-chat continuation after healthy update
restart and successful compatible rollback, without Continue. Handoff/claims must survive rollback;
test the old build/adapter, retain automatic pending delivery through temporary provider outages and
do not loop into reinstalling a failed candidate. Independent health and bounded compatible recovery
must work without the model.
General crash interruption must not become silent replay. Use the existing host authorization,
source/signing identity, private recovery data and two-generation policy; no live update or helper
installation is authorized by this design review. See [desktop updates](desktop-updates.md).

## October 19 — Cua primary, on-demand Mac Peekaboo fallback — queued decision

BF-2026-10-19-22 selects Cua Driver as primary desktop control and Peekaboo as a Mac backup,
including native application build/test and Proteus self-test workflows. Include the Linux branch
in Cua integration/validation, and advertise other platform capabilities only when actually present.
This supersedes the earlier unselected shortlist. Exact version pins and runtime compatibility
remain pending; no package install, privacy grant, build or live control is authorized by intake.

Keep the current provider/chat as planner. One compact desktop wrapper/catalog supplies required
purpose/order guidance without injecting two duplicate tool sets. Native services start on use;
release only unused Proteus-owned resources after idle cleanup. Tool schemas, backend lifetime and
authorization are distinct; schemas/results already read cannot be removed from model history.
Existing provider registration/reconnection differences must be respected and measured.

Use one host control arbiter across chats/drivers. Peekaboo may supply a confirmed missing Cua
observation/action, but requires a fresh same-target snapshot and its own element/capture IDs.
Resolve unknown/partial effects before another mutation; never replay a timed-out submission or
bypass a denied grant through fallback. Keep the backend steady after a useful switch, with a
bounded recovery path. UI reports target/backend/cursor readiness and Stop. Peekaboo's targeted
background input suppresses cursor overlays; Cua overlay/input support needs host/platform tests.
Browser Playwright and deterministic update recovery remain separate capabilities.

## October 19 — durable document positions and shared More icon — queued decisions

BF-2026-10-19-19 must retain reading positions through document refresh, renderer/web-page reload
and app restart as well as tab switching. Use bounded position metadata in the existing owner
state boundary, scoped by stable document/tab and viewing window/client, with saves during reading
and layout-aware restoration. The single-window fix does not depend on BF-11's multiwindow work;
coordinate its explicit-close/quit behavior without sharing one mutable position across windows.
BF-20 adopts the reviewed iOS-style thin circle with three horizontal dots for desktop/web browser
More controls. Preserve existing menu behavior and the separate BF-10 overview icon. These are
queued design choices; no runtime, persistence implementation or build is authorized by intake.

## October 19 — final native composer and sidebar preview

Keep the iPhone reply composer to one line until explicitly touched, then animate its full
editor and supported options/Send into view. Conversation reading collapses it without clearing
the draft; running-turn Stop and queued-message actions remain accessible. Respect Reduce Motion.
The iPad editor/options remain visible, with the editor starting at one line rather than three.
Grow editors only for explicit newlines; scroll wrapped/overflow text and cap the entire composer
card at half the app window, reserving space for controls and attachment details. Phone Return
always inserts a newline; tablet Return submits and Shift+Return inserts a newline. Preserve
multiline pastes without submitting. Show attachment + in expanded preview controls, with choices
disabled for unsupported synthetic providers instead of inventing upload support. Use desktop Home,
Schedules and Team Tools marks with slightly brighter sidebar ink, six-point project nesting and
nine additional points for items (halfway between the last two accepted item offsets),
and a smaller green close glyph with an unchanged 44-point touch target. These are final native
simulator preview changes, not authorization for a production build or physical installation.
Keep UIKit editor focus separate from SwiftUI's TextField FocusState, and defer keyboard
resignation until after the representable's layout update to avoid the reproduced tablet hang.
Use a smaller composer budget when keyboard space is constrained, retaining visible controls.

## October 19 — native preview Standup and browser follow-up

The operator chose one Standup tab on phone and a tab plus optional order-only dock on tablet.
The dock closes with X; pop-out is removed from both previews. Keep roster/list editing on
Standup and links exclusively on Team Tools, retaining the website account as the record source
and preserving revision/unknown-field behavior. Use numbered people like desktop. Browser More
absorbs Downloads/History; phone puts Refresh before Find and More before overview, while tablet
puts More immediately before overview. Share the supplied overlapping rounded rectangles as the
overview mark; desktop/web remains queued in the separate authorized release chat. Sidebar
selection follows desktop token/outline/icon geometry with smaller equal nesting. These are
native simulator design changes; release and physical installation authorization remains separate.
Project navigation destinations lifted into the outer navigation stack explicitly receive their
existing computer store. Workspace selection clears the displayed main-tab selection while keeping
the browser/session intact; native selection traits follow the same selected tree item as its colors.

## October 19 — bulk tab actions retain typed owner operations — queued decision

BF-2026-10-19-18 selects explicit stable tab identities from the Tabs page through Command-click
or a Select button and checkbox column. Top-row Hide/Move/Close operate through the same owner
and typed resource boundary as individual actions, with BF-17's grouped Move destination. Do not
replace those lifetimes with generic row deletion or imply transactionality across partial owner
operations. Preserve drafts/history/permissions and expose per-item outcomes/retry state. This
is queued interaction scope; no live bulk operation or implementation is authorized by intake.

## October 19 — workspace headers identify project move targets — queued decision

BF-2026-10-19-17 groups tab-move destinations by workspace with selectable project children,
including the real default project. Workspace names are headers rather than redundant move
targets in this flow. Use stable scoped identities and authoritative project metadata, not
ambiguous repeated names or only currently open views. Keep existing resource lifetime/access
rules and unrelated destination groups. This is queued presentation/selection scope, not an
authorization to migrate legacy resources, alter default projects or build the application.

## October 19 — one manual workspace order for cards and sidebar — queued decision

BF-2026-10-19-16 makes workspace-card dragging set a durable manual order shared by the collection
and sidebar, scoped to the owning computer. Use stable IDs and the owner service with revision
checks; a local renderer reorder must not become a second conflicting sort policy. Preserve
selection, expansion, default identity and resource membership/lifetime. This workspace ordering
does not replace manual project ordering or BF-08's current-first/alphabetical overview sections.
Implementation and UI acceptance remain held for the next release.

## October 19 — auth browser selection and initiating-client callback — queued decision

BF-2026-10-19-14 follows the operator's in-app/system browser preference for supported Proteus
account sign-in and binds completion to the originating app, installation, pending attempt and
window. Separate desktop/mobile client identity and callback routing rather than relying on an
ambiguous shared custom scheme or changing only the displayed client name. Preserve existing
sessions/mobile deep links and owner-held PKCE/state/issuer/cancellation checks. Already-working
Life/Team access is evidence to investigate a disabled profile control, not a reason to demand
fresh sign-in. In-app auth must retain its protected content boundary and stay outside generic
agent page access and thumbnail/history capture. This is queued; no auth route/grant was changed.
Widevine BF-15 remains an evaluated runtime option, not an adopted dependency or verified feature.

## October 19 — window Close versus app Quit and direct new-tab pages — queued decisions

BF-2026-10-19-11 separates presentation-window closure from whole-app shutdown: forget an
explicitly closed window's restore placement, but restore every window still open at app Quit
with its geometry, selected item and reading position. Windows share one host/service/runner;
their presentation state and IPC targets remain independently identified. Do not clone sessions,
overwrite another window's saved view or treat window closure as chat archival/turn cancellation.
Command+N creates a window; Command+T creates a scoped tab in the focused window.

BF-12 makes + open a new-tab page directly, with existing supported creation actions as blocks
at the top, on desktop and iPhone/iPad and corresponding web surfaces. One page-level input both
filters retained history and accepts addresses; focus it immediately and use Enter/the existing
angled-arrow icon to open typed input. Explicit result selection opens that saved URL. Filtering
never triggers website navigation or chooses a match implicitly on Enter. Keep existing search,
profile, placement and permission semantics. Both decisions remain queued under the build hold;
they do not authorize changes to the separately owned native preview work.

## October 19 — next-release overview groups current-workspace projects — queued decision

The operator reaffirmed that tab overview includes every project in the current workspace, current
project first then the others alphabetically by name. Each section shows that project's unhidden
navigation entries in strip order, including inactive projects. The reported one chat and three
browsers mean four cards in the current project's section, not a global four-card cap. Hidden
descriptors, other workspaces and fixed workspace navigation pages do not become cards. Keep the
complete inventory in Tabs management, independently of load state. Share per-project visibility/
item ordering with navigation. BF-09's follow-up chooses cached browser **and chat** thumbnails:
refresh soon after interaction and periodically while viewed, persist compact last-good images
locally through unload/restart, and render overview immediately from cache with icons as fallback.
Coalesce capture/writes and preserve actual view identity, authorization, focus, scroll and drafts;
never wake an unloaded tab for a preview. This replaces capture-on-overview as the primary path.
BF-2026-10-19-08/09 record findings and pending acceptance. Implementation/builds remain held.

## October 19 — native Find is keyed to a document, not shell mutation batches

The renderer's app-content observer also sees unrelated polling and metadata changes around an
embedded native browser. Restarting Chromium Find for each batch clears selection and reveals
its first match. Compare query, native ID and an ephemeral document revision before changing the
request epoch. An unchanged passive refresh is a no-op, including while explicit Find is pending.
Top-level DOM readiness advances the revision; history titles, iframe navigation and compositor
updates do not. Keep native Find's deliberate search/stop behavior and current stale-reply guards.
Do not cache a wrapper's object identity or persist a search revision in user data. Renderer-text
Find still rebuilds ranges passively without reveal. BF-2026-10-19-01 tracks exact package and
live acceptance separately.

## October 18 — Source registration is availability; loading is workspace configuration

Clarify the existing model rather than adding a folder attachment step: every registered source
folder offers entries to all workspaces on its owning computer. A workspace saves loading choices;
“Configured in” summarizes those choices or existing folder references, not access or live usage.
One-time folder bulk changes affect current entries only. Source loading stays separate from file
and connected-tool approvals. Desktop/web registered-folder cards use the common 18px Engine Room
gap and wrap controls at narrow widths. BF-2026-10-18-03/04 pass desktop/web normal/narrow UI and
exact signed-package checks. Authenticated web acceptance passes; destination installation and
live preservation are tracked separately in the release ledger.

## October 18 — selected phone drawer is a functional simulator preview

The operator selected the button drawer, preserving the current Proteus screens and deferring
the mock-up's Home redesign and new Share action. Browser Back/Forward/Find/History/one Tabs control
move to the bottom; full URLs remain at the top. Circle “…” holds existing extra actions.
Double-tap manually toggles top controls while retaining bottom controls. Do not add automatic
scroll hiding. iPad navigation is explicitly outside this pass. Gate the prepared code to Debug
iPhone simulators and use a separate preview app identity; source does not establish native
acceptance. Simulator builds, signed installation and 740 runtime tests now pass. Native checks
exercise the actual app through the separate preview and test-runner identities; see
[phone design status](iphone-navigation-design.md) for the current acceptance result. Preserve
browser history ownership, give phone drawer/browser controls full touch targets, and use actual
chat/browser snapshots in aligned overview cards. Use UIKit for interactive Back; phone reading
observations must not introduce a competing SwiftUI drag recognizer. The operator explicitly
requested no dramatic recovery: preserve simulator data, accounts and certificates.

## October 18 — phone navigation exploration reserves the bottom edge for content and browsing

Remove phone app-section buttons from the bottom edge and separate browser controls from the
URL field into a bottom toolbar. Use interactive previous-page reveal and pinch-to-overview
motion on phone and iPad, with honest content thumbnails and cancellation. The operator authorized
a synthetic local phone preview comparing Button drawer, Right-edge drawer and Upper-left pull,
with a Home section hub. The upper-left experiment uses a downward header pull to preserve the
horizontal Back gesture. These options and their button fallbacks are design alternatives;
the production navigation decision is still open. See BF-2026-10-18-02 and the phone design note.

## October 18 — queued iPad navigation follows desktop; phone design stays separate

The requested iPad correction uses two tab-navigation layers instead of a redundant “‹ Workspace”
back bar. Sidebar ordering, section/tab separators, integrated Workspaces collapse and hierarchy
colors follow the accepted desktop. Live Browser belongs in tab “+”, with the same owner boundary
for user and authorized agent loading, rather than a separate Chat tools row. These are queued
design choices in BF-2026-10-18-01, not current implementation claims. BF-02 now tracks iPhone
exploration; do not extrapolate the iPad layout into a settled phone design.

## October 18 — browser access follows app authorization

Remove the independent tab-sharing and extension-profile opt-ins for ordinary website automation.
Legacy flags round-trip without controlling access. Keep profiles as session partitions, genuine
account/backend availability and the single-tab protocol connection; do not export credentials.
Hide/visibility and page loading are independent: explicit agent page use can load a hidden page
without revealing it, while initial hidden creation never fetches. See
[browser agent access](2026-10-18-browser-agent-access.md).

## October 18 — paid native signing without resetting saved identity

Use the paid organization identity and `org.proteusapp.review.proteus` for iPhone/iPad builds. A new signing
prefix cannot read the old app's Keychain, so copying files alone is insufficient. A temporary,
separately signed helper transfers only Proteus's allowlisted credentials using a device-generated
recipient key and authenticated encryption; the private recipient key stays on the device.
The normal product contains no migration endpoint. Preserve the original service names inside
the new access group so existing pairing and encrypted caches retain their identity.

Authenticate file hashes and cache counts together with the credentials. Preflight all conflicts
before any Keychain insertion, read back every inserted value, and make retries idempotent.
Require a fresh per-launch operation ID so stale success receipts cannot pass acceptance.
Keep source credentials and the original installation until paid data/launch acceptance. Do not
revoke shared certificates or uninstall the old app to bypass the team-prefix restriction.
See [native paid-account migration](native-paid-account.md) for exact exclusions, acceptance and
recovery policy. This changes mobile signing only; native Mac and desktop identities remain separate.

## October 18 — owner grouping and request-local status snapshots

Group remote workspace trees under a named Other Computers section. Desktop's local owner,
web's account default and native's saved destination define the primary tree; merely browsing
another owner does not change it. Stable host/workspace/project keys prevent duplicate IDs or
similar names from mixing contents. Native project moves update organizational caches after the
owner confirms them, preserving existing browser views. Pending commands retain their original
identity and issue time, including after deletion redirects; never reinterpret an uncertain action.

Status projections may share one freshly read project/permission snapshot for the duration of a
single response. Do not retain it across requests or use it to authorize future commands. Mutation
revision checks and permission decisions continue reading current state. Deduplicate permission
contexts before describing them, rather than repeatedly loading the same grants and discarding
duplicate results afterward. Bounded full-state timing separates assembly from serialization.

Saved scheduled/manual runs can retain `contextSelection` for their originating schedule, but
their permission display uses the run's captured context. Polling must not prepare a new execution
or replace that context with current sources. Future schedule execution and explicit context refresh
still use ordinary preparation. Reusing captured contexts also avoids the permission-preview cache
cycling through a large saved history on every refresh. MCP source parsing and canonical paths may
be shared within a bounded synchronous display batch; discard those memos after the batch or at the
next microtask. Direct provider resolution, permission mutations and action authorization remain
fresh. Validate captured hashes, source/root targets, modes and environment substitution per record.

Repeated tab-sync errors back off independently by scope from one second to one minute and
deduplicate repeated warnings. Preserve pending operations, original command IDs and issue times;
an uncertain result is not permission to issue a fresh action. Healthy scopes continue. Capacity
backoff remains owner-wide and navigation conflicts retain their explicit resolution flow.

## October 18 — explicit preview source, navigation and approval controls

A registered Source library root is a discovery boundary, not an execution root or access grant.
Await registration scans and project the same registered catalog into every workspace; keep each
workspace's modes independent. Report empty/partial/failed scans, expose Rescan, and merge scan
receipts into fresh catalog state. Nested MCP discovery is opt-in for preview library scanning;
connections stay Off by default. Folder Apply to all writes the chosen mode to all current group
entries, including filtered items, through revision-checked configuration saves. It is a one-time
bulk edit: future entries do not inherit a hidden folder policy and per-item overrides remain.

Engine Room belongs after the workspace tree in the scrolling navigation, with a divider; the
allowance remains fixed. Collapse all clears disclosure and extra paging while retaining selected
content and resource lifetimes. App settings owns Open data folder. This supersedes October 16's
fixed Engine Room placement, without changing production navigation.

Chat approval mode, read-only auto-approval and working-folder access are separate controls.
Use workspace preserves original permission inheritance, Ask suspends reuse, Saved permissions
reuses explicit grants, and Auto-approve tools retains its broad scope. Remember/remove actions
name chat versus workspace scope. Provider-marked read-only metadata is required; shell text is
not a proof of safe read behavior. Selected Codex MCP servers remain authorized at server breadth
for the turn, so the UI must not promise per-call approval.

Preview Saved permissions may request Codex workspace-write when an explicit canonical read/write
grant covers the starting folder. External grants alone cannot implicitly authorize it. The native
policy excludes implicit temporary-directory writes and network access and keeps protected
approval routing. Additions apply on the next explicit turn, preserving an active narrower sandbox;
reductions or unknown changes interrupt without replay. This preview exception supersedes the
older unconditional Custom/read-only statement below; production behavior remains unchanged.
Real-provider and package verification are separate from source/fixture checks.

## October 17 — preview project deletion is organizational

The workspace Projects page allows deletion of nondefault projects after a short review naming
the receiving default. Default protection follows identity, not the name General. Changing the
default affects future work; it does not move existing projects’ contents.

One revision-checked catalog write removes the project and records a permanent same-workspace
redirect to the default selected at commit. Chat membership resolves that redirect without
rewriting active run files or their captured settings. Redirect chains handle later deletion of
the receiving project. Saved-session reads/writes, renderer reconciliation and native browser
creation/reparenting resolve the same mapping, preventing late saves from restoring an old root.
Existing content IDs, terminal processes, browser views/grants/history, document authorization,
drafts, pending approvals and activity timestamps survive. A failed view acknowledgement can be
retried with the original review revision; the durable reassignment remains recoverable.
This decision applies only to the isolated desktop preview.

## October 15 design proposal — organizational Projects and explicit access scope

Proposed, not implemented: [BF-2026-10-15-10–12 design](2026-10-15-workspaces-projects-design.md)
separates an owner-wide discovery library from workspace source selection and access grants.
Workspaces own configuration; Projects organize peer chats/resources. The operator clarified
that the workspace name belongs in top-level app navigation; Projects/Chats/Tabs/Configuration
are fixed left in its local strip, with optional resource tabs afterward and no generic Workspace
tab. The Workspaces collection has Workspaces/Chats tabs. Individual projects open their own view
and are nested beneath workspaces in the existing sidebar line hierarchy. Preserve four-box,
panel and folder icon roles. Reuse chat-index presentation with scoped field locks instead of
designing a separate list for each context. This supersedes the intermediate Workspace tab.
Workspace Tabs aggregates direct and project resources; workspace-created chats use General. Global chat quick
views retain original membership; moves preserve captured execution configuration and permissions.
Defaults apply to new unscoped work, with legacy main/Team/Unhoused records retained explicitly.
Migration must preserve all identities, history, sessions, drafts, authorization and retry receipts.
Bounded Autopilot is a proposed enforcement contract, never a relabeling of existing broad approval.
Keep pending permission requests above the composer and use one Permissions surface from Details
and the composer mode control. Show exact scope and grant origin, retain drafts, leave receipts
and reuse unchanged grants. Prototype controls only; no live policy or authorization changed.
Only documentation and synthetic prototype rehearsal are authorized; [prototype UI rehearsal](design/2026-10-15/prototype-validation.md) passed.

## October 14: converge tab metadata without spending retry receipts

Shared-state application and view lookup are observations, not user interactions. Keep the
first known opened timestamp, accept only newer interactions and retain a known favicon when a
client omits it. Preserve authoritative navigation titles while applying owner state. Repeated
no-op observations must converge without mutation receipts. Retry envelopes persist alongside
pending operations; capacity refusal backs off the whole owner, with independent hosts remaining
available. Do not increase limits or erase protected receipts to conceal saturation.

# Design decisions

These decisions describe implemented behavior. Proposed work belongs in `planned-updates.md`.

- **Execution ownership is platform-neutral.** Linux PCs and Macs use the same scheduler/provider
  and encrypted remote boundaries. Host UUIDs own execution, authorization and retry receipts;
  display names and optional authenticated platform metadata are descriptive. Protocol 1 and
  legacy storage/wire keys remain stable; missing metadata never implies macOS or grants access.
- **Shared package verification, separate platform signing.** Mac/Linux use one runtime inventory
  and verify its exact names/hashes, copied package input and complete final metadata/provenance.
  Only the copied PTY is rebuilt for Electron. Mac bundle identity, vendor bytes and signing
  requirements remain separate from unsigned CI and Linux artifacts; no artifact is installed
  merely because packaging or a synthetic check passed.
- **Protected credentials follow the execution host.** Desktop tokens require protected Electron
  safeStorage and refuse plaintext fallback. Explicit legacy administrator profiles resolve
  service/account references using existing Mac Keychain commands or Linux Secret Service;
  secrets stay outside profiles, process arguments, logs and client responses. This does not
  restore direct database access to normal Life clients or migrate credentials between computers.
- **Hosted tests have bounded claims.** CI exercises disposable Linux/Mac packages, website tests
  and an iPhone simulator without production credentials, Apple account changes or installations.
  Synthetic metadata/UI checks do not establish signed package continuity, provider authentication
  or real mobile relay operation.

- **Independent rotating diagnostics.** A dedicated worker owns `logs.sqlite`, keeping up to
  2,000 entries under a separate byte budget. Log retention cannot remove browser history or
  execution retry receipts. Lists expose compact summaries/cursors; individual redacted diagnostic
  bodies are fetched on expansion. Legacy JSON survives as a recovery copy; full diagnostics
  stay on the owning computer rather than entering the generic account-event store.
- **Clicked navigation precedes mirror acknowledgement.** A page click claims its logical
  destination before history polling can acknowledge the old selection. Active loads reject
  stale mirror application; actual commits/redirects reconcile the same entry afterwards.
  Private-URL protection and explicit conflict recovery remain independent of this load guard.


- **Computer-owned browsing history.** Default and named non-private profiles share one worker-owned SQLite store per computer. The account service stores profile definitions and settings; it does not receive new visit history. Matching profile IDs select logical history, never shared cookies or authentication. Replication requires an explicit paired-computer/profile selection.
- **Canonical tab navigation.** Stable entries and a selected-entry ID live on the owning computer. Explicit navigation/traversal/redirect operations commit with durable retry receipts and visit changes. Mirrors do not record another visit. Back preserves Forward entries; a new destination after Back branches. Local unload or an authentication callback cannot remove shared state.
- **Offline ownership stays fixed.** Native outboxes retain their destination computer and event IDs across reconnect and computer selection. Stale navigation cannot overwrite the owner; preserve the local destination for independent recovery. Profile unavailability never silently falls back to Default.
- **History and navigation are separate.** Chronological visit retention does not truncate open tabs' Back/Forward lists. Indexed queries and cursor pages load progressively; native clients cache 30 days and request older days with a day of preload. Legacy originals, deletion tombstones and retry receipts remain intact.
- **Chat identity and placement.** Chat links carry owner and run IDs without authorization secrets. Agent browser placement follows saved workspace association by default; explicit application/workspace/current-chat destinations change placement while preserving the run's existing access boundary.
- **Quick-glance versus file details.** Runtime, usage and approvals remain prominent. Run record, provider session folder, starting folder and additional folders use a separate collapsible Run files & folders section with existing copy/open actions.

- **Host identity and display names.** A stable host UUID owns credentials, chat identity and
  execution routing. Each desktop supplies its configured display name through authenticated
  state. Clients refresh that name without re-pairing; labels never select an authorization or
  imply a special personal/work category. Failed metadata persistence preserves existing keys.
- **One website destination lookup.** Account-backed records take precedence over browser-only
  legacy pairings. All sections share that lookup; absence of a default or credential is not
  evidence of an offline Mac. This does not migrate nonextractable keys or widen account trust.
- **Native device-zone chats.** Mobile chat timestamps follow the viewing device’s time zone,
  including DST and live zone changes. Shared account defaults cannot force UTC on native chats.

- **Desktop execution with remote clients.** Provider credentials, tools and browser sessions remain
  on the owning Linux PC or Mac. iOS sends authenticated encrypted commands through an opaque relay. This preserves
  access to local workspaces and avoids replicating execution environments on mobile devices.
- **Independent app and workflow repositories.** Proteus owns generic formats and UI. organization workflows and
  other operating systems own their schedules, workflow instructions and validators. Source-owned
  schedules are exported into the local store; opening the editor never executes repository code.
- **Plain JSON and revision checks.** Schedules remain AI/editor-friendly. Reads use the current
  file, writes validate and atomically replace it, and stale edits fail instead of overwriting
  changes. Run snapshots keep past conversations reproducible.
- **One host and serialized turns.** A process lock prevents competing runners for one data home;
  the engine avoids concurrent sessions and overlapping runs. Parallel execution is deferred
  until provider/client lifecycle and permission isolation can support it reliably. The October 9
  request for parallel independent chats across all providers/devices without an arbitrary Proteus cap is queued as BF-2026-10-09-11; it does not
  change the current runtime policy or the one-turn-per-session/single-runner invariants.
- **Provider-owned capabilities.** Clients use normalized live metadata for models, effort and
  context tiers. No model-name-specific limit table exists. Unsupported saved settings remain
  visible and fail explicitly at execution. Missing metadata stays unknown; provider defaults
  are not inferred from another editor's UI. See `providers.md`.
- **Explicit context and authorization.** Source discovery is separate from selection and folder
  access. Managed sessions disable automatic Copilot instruction/config discovery and provide
  captured context. Favorites do not grant permissions or activate disabled MCPs. Permission modes
  and individual grants are distinct and can resolve waiting tools in a running chat.
- **Shared rich content, native shells.** Mac and iOS render Markdown from the same bundled code.
  Tool calls are separate expandable activities with status, progress, inputs and outputs. Internal
  reasoning is not displayed. Raw HTML/scripts in model output are not trusted.
- **Visible bounded browser automation.** Electron hosts shared website tabs; a per-tab Playwright
  bridge exposes only the broker's allowed operations. Remote sites cannot access app IPC.
  Bitwarden credential fill stays an explicit desktop action outside the agent tool boundary.
- **Local Mac packaging first.** The local .app uses the existing iOS artwork and a stable Proteus
  bundle identity. Local ad-hoc signing requires no Apple certificate and is not notarized
  distribution. Developer ID signing, notarization and update delivery remain separate work.

- **Native provider processes, common UI.** Codex uses an app-server adapter with explicit context;
  Copilot uses its SDK. Model metadata remains separate. Tool restrictions unsupported by another
  provider are refused rather than silently widened.
- **Queue versus steer.** A queued message is durable future work and runs only after success;
  steering targets one active native turn. Delivery acknowledgments are distinct from completion.
- **Host-owned OAuth.** Connection recovery invokes the provider's OAuth client. Corporate sign-in
  opens on the execution computer even when requested from iOS, keeping loopback callbacks and tokens on the host.

- **Message-scoped model choices.** The composer captures settings on submission. Queued messages
  retain independent choices, applied only when their turn starts. A steering request never mutates
  a running model. This avoids a late dropdown change altering already queued work, while preserving
  the native conversation and audit history. The source schedule remains unchanged.

- **Retain vendor signing identity.** The local Mac shell may be ad-hoc signed, but official Copilot
  binaries keep verified GitHub signatures so provider-owned Keychain ACLs recognize the caller.
  Only the two explicitly verified binaries skip re-signing; missing/invalid vendor signatures fail
  packaging. Credential resets or broader Keychain grants are not a packaging workaround.
- **Stable live controls.** Token/tool updates patch conversation content without rebuilding
  unrelated controls. Authentication status is polled only while its view is open, with bounded
  duration and visible feedback, rather than relying on a transient toast or manual refresh.

- **Observe before replacing Omi.** The app owns scheduling controls, not transcription policy.
  It invokes the installed native runtime through fixed commands and existing locks. A persisted
  global gate plus per-execution ownership checks block manual, queued and resumed work until
  native services are separately unloaded; imported Codex replacements require paused originals.
  Preparing schedules never activates them or modifies their upstream owners.
- **Independent native service lanes.** Each of the three Omi native jobs has one execution slot,
  independent from the single AI-turn slot. This keeps review controls responsive during long ASR
  or semantic work. The native worker still owns file locks and transactional publication.
- **One product, separate trust boundaries.** The full Life web application lives in `web/` and
  retains Laravel authentication, workspace authorization and its existing database schema.
  Desktop opens it in private sandboxed browser tabs, with no app token or preload bridge.
  The Electron bundle excludes web source/runtime; no web database or uploads enter packaging.
- **Relay remains an independent service.** The existing encrypted WebSocket relay only transports
  remote traffic. A later website host may run it behind the same domain/reverse proxy, but PHP
  request handling and nutrition data must not become a desktop command channel. Docker is an
  optional packaging/operations choice; a supervised Node service has the same protocol role.
  No production relay or DNS changes are part of this source integration.

- **Native, optional Life.** Personal records must be explicitly enabled and configured in Setup,
  with independent tabs and local forms. The host connects to SQL through private OS-backed
  credentials; the renderer gets scoped domain records, never arbitrary SQL or database secrets.
  Existing nutrition entries retain immutable food-version references. Schema updates are
  versioned, previewed and protected by backup/integrity checks, not silently run at startup.
  Public-origin authentication and the future encrypted relay remain separate server concerns.
- **Workspace-bound Markdown creation.** The app chooses configured folders and relative names;
  each request revalidates root membership and canonical containment. New notes never overwrite.
  Hide native browser views for the entire lifetime of a modal, including resize events.

### Desktop workspace restoration

Keep desktop tab descriptors in the host's private application-data directory rather than
origin-scoped localStorage: the authenticated loopback port can change across launches. Persist
references only, and recheck current files/features when restoring. Reopened browser views revoke
old agent access. Reopened terminal descriptors do not execute anything until explicit Resume,
which never repeats a startup command. Browser disposal during app quit must not overwrite the
saved workspace with its intermediate empty state.

- **Ghostty VT with desktop-only PTYs.** Use the real Ghostty parser compiled to WebAssembly inside
  the Electron tab, with local node-pty processes owned by the main process. Do not expose shell IPC
  through the remote protocol. Native Ghostty configuration is read-only input for supported profile
  fields. Persist tab descriptors, never automatically rerun a saved command after restart.
- **Independent transcription ownership.** Omi native jobs and general transcript intake/review
  have distinct gates because their current owners and scopes differ. Keep existing schedule IDs,
  verify canonical policy snapshots at execution, and require explicit owner handoff. A successful
  provider turn does not prove guarded workflow publication or downstream context updates.


## Codex workspace sandbox and operation approvals

Production baseline; the October 18 isolated preview exception and October 16 additive-turn
handling above supersede the corresponding preview behavior.

Native filesystem sandbox scope follows explicit Proteus Trusted/Autopilot folder grants, using
canonical roots and excluding implicit temporary directories and network access. Command approval
is independent: Trusted does not become unattended shell authorization. Ask/Custom retain the
existing read-only sandbox. Before starting a turn, validate the native runtime's resolved policy;
when effective writable roots change, interrupt an active turn before it can keep stale grants.


## Shared clients and direct Life (October 4)

The website reuses the desktop color tokens and encrypted client protocol while keeping Laravel
account authentication and responsive server-rendered Life pages. Electron-only browser views,
local PTYs and OS credentials remain desktop capabilities. Section tabs store allowlisted section
keys, not private titles, queries or record contents. Provider allowance comes from the selected
connected Mac and honors that host's visibility flag; cached/offline values are not live quotas.

Mobile Life connects directly to the website account, independent of either Mac's availability.
Use the existing account, MFA, PKCE S256 and a fixed application callback. Store tokens in Keychain,
keep health records in memory, enforce workspace/account identity on responses and writes, and
reuse the additive native mutation ledger for safe retries. Preserve original nutrition food
versions and all existing data during deployment; an app download never silently upgrades SQL.

A desktop may also act as a separately paired encrypted client of another desktop. Its peer keys
live under macOS safeStorage and never enter renderer catalogs. Every request names the destination;
changing destinations clears old selections and fetches the destination's full live catalog. An
offline/error response cannot fall back to local execution. New chat always defaults to This Mac,
independent of the selected history tab. This feature is human-directed remote control, not
multi-provider agent delegation or a new grant to existing agents.

Projects remain a design discussion. Existing saved multi-folder workspaces continue to provide
reusable folder/context selections; no new folder-independent project schema is introduced.

Browser persistence stores bounded URL/title entries and index, omitting POST bodies, Chromium
page state and common authorization callbacks. Native history menus validate their original
snapshot before jumping, so an open menu cannot apply a stale index after intervening navigation.


## Account destinations and API-only Life (October 4 continuation)

Website destinations are account-owned records, with device credentials encrypted at rest under
the website application key. Authenticated strong-auth sessions retrieve only the selected
destination credential and import it into a nonextractable in-memory browser key. The website
server is a trusted credential custodian; the relay remains an opaque transport. Distinct browser
sockets retain independent challenges, sequences and drafts. Sign-out clears local access but
preserves account enrollment. Explicit removal and Mac revocation have distinct scopes.

All native Life clients use the website API. Centralizing authorization and schema ownership in
the service avoids database credentials and migrations on every desktop. Preserve old profiles
for recovery without opening them. Account/workspace/session identity travels with drafts and
evidence requests; changing sign-in cannot silently retarget old inputs.

## October 4 — queued cross-client product contract

The operator wants one Proteus experience across desktop, website, iPhone and iPad. The
[next-update queue](planned-updates.md) records the requested contract; this entry changes design
scope only. Execution remains desktop-owned; Life and proposed shared Team Tools configuration
use the account API. The relay stays an opaque transport and does not need a second account system.

Use the desktop chat presentation, iPhone chat-bubble icon, website Garage artwork/detail design,
website tab close controls and desktop dividers as the common references. Expand only the active
feature's sidebar children. Chats aggregates authorized host indexes, while the website has an
independent explicit default execution Mac. Aggregation must not retarget actions or merge quota.
Default and temporary destination selection are separate settings; offline never implies fallback.

Team Tools contains Standup, shared named lists/links and a secondary browser-tab strip. Persist
descriptors separately from memory residency; leaving Team Tools unloads its idle browser pages.
Other desktop tabs remain loaded until closed or deliberately unloaded. The proposed Engine Room
contains resources and setup/connection/account controls; its name is provisional. New browser
tabs gain a history home and Google address-bar search plus explicit DuckDuckGo/Google/Bing choices.
History covers retained Proteus visits, not unrequested external-browser history or impossible
cross-origin tracking. Website embedding and exact resource metrics have real platform limits.

Prefer shared feature/text/icon/schema/state modules and contract fixtures, with native adapters
for platform APIs. Do not collapse trusted shell, untrusted browser, API and host authorization.
Before expanded remote authority, resolve account-key custody/session revocation and authenticated
revocation notices. Storing real workplace lists on a personal service requires a domain/policy
decision; reusable schemas belong here, private names/content do not. Account enrollment remains
pending and no prior implementation or deployed acceptance is broadened by this queue entry.
Tagline, section naming and multi-provider release scope remain open for discussion before building.

## October 4 implementation decisions superseding the planning entry

Engine Room is the accepted name and there is no navigation tagline. Team roster/link storage
is authorized by the operator's explicit data-policy clarification. Shared API records are
account-scoped and encrypted at rest; separate app scopes require native consent. Website account
key custody remains a documented trust boundary: MFA protects sign-in, while a compromised website
server could still impersonate a stored device key. Signed host revocation now invalidates that
device at the host; untrusted relay notices only disconnect. Per-session short-lived host grants
remain future protocol work. Multi-provider implementation is entirely deferred.

Website external browsing uses real browser tabs because arbitrary Jira/ADO pages may forbid
embedding. Native Team browser descriptors restore without loading; active pages reload on demand.
Dirty, audible or agent-owned desktop pages reject automatic unloading. Process metrics name their
shared attribution rather than inventing a per-tool memory number. APNs entitlement/provisioning
and production push delivery are explicit release dependencies. See `parity-release.md`.

## October 5 — approved chat presentation and queued shell/composer parity

The operator approved the interactive current-versus-proposed chat comparison. Group consecutive
routine tools and automatic approvals between messages into expandable Activity blocks; retain
paths, commands, results and authorization reasons in correlated detail, with raw audit data one
level deeper. Actionable approvals, failures and sign-in problems remain visible. Add reported
usage/context detail without fabricated metrics. This is design approval plus a request to queue,
not evidence that production rendering changed.

Desktop and web share the conversation presentation. Native mobile shares event semantics,
capabilities and detail availability while retaining condensed formatting and solid message boxes.
Place compact Proteus branding in the tab-bar chrome, using the existing logo/icon artwork. A
minimized navigation rail keeps slightly larger, optically consistent icons and its hover slide-over,
with keyboard/touch alternatives. The mockup's illustrative replacement logo was not selected.

Remote desktop chats should reuse the local composer and normal details layout, using host-owned
model metadata and exposing session/context information read-only. Omit remote Open/Copy path
and context-source changes in this increment. Load earlier history automatically while scrolling
up, without changing the reading position. Retain mobile's expandable detail presentation.

Images and other files can be pasted into a removable composer attachment strip; images open a
modal preview. Attachment delivery stays explicit, provider-capability-aware and bound to the
account/host/chat/message. Pasting grants no additional trust and must not execute file contents.
Implementation and acceptance remain in the single `planned-updates.md` backlog.

## October 5 — generated documents open on demand

Expose clear Markdown document links in chat and open an app document tab only when clicked.
Preserve the originating chat and reuse an existing tab for the same host/file. Do not auto-open
or force split view. Remote viewing is an authorized read-only preview through the owning Mac,
not native remote file Open or context editing. iPhone uses return navigation; desktop/web/iPad
use document tabs. Broader tab organization is awaiting further operator input. Escape explicitly
closes the image-preview modal without closing a chat or cancelling execution. These are queued
requirements; the current local Markdown handler alone does not verify cross-client support.

## October 5 — approved remote document identity and viewing scope

Keep generated files on the executing Mac and register chat-bound document IDs. Transport bounded
read-only content over the existing authenticated encrypted relay after checking a separate,
revocable View chat documents grant and the current host file boundary. Document IDs, cached links
and restored tabs confer no authority by themselves. Do not promote the broad local Markdown
endpoint into a general remote reader or expand existing peers' resource permissions silently.

Fetch the current saved version on open, return version metadata, and offer explicit refresh for
changes. Initially keep displayed contents in memory for the open tab only; persist descriptors,
not offline document copies. A disconnect leaves an already-loaded version readable with a
last-read label, while first reads require the owning Mac online. Clear account-bound content on
sign-out/account changes. Revocation stops subsequent reads, not possession of already-delivered
bytes. No new AI turn or plaintext website database copy is needed; existing website-client trust
is unchanged. This is queued design approval, not implementation or permission migration.

## October 5 — interactive previews require explicit script approval

The operator approved queuing provider-neutral interactive HTML artifacts with scripts off by
default and a user approval path. Provide Enable interactive preview and Stop scripts in trusted
Proteus chrome. Approval is limited to the exact artifact and bundled code version for the current
viewing session; ordinary rerenders preserve approval, while changed code and restored sessions
require renewed approval. The artifact itself must not approve or broaden its capabilities.

Script approval permits isolated browser JavaScript for the preview. It does not authorize Node
or `.cjs` execution, installs/build commands, access to other chats/files/credentials, network or
app actions. Additional capabilities remain separate and explicit. Reuse document authorization
for remote delivery, keep state in memory initially and expose stop/unload in Engine Room. These
are backlog requirements, not an implemented sandbox or a grant to run existing artifacts.

## October 5 — content workspaces and recency-based browser residency

The operator chose sidebar navigation for feature landing pages and content-only main tabs. Chats
and Team Tools own nested content tabs with a common creation menu and browser toolbar. Preserve
tab-strip positions through navigation. Home is initially selected, reports release information
and is unmounted when left. Review acknowledges a failure event, never a pending permission.

Browser residency is the union of the most recent six tabs and all touched within one hour,
across scopes per app, with active/dirty work protected. This supersedes the earlier immediate
Team Tools unload decision. It is not a six-tab maximum and does not stop terminals or model work.
Broader Safari-style tab groups remain a later design. The operator authorized implementing the
approved backlog and deploying after verification; current historical receipts are not acceptance
of this redesign. Worker models are capped at GPT-6 Sol with medium/high effort.


## October 5 — restore all content scopes without replaying work

Persist safe tab descriptors/order in the main strip, chat workspaces and Team Tools. Browsers
restore unloaded until activated. Restore identities and layout rather than executing startup
commands, restarting runs or inheriting a document/script approval. Website external tabs stay
under browser control; restored Proteus descriptors never automatically reopen external windows.

The remote-document implementation was narrowed after automatic approval review: a peer-level
View chat documents grant is necessary but insufficient. The requesting client creates a bounded
pending request for an exact chat-linked document; trusted host UI approves its exact bytes/version
for that device with an expiry. Revalidate identity, current grant, workspace containment and version
on every read. Changed content or destination needs a new approval. No body is sent while pending.
This replaces the initial blanket linked-file read proposal; successful source checks are separate
from full security/UI validation and installed-client acceptance.

## 2026-10-05 — Explicit sender consent for chat attachments

The operator explicitly approved the guarded delivery workflow after reviewing the proposed
boundary and synthetic test evidence. The sending client must show the exact selected files,
destination Mac/chat and named AI provider before Confirm Send. Upload/staging alone never
starts a chat or forwards bytes. Bind a short-lived one-use consent to authenticated device,
chat or first-message draft, message, provider and ordered file metadata/digests; verify it again
at the provider byte boundary. Changing destination or payload requires fresh confirmation.
Preserve accepted queued attachments privately across staging expiry/restart; never replay an
ambiguous interrupted provider send. Tests use synthetic files only, with no real user-file or
live-provider delivery. This authorizes implementation, not unattended export of existing files.

For larger batches, keep the same exact ordered one-use consent: at most 256 files, 8 MiB each
and 32 MiB total per message. The size budget is not multiplied by splitting uploads or by
sending a first-message draft. Finished staged files may number in the hundreds, but only four
per device and sixteen globally may have open upload descriptors; staged bytes are bounded to
64 MiB per device and 128 MiB globally. Sequential upload activity refreshes a 15-minute
inactivity lease for that message, while idle staged bytes expire. Accepted queued bytes remain
private and durable until consumed or revoked. Partial acceptance failure removes the entire
selected batch; the sender must reselect and reconfirm. The composer shows a quiet + Attach
control without advertising format or count limits in its normal state.

## October 5 — full-width compact top bar and notification routing

The operator clarified that desktop/web navigation begins below a full-width top tab row, with
Proteus in the upper-left corner. Reduce tab height and title-to-boundary padding before reducing
any title character allowance. Keep the icon rail, hover slide-over, creation menu and exact
scroll-position retention. A follow-up screenshot clarified that the collapse arrow should sit
near the sidebar top, with little empty space before Home and tighter left/right margins. Native
layout is unchanged by this desktop/web-specific request.

Fix iOS notification opening for cold and running app states before installation. Home is the
ordinary cold-start destination, but an explicit notification target takes precedence. Native
remote APNs push remains pending because the operator does not have paid Developer membership;
local notification routing is independent of that entitlement. Preserve existing signing.

## October 5 — host-owned chat lifecycle and fresh Copilot quota reads

Archive is a reversible visibility state of a Proteus chat, controlled by its owning Mac and
shared with authorized clients. Deletion is a confirmed Proteus-record operation, not permission
to delete generated files, provider histories or schedules. Active work and unresolved approvals
must not be orphaned. Restored descriptors and caches cannot resurrect a deleted chat.

Copilot's long-running SDK process can return a cached quota even when Proteus's own usage cache
is bypassed. Use a short-lived same-profile read-only quota process for an actual refresh, keeping
the executing chat client untouched and coalescing simultaneous requests. A local check timestamp
does not prove a provider observation timestamp. Do not label SDK fetch-time resetDate values as
authoritative reset times; retain explicit estimated/unreported provenance.


## October 5 — selected Claude MCP and runtime model identity

The Claude adapter uses only MCP definitions selected in the captured chat context, passed in a
private configuration file with strict isolation. Keep resolved environment/header values out of
process arguments and logs, require confirmed permission hooks, and clean private configuration
after its process exits. Unselected machine/project servers must not appear implicitly. Runtime
status and login are separate advertised capabilities: Claude status is supported, while scoped
login remains unavailable until the installed CLI's credential scope can be verified safely.
An authentication requirement points to the owning Mac without claiming OAuth succeeded.

Model aliases remain selectable and show resolved model IDs only when the runtime reports them.
Preserve explicit IDs and provider capabilities; never infer model versions from an alias table.
No workplace task or paid provider turn is used to test these adapter changes.

## October 6 — chat-only approval and local chat titles

Chat-only auto-approval is an explicit opt-in on one owning-host chat. It persists with that
chat through continuation and restart, and can be revoked to inherit the workspace setting.
It changes the effective approval mode only within the existing granted folders, tool rules,
and sandbox; it does not add filesystem roots or change workspace defaults. A provider,
root, or integration context change permanently invalidates the chat grant, even if a
previous configuration later returns. The decision path retains protected-request and
unknown-tool safeguards and records chat versus workspace provenance. Source and isolated
tests implement this behavior; installed cross-client acceptance remains separate.

For an unnamed new chat, the host derives a short title locally from the opening prompt.
Naming requires no additional provider turn, network call, or wait before creation. A
provided name or later manual rename takes precedence. Title revisions reject stale
client edits, including on chats created before this metadata existed. Cross-client
installed propagation remains to be verified.

## October 6 — accepted chat activity presentation for the queued build

Desktop chat is the visual reference for website typography, spacing, controls, and message
organization. User and agent messages retain their side accent borders. A contiguous tool and
approval sequence sits inside one restrained warm orange Activity box **without** a side accent;
the individual activities inside it retain their own side accents. Successful items keep a quiet
green fill. Failed or warning items use a lighter, richer orange fill and expose the actual safe
failure reason. A running item uses the existing circular working indicator, and the enclosing
Activity box may animate subtly while any item runs. Text labels and reduced-motion behavior must
convey status independently of color and animation. See BF-2026-10-06-08, -09, and -13 and the
examples in [the build handoff](2026-10-06-build-handoff.md). This is an accepted design direction,
not an implementation or release claim.

## October 6 — host-owned shared content descriptors

Chat browser/document and Team browser descriptors use one bounded host-owned revisioned store.
Authenticated remote get/mutate operations carry explicit scope and current revision. Clients rebase
only their original operations after a conflict, preserving concurrent additions. Selection, scroll,
cookies, page memory, terminal execution and document bodies remain local. Host document descriptors
contain opaque IDs; a separate private source registry rechecks current roots and exact-version
approvals. Startup seeds only an uninitialized scope, preventing stale saved tabs from resurrecting
closed remote tabs. Revocation removes host-bound views and rejects delayed replies. Both native
clients and visiting desktops use this boundary. Unknown store fields survive atomic replacement.

Certificate inspection and browser automation share a lease only when Proteus owns the debugger.
A foreign debugger is preserved. Each consumer releases its listeners and lease independently,
so interrupted automation can recover without disabling certificate reporting or restarting the app.

## October 6 evening — shared Home and evidence-based acceptance

Home is one DOM renderer and one scoped stylesheet (`public/shared/ui/home.js`, `public/home.css`) imported
by desktop and web. Platform adapters supply data and navigation; only a Mac-only instruction
panel differs. The latest release is summarized with expansion, rather than rendering full
history in a separate desktop design. A local demo uses this same renderer.

The operator's latest direction reserves orange Activity groups for issues. Success-only groups
remain green, and item side accents have straight left corners. This supersedes the earlier
unconditional warm-group sample. Native browser-close notifications can arrive before the close
promise resolves, so selection must be reconciled by stable ownership before dispatching close.

Release acceptance is reopened item by item when screenshots or live evidence contradict a
completion claim. Tests, source presence, installation and actual workflow verification remain
separate. See `2026-10-07-acceptance-audit.md`.

## 2026-10-07: bounded navigation history and stable transcript paging

Authorized content descriptors may include a normalized 50-entry/32-KiB URL/title backstack.
Use the existing safe-history filter; never synchronize cookies, page content or credentials.
Keep selection local and keep loaded desktop pages intact. Native retains its existing WK view
on a remote URL update rather than discarding it. Use absolute event boundaries for older chat
pages and retain disjoint cached segments until gaps close.

## October 7 follow-up: Standup links and browser recents

Standup links belong to the revision-checked shared team-list record, not the independent browser
bookmark collection. Desktop and website share the same row markup/style. Editing other roster
fields preserves stable link IDs; conflicting writes remain rejected by the existing API.

An address field shows up to 20 distinct URLs ordered by latest visit, retaining that visit's device
name and timestamp. Desktop combines retained local and account visits; web/native use the authorized
account history. No system-browser history is imported and no missing device identity is inferred.
Native new tabs focus the keyboard; desktop suggestions suppress the embedded page through the
existing overlay token while open. Website suggestions stay within layout so they do not cover Go.
Resources truncates oversized labels in a fixed-width table and flex rows rather than wrapping them.

### Shared allowance rendering
Desktop and website use one provider-pill and detail-dialog renderer and stylesheet. The website retains its authenticated Mac quota request and privacy setting, while collapse is a single persisted toggle. Connection identity appears once below allowance; the green dot requires connected state. Web provider setup links to the page explaining destination-Mac configuration. Nested Activity Details has no extra border or padded box, matching desktop.


## October 7 — Native page title authority and new-tab visibility

For the same loaded URL, the local page's observed title takes priority over another client's
automatic descriptor title. Explicit custom names remain authoritative across clients, and remote
URL changes still navigate. Apply incoming tab collections atomically to avoid transient removal
of the selected child. New-tab scrolling is triggered by newly added selected IDs, not ordinary
selection changes, preserving the accepted manual strip position behavior.

Bundle the same README used by desktop/web Home into the native app. Present it from a Home link
in a dismissible, scrollable sheet with normal body typography, so it remains readable offline.


## October 7: active runtime, browser ownership and credential consumers

Runtime means observed active orchestration, not inference or billing. Persist active intervals
per turn; pause while waiting for the operator, exclude queue/idle gaps, and union overlapping
child-tool intervals. Host observation timestamps offset remote device clocks. Interrupted tails
are excluded and marked partial. Older chats remain unavailable or partial; never reconstruct
work time from message spacing. See runtime.md.

Browser presentation parentage is distinct from agent control. Moves preserve page identity but
clear old control grants; copies are independent unloaded pages. No live terminal, running chat,
or protected remote-document grant is cloned. Projects remain deferred. A provider-command view
reads reported tool activity and does not invent an attachable interactive process.

Integration status belongs to a specific host/provider/MCP consumer. A successful Azure login
cannot establish Jira/ADO MCP authentication. New credential isolation must meet the protected
storage requirement; see the official adapter investigation in the implementation ledger.

## October 7 — Separate tab resumption from active automation; bound chat history residency

A completed turn releases browser automation connections and active ownership while retaining a
chat-scoped in-memory resumption association. This permits same-tab continuation and lazy reload
without granting another chat access or persisting agent authority across app restart. Explicit
revocation and transfer clear the association. Visible, actively automated and audible pages are
exempt from background throttling; no new aggressive unloading policy is introduced.

Desktop refresh uses summaries plus on-demand history pages with bounded transient delta cursors.
Changed existing events are patches by absolute event position. Unknown cursors recover with a
full bounded page. Inactive rendered conversations and completed host histories have four-entry
caches; active provider histories remain pinned so callbacks retain valid event references.
Durable history, drafts and descriptors are independent of rendered-view eviction.

## 2026-10-07 — Search chats, document tools and queued steering

Internet Search is a persistent chat classification, not a separate execution engine. Its first
turn uses host-owned provider defaults and workspace defaults, reducing setup choices while keeping
normal model changes and one-way promotion after creation. Scheduled runs remain a separate list
classification; classification is persisted through remote summaries and offline caches.

App capabilities belong in provider runtime instructions and actual tool adapters, rather than a
repo-only skill that ordinary user workspaces would not load. Markdown opening uses canonical
workspace authorization and stable chat descriptors. A per-turn MCP capability supports existing
Codex sessions without assuming the resume API can install new dynamic tools.

Queue-to-steer preserves the queued message until provider delivery succeeds. An in-flight map
serializes conversion by message identity and completion waits for pending conversions before
consuming the next queue entry. Failure is visible and leaves the original queued message intact.

Search promotion mutates only the current run’s classification and is idempotent. It does not
reject an unrelated streaming-event revision: no transcript, model choice or title is overwritten.

## October 7 — Keep chat navigation outside view padding

The child-tab strip belongs directly to the workspace above its scrollable content. Per-view negative margins coupled navigation to conversation padding and broke shell/document borders at normal and narrow sizes. A shared workspace row also keeps navigation mounted through document scroll and asynchronous chat replacement without per-view CSS offsets.

## October 8 — Connection recovery is separate from command delivery

An unavailable peer request may initiate connection recovery but never retains or replays its
command. Periodic callers respect the peer’s backoff timer; otherwise tab/index polling defeats
retry throttling. Expected background disconnects use connection state rather than global toasts.
Notice deduplication preserves expiry and dismissal during a repeated background failure.

The pending-request approval shortcut uses the existing chat permission API with an optional
expected request ID. The host checks that ID synchronously before changing the grant. A separate
capability advertises this guard to remote clients so older hosts cannot silently ignore it.

Browser refresh is idempotent at the native view boundary: compare actual bounds, visibility and
throttling before applying updates. Avoid repeated compositor-affecting setters without disabling
real resizing, automation exemptions or background resource controls.

## October 8 — Proposed account contexts and connection evidence

BF-2026-10-08-04 is a queued design, not an implemented architecture. Separate identity,
credential consumer and resource context so any number of accounts can each access multiple
tenants/subscriptions/sites. Agents select an authorized context explicitly; they must not change
global defaults or another chat's login. Reuse requires adapter-supported isolation, not merely
a familiar email or MCP alias. Keep credentials provider-owned and private registry data outside
the repository. See `mcp-auth.md` for the detailed proposal and acceptance criteria.

Track transport, authentication and resource-access evidence independently. Historical auth
warnings require sufficient newer evidence for the same binding before showing recovery; a
connected flag cannot erase a stronger failure. Timers use reported metadata, while renewal and
verification use official runtime interfaces. Missing metadata and unsupported isolation remain
visible limitations. Monitoring never interrupts an active provider session, forces account
switching, bypasses interactive policy or replays an ambiguous external write.

## October 8 — evidence-aware integration health and queued edits

Keep integration health in private host application data with exact consumer bindings, expected
labels separate from observed identity, and resource access separate from runtime connectivity.
The same MCP alias does not identify a shared credential owner. Background work uses only live
sessions, holds provider startup, serializes with manual MCP operations, bounds reconnect attempts,
and never replays a write or opens sign-in. Unsupported isolated selection must fail visibly.
The Accounts & Integrations view replaces Integration profiles; Providers, Mac Connections and
Proteus account security retain distinct responsibilities. Web shares the renderer with read-only
metadata and host-owned check/recovery actions.

Edit queued text in place, preserving its ID, attachments and model controls. Compare the exact
prior text and require queue membership; reject edits during steering delivery. An accepted
pending answer removes only its exact request form even if focused; preserve unrelated drafts.
Render every approval choice supplied by the host on all clients and retain scope explanations.

## October 8 — Live browser references and page find

Live Browser transports bounded captures over the existing encrypted paired-device protocol.
A separate host-owned viewing grant controls access; a device can reference only a frame it
received for that chat. References expire after 30 seconds and are invalidated by navigation,
unloading or revocation. Point annotations become observed-page context for the agent, never
direct input. Existing chat queues, steering and pending-request checks remain authoritative.
One capture is in flight per chat/tab and short-lived shared frames avoid redundant encoding.

Text finding uses nonmutating CSS Highlight ranges so selecting a match does not alter the
transcript, links, provider text or Markdown DOM. Native browser views use WebKit's find
interaction; Electron routes its find results to the shared panel. Counts describe loaded,
searchable content and must not imply an entire unloaded history or canvas contents.

The iPad chat-list route no longer observes a cached selected-chat ID as a fresh navigation
request. Only explicit selections and notification routes may reopen the chat. Pending-answer
drafts are keyed by the question as well as the chat, independently of ordinary message drafts.

## October 9 — Content-edge swipes and retained setup disclosure

Use content-relative 56-point edges instead of the physical screen edge so the iPad sidebar does
not obscure navigation. Require 80 points of predominantly horizontal movement; center, short
and vertical drags do not route. Browser history uses the same stored-history path as toolbar
arrows, avoiding duplicate WebKit and app recognizers and preserving restored history semantics.
At the history root, chat and main browser containers return to Chats without closing tabs.

Web setup disclosure is draft presentation state, stored outside submitted values. Preserve both
open and closed choices through host events and provider catalog rerenders, and start expanded
so workspace/destination setup is visible as on desktop.

## October 9 — Needs attention retains actionable notifications

Approved design, queued without build: transient 15-second banners and persistent actionable items
are separate views of the same issue. Needs attention has Chats and Notifications tabs, rich issue
specific actions and seven mixed recent unresolved items in the sidebar. Navigating to the page or
an issue never replays its banner. Dismissal affects presentation only; resolution and expiry affect
the pending state. Meaningful updates order the list; polling and repeated errors do not reorder or
multiply it. Document Details exposes the full authorized disk path with wrapping and copy support.
This supersedes the initial notification mockup's banner-replay shortcut. See BF-2026-10-09-05–07.

## October 9: browser isolation and shared notices

Use native persistent partitions and iOS identified website stores behind stable account-scoped profile IDs. Sync definitions/settings only. Keep Default unchanged. Treat enabled extensions as a whole-profile human-only boundary until credential-only isolation is validated. Use a small native child window for desktop banners because HTML overlays do not reliably cover WebContentsView. Dismissing a 15-second banner does not resolve its underlying request. Execute independent chats in distinct provider runtimes, retaining same-session serialization. The combined ledger distinguishes synthetic verification from live acceptance and deployment.

## October 9 — Native typing stays within the composer

Native typing performance (BF-38) is authorized independently of the queued composer redesign.
Keep text observation at the composer boundary rather than publishing the entire host draft map
for every keystroke. Save edits into memory immediately instead of debouncing user intent; move
automatic encoding/encryption/disk work to an ordered utility queue. Preserve synchronous ordered
flushes at lifecycle boundaries and cache deletion so background writes cannot restore old data.
This changes neither the encrypted cache format nor Send/Queue/Steer/answer semantics.
Share one ephemeral website store only among trusted bundled Markdown renderers, retaining each
message's own script bridge. Arbitrary HTML artifacts and browser profiles keep their isolated
stores. Idle Find must not broadcast zero-count results for every rendered message.

## October 9 — Approved adaptive composer and circular action buttons

Keep one bottom action row. Expose Model, Level and Speed separately when the available chat
width permits; combine them into one options submenu on iPhone and narrow iPad windows.
Adapt to available width rather than device name, preserving selections across layout changes.
Use circular 44-point icon buttons for Steer, Send/Queue and Stop. Attach retains its old plain +
without a circular background or border and keeps a 44-point touch target. Preserve existing
composer/text-box colors on each platform. This refinement supersedes circular styling for Attach.
Send retains the
current green color and uses an up arrow; Queue adds a clock badge, while Steer and Stop remain
distinct actions. Keep labeled model/options controls and accessible action names. Working
status belongs after the latest content, above the composer. The operator approved the preview
with circular buttons, superseding the earlier rounded-button selection. BF-26–28 record the
queued implementation; preview approval does not certify a native build or installation.

Desktop/web follow-up: adopt the same layout using actual HTML labels above selects and
34-pixel circular pointer buttons, retaining 44-pixel touch targets for coarse pointers. Keep +
in its current left position and use local desktop's text-box colors on desktop remote and web.
Keep provider-supported Context and catalog refresh available. The full HTML prototype imports
existing styles and the attachment picker; its handlers are synthetic and cannot send/upload.
BF-29 separates completed prototype rehearsal from queued application integration.

Further review establishes local desktop as the canonical chat and Run details format in all
three HTML clients. Put instructional paragraphs behind Explanation disclosures, enlarge runtime
and put smaller multiline input/output tokens directly below it. The operator explicitly accepts
display/copy of authorized remote paths; retain identical fields and Copy path actions, with
local-file Open disabled in remote/web views. Keep shared document viewing distinct. The editor
grows upward through content measurement and begins scrolling at 60% of available chat space,
including its controls/attachments in the cap. Expanded hover visuals must not move the + glyph.
BF-30–31 record the completed review demonstration and queued production integration.


## 2026-10-10 — Install the entire queued chat scope

The operator rejected the partial 0.2.10 rollout. Production 0.2.11 integrates the approved
composer/details designs and all follow-ups rather than leaving prototypes in the review page.
Use one JavaScript presentation adapter and details renderer across local/visiting/web clients,
preserving their existing handlers. Native touch controls adapt to width and retain isolated drafts.

Static localhost previews are discovered and bundled by the owning Mac, scoped to normal
chat-linked URLs and existing document-viewing grants. Send a bounded versioned snapshot through
the encrypted relay; do not expose an arbitrary development-port proxy. Versions keep stable tabs
and revoke script consent. Native metadata publishes both changed hashes and the first fresh read
after restart, without persisting content or interactive authority. Static native HTML uses a
nonpersistent JavaScript-disabled view because WebKit can leave disabled-JavaScript srcdoc frames
empty; interactive content remains in an opaque sandbox. Network and app/file actions stay blocked.

All target updates are authorized. Preserve certificates, app data and pairing. The hosting Mac
updates through an external idle handoff; unavailable HC/web deployment routes remain explicit
installation gates, not claims that source/build verification completed deployment.

- **Cache headroom is separate from rendered history.** Long chats start with a small meaningful-row window and prefetch one compatible older page while the reader approaches it. Collapsed tool/approval streaks count as one row, so activity-heavy histories do not require hundreds of tiny reveals. All absolute event indices and older transport pages remain reachable; renderer limits are not retention limits. Heavy activity descendants are constructed on expansion, native offscreen Markdown views keep measured height, and prepend restoration follows a message anchor/inset rather than a stale content-height estimate. Bottom calculations include the native composer safe-area inset.
- **Bounded command receipts retain replay protection.** The existing 10,000-record ledger compacts only completed receipts older than the clock-skew/replay window when capacity is reached. Recent/inflight/pending claims stay intact and expired unknown request IDs still fail validation. A temporary busy error replaces a misleading daily quota message.
- **Prepare mobile history before the reader reaches it.** Keep the small initial window, but prepare later rows 2.5 viewports ahead and fetch transport cache six viewports ahead when headroom is low. Later batches use 24 meaningful rows / 96 KiB; native rich views warm 1.5 screens ahead. Background cache fetching stays bounded and separate from mounted views. Preserve desktop/web paging after favorable operator feedback.
- **Browser failures belong in transient notifications and retained Logs.** Proteus main-frame load failures use a 15-second shared notification with Reload and View logs, and a sanitized warning in Engine Room Logs. Deduplicate each navigation and clear stale diagnostics when a new navigation begins. Ignore intentional aborts and embedded-frame failures; website-owned error content remains website content. No permanent Proteus error strip reserves browser-page space.


## 2026-10-11 — Workspaces are the persistent project container

Use the existing Workspaces feature for complete independent configuration and navigation; do not
add a Projects section. The sidebar opens a workspace list and shows seven recents. Opening an
individual workspace adds one named top tab with a singular square icon and pinned Workspace
child. Chats and Configuration are button pages inside that pinned child. Shared chat lists lock
the owner/workspace filter only in workspace views; the master list remains filterable.

A chat is identified by owner and run ID. Main-navigation and workspace representations share
conversation state and drafts, deduplicate within a container, and enforce the existing single-turn
rule. Links and new tabs keep their originating container. Hidden workspace tabs retain children
and selections. Terminal restoration preserves descriptors/output and never replays commands.

A workspace belongs to one machine. Remote viewers edit source modes/defaults/approvals through
that owner's authenticated API; local file picking remains on the owner. Local Copy preserves the
entire independent configuration and approvals after naming, then opens Configuration. Copy to
another computer maps paths and clears machine-specific approval grants; chats, credentials and
browser cookies are never configuration-copy payloads. Remote terminal descriptors identify the
owner; this release does not introduce a remote PTY or a workspace-only document transport.

Unify command-folder/starting-folder terminology as Starting folder. Source discovery is separate
from execution roots and access grants. Each root gets its own budget and refresh result; exclusions
are configurable, and scans run off the UI thread. Source modes/favorites edits reuse discovery.
Group sources alphabetically by folder and name; active master filtering crosses all source kinds.

Preserve recorded usage provenance: Claude input includes explicit uncached, cache-read and
cache-creation counts. Old records with unavailable cache counts remain visibly incomplete.

## 2026-10-12: Missing supplemental folders are contextual warnings

An unavailable supplemental folder must not prevent a chat using another valid starting folder. Omit its sources and execution-directory entry from the captured context, report the omission, and preserve the saved configuration for recovery. Do not silently substitute a different starting folder or explicitly chosen main agent, or weaken changed-source/MCP identity checks.


### Remote command persistence and desktop responsiveness

Remote retry claims/results use a dedicated SQLite worker with durable transactions; the Electron main thread must not serialize and rewrite the entire receipt history. Preserve the legacy JSON and import it with an atomic marker. Keep unresolved claims indefinitely and completed receipts for at least 24 hours; storage admission may reject new work but must not silently drop replay protection. Completion of an already admitted action persists even when its result exceeds the admission budget. Diagnostics expose bounded counters and timing only.

Tab synchronization compares shared normalized descriptor semantics, not raw JSON property ordering or optional-default representation. Rebase against current host state before suppressing true no-ops. System-process and terminal-status polling uses asynchronous coalesced queries; device-encrypted cookie snapshots retain ordering and shutdown persistence while disk operations yield.


### Desktop release coordination through destination Codex chats

Use one tested signed artifact and corresponding source for authorized desktop updates. The coordinator transfers immutable, hash-verified artifacts privately; the existing authorized destination chat performs fresh local preflight, preservation, installation and live verification. Carry forward user authorization and retain local ownership of current data. This reduces artifact drift and makes completion auditable without relying on stale remote observations. Follow [desktop-updates.md](desktop-updates.md); this operating procedure does not itself authorize new targets or transfers.


### Scheduler worker and bounded stall attribution

Periodic scheduler reads, cron computation and durable snapshots belong in a serialized worker. The main thread retains durable run claims before provider effects; completed runs remain duplicate-slot evidence when checkpoint writes fail. Never advance in-memory checkpoint state before persistence succeeds, hide external schedule edits with metadata-only caching, or queue concurrent ticks. Performance diagnostics use fixed phase names and bounded records, report synchronous versus asynchronous elapsed time separately, and save privately without blocking flushes. A temporal correlation is not proof of the reported periodic hang.


## October 12 — Fresh scoped health projection and bounded stall evidence

Use operation-scoped catalog reuse rather than a long-lived context cache for remote integration
health. Recheck external configuration and source bytes on the next operation; keep registry hash
bytes stable so existing recovery counters and profiles survive. Retain only bounded opaque identity
digests. Preserve command journal and scheduler claim ordering unchanged. Keep a separate small ring
of >=1-second stalls/discontinuities because frequent short stalls otherwise evict the evidence needed
to diagnose the user's occasional full freeze. Correlation is recorded without asserting causality.


### Native navigation and browser favicon bounds

Keep account-shared default-profile Recent sites separate from each tab's durable Back/Forward
stack. Commit settled navigation without letting stale observations from an interrupted load
rewrite the stack. Use WebKit's native gestures only when its adjacent history matches the saved
stack; retain the saved-history fallback after view recreation. Pinch opens the existing scoped
overview while preserving page zoom and Reduce Motion behavior.

Favicon resolution is a bounded generation per page/icon selection, with one in-flight resolver.
Its own network requests must not recursively trigger more resolution; unrelated network
completions and non-image content cannot prolong work. Closing/unloading invalidates late work,
and unchanged icon bytes do not cause another whole-browser publication.


### October 12 unified browser preservation follow-up

New desktop history stores retain all visits by default. Existing explicit retention preferences
survive migration; shorter retention is a deliberate setting. Retained per-tab navigation and
retry receipts are independent of chronological visit pruning.

New navigation retry receipts contain compact deterministic acknowledgements, while existing
receipt payloads remain readable and unchanged. The history list is obtained separately from its
indexed store, preventing each visit from saving another copy of a growing navigation window.

A native navigation conflict preserves its tab's complete local branch and unrelated pending
operations across restart. The viewer explicitly chooses owner history or a separate local tab;
that tab retains its original navigation scope and owning computer.

### History settings use owner catalogs

History settings project the owning desktop’s existing paired computers and cached account profile definitions, including Default. Viewing clients do not supply the authority for replication destinations. Saves preserve hidden peer configurations and unknown fields; revoked configurations may be retained or disabled, but cannot gain access through a stale client. Native, desktop and web share this contract. Catalogs are derived and are never stored as preferences.

### 2026-10-13 — Separate loading state from shared tab presentation

A restored WebContents briefly has no document title; publishing New tab at that point caused
owner metadata and renderer labels to alternate. Retain remembered/logical titles until loading
settles and reconcile unloaded native snapshots from owner page-title updates. Do not turn off
navigation synchronization to mask it. Keep unchanged tab strips mounted and detached sync
baselines. Since native commands can await a load, recheck order at the final replacement step
to preserve a user reorder made during I/O. A counter guards concurrent scope application.

## October 13 — Proposed shared agent tab-management boundary (queued)

BF-2026-10-13-11 proposes a single host-owned operation boundary for interface actions, internal
agent adapters and external MCP clients, with complete typed inventories and real tab placement.
Tab organization grants are distinct from page/chat-content grants; chat Close differs from
Archive/Delete/Cancel. Reuse BF-06 configuration/approval preservation and durable retry/revision
checks. SafariSelector supplies inventory/verification patterns, not a backend to copy.
This is a queued design direction, not an implemented/verified decision or authorization to build.
Tool names, protocol compatibility and metadata scope remain to be finalized; SQLite is shelved.

## October 13 — Proposed all-type tab placement and workspace inventory (queued)

BF-12 adds Workspace Tabs as Chats / Tabs / Configuration and makes visibility/placement a
common contract for browser, terminal and viewer tabs. Hide retains the logical tab/resource;
Restore and reorder preserve navigation position. Display parent must be distinct from terminal
execution owner and viewer source/authorization origin so moves do not restart work or widen grants.
Creation and interaction dates have explicit semantics; passive refresh never counts as interaction.
A synthetic interactive preview is design context only. No implementation/build is authorized.

## October 13 — Proposed workspace deletion separates tabs from conversations (queued)

BF-13 deletes the workspace and affected navigation/tab tree while preserving every associated
conversation as unhoused, or bulk-rehomes chats to an existing/new same-owner workspace. The bulk
chat option does not migrate non-chat tabs selected for closure. Source files/provider sessions and
active model turns survive; effective run configuration and permission boundaries cannot follow a
removed profile or silently inherit a default. Explicit cascade closure differs from ordinary
Move chat child preservation. Default/final workspace and source-owned schedule dependencies need
explicit handling. This is queued scope only, not implementation or authorization for deletion.

## October 13 — Proposed browser download lifecycle and local destinations (queued)

BF-14 extends ordinary and explicit Save As downloads through one owner/profile-bound manager.
Download completion dates and cancellation come from actual transfer state; records are independent
of rotating logs. Defaults resolve the owner's OS Downloads folder, with per-device configuration
and per-download Save As overrides. Navigation placement does not own transfer lifetime; native
Files/export and remote owner-folder behavior remain explicit. This is queued design scope only,
not implementation, a completed download workflow or authorization to build.

## October 13 — Extend existing Playwright for visual control (queued)

The operator chose the existing Playwright integration for BF-15, rather than another browser-agent
framework. Model-visible image tool results and coordinate input supplement semantic snapshots for
pixel-only interfaces. Reuse live tab/profile and private CDP permissions; screenshots require an
explicit coordinate/capture identity and provider image transport. Image capture alone does not
verify remote desktop control. This is an implementation direction on the build list, under the
existing hold; no implementation/build or private-session live verification has occurred.

## October 13 — Default Playwright, on-demand developer backend and human inspector (queued)

The operator selected Playwright as default and Chrome DevTools MCP as optional on-demand Developer
mode, with built-in human DevTools/Inspect and MCP packages for agent access (BF-16). A shared owner
service manages identities, grants and controller ordering; optional diagnostics cannot require a
separate browser/profile or break ordinary browsing. Electron bridge compatibility and inspector/
debugger coexistence remain unverified. BF-17 proposes an explicit profile preference for agents
on shared/run-owned extension-profile tabs, replacing a blanket block without sharing every tab
or implicitly enabling developer/Live Browser access. No packages installed or policy changed.

## October 13 — Extension chrome and feedback-context intake (queued)

BF-17 agent access on extension-enabled tabs is explicitly confirmed. BF-18 places Extensions/
actions in browser chrome between Go and Overview, with locale-resolved installation identity;
BF-19 gives extension popups bounded host-owned close/error behavior independent of page rendering.
Keep extension data/profile identity and native popup/options/onboarding semantics intact. BF-20
requires provider→owner→API→UI evidence before classifying a missing explanation as rendering loss.
The completed read-only owner audit found no first finalized explanation and consistent native/
JSON/API preservation of the later explanation in a feedback question. Substantive question
context must remain readable after answering without inventing an un-emitted assistant reply;
agents should explain before dependent follow-ups. Actual historical UI rendering remains
unverified. All changes are queued; no implementation/build or active-chat changes.
The follow-up report of visible answers without their agent questions reinforces BF-20's explicit
question/answer history contract and reopens prior BF-2026-10-07-07 presentation acceptance.
Persistence success alone must not be described as verified readable conversation history.

- **Organization is separate from execution.** Chat workspace membership uses explicit run-level
  fields, including null for unhoused chats. Captured workspace roots, model/session options and
  approvals remain frozen during an organizational move. Mutable JSON remains authoritative;
  the workspace/chat SQLite migration is shelved. Document placements grant the named viewer's
  presentation without rebinding its source to the destination's filesystem authority.
- **Deletion preserves execution and supports retry.** Workspace deletion journals its affected
  set, moves surviving conversations and closes associated resources before removing the active
  profile. Archived profiles retain captured execution for existing runs/schedules. The last active
  workspace is replaced with a clean default; no project file is removed. Retrying must not move
  a chat the user has since placed elsewhere or close a tab already moved out of the affected scope.
- **Scoped package integrations and debugger handoff.** Playwright MCP is the default package;
  Chrome DevTools MCP starts only with a per-tab developer grant. Neither creates an unrelated
  browser nor exposes a global profile/CDP endpoint. Human DevTools releases automation attachment;
  closing the inspector restores ordinary automation. Image results preserve provider-native
  transport, while summaries omit image bytes. Coordinate observations expire and are invalidated
  by navigation, viewport/device-scale changes and input.
- **Redirects preserve both intent and platform behavior.** Desktop GET redirects wait five seconds
  for Accept/Reject and Back cancellation. Non-GET requests follow natively, preserving request
  bodies. SPA replaceState reconciles an entry rather than delaying unsafe application state.
  iOS reconciles native redirect/replacement history without a banner. Safe requested addresses
  remain recoverable; authentication URLs/secrets are not added to portable history.
- **Downloads remain device-owned.** Desktop uses an OS Downloads default and configurable folder;
  filenames are reserved without overwriting unrelated files. Native uses Files, explicit folder
  access and export. History records real completion dates and bounded metadata; rotating it never
  deletes completed user downloads. Progress writes are coalesced on desktop. Web browsers retain
  their own download lifecycle and operating-system folder controls.
### October 14: legacy navigation authority

Before the all-type desktop synchronizer starts, import the newly managed saved surfaces into
legacy main/Team browser-only registries, and terminals into legacy chat registries. Preserve
existing browser authority, canonical relative ordering and unrelated extension fields. Record
`desktopSeedVersion: 2` on each imported scope so a stale session cannot resurrect intentionally
closed tabs on subsequent saves/restarts. Workspace registries already supported these types;
their missing descriptors retain close authority. The import precedes rendering, since dropping
a chat parent would also prune its child navigation. This desktop-owner correction does not
require a native-client rebuild. Validate with existing nonzero revisions and actual UI restart,
including an intentional close after migration.


## October 14 — Placement changes preserve navigation; native sidebar shares layout

Navigation entry identity and operation identity serve separate purposes. Use a new operation UUID
for each actual command and persist the exact command for retries; never reuse an entry ID as a
global receipt key. Reconciliation may acknowledge a matching saved entry without inventing a
visit. Changed payloads and actions against closed tabs preserve the outbox and pause retries for
explicit recovery. Browser moves use the same owner boundary as viewers/terminals; copy the entire
worker-owned stack to the destination without visits, retain source/receipts for crash recovery,
and advance the destination revision so stale commands cannot silently apply. The metadata file
and database are not one atomic transaction; copying first leaves the original intact on failure.

Electron's native WebContentsView paints above the shell's HTML. A compact sidebar expansion
therefore reserves 250 pixels of layout space and updates native bounds, instead of hiding the
whole browser. Other modal overlays retain their existing behavior. Workspace Tabs column widths
are local presentation preferences, never shared ordering or workspace configuration. Chat Move
changes organizational membership and its visible index independently of captured execution roots
and approvals; a browser-only Copy command does not clone a conversation.


## October 14 — Agent document placement follows the open chat surface

Resolve the existing local workspace chat first, then its standalone chat, then an already-open
organizational workspace. An agent document remains associated with its original chat/file
permission boundary while its display descriptor belongs to the selected workspace or chat
container. Reopening the same chat document reuses its descriptor/view and can relocate an older
chat-scoped placement; it must not create a duplicate top-level chat beside an existing workspace
chat. This corrects document opening without removing standalone chat subtabs. A broader model
with workspace containers and peer chat/resource tabs is a future design review, requiring saved
placement migration, browser-history/terminal continuity, host ownership, grants and focus rules.

## October 14: owner Move updates canonical placement without renderer help

Chat membership and canonical tab placement must follow the same owner Move path. Inspect both
main and workspace scopes, preserve the existing descriptor and unrelated rows, remove duplicate
chat placements and write once. Do not reopen a deliberately closed chat. Repeating a Move repairs
a stale main alias without changing other tabs; after convergence it is a revision no-op. Browser
retry queues remain preserved and are not required to synchronize before chat placement can move.
User-initiated Move selects the destination chat and reveals both navigation levels; an unrelated
background Move does not steal focus. Browser conflict recovery identifies the pending tab/page
and explicitly separates keeping saved history from first opening the pending page in a new tab.

## October 14: full redirect history and immediate native redirects

The operator explicitly withdraws redirect waiting/rejection and iOS entry rewriting. Preserve
every full HTTP(S) destination as a distinct entry/visit, including login paths, query strings
and fragments, while the native engine handles redirects and POST bodies. URL userinfo and
privileged/non-web targets remain rejected; page state, form bodies, headers and grants remain
outside history. This complete-URL retention preference replaces the earlier authentication URL
exclusion in shared browsing metadata. Keep private-profile selection and content/agent grants
independent, preserve existing data and acknowledge that earlier omitted URLs are unrecoverable.

## October 14: explicit approval for a schedule-started conversation

Preserve scheduled-run protection: a new conversation-only auto-approval requires the exact
waiting request, supported scheduled/manual trigger, matching permission context and current
chat revision. New folder trust must match the currently offered folder/access. Store only on
the named run, apply through continuations/restart and keep future schedule executions ungranted.
Revocation/inherit remains available. Automatic review rejected globally removing trigger guards;
the implemented narrower current-request path passed review and independent run-isolation checks.

The owner also converts older clients' different-URL `browser-redirect` commands to distinct
entry/visit appends under the existing idempotent receipt, retaining the originally selected URL.
Same-URL title metadata still updates without a new visit. A native cached Tabs page permits
local title selection while owner mutations remain disabled offline, and does not create a
connection alert for that cache read. History reconstruction rejects the privileged app origin
in both native and logical restoration; normal agent tab listings omit complete backstacks.
# Linux source and build ownership

The current Linux build uses the verified accepted 0.2.20 source archive from transfer commit
`418a083` on `codex/signed-proteus-0220-20261015`; all 879 source hashes and archive digest
were verified before import. Its accepted Mac fingerprint is
`3f2196de3586915fc72f8d0cdebb645c109992306c3735514d0786b0acaf4985`.
The earlier 0.2.19 import (`82cd923`) remains historical. Do not use an older `main` checkout or
an independently reconstructed Mac artifact as the current source. Record
the upstream source identity separately from the Linux runtime fingerprint. Linux packaging
rebuilds only its copied PTY, retains pinned dependencies and leaves Mac signing/iOS files alone.
Platform data paths and desktop lifecycle changes stay conditional; secure-storage requirements,
provider approvals and relay protocol remain intact. Keep private prelaunch backups outside Git.


## October 14, 2026 — Attachments do not share the controls lane

Use the existing shared composer grid for all desktop chats, with attachments in a bounded full
row preceding the controls; web retains its separate strip with the same styling and bounds.
Observe picker hosts rather than replaceable strips. Keep the controls docked while editor and
attachment content scroll, including when a waiting question occupies space. Preserve attachment
delivery/consent, draft state and model metadata; this correction does not redesign chat ownership.
Build/test first and hold website/Work Mac deployment as requested.

## October 23, 2026 — Apply the two-backup ceiling to server and local website recovery

The operator explicitly chose the latest verified backup plus one previous backup in each
applicable location and rejected accumulating older release/migration copies. This supersedes
the website's former three-generation/calendar and historical migration-pin exceptions. Verify
the retained pair, retire older known project payloads, retain minimal receipts, and do not import
obsolete generations solely to delete them. Additional full retention requires a fresh named,
size-bounded, time-bounded operator exception. Temporary third generations resolve immediately
after acceptance. Preserve unknown/unrelated data and existing review/access boundaries.

The website deployment helper applies that ceiling to inactive code generations as well as
full recovery sets. Count failed/incomplete extraction directories before permitting the next
in-flight generation. Retain the failed job/transaction and minimal manifests; storage cleanup
must not turn a failed activation into a replayable success. After a failed extraction caused
by storage pressure, reuse the verified recovery and exact tested artifact with a distinct,
recorded deployment transaction after resolving the storage condition. No new recovery capture
or application rebuild is justified solely by the retry.
The local code builder also refuses accumulated archives and prior unresolved build payloads;
that preflight performs no deletion and does not create a live-data backup.

## October 14, 2026 — Bound app update recovery to two full generations

The operator rejected release-by-release backup sprawl. Limit full recovery to two accepted
generations per installation/data home or physical device, count nested before/after/retry copies
individually, and resolve temporary in-flight exceptions. Use one verified pre-update snapshot,
resume device copies, retain post-install verification as receipts, and keep one app bundle per
generation. Compact completed migration evidence to targeted state/helper/receipts. Extra full
exceptions require explicit reason, budget, deletion condition and operator approval. This changes
agent/update instructions; it does not implement a new scheduler or deploy app code.

## October 15, 2026 — Exercise Projects in a separate real desktop app

Use the real Electron shell, engine and provider boundary for the next design iteration, seeded
with synthetic workspaces/projects/sources. A distinct bundle/name, userData/sessionData, loopback
port and runner home let production remain running. Copy only the existing Codex auth file into a
private preview Codex home; do not import provider config, native history, MCP connections, browser
profiles or production chats. Authentication presence is not proof of a working provider connection.
Preview bootstrap refuses unmarked populated data and preserves existing experiments on restart.

Project membership is organizational. Moving a conversation retains its captured execution and
permission context. Project content tabs currently persist in the desktop session instead of
inventing project support in the legacy workspace/chat resource owner protocol. Consequently,
non-chat project transfers and workspace deletion are explicitly unavailable pending that boundary
work. This is no production migration; web/mobile remain deferred.

Present real permission capabilities honestly. A saved exact command can execute changed scripts,
and a tool rule need not bind every recipient/resource argument. Keep broad approval explicitly
broad, and show bounded Autopilot as unavailable until provider/host enforcement can support it.

## October 16, 2026 — Separate approval decisions from permission management

A pending request answers a narrow question: what action, what target, and whether to allow it.
Expose Allow once, Deny and only host-supported Remember scopes there. The composer Permissions
button navigates to the existing side panel; do not duplicate that panel in a verbose modal.
Keep workspace mutations in workspace Configuration, chat exceptions in the chat, and explanations
behind Help. Whole-profile deletion resets inheritance; labeling it Revoke falsely suggests denial.

Codex's currently running native sandbox cannot be replaced in place. In the isolated preview,
prove that a changed policy preserves every original runtime/writable root before permitting a
turn to continue under its original narrower sandbox. Reductions, mixed changes and unknown policy
still interrupt, invalidate stale approval completions and require explicit continuation. Do not
silently retry tools. Additive Remember initializes from effective inherited grants rather than
an empty permission override. Normal production behavior remains gated pending review/rollout.

Workspaces collection no longer duplicates global Chats. Use separators across its fixed local
tabs and following resources. Sidebar options use shallow grouping or contextual navigation to
recover chat-title width; they remain proposals until the operator selects a direction.

## October 16, 2026 — Group workspace navigation without deep indentation

Historical design: later October 16 paging and October 18 Engine Room/Collapse all rules
supersede the loaded-count and fixed-footer choices in this entry.

The operator selected grouped rows. Keep workspace names on shaded headers, project grouping
shallow, and chat titles on up to two lines. Right-side expanders control disclosure independently
of the name links. Workspaces is the final scrolling feature; a separator then introduces all
workspace groups, which remain present on every feature. Initial groups are collapsed.

Separate active location from disclosure state. Switching features retains expansion and loaded
chat counts. More adds seven recent chats; explicitly collapsing a project discards its extra
count so reopening restores the top seven. Closing a workspace preserves its nested project state.
Use a single scrolling region for features and groups, with AI allowance and Engine Room outside
that scroll region. This keeps settings reachable while long chat lists consume navigation space.
The change is confined to the isolated desktop preview and does not alter chat membership,
resource placement, captured permissions, provider execution or production navigation.

## October 16, 2026 — Preview tab polish and direct row ordering

Use the existing feature icon vocabulary across fixed tabs, resource strips and the Open tabs
table. Selected browser titles receive the same white foreground as selected chat/project tabs;
inactive navigation gets a modest brightness increase. Fill project selection through the expander
so its disclosure control belongs visibly to the row. Whole-group shading alternatives remain
proposals; do not make every ancestor look selected.

Dragging a title or empty row space reorders existing siblings in one workspace/project. Keep
buttons, links and column resizing independent, preserve plain-click navigation and provide
Alt+Shift+Up/Down from the focused title. Aggregate/filtered lists must never infer a new parent;
cross-owner placement belongs to explicit Move. Persist through the existing desktop owner action.

The operator removed the composer Permissions shortcut. Ongoing permission management lives in
the existing Details sidebar, with Help for explanations and workspace Configuration for shared
changes. Pending requests retain their inline decision controls. This supersedes the composer
shortcut described earlier in this day's decision without changing approval semantics.

## October 16, 2026 — Workspace panels and mixed project recents

The operator selected the workspace-panel treatment. Use existing Proteus surfaces and accents,
keeping the navigation background. Workspace and project headers establish grouping; the selected
child gets a lighter box containing its type icon. Do not add a left hierarchy line. Put the
computer name beside the workspace name; keep it below the wrapped title in global chat recents.

A project's recent list combines its conversation membership and existing browser, terminal and
viewer tabs. Deduplicate open representations of a conversation. Count all represented items,
independent of pagination; workspace count means number of projects. Sort by recorded interaction,
falling back to existing chat activity when access is unknown; never make listing itself a touch.
Opening a resource selects its current owner/session; listing does not imply a grant or recreation.
Sidebar recency does not reorder the user's tab strip.

Reuse this selection/grouping treatment for active feature recents without new header expanders.
Keep seven initial entries and add four with each subtle More action. Feature departure resets
extra paging while retaining workspace/project disclosure state. Project collapse resets its
items; workspace collapse resets its extra project list. This supersedes the earlier choice to
retain loaded counts across features. Scope remains the isolated desktop design preview.

## October 17, 2026 — One group surface and a shared sidebar width

The operator selected whole-project panels and supplied a reference palette, superseding the
initial shared Workspaces-button green. Sidebar buttons and subitems use the same roles: dark
navigation, muted workspace surfaces, a continuous panel around each project's heading and
children, olive selections with pale-green text, plain counts and subtle group borders. The
workspace header has no separate fill. Strong active-project text and an accent icon identify
ancestry; the strongest fill identifies the selected item. Keep shallow indentation and no
vertical hierarchy lines. Feature recents share these roles. Activity below an hour shows
whole minutes, with `<1m` for less than a minute, rather than collapsing every recent item to `<1h`.

A subsequent visual pass lightens the sidebar and aligns the surfaces to one green family.
Inactive or collapsed projects stay dark; only the current expanded project receives a brighter
panel. These are navigation states, not resource loading changes. Match left/right insets around
project panels, their child rows and feature sublists rather than accumulating left-only margins.

The final requested mapping replaces approximate sidebar shades with the existing chat surfaces:
main background for the sidebar, outer chat card for active workspace/buttons, assistant message
for the current expanded project, and user message for selected items. Reuse background/panel
tokens and shared preview message tokens so these exact pairs stay aligned. Preserve the dark
inactive/collapsed treatment and balanced insets.

The next selected-item reference overrides only the user-message mapping: selected sidebar
items now use its sampled olive fill `#46503f`. The other three chat-surface mappings initially remain.

The following refinement removes enclosing boxes from non-workspace feature recents: the
active feature button and selected item keep their own fills, while the list and wrapper are
transparent and borderless. Workspace/project panels remain. Lighten the current expanded
project slightly above the assistant-message surface (`#26312a`); preserve dark inactive projects.

The sidebar's pinned and transient forms share an application appearance width, changed with a
pointer or keyboard resize separator and retained across restarts. Transient navigation overlays
content rather than reflowing it. Native browser views are temporarily hidden using their existing
overlay ownership mechanism, with no unload/recreation or session changes. Proper browser/renderer
compositing is deferred. These choices apply only to the separate desktop preview at this stage.

## October 17, 2026 — Sampled reference navigation treatment

The latest operator reference supersedes the earlier exact chat-surface mapping and olive fill:
sidebar `#121512`, active workspace `#181d19`, active project/feature `#1d231e`, selected row
`#31392c`, accent `#bedc93`. Inactive icons and metadata use `#6e786f`; selected text uses
`#d4e7b6`. Inactive projects blend into their workspace, leaving the active expanded panel distinct.
Use shallow balanced insets, rounded panels and a curved accent on the selected row itself; this
is not a vertical tree guide. Keep non-workspace feature lists unboxed. A nonzero Needs attention
count gets the reference's filled badge; ordinary counts stay plain.

Icon paths, glyphs and website favicons are preserved. Isolated preview icon wrappers allow main,
chat/workspace and Team Tools tab icons to take the same green accent without changing white
selected titles. Chat message colors stay independent. Scope remains the isolated desktop preview.

The next refinement restores the horizontal divider below Workspaces and reduces the sidebar
feature/workspace/project labels from 15px to 14px; leaf item titles and metadata are unchanged.
Active Chats and other feature recents now share one continuous project-style panel around the
heading and items. Keep the heading and inner list transparent so this remains a single surface.

## October 17 — activity ordering and tab lifecycle in the desktop preview

Selection, focus and scrolling no longer advance recent-item age or order. Preview activity uses
`lastActivityAt`, separate from browser retention's `lastTouchedAt`: new resources, accepted chat
messages, explicit browser navigation/refresh and successful terminal input advance it. Reading,
provider output, title changes and restoration do not. Chat summary/index/view projections expose
accepted-user activity with creation fallback; legacy focus timestamps are not treated as activity.
Projects keep an explicit workspace-local order, edited by title/row drag or Alt+Shift+Up/Down on
the workspace Projects page. The sidebar follows that order. Workspace aggregate Tabs cannot be
reordered; project Tabs retain sibling reorder. Lists validate workspace, project and owning host.

Closing workspace navigation survives passive reconciliation and returns from active descendants.
Closing the final chat view evicts history/render caches, including late fetch results, while
preserving history, drafts, permissions and execution. Browser Hide now unloads in the preview;
Restore reveals without loading; selection loads. Persist/shared status alone does not prevent
Hide, but actual in-flight work/unsaved page state still reports a blocker. Hidden persisted tabs
stay unloaded through restart, with portable navigation identity preserved. Native hide succeeds
before visibility is committed, with conflict checks and rollback on persistence failure.
Production, web and mobile remain held. See desktop-preview.md for verification and current app.


## October 18 — production projects use additive owner metadata

The reviewed preview design becomes the ordinary desktop/web workspace model. Extract a shared
host-owned project catalog rather than enabling the synthetic preview bootstrap in production.
Preserve the distinct preview bundle, data root, provider setup and relaunch workflow.

Initialize each legacy workspace with one stable default project. Catalog membership/redirects
are organizational metadata; do not rewrite original run files, execution context, permission
origins, schedule selections or provider IDs. Keep canonical legacy source roots and selections
while registering their union globally. Adding library roots discovers tools without granting
filesystem access. Move direct legacy workspace chat views to the default project, but preserve
explicit main/Team/unhoused views and direct workspace browser/terminal/document placement.

Shared content uses an explicit `project` scope and owner namespace. Never alias two projects to
one workspace content key or seed a peer-owned collection as local data. Redirect deleted
projects to the fixed default chosen at deletion; later default changes do not retarget old
redirects. Preserve native resource identity and document authorization origins during moves.

Migration must not silently trim a session at the previous 100-tab limit. Support 1,000 tabs with
bounded persistence and visible overflow refusal, retaining the prior valid file. Validate
logical identity, drafts, navigation history and restart idempotence using synthetic legacy data
before any live replacement. Existing owner/peer history services remain opt-in; project support
is not permission to replicate credentials, cookies, live processes or another computer's data home.

## October 18 — peer project transport keeps the owner boundary

Extend the desktop peer command allowlist to match the established project/source and workspace
interface commands already implemented by the owner. Keep revision, grant and lifecycle checks
at that shared boundary; a local peer must not reconstruct or edit another owner's catalog.
Treat project-shaped move results as catalogs, rather than chat lifecycle records, and project
them through the same metadata filter as ordinary catalog reads. Cache project membership in the
existing encrypted host/chat index so a same-workspace move survives stale indexing and offline
restart without changing chat execution, activity or archive state.

## October 18 — preserve navigation aliases during project migration

Organizational chat membership does not determine every open view. Passive migration must retain
main quick-reference chat aliases and their child resources while moving workspace/project
descriptors into the appropriate project scope. A saved chat absent from an initial summary or
an older peer registry is not evidence of an intentional close. Preserve those local aliases
until the owner has exposed the descriptor; observed owner closures still synchronize normally.
When an older peer gains project support, remap existing workspace chat views before applying
project-scoped tab synchronization. Preserve native view identity, children, drafts and selection.

The live acceptance guard compares all saved view aliases, not just unique logical content IDs.
A failed preservation check blocks subsequent machines. Reuse the verified original cold
generation for correction after checking for intervening work; retain only compact failed-attempt
evidence after acceptance rather than accumulating full recovery copies.

## October 18 — web follows the accepted desktop navigation

Use the desktop's existing color tokens, icon geometry, label sizes, shallow insets and rounded
selection edge across the authenticated web shell. Workspaces and projects keep one owner-scoped
tree on every page, including Engine Room; expanding it reads descriptors without opening tabs or
advancing activity. Preserve manual project order and meaningful activity order for mixed resource
items. More adds four items; collapsing a group clears its extra paging, and feature departure
resets temporary paging while keeping expansion state.

The top navigation identifies a workspace. Its inner navigation starts with the fixed Projects,
Chats, Tabs and Configuration controls; do not insert another workspace-name tab there. Keep
Engine Room in the scrollable navigation below Workspaces and AI allowance fixed. Persist web
sidebar width in account-scoped browser preferences; the collapsed overlay uses that width
without shifting the main content. Browser-specific controls and owner-side access restrictions
remain explicit. This web-only refinement does not replace the frozen signed desktop artifact.

### October 19 — Refresh resumed Codex browser schemas through the existing app bridge

The installed app-server resume schema cannot replace native dynamic tool definitions. Preserve
existing thread identities and refresh the current browser/tab catalog through `proteus_app` on
resume. Reuse native app-action approval/revocation handling rather than bypassing it or requiring
new chats. Capabilities remain run-bound, rotate per turn and close at turn completion.

## October 19 — device-specific feature headers and service-owned Team Tools

Use a compact feature header as iPhone's navigation anchor; keep the drawer and main-tab add
action available alongside each feature's existing controls. Main tabs remain labelled in the
phone sidebar and are also manageable from Home. iPad retains its main strip, adjacent child
tabs and page-level feature header, with no redundant sidebar tab list. Phone search stays below;
iPad search follows actions in the page header. Only phone supports manual double-tap hiding.

Team Tools continues to read/write website-service lists. It must not adopt the selected Mac
as a replacement source. Link management belongs on Team Tools; roster/settings and Dock
Standup belong inside Standup. Previews use a shared synthetic service to verify revision-aware
editing across idioms without changing real accounts or interpreting a build as live parity.

## 2026-10-19 — Website data stays with its browser partition

Reuse Electron's cookie inventory/clearData and Chromium DOMStorage, IndexedDB, CacheStorage and
quota inspection. A short-lived hidden target serves an empty intercepted document in the selected
partition: no website request, page script, sleeping-tab load or agent debugger handoff is needed.
Never use browser-wide CDP Storage.getCookies: it can expose a different browser context. Keep
cookie values internal, show names/scope/expiry and warn that site-wide cookie clearing reaches
registrable-domain siblings. Clearing website data leaves Proteus history, sessions, approvals,
source choices and extension definitions intact. Preserve extension storage in whole-profile clears.
Known-site discovery is honest: cookies, open tabs and origins observed by this version; support an
explicit origin for older cookieless storage. No browser-database parsing or claims of an exhaustive
legacy origin inventory. Version requests are per-origin browser hints, not arbitrary hostname
rewrites; only the known m.youtube.com to www.youtube.com desktop equivalent is normalized.

Overview uses organizational owner sections, never resource recreation. Main overview mirrors the
main strip; workspace overview includes that workspace's named projects, current first. Dragging
reorders same-owner peers, never silently moves a tab to another project. A gesture that changes
page zoom must end before a new baseline pinch can enter overview.

## October 15: authenticated workspace favorites and simulator family coverage

Native chat source favorites use the current authenticated host workspace profile. A captured
chat's explicit workspace ID takes precedence over an ID omitted by its folder profile; an
explicit empty favorite list is authoritative. Legacy missing lists fall back to scoped discovery.
This avoids stale offscreen SwiftUI section tasks without broadening trust or changing owner
mutation/revision checks. Test-only picker interactions target the displayed value and verify
the resulting selection and backend state. Native CI partitions all UI cases by required hardware
family, rejects mismatched/unavailable simulators and runs tablet assertions on an actual iPad.
A phone run or a silent device guard cannot establish tablet acceptance.

## October 15: one native browser navigation gesture owner

Honor the October 9 content-relative 56-point edge/80-point movement contract through the
existing app handler. Disable WebKit’s independent interactive recognizer and remove the
native-adjacency suppression of that handler. The October 12 full-path check in goBrowserHistory
still selects an existing WKBackForwardList item when safe, preserving DOM/page instances and
history.state; restored or mismatched stacks retain saved-URL loading. A delayed fallback cannot
reliably distinguish WebKit cancellation from a late interactive commit and could navigate twice.
This ownership correction deliberately removes WebKit’s interactive swipe preview/cancel animation,
while preserving semantic navigation, zoom, two-finger handling and owner/history safeguards.
Validate a single swipe across three pages to detect skipped entries as well as missed actions.

## October 15: browser activation is explicit and transient

Keep the remembered main-browser ID separate from a transient activation request carrying a
fresh UUID and target tab ID. A user selection, including reselecting the same browser, emits
the request. Passive browser-view appearance, cache/account hydration, remote metadata and close
fallback do not. Shell reconciliation imports/removes descriptors independently and processes an
activation only after its target exists. No request is persisted. This prevents deferred SwiftUI
observations of restored browser state from overriding a cold notification’s explicit schedule/chat
target, without timers, reseeded caches or changes to owner permissions and saved tab identities.

## October 19: one host across windows, independent update supervision

A WindowRegistry assigns every desktop window a durable ID and private session/reading namespace.
Top-frame IPC and asynchronous native callbacks retain that ID; a closed context cannot resolve to
another focused window. Browser profiles, permissions, extensions, downloads, provider sessions and
terminals remain in one host-owned service. Inventory exposes per-window views alongside stable
logical IDs; canonical operations reconcile every matching view without recreating sessions.

The update supervisor runs from the immutable signed staged candidate's Electron runtime, outside
its replacement target. This avoids a dependency on a separately installed Node interpreter and
reuses the exact verified signed resources. The tradeoff is transient staging disk space; the old
application belongs to one verified recovery generation, and completed helper staging is retired
only after its process exits. Both candidate and rollback baseline must implement update protocol 1
and data-compatibility 1. The first helper-capable release is installed through the existing external
procedure; an older 0.2.25 app is not claimed to support this new automatic rollback contract.

A private journal outside the app-data snapshot retains authorization, checkpoint, source/package
identity, helper readiness, phase and one continuation ID. The host waits for settled turns and
attached nonpersistent terminals/downloads, then takes a dispatch barrier; new input before handoff
invalidates the checkpoint, while recovery input stays durably queued before the continuation.
Atomic-replacement phases reconcile after helper restart. Compatible rollback does not restore an
old data snapshot over newer records. Delivery retries reuse the same ID; ambiguous delivery or
changed permissions/sessions require inspection instead of replay. The installer initializes the
per-target recovery inventory, including existing backup roots, before unattended restart is enabled.

Cua is the primary native-control backend. Peekaboo's actual snapshot-only inputs are adapted to
an exact PID/window receipt instead of guessed Cua parameters. Catalogs/processes start on demand;
only Proteus-owned transports and sessions are stopped. Stop retains uncertain input effects until
the same target is observed again. Permission refusals remain host-wide across chat/backend changes.
No foreground/global-pointer or nested agent/shell/browser control is exposed through this surface.

## October 19: disabled owners retain a stable identity

Persist the initial disabled remote configuration when creating a new local owner. Navigation
operation digests include its host identity even when no remote listener is configured. Generating
a new identity on restart breaks otherwise identical retry receipts. Saving the default does not
enable remote access, pair devices or rewrite existing histories/receipts. A restart regression
preserves the complete Back/Forward stack and replays its original operation successfully.
## October 20 — native browser keyboard ownership on renderer navigation

When the foreground window leaves an active native browser for a renderer page, return native
keyboard focus to that window's shell after hiding the browser. DOM focus alone leaves keystrokes
in the hidden WebContentsView. Do this once on the transition; repeated layout updates and
background windows must not steal focus. A real native-focus regression fails the prior signed
artifact and passes the correction, alongside foreground/background ownership unit coverage.


## October 20 — Preserve text entered during asynchronous tab creation

Hiding a native browser after creation is too late for fast Command-T typing. Return native
keyboard ownership synchronously, then keep a window-local ordinary text input until the owner
returns the new stable tab identity and its address field mounts. Transfer text, selection and
early Enter only to that identity after form handlers exist. Native input editing handles paste
and composition; there is no global key recorder or persisted typed buffer. This also serves
main, chat-child and Team new-tab creation without changing browser page authorization.


## October 20 — Native chrome follows scroll intent; thumbnail work stays off the UI thread

Use the existing WebKit scroll recognizer as an observer without replacing its delegate or
consuming page input. Separate hide/reveal thresholds avoid oscillation; an explicit menu action
remains available. Address swipes apply only to the unedited display and resolve fresh visible
container order, preserving scope and page history. A serial utility queue performs thumbnail
resizing, encoding, atomic persistence and retention; temporary capture tasks coalesce and avoid
active scrolling. Toolbar labels have independent presentation so iOS cannot visually merge the
page name into the sidebar button. The existing iPad rail color also defines desktop and phone.


## October 20 — Readiness IPC ends before the update host exits

After the signed helper acknowledges its job identity, the host removes handshake listeners and
disconnects/unrefs the transient IPC channel. The helper continues through its private durable
journal independently. Error/timeout paths release the same channel. A subprocess regression
verifies disconnection while the independent helper remains alive; the forced-health test's
injected helper follows the same contract. This hardens independence; final exact signed
update/rollback acceptance remains required after an earlier fixture exit timeout.

## October 20 — Shared container content with recoverable window presentation

The operator clarifies one canonical content-tab set per Team Tools/workspace/project/chat owner
across windows: Close and same-tab navigation synchronize, while each window independently keeps
its top-level navigation, selection and geometry. Window identity scopes presentation; it must not
create a separate Team content registry. Native view IDs remain separate from stable logical tabs.
The secondary-window duplicate/wrong-selection cause is not established by this design choice.

Individually closed windows must now be recoverable and nameable in Engine Room, superseding
October 19's discard-on-Close policy. Restore saved window presentation against the current owner
contents rather than restoring old project tabs/URLs, permissions or terminal execution. Repeated
restore focuses an existing open instance. Keep one host/runner and current revision/receipt
protection. The operator selects the integrated Unified strip, retaining its darker background
and the current navigation style: top-level close ×, selected underline and dividers. Revise the
chat draft with those controls before the Proteus demo. Further operator refinement adds a thin
top tab boundary matching dividers, retains the existing overlapping rectangles overview button,
and keeps overview/+ controls at the right of each strip. The sidebar joins the title bar and spans
beside secondary tabs, without a blank segment above it. Keep overview distinct from Engine Room
window-session management. These are next-release requirements,
not implemented or live-verified behavior. See [window management](window-management.md).


## October 20 — Functional isolated window exploration

The operator authorizes the selected design in Proteus Design Preview and the associated iPad
repair source. Keep the existing overview icon in the universal secondary content row, beside
New tab at the right, rather than coupling it to a URL field. The main integrated strip reserves
20 pixels above 44-pixel tabs for drag space and centers one brand beside native window controls.

Window snapshots own presentation, drafts and reading positions; canonical content registries
own shared membership/navigation. Restore against current owner state before mounting views and
focus an already-open instance. Use private revision-checked atomic metadata and bounded snapshot
files. Merge legacy Team registries once by stable identity, never URL. Recheck local identity
after asynchronous native creation so synchronization cannot append a duplicate entry.

For native chat pinch, observe UIKit gestures at the current content surface; SwiftUI’s nested
magnification recognizer can lose to scroll/text views. Leave browser-page pinch to its existing
handler. Keep unsupported owner tab descriptors in mobile projection rather than generating
accidental closes or incomplete reorder payloads. Preserve current authorization boundaries;
empty-looking Team UI is not evidence that its website data was deleted.


## October 20 — Stable drag brand and explicit human pause

The latest preview uses the brand area for window dragging, without Home navigation. Keep its
width independent of the sidebar and restore the original sidebar chevron. The 56-pixel header
fits an 11-pixel margin, 44-pixel tabs and a bottom border, preventing selection-line clipping.

Default agent page access still needs no sharing/profile opt-in. The operator additionally wants
a real robot switch: interpret Off as an explicit human pause for that logical tab. Persist it
at the host, independent of native view lifetime or presentation moves, and gate all page backends
at the same boundary. Do not add an agent route that resumes itself. Organizational inventory and
lifecycle remain separate from page access; pausing does not recreate a session or clear history.

## October 20 — page scale in the browser page menu

Use an owner-bound sandboxed child window for the browser … menu so one compact − / percentage /
+ row can remain open above the native website while changing scale. A native Electron Menu
cannot render this interactive row. Read the website's actual zoom factor on each opening and
after adjustment, preserve Chromium's origin/profile behavior, and keep shell zoom separate.
The menu receives only validated labels, theme colors and a numeric percentage; its preload can
choose a captured action, adjust scale or close. The host checks sender/frame and captured page
lifetime. Preserve existing menu dispatch through toolbar redraws and dismiss on blur/Escape.

## October 20 — independent setup and browser presentation lifetimes

Keep New chat setup mounted in the tab with unique form/provider/attachment identities, rather
than a modal that blocks navigation. Save bounded window-private draft data without attachment
bytes; share only the existing canonical blank-tab descriptor. Record explicit pending-open
intent until authoritative ownership acknowledges creation, while preserving revision conflicts.
Keep each form's source catalog independent of whichever project the renderer is now displaying.

Reuse the sandboxed page-menu child surface for compact popup clients. Native page rendering and
shell HTML do not share CSS stacking; legacy hiding was a workaround, not an Electron requirement
that agent pages disappear when unselected. Preserve page/debugger identity across selection and
keep an active turn's automation lease between calls, releasing it on completion/human pause.
Do not claim this lifetime hardening reproduces the original reported dropout.

Use registrable-domain/private-suffix rules for page-scale preferences, isolated by the existing
account-owned partition. Persist before applying, update matching live views, and keep layout
scale independent from visual pinch. Gesture eligibility is measured at the start of a fresh
pinch and permanently blocked for that gesture once zoomed; a small baseline attempt may open overview.

## October 21 — menu bar Keep Screen Awake

The operator requested a tray-controlled idle keep-awake feature. The desktop host now offers
**Keep Screen Awake**, off on launch, using Electron's native `prevent-display-sleep` assertion.
It remains active with windows closed and stops on toggle-off or application quit. It does not
move the pointer, require Accessibility input permission, or change system sleep preferences.
Native protection starts immediately, so it also covers sleep timeouts shorter than a few minutes.
Explicit locking/sleep and OS policy remain in control. The setting is local to this process;
restart/update returns to off. All 865 Node tests and syntax checks pass. Isolated Electron UI acceptance verifies the native
macOS display-sleep assertion, background operation, toggle-off and quit cleanup. Packaging is
in progress; installed apps are unchanged.
## October 22 — bounded Windows atomic replacement

Installed acceptance exposed a transient Windows sharing violation while replacing a chat-state
document. Atomic state writers now share a bounded Windows-only rename retry (at most ten short
waits). They retry the replacement operation without deleting the old document or weakening ACLs.
Persistent denials still fail, and other platform/error behavior stays immediate. A real Windows
reader-lock fixture verifies replacement after the reader releases the file.
## October 22 — unchanged workspace saves do not request descriptor synchronization

A Linux traffic failure and separate bounded trace exposed catalog/sidebar repaint scheduling
another chat/project descriptor pass immediately after hydration had persisted the same snapshot.
Use the existing serialized workspace comparison to decide whether `saveWorkspace` schedules
its debounced sync. Keep the schedule alongside a real snapshot change and preserve a pending
edit's timer when a no-op save arrives. Do not remove queued reconciliation, cache arbitrary
descriptor responses, loosen history acknowledgement or increase test traffic budgets.
Periodic and explicit/event-driven refresh still obtains owner changes; pending request identities,
complete histories and checkpoint behavior are unchanged. New exact-package verification is
required before installing the superseding runtime.

## October 22 — private draft assets for large desktop transfers

Use fixed authenticated draft-release assets in the authorized private source repository when
transferring a large signed desktop archive and its source companion. Pin repository privacy,
draft status, numeric release/asset identities, byte lengths and independent digests; verify the
uploaded server digest and actual destination download. This avoids adding each build's binary
payload to Git history. Existing transfer branches remain evidence, not application branches to
merge. Do not publish the draft or replace an ambiguously uploaded asset: reconcile it first.
No application data, profiles, credentials or private acceptance receipts belong in the assets.

# Structured questions retain protocol identity and provider lifetime

Only structured provider input enters the answer queue; ordinary prose is never classified as
a request or an approval. Native asynchronous message questions remain durable until answered;
the protocol advertises no expiry. Native server requests retain their blocking flag and actual
resolution notification. Answers and returned task feedback preserve stable owner-side delivery
identities; uncertain delivery cannot trigger an automatic resend/fallback. Native tool approvals
remain a separate human decision even when a remote coordinator reports awaiting input.

## October 26 — retain desktop identity for protected credential selection

Keep a bounded allowlist of existing Linux desktop-session variables across updater relaunches.
Desktop identity and D-Bus/display identity jointly determine Chromium's protected-store choice;
preserving only the latter can change availability despite an unlocked wallet. Never infer a
desktop, switch password stores, change encryption or copy secret environment values to solve
this. A previously lost context needs its verified normal-launch values restored separately.

## October 26 — presentation cleanup during owner shutdown

Validate the trusted origin/window/main frame before acknowledging late hide/overlay requests
as no-ops during shutdown. These requests cannot mutate durable tabs or reopen surfaces after
the owner has started disposing them. Preserve rejection for every other browser action rather
than suppressing renderer errors generally or weakening the search fixture's zero-error gate.

## October 26 — existing-tab metadata cannot reopen a closed identity

Retain the compatible open operation with an optional updateOnly flag for snapshots of existing
tabs. Both client rebase and the owner require that identity to remain present. Fresh user opens
retain ordinary creation semantics. This avoids treating title/history refresh as an instruction
to reopen a closed or moved tab, without changing placement, sessions, permissions, navigation
receipts or the persisted descriptor format. Older clients must be upgraded to supply the flag;
existing uncertain request payloads and operation identities are never rewritten.

## October 27 — Scope-proven delegation and bounded derived projections

Provider-owned relationship events establish native child lineage. For current Codex this includes authoritative `thread/started` ancestry and `subAgentActivity` started/interacted events; old collaboration events remain compatible. Model narration, restored transcript rows or arbitrary IDs cannot establish authority. Children route applicable approvals through the parent, with child abort signals and explicit scope-rejection provenance. Host delegation uses ordinary engine runs captured from the parent provider/model/account/context, stable operation receipts and current-profile validation; it does not create another owner or approve external tools.

Child journals and selected-transcript caches are bounded. Summaries stay lightweight, transcripts page only through a proven parent relationship, and current streaming text is separate from durable events. The read-only inline surface preserves the parent composer and session. Protocol additions remain optional version-1 fields/capabilities, so older owners get an explicit unavailable view without a relay upgrade.

Arbitrary file storage is separate from provider media support. Preserve exact originals and let a bounded active-turn tool read unsupported binary/oversized text, rather than reserializing huge text into a provider message. Rich paste is inert and uses plain text when hidden styles cannot be established. Explicit schedule folder grants pin the canonical destination at save, while workspace references resolve current configuration afresh with revision provenance.

The measured browser optimization batches only redundant state projections at 16 ms. Mutations, access revocation and explicit reads remain synchronous to owner semantics. The comparison demonstrates reduced projection work, not a general claim of lower production memory or fewer active model processes.

## October 29 — Interactive edge swipes everywhere; one browser swipe handler

Refines the October 15 native content-edge correction at the operator's request for Safari's
interactive page-image swipe, extended to other navigation. One Proteus edge recognizer serves
browsers, project tabs, project homes and iPad workspace/project steps. It follows the finger over
the last image of the destination (the previous/next saved web page, the project home or the
workspace page), then settles or springs back, committing past 30% of the width (at most 150 pt)
or with a flick. It starts only within 56 points of the content edge, so it also works beside a
pinned iPad sidebar, and scroll views and tab strips under that edge wait for it to fail; taps and
long presses continue alongside. WebKit's own recognizer stays disabled: enabling it was tested,
and with both installed neither reliably owned the edge, while a single handler keeps saved owner
history, restored history and the exhausted-history return to the project home consistent. Page
images are snapshotted as each page is left and held in a bounded memory-only cache. UIKit's pop
still returns from a pushed project or workspace on iPhone, and steps that push with their own
animation trigger on release instead of sliding.

Chats have no header bar. Their actions live on the tab that names the chat, so a project chat on
iPhone shows only the project bar and the chat's own tab row. The single sidebar control sits at the
start of the project/workspace bar on both iPhone and iPad and is never opened by an edge swipe.
Project tabs swipe back to their project home before UIKit pops the project.
