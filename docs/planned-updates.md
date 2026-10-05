# Implementation status and backlog

Maintain this as the single backlog. Design rationale is in `decisions.md`; recent changes are in
`../CHANGELOG.md`. Items below are status, not promises of completed validation. The October 5 design bullets are
retained as acceptance criteria; the installed versus unverified state is summarized immediately
below and in `content-workspace-release.md`.

## Next changes

### 1. Command W closes the current tab

Requested October 5, 2026. Status: recorded for the next set of changes; implementation
and verification pending.

In the Proteus Mac app, **Command-W (⌘W) must close the current tab and must never
close the main Proteus window**.

Acceptance criteria:

- With multiple tabs open, close only the current tab and leave the other tabs and
  main window open.
- Apply the shortcut to the current tab in the active tab area, including nested
  chat and Team workspaces. Preserve existing restrictions on persistent tabs.
- Closing the last closable tab leaves the main window open. If there is no closable
  current tab, do nothing; never fall back to closing the window.
- Honor existing tab-close protections and confirmations. Cancelling a close leaves
  both the tab and window open.
- Verify shortcut handling with focus in ordinary content, embedded browser content,
  terminals and text inputs, so the main window cannot receive a fallback close.

## 0.2.0 implementation and rollout status

The initial installed base source was `74da6f78827de0145f2164b3a1d2d065202dea0e`;
its integrated Node suite passed 331/331 and signed packaged-app smoke passed. The final
Mac/native follow-up build uses `d24bd8a3904f3370044410b2fb4a306e24f269cd` with
256-file/32-MiB guarded attachment batches, Claude MCP status settling and website chat-title
persistence. It passed 340/340 integrated Node tests and `npm run check`; native follow-up
validation passed 53/53 unit tests and three focused iPhone/iPad viewer tests. Build Mac,
physical iPhone and iPad are now installed in place from the final commit with their signing,
data and pairing identities preserved. Website release `20261005T232043Z` from `d24bd8a`
preserved 9,212 files and configuration/schema/nutrition state; its 23:34:50 UTC audit passed
14/14. A supplemental isolated restore of the recovery capture passed after the ordinary
restore failed; no production writes or live state comparison were made. Web-only
`2355d6bd004d3743bf79566937e1e32697e354bd` then deployed as `20261005T234233Z`,
preserved the 9,212 files and protected state, and passed 14/14 at 23:45:35 UTC. The
actual HC chat showed five grouped Activity entries with approval counts and zero
standalone Auto-approved entries. Work Mac final reinstall/live
readiness check remains in progress. Both physical clients reached both Mac hosts independently at HC 22:48:32 UTC and Personal 22:49:00 UTC. Website base release
`20261005T221822Z` passed 9,212-file verification and 14/14 health checks; a web-only Home
correction from `d9e3d96` was deployed as `20261005T224447Z`; its independent 14/14 health
audit passed at 22:49:33.926 UTC. Work Mac 0.2.0 launched with state preserved. Both desktop
pairing directions passed authenticated read-only chat-index checks: HC saw five Personal chats
and fifteen HC chats around 22:52 UTC, and Personal refreshed fifteen HC chats at 22:54:20 UTC,
with `partial:false` in both directions. The new Build incoming HC device was online with
resource/document grants off. HC passed its normal macOS installed-app signature check without
Keychain or trust changes; it preserved 15 runs, five schedules, open tabs and existing pairings.
The installed Claude MCP status probe has a confirmed startup-settling bug: Safari showed
connected, while ADO/Atlassian appeared pending after an immediate sample. A bounded settle
source fix is in the final frozen build. Build Mac has been reinstalled; HC reinstall and
live recheck remain pending, so earlier values do not prove server failure. HC read the
saved shared-account identity through `/api/app` at 23:09:32 UTC without credential or
scope change. The separate website chat-title persistence correction from `d24bd8a` is deployed; its 14/14 audit passed. A
separate web-only Activity grouping correction is deployed and live-verified. No physical-device live
notification tap, attachment upload, generated-document approval or provider turn is claimed.
Website account timezone is America/Denver with a verified 3:39 PM chat timestamp; automatic/device
zone selection is follow-up. The Home build-ID width fix passed live 1280-pixel visual
acceptance (12-character display and full-ID tooltip) and the 14/14 health audit. Bounded logs
from d24 and the web-only successor are classified. The latter had one expected `.env`
denial, 18 PHP lifecycle entries, 552 known MariaDB `column_stats` warnings and one
unrelated different-account localhost connection abort; Laravel and relay Apache had no
recent errors. This is not an all-clean log result.

