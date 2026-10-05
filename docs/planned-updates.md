# Implementation status and backlog

Maintain this as the single backlog. Design rationale is in `decisions.md`; recent changes are in
`../CHANGELOG.md`. Items below are status, not promises of completed validation.

## Queued: tab-bar branding and persistent navigation icons — October 5

Status: explicitly requested following the approved chat mockup; not implemented.

- Move the compact Proteus name and existing app logo into the top tab-bar chrome so branding
  remains visible with the navigation minimized. Preserve the current product logo and icon
  artwork; the illustrative mockup logo is not an approved replacement.
- Slightly enlarge navigation icons and normalize their perceived size, alignment and stroke
  treatment. Equal bounding boxes alone are insufficient when glyphs occupy different areas.
  Apply the same shared sizing rules to corresponding desktop/web and wide-iPad controls.
- Minimized navigation retains a narrow rail of clickable feature icons, active-state indication
  and accessible names/tooltips. Pointer entry still opens the sidebar as a slide-over; leaving
  closes it without shifting the content, losing focus or intercepting unrelated chat controls.
  Preserve explicit expand/pin controls, keyboard access and a touch alternative on iPad.
- Acceptance: expanded, icon-only and hover-overlay states at normal/narrow widths and UI scales;
  long/overflowing top tabs; active feature/subitems, pointer transitions and keyboard/touch use.
  This changes shell presentation, not feature routing or the location of iPhone allowance.

## Queued: remote desktop chat parity and automatic earlier history — October 5

Status: operator report with local/remote desktop screenshots; queued, not implemented or tested.

- Reuse the local chat composer and layout for remote desktop chats: the same message box,
  Send/Queue/Steer/Stop behavior and destination-provider model, effort, speed and applicable
  context-size controls. Use the owning Mac's refreshed catalog and advertised capabilities.
  Apply selected settings to the next queued turn, preserve the active turn's settings and keep
  the chat on its original provider/host. Never silently substitute a model or route locally.
- Present the same read-only chat details as a local session where the host supplies them:
  input/output and supported cache/credit metrics, session identity/files metadata, captured
  workspace and loaded context, source versions/delivery state, model history and approvals.
  Desktop/web use the normal details sidebar/adaptive layout; mobile keeps expandable Chat
  details and Loaded context with its existing compact visual treatment.
- Omit remote file Open/Copy path actions and context-changing controls from this increment.
  Read-only source/path metadata can remain informative; do not map remote paths to the viewing
  machine, request new filesystem grants, alter context or expand resource access for parity.
  Context-size model selection is distinct from changing selected workspace/context sources.
- Replace the normal Load earlier messages button with automatic page loading near the top of
  remote conversation history, including web/native equivalents where applicable. Preserve the
  visible message/scroll offset when prepending, stop at the beginning, show a compact loading
  indicator, and offer a retry on failure. Coalesce loads, deduplicate stable event IDs and
  preserve activity boundaries, open disclosures and playback through pagination/live updates.
- Retain per-account/host/chat drafts, selected model settings and scroll state across tabs and
  reconnects. Offline and older-host capability limits must be explicit; no replay of ambiguous
  sends. Keep provider setup on the host and existing host-side permission enforcement.
- Acceptance: the same synthetic local/remote transcript and composer states; model changes
  through a real test peer without billable prompts; source/session details read-only; older-host
  fallbacks; repeated upward scrolling during streaming, reconnect, failed paging and long history.

## Queued: pasted image and file attachments in chat — October 5

Status: requested for chat composers across desktop/web/iPhone/iPad, including remote chats;
not implemented. The supplied attachment-strip image is a presentation reference only.

- Pasting images adds preview thumbnails in an attachment strip at the top of the composer.
  Clicking/tapping a thumbnail opens a large modal preview; clicking the backdrop or its X
  closes it. Include Escape, focus containment/return and an accessible close control.
- Pasted non-image files appear as filename tags, with type/size where useful. Keep attachments
  outside the editable text if simpler; allow multiple mixed attachments, text and per-item removal
  before sending. Retain their association with the draft and show sent attachments in history.
  Use platform paste/file-selection equivalents where clipboard file access is unavailable.
- Stage attachments locally until explicit Send/Queue (or another explicitly supported send
  action). Show preparation/upload/error states and provider capability/size limits; unsupported
  formats must produce an actionable explanation, never silent omission or claimed delivery.
  Images should reach image-capable providers as images, not only a path on the viewing device.
- Bind every attachment to its account, destination Mac, chat and submitted message identity.
  Deliver remote bytes through an authenticated encrypted host transport; do not expose public
  file URLs or give the website provider credentials. Define bounded size/count/type validation,
  filename/path normalization, draft protection, retention and cleanup before implementation.
- Preview untrusted file contents safely; do not execute pasted files or interpret file content
  as privileged application instructions. Pasting itself grants no workspace trust or broader
  tool permission. Treat attachment removal, cancelled sends, retries, account/host switches and
  application restart explicitly so content cannot be silently sent to another destination.
- Acceptance: multiple image/file paste with text, remove/retry, thumbnail/full preview dismissal
  and keyboard accessibility, native clipboard/files equivalents, local and remote delivery,
  duplicate send protection, provider rejection, large/unsafe files and cross-account isolation.

## Queued: allowance refresh and approved chat presentation — October 5

Status: the operator approved the interactive chat proposal on October 5 and requested queuing,
not implementation. The source review and read-only local Mac check are complete. The approved
flow applies to desktop, web and mobile; mobile keeps its condensed native formatting and solid
message boxes. No runtime change, deployment or live-chat execution has occurred for this queue.
Private chat contents, machine paths and account usage values are excluded from this record.

Confirmed requirements:

- **Copilot reset:** prefer a valid future provider reset timestamp. When its monthly allowance
  reports a missing/past reset, show an explicitly labeled expected reset derived from GitHub's
  documented first-of-month 00:00 UTC rule, in the viewer's display zone. Preserve the raw
  observation and its freshness separately; never invent a replenished allowance or apply this
  monthly rule to other providers' rolling windows. Investigate why the installed runtime reports
  a past timestamp. Check actual billing metadata before calling the allowance premium requests:
  current GitHub AI Credits and legacy premium requests must not be conflated.