## Active release: content tabs, Home, attention review and browser lifetime — October 5

The operator authorized implementation of all previously approved queued work together with the
requirements below, followed by tested updates to both Macs, iPhone, iPad and website. Coordination
and implementation use GPT-6 Sol or lower, at medium/high effort as appropriate. The broader
multi-provider feature and future Safari-style browser tab groups remain deferred. Implementation,
verification and installation receipts must be recorded separately; this entry alone proves none.

- Hide system scrollbars on main and nested tab strips while preserving trackpad/wheel/touch and
  keyboard access. Fade partially obscured labels near trailing new-tab controls. Preserve each
  strip's exact scroll offset through tab selection, sidebar navigation, rerenders and content
  refreshes; no reset to the beginning or unnecessary active-tab scroll jump.
- Main tabs represent user content: open chats, individual schedules, browsers, terminals and
  documents. Feature landing pages (Schedules, Chats, Engine Room, Transcription, etc.) are reached
  through sidebar navigation without adding feature tabs or overwriting content tabs. Preserve
  content state and migrate existing descriptors without dropping open user content.
- Each chat becomes a content workspace: its first persistent child tab is the named conversation,
  followed by user-opened browser, terminal and Markdown/document views. Team Tools keeps its
  persistent tool tabs and gains the same content-view machinery. A single trailing + opens the
  same icon-and-label creation menu at main, chat and Team levels, with scope-appropriate actions
  and honest platform/host capability limits. Menu icons do not each repeat a + prefix.
- Restore open content tabs and their order after reload across the main strip, each chat workspace
  and Team Tools. Persist safe identities/descriptors and selected context; browser tabs restore
  unloaded until activated. Restoring a terminal must not restart its previous command or create
  background work. Do not restore document bodies, credentials or interactive-preview grants.
  Website external browser tabs remain browser-owned; restore their Proteus link/launch descriptors
  without reopening external windows automatically. Recheck current authorization on activation.
- Reuse the main browser toolbar throughout embedded browser surfaces: Back, Forward, Refresh,
  address/search and Go with consistent icons and states. Website external cross-origin tabs
  retain normal browser controls; do not promise control of those tabs from the Proteus website.
- Add Home first in navigation and show it on initial app load. Explain Proteus capabilities,
  display the actual installed/released version, expose release changelog and update status/action
  according to the configured distribution source. An unavailable/unconfigured updater must be
  explicit, not a fabricated update result. Unmount Home content on leaving and recreate on access.
- Needs Attention includes newly failed chats until successfully opened/reviewed through either
  Chats or Needs Attention. Persist acknowledgment against the current failure event; retry or a
  new failure can require attention again. Reviewing cannot approve, dismiss or hide unresolved
  tool permissions/questions. Retain actual failed status in history. Avoid review on prefetch.
- Expand Engine Room Resources to explain the whole local Electron application footprint and its
  process breakdown. Distinguish app/renderer/GPU/utility and tracked host/provider/terminal child
  processes, unavailable metrics and shared attribution without double counting. Remote/web/mobile
  views must label the owning host and platform measurement limits.
- Replace immediate Team browser unloading with a browser policy across all scopes in each app:
  keep the six most recently touched browser tabs plus every browser tab opened/interacted with
  during the past hour. Unload an older tab only if outside those six. Keep descriptors and reload
  when selected. Actual user interactions update recency; background polls/page timers do not.
  Protect foreground, unsaved, audible, downloading or agent-controlled work from automatic loss;
  show protected state and manual controls. The six is a floor, not a hard memory/tab limit.
- Preserve native iPhone navigation and condensed formatting; wide iPad follows desktop tabs.
  Do not terminate terminals, model turns or schedules as a browser-memory optimization. Future
  tab groups are context, not permission to design/implement that additional feature now.

Acceptance includes main/nested strip scroll retention, overflow and focus; all-scope tab restoration
with lazy browser loading and no resumed commands; old-session migration;
consistent creation menus/toolbars; Home mount/unmount and real version/changelog; failure reviewed
on every client, new failure reappearance and approvals retained; fake-clock six-plus-hour policy
with protected activity; process totals with explicit coverage; cross-client regression and signed
in-place device updates preserving application data. No operational schedule is a smoke test.

## Active release: Claude MCP and model metadata — October 5

The operator reported that selecting SafariSelector, ADO or Jira for a Claude chat fails at
Proteus's own unsupported-integration guard. This is an adapter gap, not evidence that those
servers rejected a request. Implement explicitly selected MCP configuration with the same host
permission boundary and provider-specific status/authentication handling. Do not inherit unrelated
MCP servers or remove the confirmed PreToolUse hook requirement. Keep secret values out of process
arguments, logs and Git; validate using synthetic servers before any installed acceptance.

Display version/resolved-model information that the installed Claude runtime actually reports.
Keep aliases clearly distinguishable from explicit model IDs, preserve provider descriptions and
capabilities, and never manufacture a model-version table. Unknown token usage on a real provider
must not display the rehearsal-only explanation. The workplace task shown in the report is a
reference for diagnosis, not an instruction to execute those operational actions during testing.

## Active release: chat context menus, archive and delete — October 5

The operator added this to the current release. Source and synthetic cross-client acceptance
passed for archive/unarchive, filters, guarded deletion and cache/tombstone behavior. No existing
user chats were deleted for testing; installed end-to-end deletion was not exercised.

- Offer context menus on desktop/web chat rows and tabs, with equivalent native long-press
  actions. Other applicable content lists/tabs expose their existing actions consistently.
- Add Archive/Unarchive and Delete actions to the chat view. Archive state belongs to the owning
  Mac and propagates through its authenticated remote API, rather than becoming a client-only flag.
- Hide archived chats by default. Add a **Show Archived** switch after **Through Date** in chat
  filters, including compact expandable native filters. Identify archived records and allow
  unarchiving without losing the conversation or its provider association.
- Confirm deletion with the owning Mac/chat identity and scope. Deleting a Proteus chat must not
  delete generated documents, workspace files, provider-owned originals or schedule definitions.
  Reject deletion while execution, queued work or unresolved approvals would be orphaned.
- Invalidate deleted-chat caches, content descriptors and pending capabilities; reject stale
  continuation/document/attachment requests. Sync and reload must not resurrect the chat.
- Verify local and paired remote archive/unarchive/delete, default and archived filters, safe
  active-state rejection, confirmation cancellation, tab/cache cleanup and reload behavior.

## Active: optional tmux, terminal history and seamless reconnect — October 5

The operator selected tmux-backed persistence plus local saved history for this release. Proteus
must still work when tmux is absent. Install tmux on Work Mac through its existing reputable package
manager and verify with a disposable session; preserve unrelated sessions and shell configuration.
Verification found tmux 3.6a on Build Mac and 3.6b already installed on HC, so no new package
installation was needed. HC disposable-session attach/detach/persistence/cleanup and isolated
Electron quit/relaunch integration passed. Installed Personal startup showed zero terminal processes;
a real production tmux session was not started for acceptance.

- Keep **Terminal** as the user-facing tool. Ghostty remains accurate renderer/appearance detail:
  `ghostty-web` provides the embedded WebAssembly terminal and `node-pty` the host connection.
- Opening a terminal lets the operator choose a specific available tmux session (or create one)
  and a Ghostty/terminal appearance profile, with sensible saved defaults preselected. Provide
  session/preset management and explicit attach, detach, rename and end controls. Preserve existing
  profiles and distinguish appearance from session identity/lifetime.
- Tmux sessions continue after closing their Proteus tab or quitting the app. These actions detach
  the view; only an explicit End session terminates a persistent managed session. Report resource
  ownership and retain normal non-tmux PTY fallback when tmux is missing or unavailable.
- Restore terminal descriptors and bounded private local output. Reconnect to an existing session
  when activated. If the process no longer exists, typing a command should transparently create a
  fresh shell and deliver that input once, without a separate Start new session button. Preserve
  old output with a truthful ended/reconnected marker and keep initialization races/error retries
  from losing, duplicating or silently replaying input.