- **Adaptive usage refresh:** one host-owned, coalesced refresh policy per provider/account context:
  about five minutes while that provider is executing chats or schedules, about one hour when
  idle. Waiting for user input alone is idle. Refresh after a completed turn (debounced), sign-in,
  wake/reconnect when stale, and an expected reset; keep manual refresh. Consume genuine runtime
  usage events promptly, but do not substitute session tokens for account allowance. Define minimum
  request spacing, timeout/backoff and last-success/observation timestamps; preserve last-known
  data on errors. Clients receive the host snapshot rather than each owning provider polling.
  Consolidate the separate quota read inside Copilot status/model refresh, or idle checks will
  still run every five minutes. Preserve the host's usage privacy setting and existing sign-in.
- **Provider identity:** use Copilot, Codex or Claude consistently for response labels, including
  streaming and historical messages, across web/desktop/mobile. Keep the underlying assistant role
  unchanged. If a named agent is selected, retain its recorded identity as secondary information
  without hiding the provider. Older data must use a safe recorded-provider fallback.
- **Conversation parity:** the desktop conversation is the visual and behavioral reference for
  web: message surfaces, type/spacing, Markdown/tables, timestamp format, composer controls,
  scroll-follow/Jump to latest, tool details, and Copy/Read Aloud. Share normalization and reusable
  rendering where possible instead of maintaining a second incompatible event renderer. Compare
  the same synthetic event stream on all clients. The supplied screenshots also show differing
  display zones; review implicit UTC defaults versus intentional user time-zone choices, without
  changing stored UTC instants or silently overwriting an explicit preference.

Approved presentation direction, queued for implementation (the mockup used illustrative data):

- Group consecutive routine tool activity and automatic approvals between assistant/user messages
  into an expandable Activity block, with a deterministic summary such as “3 files read · 2 edited
  · 1 command.” Preserve chronological order, pagination boundaries, expanded state and scrolling
  during streaming. Live groups show the current action; completed groups collapse by default.
- Expansion lists each tool's operation, executing Mac, target path/URL, command and working
  directory when supplied, timestamps/duration, result or failure, and the rule that authorized
  it. Deeper raw details remain bounded and redacted. Show missing information honestly rather
  than inferring a target from the chat title or the nearest event.
- Record a stable tool-call correlation and the resolved target/matched trusted root for future
  approval audit events. Today the standalone automatic-approval event retains kind/reason/mode
  but omits the path and call ID; only an already-associated tool may carry the reason. Handle
  approval-before-tool ordering and legacy unlinked events without losing the audit record.
- Keep actionable approval requests, questions, failures, interrupted work and authentication
  issues prominent. Show a failure badge even when a group is collapsed. Context compaction can
  be a small timeline marker; old authentication warnings should remain historical once recovery
  is verified (see the existing MCP reconciliation item). Grouping must not change permissions.
- Add expandable Usage/Context details per turn/session using reported input/output/cache tokens,
  model, tool duration and provider credit totals where available. Mark incomplete/unsupported
  metrics; do not manufacture exact per-file cost or use an assistant's narrative as a billing
  ledger. Current Copilot code persists input/output totals and optional session metrics, but
  the remote projection omits the latter. Review a redacted, compatible contract before exposing.
  Desktop/web can use the normal details sidebar; mobile retains expandable Chat details and
  Loaded context. Flow, data and actions are shared without forcing desktop styling onto mobile.

Acceptance for the queued work: fake-clock active/idle/provider-isolation and event/manual-refresh
coalescing tests; month/year/DST reset tests; stale/missing/future provider values; identical
provider labels and synthetic transcript content on desktop/web/native; correlated/unlinked
approvals, failed tools and secret redaction; streaming/pagination/scroll preservation. Live
provider validation is read-only and must not restart active sessions or send a billable prompt.

Sources reviewed October 5, 2026:
[GitHub individual billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing),
[organization billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing),
[legacy request billing](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/github-copilot-premium-requests),
and [SDK usage APIs](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing).

## Queued: Team Tools subtab dividers — October 5

Status: reported desktop presentation issue, visible in the supplied screenshot; not fixed.

- The persistent Team Tools and Standup subtabs lack the visible separation used between
  browser subtabs. Add matching vertical dividers between Team Tools and Standup, and between
  Standup and the first browser subtab. Keep the main tab bar and this secondary bar distinct.
- Use consistent divider height, spacing and contrast across the secondary tab strip while
  preserving the active-tab underline and current tab behavior. Check each fixed tab selected,
  a browser tab selected, and narrow/overflow layouts; include the corresponding iPad tab strip
  in the parity review.

## Queued: preserve generated Standup when links change — October 5

Status: operator-reported desktop issue with a screenshot; not yet reproduced or fixed.

- After generating and docking a selected list's daily Standup order, adding a Standup link
  resets the docked panel to the empty “Generate for today” state. Undocking and redocking
  does not restore the generated list; the operator currently has to regenerate it.
- Adding or editing links must preserve the already-generated order and current presentation
  state for the selected list and day. Docking, undocking and redocking must display that same
  result, without reshuffling participants or requiring regeneration.
- Investigate link-save refresh, shared-list revisions, daily-state invalidation and dock
  remounting without assuming a root cause. Keep daily results scoped to their list and date;
  link-only edits must not be treated as a request to regenerate the roster.
- Acceptance: generate an order, dock it, add a link and verify the exact order remains visible;
  undock/redock and switch away/back to Team Tools and verify the same result. Cover link edits
  and removal too, while retaining explicit regeneration and list/day isolation.

## Queued iPad corrections — October 5

Operator-reported follow-ups; queued only, not yet reproduced, implemented or verified.

- [ ] **Open the selected shared team configuration.** Selecting an existing named team
  list on iPad currently opens a new-list form instead of that list's configuration. Load
  the selected API record, including its stable ID, revision, members, instructions, links
  and timezone. Editing/saving must update that same list; create a new list only through
  the explicit New list action. Verify selection between multiple existing lists and confirm
  that opening or saving one does not create a duplicate.