- Never replay a profile startup command because of restoration, renderer reload, reconnect or the
  first keystroke into an ended session. A new explicit terminal launch may use its configured
  startup command. A Mac reboot/crash does not preserve running tmux processes; distinguish saved
  output from a live session.
- Save history only on the owning Mac, privately and with bounded retention/clear controls. Do not
  sync terminal contents through the Life/shared API or add a remote-shell endpoint as part of
  this change. Do not modify unrelated tmux sessions, global tmux config or shell history files.
- Validate tmux present/absent, real attach/detach/restart, synthetic output restoration, no command
  replay, typing during reconnect, explicit End and profile/default choices with disposable data.
  Existing production shells and provider processes are not test fixtures.

## Active release: generated-document links and click-to-open Markdown tabs — October 5

Status: host approval protocol, bounded asset manifest, relative-link approval and cross-client
readers passed synthetic security/UI acceptance. Personal and native builds are installed; no
existing user document was opened or approved in live installed-client acceptance.
Before 0.2.0, local desktop `.md` links opened a Markdown tab, while remote desktop and website
links lacked the equivalent host-approved reader. The approved host/document identity, authorization
and offline design below is now implemented and synthetically tested; installed live-file approval
remains unverified.

- When a chat generates or updates a proposal, design document, journal entry or similar Markdown
  artifact, expose a clear clickable document title/filename in the response. Use a genuine file
  reference from the response or confirmed tool output; do not infer successful creation from
  prose alone or scan unrelated folders to find potential artifacts. First scope is Markdown.
- Clicking the document opens and selects its rendered Markdown in the originating chat workspace
  on desktop/web/wide iPad, using the later content-tab design. Keep the chat tab, draft and reading position intact.
  Repeated clicks activate the already-open document for that host/file identity. On iPhone use
  the equivalent document view with Back/swipe back to the retained chat.
- Do not open documents, switch focus, create a split view or force side-by-side presentation
  automatically when generation finishes. The operator's click is the opening trigger. The October 5 content-workspace design governs placement; broader Safari-style tab groups
  remain deferred.
- Resolve a remote document through its owning Mac and show host provenance. Use an authenticated,
  bounded read-only document capability tied to the authorized chat/file; recheck current roots,
  canonical paths/symlinks, file type and size on the host. Never treat a remote path as local,
  publish a public file URL, execute document HTML/scripts or broaden workspace/resource grants.
  This adds in-app document viewing; native remote Open/Copy path and context editing stay excluded.
- Retain safe Markdown rendering and supported relative-link/image resolution within the same
  authorization boundary. Show missing/moved/denied/offline/unsupported-host states explicitly.
  A restored document tab is a descriptor, not authority to reread a revoked file. Distinguish
  current disk contents from any deliberately retained snapshot rather than implying immutability.
- Register a host-owned document ID bound to its chat and filesystem reference. Remote links and
  restored tabs use host/chat/document identity; only the owning Mac resolves the path. IDs and
  previously rendered links are not bearer authorization. Add an independently granted, revocable
  Connections capability, **View chat documents**, without enabling general resource access,
  filesystem browsing or editing. Existing peers must not silently acquire this grant.
- The implemented authorization boundary also requires trusted host approval of the exact
  linked document version for the requesting device, with a short expiry. A peer-level grant
  alone cannot transmit content. Pending requests contain metadata only; changed bytes or a
  different device require a fresh request and approval.
- Read through the existing authenticated encrypted relay transport. Recheck the peer's current
  grant, chat/document association and current host filesystem boundary for every document/image
  request. Do not expose the broader local `/api/markdown` reader as an unrestricted remote method.
  Return bounded Markdown plus title, modification time and a version identifier for the bytes read.
  Reading a document requires no AI turn and no plaintext document store in the website database.
- Opening fetches the latest saved version. If a file changes while its tab is open, offer Refresh
  rather than silently replacing the visible content. Related local images require separate
  authorized bounded reads. Moved/deleted/denied files and unsupported hosts remain explicit states.