- [ ] **Separate main browser tabs from Team Tools browser tabs.** The iPad's global
  new-browser control must use the same plus/globe artwork as desktop, without the visible
  word “Browser,” while retaining an accessible New browser tab label. It must open and
  select a browser tab in the main top tab bar, including when Team Tools is active.
  Team Tools keeps its own separate browser-tab control and secondary tab collection,
  matching desktop. Verify that each control adds a tab only to its intended collection
  and preserves the other collection's tabs and selection.

## Queued: provider sign-in recovery and refresh without restarting

Status: requested; not implemented or validated. Applies to GitHub Copilot, Codex and Claude Code.

- Add visible Sign in / Reconnect actions to Providers and actionable recovery links wherever a
  provider blocks starting or continuing a chat. Distinguish signed out, expired authorization,
  connection failure and an account without model access; use provider-supported authentication.
- Show sign-in progress, the account being connected, success, cancellation, timeout and retry.
  Support browser/device authorization on the Mac, with clear handoff and synchronized status on
  iPhone/iPad. Keep credentials and authorization codes out of transcripts, logs and repository files.
- On successful sign-in, recheck the provider account and refresh its model/capability catalog,
  usage where supported, selectors and connection indicators automatically. Manual Refresh must
  also detect authentication completed outside Proteus; refreshing only a stale client is insufficient.
- Recover provider authentication without quitting Proteus. Use supported credential refresh or
  safely replace an idle provider connection. Preserve active/waiting turns, queued messages,
  native session continuity, selected context and unsent drafts; if reconnection must wait for an
  active turn, explain that state and complete it when safe. Do not stop unrelated providers.
- Preserve secure credential storage, existing accounts and pairings. Do not silently sign out,
  reset Keychain, weaken access controls or fall back to plaintext credential storage.
- Acceptance: for each provider, test initial sign-in, expired/revoked credentials, external CLI
  sign-in, cancel/timeout/retry and refresh while another chat is active. Verify Mac/iOS converge
  on the current account and catalog without app restart; use isolated mocks for regressions and
  report live sign-in validation separately. Account/model checks must not launch a paid chat.

Observed recovery gap: Copilot CLI sign-in succeeded, but Proteus's forced provider refresh still
reported signed out with zero models. Restarting the idle app restored authenticated status and
19 models. This is evidence for the Copilot path only; equivalent failures in Codex and Claude Code
have not been established. The shared recovery experience should cover all three adapters.

## Queued: reconcile MCP connection status with the active chat

Status: investigation requested; cause and fix not yet established.

- Reported Atlassian case: MCP configuration shows Connected while a resumed Copilot chat emits
  `MCP atlassian: needs-auth`. Keep this separate from provider-account sign-in: a provider being
  authenticated does not prove that a selected MCP is authorized in the current chat.
- Trace status from provider runtime events, per-chat MCP status, configuration views and OAuth
  completion. Check stale caches, account/profile differences, resumed-session configuration and
  whether connection checks inspect the same server instance the active chat uses.
- Show the scope and freshness of connection state. Reconcile current runtime authentication
  failures promptly across Mac/iOS; do not label a server usable solely because configuration or
  another session reports Connected. Retain historical chat events without presenting them as
  current failures once recovery is verified.
- Provide actionable sign-in/retry/error details and recheck the affected session after OAuth,
  without app restart or interrupting unrelated runs. Do not reset credentials as a diagnostic.
- Acceptance: reproduce contradictory configuration/session status with isolated fixtures; cover
  resumed chats, token expiry, reauthorization, stale responses arriving out of order and matching
  Mac/iOS status. Verify recovery via a non-mutating MCP check where supported; distinguish that
  check from actual successful tool use and record any remaining live-validation limits.

The operator supplied a local chat reference and screenshots. Keep those diagnostic references
with local app support records, outside Git; repository tests and documentation use synthetic data.

## Connection and presentation corrections — October 5

Implemented in the current source: three-column desktop allowance; host-owned names refreshed
from authenticated connections; website account/browser destination lookup and explicit connection
states; desktop-style website chat filters/main tabs; native device-zone chat timestamps;
same-tab native browsing/navigation controls and localized visit/device history with pagination.
Both desktops and physical iPhone/iPad are updated. Website release `20261005T060541Z`, including
navigation fix `7975f77`, is deployed: 9,209 files and 14 public endpoints verified, with schema,
runtime configuration and nutrition unchanged. Live All Macs Chats, all filters, main New Chat,
absence of inner chat navigation and the authorized eight-member Standup list are verified.
Default Mac is saved as Build Mac; guarded API readback preserved all other preferences,
and website reload verified the selection and live provider allowance. Build Mac's screen
remains locked, so no additional native UI checks are claimed. The final log window confirms
the known MariaDB system-table issue plus seven still-unclassified warning entries; maintenance
remains open. Personal → HC pairing was saved and online; HC → Personal remains incomplete.
HC's latest control check is unreachable, with no signed-install receipt; its last install hold
protected an active digest job. Preserve that workflow safeguard. Physical shared-account
acceptance remains separate. See `release-validation.md`.
There are no product-specific personal/work Mac categories. Any paired host can be selected by
its stable host ID; its display name is configured on that desktop.

## Message actions — October 4 follow-up

Copy and local Read Aloud buttons beneath completed assistant messages are implemented across
desktop/web/iOS. Active playback adds Pause/Resume, Stop and a text-position scrubber. Desktop/web
share one local-voice controller; native uses system speech. No provider execution or cloud voice
fallback is introduced. See `chat-rendering.md` for controls and platform limitations; installation
and deployment remain separate from implementation/test status. Build Mac, iPhone, iPad
and website are updated. HC now runs `17719ea`, including the empty-peer startup fix; relay
and providers passed after installation without a Keychain prompt. The underlying item ACL
was not changed or proven repaired. See `release-validation.md` for receipts.