- Initially retain document contents only in memory while the tab is open; persist tab descriptors,
  not document bodies or automatic offline copies. If the owning Mac disconnects after loading, retain
  the visible copy with its last-read time/version. If no copy is loaded, explain that the owning
  Mac must reconnect. Persistent offline caching is a later explicit option. Sign-out/account
  changes must clear retained private content; revocation prevents further reads but cannot recall
  bytes already delivered to a client. Transport encryption does not remove website-client trust.
- Acceptance: generated and updated links; duplicate clicks; version/refresh behavior; loaded and
  never-loaded offline states; reconnect; revoked grants; cross-chat/host/account ID substitution;
  spaces, Unicode, case-insensitive Markdown extensions and anchors; missing files; denied roots,
  traversal, symlink replacement and bounded reads/images; safe rendering; chat-state preservation;
  no automatic opening and no persistent content cache. Use synthetic files and transcripts.
  Interactive HTML previews are approved as the separate queued extension below. The Markdown
  viewing grant alone must never enable scripts or install a general code runner.

## Active release: interactive artifacts with explicit script approval — October 5

Status: static and explicitly approved interactive previews passed synthetic containment
fixtures across desktop, web and native. No existing artifact was executed in an installed client;
website previews have no hard CPU/memory guarantee.

- Support provider-neutral HTML/CSS/browser-JavaScript artifacts from Codex, Claude and Copilot.
  Use one artifact contract and preview behavior across desktop/web/iPhone/iPad. Open only on
  click, using the document tab/reader flow above, preserving chat state. Replace any provider-
  specific preview helpers with a small Proteus interface; do not require an OpenAI file format.
- Initially show an isolated static preview with scripts disabled. Keep **Enable interactive
  preview** in trusted Proteus chrome, outside generated content. Identify the artifact, owning
  Mac and version, and explain that this enables browser JavaScript inside this preview only.
  Script-dependent artifacts should show a clear enable prompt rather than an unexplained blank.
- Bind approval to the viewing account/client, source host, artifact and exact content version,
  including bundled executable dependencies, for the current preview session. Ordinary rerenders
  must not prompt again or rerun initialization; changed code/dependencies require new approval.
  Do not inherit approval across unrelated artifacts, clients or restored app sessions. Offer
  **Stop scripts** to destroy the active execution context and return to the static view.
- Run approved scripts in an isolated, disposable browser context without Node/Electron APIs,
  shell execution, filesystem authority, app credentials, authenticated browser cookies, other
  chats or ambient Proteus API access. Keep Markdown sanitization unchanged. A generated `.cjs`
  file remains source text unless a separately designed host execution workflow is invoked;
  approving a preview is not approval for Node scripts, dependency installs or build commands.
- Keep network access, embedded remote resources and app actions blocked by default, including
  before script approval. Prefer self-contained artifacts and authorized bundled assets. If a
  preview needs external access or a privileged action, explain the missing capability and
  require a separate narrow permission through trusted UI; enabling scripts cannot imply it.
  Validate any preview-to-host messages against explicit capabilities and the approved context.
- Use the approved host document identity, authorization and bounded relay delivery for remote
  artifacts and assets. Script approval cannot expand file-reading grants. Retain contents and
  execution state in memory only initially; clear on close, sign-out/account change or revocation.
  Include active previews in Engine Room resource controls with stop/unload actions and honest
  platform measurement/interruption limits. Ordinary website JavaScript has no hard CPU/memory
  budget and synchronous code may block an in-page Stop control; do not claim otherwise.
  No model call is needed for ordinary local preview interactions.
- Acceptance: static and script-dependent fixtures from each provider; explicit enable/stop;
  same-version rerenders, changed code/assets and session restoration; remote/offline behavior;
  keyboard/touch and native layouts; blocked network, host APIs, cross-artifact storage and
  attempted top-level navigation; fabricated approval controls; runaway-script stop/unload;
  denied/revoked document grants and account transitions. Use synthetic artifacts and disposable
  profiles. This queue entry is design approval, not permission to execute any existing artifact.

## Active release: tab-bar branding and persistent navigation icons — October 5

Status: source and focused cross-client UI acceptance passed. The installed Personal app showed
the compact full-width top bar, sidebar and collapsed icon rail; the original layout was restored
after inspection.

- Place the full-width top tab bar above the sidebar, with the compact Proteus name and current
  logo at the upper left. The sidebar and its hover slide-over begin below that bar. Reduce main
  and child tab height and horizontal padding without shortening the existing title character
  limit; preserve usable controls, dividers and scroll positions. Place the collapse arrow near the
  sidebar top edge, remove excess space above Home, and tighten left/right sidebar padding while
  retaining usable controls. This is the latest layout steering.
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

## Active release: remote desktop chat parity and automatic earlier history — October 5

Status: local/remote parity and automatic-history behavior passed synthetic client acceptance;
installed Personal retained both online Mac destinations. No live paid remote model turn was used.

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
- Omit native remote file Open/Copy path actions and context-changing controls from this increment.
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

## Active release: pasted image and file attachments in chat — October 5

Status: implemented across desktop/web/iPhone/iPad including remote chats. Exact one-use
consent, provider byte delivery and client UI passed synthetic tests. The follow-up larger-batch
source change allows 256 files within 32 MiB total and 8 MiB per file, with bounded staging,
sliding inactivity expiry and the same ordered consent. Final Build Mac, iPhone and
iPad installs and both d24/web-only final website 14/14 audits passed. The Work Mac final
install and live Claude readiness check remain pending. The supplied attachment-strip image remains a
presentation reference; no existing user file was sent during validation.

- Pasting images adds preview thumbnails in an attachment strip at the top of the composer.
  Clicking/tapping a thumbnail opens a large modal preview; clicking the backdrop or its X
  closes it. Pressing Escape also closes the active image preview and returns focus to its
  thumbnail/composer; it must not close the chat tab or cancel a running turn. Include focus
  containment and an accessible close control.
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

## Active release: allowance refresh and approved chat presentation — October 5

Status: the October 5 interactive chat proposal is included in the authorized active release.
The flow applies to desktop, web and mobile; mobile keeps its condensed native formatting and
solid message boxes. Source acceptance passed and the 0.2.0 clients were deployed as described
above; the installed Personal fresh Copilot quota returned 75.1% remaining without a model turn.
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

Approved presentation direction, implemented with synthetic cross-client acceptance (the mockup used illustrative data):

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

## Active release: Team Tools subtab dividers — October 5

Status: matching desktop/iPad dividers passed focused UI checks. The clients are installed;
manual traversal of each live installed Team tab was not part of the guarded install check.

- The persistent Team Tools and Standup subtabs previously lacked the visible separation used
  between browser subtabs. Matching vertical dividers now separate Team Tools and Standup, and
  Standup and the first browser subtab. Keep the main tab bar and this secondary bar distinct.
- Use consistent divider height, spacing and contrast across the secondary tab strip while
  preserving the active-tab underline and current tab behavior. Check each fixed tab selected,
  a browser tab selected, and narrow/overflow layouts; include the corresponding iPad tab strip
  in the parity review.

## Active release: preserve generated Standup when links change — October 5

Status: implemented and verified in isolated Electron acceptance: generated order and fixed positions
survive link additions/edits and undock/redock. Installed real-list mutation was not exercised.

- Before the fix, adding a Standup link reset a docked generated order to “Generate for today,”
  and undock/redock did not restore it. The isolated regression now preserves that order.
- Adding or editing links must preserve the already-generated order and current presentation
  state for the selected list and day. Docking, undocking and redocking must display that same
  result, without reshuffling participants or requiring regeneration.
- Investigate link-save refresh, shared-list revisions, daily-state invalidation and dock
  remounting without assuming a root cause. Keep daily results scoped to their list and date;
  link-only edits must not be treated as a request to regenerate the roster.
- Acceptance: generate an order, dock it, add a link and verify the exact order remains visible;
  undock/redock and switch away/back to Team Tools and verify the same result. Cover link edits
  and removal too, while retaining explicit regeneration and list/day isolation.

## Active release: iPad corrections — October 5

Source and simulator acceptance passed for both corrections; the physical iPad was updated in
place with app data and preferences preserved. Live shared-list edits were not exercised.

- [x] **Open the selected shared team configuration (source and simulator verified).** Selecting an existing named team
  list on iPad currently opens a new-list form instead of that list's configuration. Load
  the selected API record, including its stable ID, revision, members, instructions, links
  and timezone. Editing/saving must update that same list; create a new list only through
  the explicit New list action. Verify selection between multiple existing lists and confirm
  that opening or saving one does not create a duplicate.