HC packaging follow-up: evaluate a consistent signed identity to prevent per-build Safe Storage
reauthorization. Preserve existing encrypted data and require a reviewed migration of trust;
do not weaken Keychain access or treat signature changes as proof of a password problem.

## Cross-client parity — October 4 implementation

The operator authorized implementation, accepted **Engine Room**, removed the tagline, confirmed
that the proposed rosters/URLs are not sensitive or prohibited by workplace policy, and deferred
all multi-provider implementation. The requirements below remain the product contract; the
source-reviewed baseline and SEC table record the starting point, not current implementation.
See `parity-release.md` for implemented behavior, remaining security tradeoffs and release receipts.

Implemented: contextual/collapsible navigation, Chats/attention naming and artwork, aggregate
bounded chat indexes, website Default Mac, sidebar/Home allowance, Garage artwork, Team Tools
and shared named lists/links, local daily standup/docking, new-tab search/history, Engine Room,
resource unload/close, remote schedule editing, authenticated revocation, notification/log history,
and notification transport foundations. Native shared tools require separate `app:read app:write`
consent. Production Web Push is provisioned with an active worker; device delivery acceptance
remains pending. Background APNs still requires an entitled build and server credentials.
Build Mac and website parity releases are deployed. Browser-home follow-up `8e3ab51` is
installed and visually verified on Build Mac: top-aligned search, bounded long links and
25-entry **More** pagination. Shared app consent is verified there. Both iPhone and iPad are
updated over Wi-Fi with data and both destinations preserved; iPad shared-account sign-in needs
its on-device system flow. HC has the update installed and state preserved, with normal
startup, relay and provider checks passing. Personal → HC authorization is saved and online;
HC → Personal remains blocked by Keychain access. Bidirectional completion is not claimed.
The current release does not add per-session short-lived host grants, merge browser/native pairing
keys, or implement multi-provider work. Those security protocol improvements remain open.

### Product contract and current starting point

Desktop and website should have the same information hierarchy, wording, icons, feature views,
controls and interaction behavior wherever platform capabilities allow. iPhone/iPad should expose
the same features with native mobile layouts. Desktop remains the AI execution bridge: provider
credentials, tools, workspaces and execution stay on the destination Mac. Life uses the shared
Proteus website API across all clients. Feature parity is an ongoing release criterion, with
explicit capability explanations for platform exceptions and a migration path for old clients.

| Area | Source/recorded baseline | Queued change |
| --- | --- | --- |
| Life | Desktop/mobile already use the website API; separate renderers remain | Adopt the website's best Garage views and vehicle artwork; reconcile every Life view |
| Allowance | Web meters exist on the connected remote page, subject to host visibility | Make allowance available throughout the website shell from its configured default Mac |
| Destinations | Account-backed website keys deployed; enrollment/real cross-browser acceptance pending | Persistent account Connections with reviewed key custody and reliable revocation |
| Desktop peers | Chat transport exists; desktop allowlist excludes schedule commands | Remote chat/schedule control parity, including permission/context/MCP capability review |
| History | Host-specific chat lists; mobile cache; desktop remote snapshots in memory only | Authorized aggregate Chats index, bounded caches and incremental updates |
| Standup | One local `standup.json` with random/fixed members and current order | Team Tools, multiple API-backed lists, saved links and local daily presentation |
| Browsing | Bounded per-open-tab URL/title history and restored tab descriptors | Searchable history across closed/open Proteus tabs, new-tab page and search engines |

### PAR-01 — Shared navigation, wording and presentation

- Use **Chats** everywhere in user-facing navigation and messaging, replacing Run history.
  Keep internal run identifiers/schema compatible. Adopt the iPhone's paired chat-bubble icon
  (`bubble.left.and.bubble.right`); use equivalent shared artwork on desktop/web.
- Treat the desktop Proteus chat presentation and messaging as the reference: shared labels,
  composer states, tool activity, approvals, empty/error/offline states and Markdown behavior.
  Every displayed message has date **and** time; native iPhone/iPad chat messages follow the
  device time zone, while desktop/web honor their display setting. Store instants in UTC; retain date-only domain values.
  Test daylight-saving transitions and timezone changes without rewriting historical timestamps.
- Needs attention uses an **!** icon with an accessible label, replacing the diamond.
- Expand subitems only under the active left-navigation feature. Life contains Garage,
  Nutrition, Fuel & mileage and the other existing Life views; switching to Chats/Schedules
  collapses those subitems without closing their tabs or discarding state.
- Chats expands to the five most recent authorized chats by title, plus **More** for the full
  list. Use the aggregate ordering, destination badges and accessible full titles.
- Desktop/web open each chat in its own Proteus tab; opening an existing chat activates it.
  Use `(hostId, chatId)` identity so equal IDs from different Macs cannot collide. Preserve
  drafts and scroll state. Use the website's **X** close treatment and desktop-style dividers;
  closing a background tab must not activate it. Support keyboard/focus and overflow behavior.

### PAR-02 — Website destination and AI allowance

- Add a website-specific **Default Mac** setting, stored with the account and initially set
  by the operator to a paired Mac's verified identity. Never infer identity from its label
  or choose the first paired host. Provide an explicit temporary switch and a separate action
  to change the default; browsing another host's chat must not silently change new-chat routing.
- The website defaults new AI work and allowance to that Mac. Every composer/schedule/action
  shows its actual destination; an existing chat stays on its owner. If offline, show the
  offline state and require an explicit switch, with no automatic fallback to another Mac.
- Show allowance in the desktop/web shell (including Life/Team Tools), with compact/expanded
  states, host and provider/account provenance, reset details and freshness. Do not confuse
  provider usage with token counts, invent missing quota, or label stale observations current.
  Respect existing privacy/visibility settings; explain hidden/unavailable status and keep a
  website display preference separate from authority to read host usage.
- Desktop retains local provider setup and local-machine allowance by default. Provider
  accounts may share a subscription across Macs: do not sum identical account quotas as
  independent budgets. Show verified identity where available and unknown identity honestly.
- Website has no provider credential/configuration workflow for now; setup/sign-in remains
  on desktop. Web/mobile can use the destination's advertised providers and supported models.