- [x] **Separate main browser tabs from Team Tools browser tabs (source and simulator verified).** The iPad's global
  new-browser control must use the same plus/globe artwork as desktop, without the visible
  word “Browser,” while retaining an accessible New browser tab label. It must open and
  select a browser tab in the main top tab bar, including when Team Tools is active.
  Team Tools keeps its own separate browser-tab control and secondary tab collection,
  matching desktop. Verify that each control adds a tab only to its intended collection
  and preserves the other collection's tabs and selection.

## Active release: iOS notification tap routing — October 5

The operator reports that tapping a Proteus notification can crash or fail to open its target.
Native investigation and cold/warm routing regression tests are a release gate. Preserve host and
chat/schedule identity, wait for app readiness, avoid Home overriding a pending notification, and
show missing/offline targets safely. Existing notifications may be local; this is not proof of APNs.

The operator has no paid Apple Developer membership. Native background remote push remains pending
an APNs-enabled signing team and server credentials; retain the current signing configuration.
Local notifications and their tap routing do not require enrollment. Do not purchase membership or
change signing/account settings implicitly.

## Active release: provider sign-in recovery and refresh without restarting

Status: local Sign in/Reconnect, timeout/cancellation, delayed completion, account labels and
provider-specific execution holds passed synthetic integration. Copilot, Codex and Claude use
supported authentication handoffs. No live sign-in validation or credential change is claimed.

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

## Active release: reconcile MCP connection status with the active chat

Status: current-session MCP failures now take priority over configuration-only Connected status,
with refreshed OAuth/session checks and synthetic coverage. Live provider OAuth recovery remains
unverified; historical tool events are retained.

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

This section records the earlier October 5 interim release; the current 0.2.0 rollout is above.
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
was locked at that audit, so no native UI checks were claimed then. Later 0.2.0 installed UI
acceptance is recorded above. The final log window confirms
the known MariaDB system-table issue plus seven still-unclassified warning entries; maintenance
remains open. Personal → HC pairing was saved and online; HC → Personal remains incomplete.
At that earlier checkpoint HC's control check was unreachable and no signed-install receipt
existed; its install hold protected an active digest job. Preserve that workflow safeguard. Physical shared-account
acceptance remains separate. See `release-validation.md`.
There are no product-specific personal/work Mac categories. Any paired host can be selected by
its stable host ID; its display name is configured on that desktop.

## Message actions — October 4 follow-up

Copy and local Read Aloud buttons beneath completed assistant messages are implemented across
desktop/web/iOS. Active playback adds Pause/Resume, Stop and a text-position scrubber. Desktop/web
share one local-voice controller; native uses system speech. No provider execution or cloud voice
fallback is introduced. See `chat-rendering.md` for controls and platform limitations; installation
and deployment remain separate from implementation/test status. Build Mac, iPhone, iPad
and website were updated for that follow-up. HC ran `17719ea` then, including the empty-peer
startup fix; relay and providers passed after installation without a Keychain prompt. The underlying item ACL
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
HC → Personal remained incomplete then; it is still under inspection after the 0.2.0 install.
Bidirectional completion is not claimed.
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
- Provider adapters beyond Copilot/Codex/Claude/rehearsal; Claude browser/steering parity and scoped MCP OAuth controls; Codex native agent tool-filter parity and per-tool MCP approval interception; changing the provider of an existing chat.
- Paginated on-disk run storage as history grows.
- Further account-session grant hardening remains queued. Authenticated end-to-end revocation is
  implemented in the parity release; unauthenticated relay notices cannot erase enrollment.
- Codex MCP OAuth controls, generic MCP elicitation/input forms, and editor-specific agent hook and extension-tool mappings. Copilot OAuth recovery is implemented per chat.
- Bitwarden extension compatibility and broader token-broker/Keychain bootstrap integrations.
- Automatic VS Code index, unsaved buffers, or existing chat-history transfer.
- Native session relocation or cross-provider conversation migration.

Operator paths, team rosters, private instructions, chat content, and workspace membership remain
in local configuration or their owning workflow sources, outside the app repository.