- Reading an aggregate list from several authorized Macs is independent of executing new
  work on one default Mac; list filtering must never change execution routing implicitly.

### PAR-03 — Life and mobile parity

- Adopt website Garage artwork by vehicle type and its strongest cards, detail hierarchy,
  history/evidence, maintenance, fuel and mileage interactions across desktop and mobile.
  The website has trailer/ATV variants while desktop currently draws one generic vehicle;
  reconcile accepted vehicle kinds as well as icons so editing cannot lose existing kinds.
- Inventory every Life operation/view/filter with shared fixtures before restructuring.
  Centralize API validation, permissions, calculations and record semantics; preserve food
  versions, record/evidence identity, dates, account-scoped drafts and retry-safe writes.
- iPhone Home is the desktop/sidebar feature directory and the location for AI allowance;
  allowance is not persistently overlaid on every phone screen. Bottom navigation: **Home,
  Chats, Life, Team, Engine Room** (accepted name). Other features are reached from Home.
  Preserve existing optional-feature preferences with an explicit setup affordance when hidden.
- iPhone opens chats in a navigation stack; swipe back returns to the retained list position.
  iPad uses the desktop-like sidebar and top tabs when space permits, adapting in narrow/split
  layouts. All clients share message semantics, action availability and timezone preferences.
- Account & Security offers personal information, timezone, passkeys, authenticator/recovery
  and session controls on every client. Native clients may use a secure system authentication
  flow for sensitive account operations; no credential handling in an arbitrary embedded page.

### PAR-04 — Aggregated Chats and bounded caching

- Default to an aggregate of all connected, authorized desktop chat indexes, including the
  current desktop where applicable. Include device, provider, status/Needs attention, date,
  search and meaningful workspace/schedule filters; preserve filters and list position.
- Show cached rows for temporarily offline hosts with last-sync/partial-result indicators.
  Load paginated summaries first and message pages only when opened; do not download every
  transcript to build the sidebar. Define index DTOs including provider/destination fields,
  stable sort/tie-break rules, per-host cursors/epochs, tombstones and permission revisions.
- Refresh incrementally with bounded connection fanout, backoff and background work when the
  platform permits. iOS suspension is not an always-running sync guarantee. A failure on one
  host must not blank healthy/cached destinations or resubmit uncertain actions.
- Partition caches/drafts by account, host, chat and authorization scope. Bound disk/memory
  size with documented retention/eviction; protect native caches using OS keys and review the
  browser cache threat model separately. No sensitive plaintext in localStorage or generic
  service-worker HTTP caches. Logout, account switch, forget and authenticated revocation have
  explicit purge rules. Encryption cannot protect against malicious authorized page scripts.
- Titles, snippets, tool results and even status may be restricted information. Enforce data
  disclosure before indexing/replication; pairing alone does not authorize cross-domain copying.
  For restricted destinations, show only permitted metadata or a clear unavailable result.

### PAR-05 — Connections and remote Proteus control

- Standardize the user-facing name **Connections**, replacing Remote access/Remote Access and
  singular Connection. Keep **Account & Security** distinct; internal routes can remain stable.
- Through the encrypted relay, an authorized desktop/web/mobile client should start/continue
  chats, answer approvals/questions, run schedules and edit supported schedules on another Mac.
  Audit the full command matrix rather than assuming desktop peers already match phone/web.
  Add negotiated/versioned capabilities and clear unsupported states for older hosts.
- Preserve receiving-host enforcement, workspace/provider policy, revision conflicts, unknown
  schedule fields, durable mutation IDs and repository ownership. Source-owned schedules are
  changed through their owning repository's supported workflow, not overwritten remotely.
- Full Proteus control means explicitly supported application operations. It does not grant
  unrestricted OS control, credential export, desktop IPC/CDP access or provider setup from web.
  Remote tab/resource controls need separate host capabilities and authorization.
- Account-level pairing is **pair once per Mac**, then available after account sign-in across
  browsers. Keep user identity/MFA in the existing website/API; the relay remains encrypted
  transport. Native clients retain protected device credentials; account-based enrollment
  must not silently copy a browser key into every device or broaden previous pairings.
- Connections distinguishes connect/disconnect, forget locally, remove account enrollment,
  revoke a browser/device and revoke all account access to a Mac. Show pending/confirmed
  revocation when a host is offline. Account enrollment is not the same as an active session.
  Resolve SEC-01–04 below before expanding account-backed remote authority.

### PAR-06 — Team Tools, Standup and team tabs

- Rename the main feature **Team Tools**. Its secondary tab strip sits directly under the main
  app tabs: a persistent **Team Tools** overview first, then **Standup** and browser subtabs.
  Standup is a tool within this feature, not a separate top-level navigation item.
- Store multiple named team lists in the Proteus API/database, with stable member IDs,
  random/fixed ordering groups, instructions, timezone and revision conflict protection.
  Share these configurations across signed-in authorized clients. Migrate existing local
  lists with preview, idempotent import and backup; do not overwrite competing client lists.
- The generated daily order/date can remain unique per app and selected list. Store it locally
  with its source revision/date/timezone; web sessionStorage is suitable if it needs only to
  survive reload in that browser tab. Closing the browser session may clear that daily result.
  This is separate from durable shared team configuration and restored browser-tab descriptors.
- Add **New browser tab** in the Team Tools subtab bar. Navigate to team boards/backlogs/queues.
  Right-click (or native touch equivalent) offers **Add to standup links** and **Unload tab**.
  The overview has editable named/ordered standup links, paste/add/remove controls and **Load
  standup links**, opening the selected list's links inside this feature with a bounded batch.
  Store link configuration with its API-owned list and the same scoped authorization.
- Restore open team-tab identity, grouping, order, selected tab and safe URL/title/history
  after app reload. Restore descriptors without eagerly loading all pages. Keep authentication
  in the protected local browser profile; never save POST bodies, passwords, tokens or unsafe
  callback URLs. Arbitrary website form/scroll state cannot be guaranteed by URL restoration.
- Leaving Team Tools unloads its browser contents while preserving tab descriptors; returning
  loads the selected page on demand. Keep other app tabs loaded until closed or explicitly
  unloaded. Protect unsaved work and active downloads/media/agent use with visible choices;
  never silently destroy an active operation to satisfy an idle-tab policy.
- For desktop use isolated native browser views with no privileged preload or implicit agent
  access. Web embeds only sites that allow it; otherwise use ordinary browser tabs and explain
  the limitation. Do not proxy authenticated Jira/ADO pages or strip their framing/CSP rules.
  Web cannot guarantee automatic multi-popup opening or manage an external tab's later state.
- The operator confirms these team rosters/URLs are not sensitive and are allowed by workplace
  policy. Their account-scoped API storage is authorized. Do not infer permission for unrelated
  professional records; keep private source data out of this repository.

### PAR-07 — Engine Room and resource management

- Suggested section name: **Engine Room**; alternatives **Systems** or **Control Center**.
  Discuss before changing labels. Contents: **Resources**, **Providers** (desktop setup),
  **Connections**, **Account & Security**, and **App Setup**.
- Resources lists open tools/tabs and the host they belong to, loaded/unloaded state, observed
  CPU/memory and observation time. Use real process metrics; shared-process rows and overhead
  must not be double-counted or falsely presented as exact per-tab measurements.
- Offer **Close** and **Unload**. Unload destroys disposable page contents, preserves a safe
  descriptor, and reloads on selection. Right-click tabs exposes the same action. Chat-view
  unloading/closing must not cancel host work; stopping a run or terminal process is a distinct
  deliberate operation. Do not unload the execution host or credential manager as an ordinary tab.
- Web/iOS can show authorized remote-desktop telemetry and commands once supported. Their
  own local CPU/RAM visibility is limited; show unavailable rather than fabricated parity.
  Use low-frequency sampling and bounded subscriptions so the monitor is not itself expensive.
- Native iOS may evict views under memory pressure; restore state without claiming all views
  stayed resident. Other desktop tabs remain loaded by default, with explicit user unload.

### PAR-08 — Browser search, new-tab home and history (follow-up)

- In a new browser tab, an address-bar search term searches **Google** on Enter. Explicit valid
  web URLs/hostnames navigate directly. Define handling for localhost, ports, IP addresses,
  spaces and internationalized domains; reject unsupported schemes and embedded credentials.
  Do not leak a malformed URL, pairing link, local path or token into a search automatically.
- New-tab home shows a top search box with **DuckDuckGo**, **Google** and **Bing** buttons.
  Each button submits the query only to that provider, in the current new tab; Enter defaults
  to Google. Do not send queries while typing or fan one query out to all engines implicitly.
- Below it show all **retained Proteus browsing history**, across open and closed tabs, with
  title, safe URL, visit date/time in the user's timezone, local history search and pagination.
  Keep local history filtering distinct from submitting text to an external search engine.
  Shared browser components apply to ordinary tabs and Team Tools subtabs.
- Add an app-owned history store separate from per-tab back/forward restoration. Existing
  bounded history cannot reconstruct already-pruned/closed-tab visits; import available safe
  entries without inventing dates, and record complete supported visits prospectively.
- Default history is local to the client/browser profile. Do not import Safari/Chrome/system
  history or synchronize workplace URLs across devices without a separate explicit design.
  Include clear-history/individual-delete controls, configurable retention and an option not
  to record visits. Private-from-agents is distinct from history-off/private browsing.
- Exclude credentials, authorization callbacks, sensitive URL parameters and private visits;
  show sensitive-page titles carefully and never preload all history pages or favicons through
  third-party services. No agent history access by default. Third-party pages cannot access
  the privileged new-tab history store, even if they navigate or open a new window.
- Website can retain Proteus-managed links it opened, not read the user's entire browser history
  or track later cross-origin navigation in external tabs. State this platform exception and
  do not weaken browser security to imitate native history coverage.

### PAR-09 — Multi-provider workflows deferred

Keep the existing [design proposal](multi-provider-workflows.md) for a later review. The operator
explicitly deferred all multi-provider implementation in this run, including planning previews.

### PAR-10 — Shared implementation and release acceptance

- Extract shared desktop/web design tokens, icons, navigation/feature registry, canonical UI
  text, message/time formatting, tab descriptors and state models from the existing clients.
  Share safe renderers/transport rather than maintaining competing copies. Keep native SwiftUI
  where platform behavior benefits; use generated/versioned contracts and common fixtures for
  Swift/JavaScript/PHP instead of forcing all clients into one rendering technology.
- Keep Life/Team business validation in the API and execution/security policy on the host.
  Review duplicated controllers/read models and client calculations before moving them; use
  gradual per-feature extraction rather than an unvalidated replacement of the whole website.
- Maintain a desktop/web/iPhone/iPad capability and screenshot matrix for each changed feature.
  Compare labels/icons/layout, narrow/wide/dynamic text, keyboard/touch, date/time, error states,
  filters/pagination, multiple simultaneous hosts/accounts, drafts, restart and stale/offline data.
- Shared logic must not flatten security boundaries: trusted shell, untrusted web content,
  Life account API and encrypted remote commands keep separate adapters and authority checks.
- Release order recommendation: **1)** security/capability contracts and naming discussion;
  **2)** common shell, Garage/chat polish, default Mac/allowance and mobile navigation;
  **3)** aggregate Chats/cache and complete remote schedule controls;
  **4)** Team Tools, shared lists/links, new-tab history/search and resource lifecycle together;
  **5)** multi-provider work remains deferred.
  This is a phased queue, not a promise that every item belongs in one release.

### Security review — findings and work required before expansion

This is a targeted source review plus existing synthetic protocol tests, not a production
penetration test or independent cryptographic audit. Existing protections include strong account
authentication, required passkey user verification in the installed library, PKCE, scoped Life
tokens/tenant checks, CSRF, exact relay browser origins, per-host registration tokens, AES-GCM
session binding/sequences, durable mutation claims and host-side command/permission enforcement.
Keep those protections while unifying the clients.

| ID | Evidence and consequence | Queued response |
| --- | --- | --- |
| SEC-01 | `RemoteDestinationController::credential` releases a long-lived Mac key after strong web sign-in; encrypted database storage is decryptable with APP_KEY. Website compromise can impersonate the enrolled account device. | Explicitly review custody; prefer account enrollment with distinct, scoped, revocable device/session credentials or host-validated short-lived grants. Model recovery/rotation, server compromise and host-offline behavior before selecting a protocol. MFA does not remove server-custody risk. |
| SEC-02 | `RequireStrongAuthentication` checks a verified session, with no recent-auth check on destination credential release/enrollment/removal. `destroy` only deletes the website row; host commands authenticate the device key independently of web logout. | Add recent strong-auth for sensitive connection/security changes, session inventory and host-enforced revocation/expiry. Keep forget/sign-out/revoke scopes truthful. A stolen or previously released key is not invalidated merely by deleting cookies or the account row. |
| SEC-03 | `src/remote-client.js` emits revocation for unencrypted relay `revoked`/`rejected` packets; `src/desktop-peers.js` then deletes its protected pairing. Web preserves its account record; iOS stops/requires re-pair guidance. | Promote authenticated end-to-end revocation from deferred backlog. Unauthenticated notices may disconnect, never destructively erase trusted enrollment. Add forged-notice regression coverage across all clients. This is an availability/enrollment-integrity issue, not evidence that ciphertext is decryptable. |
| SEC-04 | Paired devices currently share the broad host command surface, and account browser sessions share one device credential. Host sync can expose more than a summary index. | Design host-enforced least-privilege scopes, client/session identity, audit trails and separately authorized chat disclosure/schedule/resource actions. Do not treat a renderer allowlist or account membership as the host security boundary. |
| SEC-05 | Desktop peer `methods` excludes `schedule.run`, `schedule.save`, `schedule.preview` and some chat/context/approval capabilities already in `src/remote.js`; its test explicitly expects schedule.run rejection. | Build a reviewed capability matrix and extend desktop controls deliberately; preserve schedule ownership, revision guards and operation UUIDs. Current peer support is not full remote control. |
| SEC-06 | New shared caches/history/team rosters/URLs create new sensitive stores; existing browser history intentionally omits forms and auth callbacks. | Threat-model these stores, enforce account/host/domain boundaries, retention and purge rules, protect URL secrets and validate untrusted content. Review organizational approval before storing real work rosters/boards on a personal service. |

Additional review gates: account recovery and password/email/factor changes versus all sessions,
OAuth token families and Mac grants; exact WebAuthn origin/RP and user-verification enforcement;
session theft/XSS/CSP; CSRF and object-level API authorization; uploads/evidence integrity; key
backup/rotation; relay resource exhaustion and connection fanout; Electron sandbox/IPC and native
Keychain protection. Add targeted tests for gaps; no security sign-off from UI similarity alone.

Primary references consulted October 4: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[WebAuthn](https://www.w3.org/TR/webauthn-2/),
[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors),
[Electron process metrics](https://www.electronjs.org/docs/latest/api/structures/process-metric).
Browser embedding follows the target site's policy. Process measurements require shared-process
attribution; neither capability should be overstated as exact parity.

### Confirmed product choices

Use **Team Tools**, **Engine Room**, **Connections**, **Account & Security** and **Chats**.
Remove the tagline under Proteus. Website tools that cannot be embedded open actual browser tabs
without replacing Proteus. Rosters and the requested board URLs are allowed in the shared API.
The relay remains transport, with identity/MFA owned by the existing website account.

## Account persistence and Life API consistency (October 4 continuation)

Account-persistent website destinations are deployed; enrollment and cross-browser restoration
remain pending explicit account-key custody confirmation. API-only desktop Life is installed and
the operator's website sign-in plus native food pagination were verified. Its old database profile
is archived and never used by the runtime. Setup sign-in/spacing, signed-out tab restoration and
graceful HTTP shutdown are covered by focused regression checks. Build Mac/iPhone updates and
relay connections are verified; physical mobile Life sign-in and latest iPad update are deferred.
See `release-validation.md` for exact installed versus source-only observations.

## Shared website, native Life and desktop destinations (October 4)

Implemented: shared dark web/desktop theme and persistent website section tabs; website provider
meters and retained destination; richer native Garage/fuel/nutrition cards and date filters; direct
website Life on mobile with PKCE/Keychain, native forms and retry protection; mobile provider usage;
legacy host-label repair; native desktop peer pairing, full destination catalogs and local-first
history; browser history restoration and long-press navigation menus.

See the current handoff for deployment and physical acceptance. Website account sign-in on each
mobile device remains distinct from encrypted Mac pairing. Native Life and allowance require their
respective account/host connection. Physical trackpad feel, large-history pagination and complete
website/native presentation parity remain follow-up work. Projects are explicitly on hold pending
design discussion; the existing saved workspace configuration remains available.

## Transcription / Life / remote expansion (October 3–4)

Implemented in source: separate Omi and general transcription areas, independently gated native
and Codex schedules, canonical source parity checks, per-native-job lanes, full Proteus-branded
website, native Life setup/records, all-root Markdown browsing, Ghostty terminal tabs/profiles,
full desktop tab restoration/browser gestures, collapsible allowance meters with a separate Setup visibility flag, Claude support, and
separately paired Mac destinations on mobile/web. See the handoff for actual validation.

Website code-only deployment and live relay TLS/two-host routing checks have completed. The
Mac, physical iPhone and physical iPad updates are installed; actual paired-client acceptance on the
new shared relay remains separate. Native
Life backup restoration and the approved additive v2 upgrade are verified, preserving core table
schemas/row hashes and the nutrition digest. Original evidence-file hashes also match. Life is
enabled and ready after Keychain approval; all seven sections read through the installed app’s
actual credential resolver and SSH connection. No production record writes or evidence uploads
were used for acceptance. The four deployment credentials are saved in the authoritative vault
and verified after sync. Both Mac relay hosts are online; the personal host is paired with the
signed-in web client and its schedules were read. The work-host browser pairing has been approved and verified independently of the personal host. Mobile Manage Macs can edit a relay address while preserving the
existing pairing key and history; the operator changed both existing endpoints to the shared relay and confirmed connectivity. Both
physical devices now also retain an independently paired Build Mac destination.

Existing native Omi services and Codex automations still own processing. Installed Codex catalog
and two no-tools synthetic turns now pass, but real workflow tools, claims, context effects and
retry acceptance remain to be verified. Replacements were refreshed while disabled with current canonical fingerprints. Native cutover
also requires restoring the configured
independent policy dependency; general AI schedules need reviewed unattended command approvals.
Review ownership, drain original transactions, then pause/unload only the corresponding
original owners before enabling replacements. Observe bounded real outcomes before claiming
unattended reliability. Bluetooth, recording capture and mobile review remain separate.

Implemented in the workspace-context release:

- Copilot model catalog in New Chat, with refresh and explicit unavailable-model errors.
- Named multi-folder workspaces, default command folder, native folder picker, VS Code import.
- Live context refresh, per-source Every chat / With workspace / Choose per chat / Disabled modes.
- Cross-workspace folders and individual instructions, skills, agents, and MCP source references.
- Exact captured/supplied source versions, per-chat context refresh and retained context history.
- Disabled MCP imports, duplicate/conflict handling, source-relative execution.
- Standup Current/Settings tabs, persisted current date/order, random then fixed ordering.
- Animated working indicator, native session and run paths with Open/Copy, transcript export.
- Optional Copilot data directory for new sessions; existing sessions retain their storage location.
- Desktop credential-provider boundary and explicit Bitwarden login fill in private browser tabs.

See [workspaces](workspaces.md) and [credentials](credentials.md) for behavior and limitations.

## Chat presentation and active-run approvals

- Mac and iOS show one expandable activity per tool call, with arguments, progress, output,
  duration, and success/failure. Empty assistant messages are omitted; final Markdown stays complete.
  Long tool displays are bounded and labeled; original output remains in the provider session.
- Individually saved folder/tool grants display as Saved rules only. Trusted workspace and
  Auto-approve tools remain explicit broader choices. Changes apply immediately to the active chat,
  including a waiting tool; adding context still requires authorization for the new configuration.
- Both clients can change a chat's permission mode. The host checks the context and permission
  revision before applying it. Existing individual grants never become broader trust automatically.
- Provider execution time excludes time waiting for human input. Genuine questions remain interactive.
- Schedule model selection shares the New Chat catalog, including refresh and visibly unavailable
  saved models. Mac default-model settings use the same picker.
- Mac chat and details fill the remaining viewport and scroll independently. Narrow windows switch
  between Chat and Details. Scrolling upward retains the reading position while output arrives.
- Browser navigation has a deadline. Background agent tabs receive usable viewports; detailed
  Playwright errors reach the tool result instead of becoming a generic failure.

## Model settings, external edits and Mac identity

- Capability-backed effort and context tier on Mac/iOS, captured on runs and supplied on resume.
- Host catalog refresh at launch, every five minutes and manually, with visible stale state.
- Fresh schedule reads on reopen/reload; revision conflicts protect external edits and app drafts.
- Local branded Mac bundle and Dock artwork matching iOS; see `mac-app.md`.
- Handoff guide, design decisions, feature references and changelog.

## Chat steering, Codex and MCP recovery

- Implemented Mac/iOS structured tool results, durable queue, live steering and compact Mac browser.
- Compact composer model/effort/speed/context menus and separate Queue/Steer/Stop buttons.
  Captured next-turn choices support model changes within an existing provider session.
- Implemented separate provider catalogs and Codex native execution/continuation with selected
  instruction/skill context and explicit tool-scope compatibility errors. See `providers.md`.
- Implemented Copilot per-chat MCP status and OAuth sign-in on the Mac, available from both clients
  and `/mcp auth <server>`. See `mcp-auth.md` for callback and credential boundaries.
- Preserve verified Copilot vendor signatures in Mac packaging; persistent OAuth progress and
  bounded automatic status refresh on both clients; stable controls while chat output streams.
- Validation details for the release are recorded in the PR and handoff notes; distinguish synthetic
  protocol/UI checks from any real corporate OAuth completion, which requires user interaction.

## Proposed multi-provider workflows

A coordinator chat or schedule could dispatch separate provider sessions through named worker
profiles, live model/allowance discovery, enforced tool/data boundaries and durable child runs.
See [multi-provider workflow design](multi-provider-workflows.md). This is a design proposal,
not installed orchestration. First implement fixed same-host workflows and explicit transfers;
then bounded dynamic delegation and separately authorized cross-host workers. Existing relay
pairings do not grant agents new authority, and company-source policy stays in its own repository.

## Deferred (no implementation yet)

- Detached background daemon/login item, Developer ID distribution signing/notarization, automatic
  updates, additional concurrent AI execution and workflow completion validators. Generic completion
  notifications are implemented; workflow-specific completion proof remains separate.
- Automatic reconciliation of foreign workflow manifests; currently use the owning repository
  exporter and explicit import/refresh.
- Provider adapters beyond Copilot/Codex/Claude/rehearsal; Claude MCP/browser/steering parity; Codex native agent tool-filter parity and per-tool MCP approval interception; changing the provider of an existing chat.
- Paginated on-disk run storage as history grows.
- Further account-session grant hardening remains queued. Authenticated end-to-end revocation is
  implemented in the parity release; unauthenticated relay notices cannot erase enrollment.
- Codex MCP OAuth controls, generic MCP elicitation/input forms, and editor-specific agent hook and extension-tool mappings. Copilot OAuth recovery is implemented per chat.
- Bitwarden extension compatibility and broader token-broker/Keychain bootstrap integrations.
- Automatic VS Code index, unsaved buffers, or existing chat-history transfer.
- Native session relocation or cross-provider conversation migration.

Operator paths, team rosters, private instructions, chat content, and workspace membership remain
in local configuration or their owning workflow sources, outside the app repository.
